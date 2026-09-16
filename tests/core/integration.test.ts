import { describe, expect, it } from 'vitest';
import { isLevelComplete, BLOOMBURST_SCORE, PELLET_SCORE, POWER_PELLET_SCORE } from '../../src/core/collectables';
import { parseLevel, wrapCol, type Grid } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';
import { findPath } from '../../src/core/pathfinding';
import { advanceLevel, createInitialState, step } from '../../src/core/state';
import { PLAYER_SPEED_TILES_PER_SEC } from '../../src/core/theme';
import type { Direction, GameState, TilePos } from '../../src/core/types';

const grid = parseLevel(LEVELS[0].rows);
/** dtMs that moves the player exactly one tile in a single step() call at its fixed speed. */
const TILE_STEP_MS = 1000 / PLAYER_SPEED_TILES_PER_SEC;

function tileOf(pos: { x: number; y: number }): TilePos {
  return { col: Math.round(pos.x), row: Math.round(pos.y) };
}

function directionTo(g: Grid, from: TilePos, to: TilePos): Direction {
  if (from.row === to.row && from.col === to.col) return 'none';
  if (to.col === from.col && to.row === from.row - 1) return 'up';
  if (to.col === from.col && to.row === from.row + 1) return 'down';
  if (to.row === from.row && wrapCol(g, from.col + 1) === to.col) return 'right';
  if (to.row === from.row && wrapCol(g, from.col - 1) === to.col) return 'left';
  throw new Error(`Tiles are not adjacent: ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
}

/** First remaining pellet/power-pellet/Bloomburst tile in row-major scan order, or null when none remain. */
function firstRemainingPellet(state: GameState): TilePos | null {
  const { pellets } = state.collectables;
  for (let row = 0; row < pellets.length; row++) {
    for (let col = 0; col < pellets[row].length; col++) {
      if (pellets[row][col]) return { col, row };
    }
  }
  return null;
}

/** Walks one BFS-shortest path via a sequence of single-tile step() calls, returning the resulting state. */
function walkPath(state: GameState, path: TilePos[]): GameState {
  let current = state;
  for (let i = 1; i < path.length; i++) {
    const direction = directionTo(grid, path[i - 1], path[i]);
    current = step(current, { direction }, TILE_STEP_MS);
  }
  return current;
}

/**
 * Deterministically clears every pellet/power-pellet/Bloomburst on the real
 * Hollow Garden level: repeatedly BFS-paths from the player's current tile to
 * the first remaining collectable (row-major scan) and walks it via step().
 * Enemies are frozen (the test-only `freezeEnemies` flag on createInitialState)
 * so this exercises the pellet-collection and level-completion logic in
 * isolation from collision/respawn timing, which is covered separately in
 * collisions.test.ts and state.test.ts.
 */
function clearLevel(state: GameState): GameState {
  let current = state;
  let guard = 0;
  while (!isLevelComplete(current.collectables)) {
    if (guard++ > 2000) throw new Error('clearLevel exceeded its iteration guard');
    const target = firstRemainingPellet(current);
    if (!target) break;
    const path = findPath(grid, tileOf(current.player.pos), target);
    if (!path) throw new Error(`No path found to remaining collectable at ${JSON.stringify(target)}`);
    current = walkPath(current, path);
  }
  return current;
}

describe('core integration: full level playthrough', () => {
  it('clears the Hollow Garden level and scores exactly the pellet/power-pellet/Bloomburst total', () => {
    const initial = createInitialState(0, 7, 1, true);
    const expectedScore =
      initial.collectables.pelletsRemaining * PELLET_SCORE +
      initial.collectables.powerPelletsRemaining * POWER_PELLET_SCORE +
      initial.collectables.bloomburstRemaining * BLOOMBURST_SCORE;

    const finished = clearLevel(initial);

    expect(finished.levelComplete).toBe(true);
    expect(finished.gameOver).toBe(false);
    expect(finished.collectables.score).toBe(expectedScore);
  });

  it('continues into level 2 via advanceLevel and can collect at least one pellet there', () => {
    const initial = createInitialState(0, 7, 1, true);
    const finished = clearLevel(initial);
    const levelTwo = advanceLevel(finished);

    expect(levelTwo.levelNumber).toBe(2);
    expect(levelTwo.levelComplete).toBe(false);
    expect(levelTwo.collectables.score).toBe(finished.collectables.score);

    const target = firstRemainingPellet(levelTwo);
    expect(target).not.toBeNull();
    const path = findPath(grid, tileOf(levelTwo.player.pos), target as TilePos);
    expect(path).not.toBeNull();

    const afterOnePickup = walkPath(levelTwo, path as TilePos[]);
    expect(afterOnePickup.collectables.score).toBeGreaterThan(levelTwo.collectables.score);
  });

  it('produces identical final states when the same seed is replayed', () => {
    const runA = clearLevel(createInitialState(0, 7, 1, true));
    const runB = clearLevel(createInitialState(0, 7, 1, true));
    expect(runA).toEqual(runB);

    const nextA = advanceLevel(runA);
    const nextB = advanceLevel(runB);
    expect(nextA).toEqual(nextB);
  });
});
