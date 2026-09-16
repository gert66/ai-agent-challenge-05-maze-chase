import { collectAt, createCollectablesState, isLevelComplete } from './collectables';
import { type Grid, parseLevel } from './grid';
import { LEVELS } from './levels';
import { createPlayerState, stepPlayer } from './player';
import type { GameState, InputState } from './types';

const gridCache = new Map<number, Grid>();

function getGrid(levelIndex: number): Grid {
  let grid = gridCache.get(levelIndex);
  if (!grid) {
    const level = LEVELS[levelIndex];
    if (!level) throw new Error(`Unknown level index ${levelIndex}`);
    grid = parseLevel(level.rows);
    gridCache.set(levelIndex, grid);
  }
  return grid;
}

export function createInitialState(levelIndex: number, seed: number): GameState {
  const grid = getGrid(levelIndex);
  return {
    levelIndex,
    seed,
    player: createPlayerState(grid),
    collectables: createCollectablesState(grid),
    elapsedMs: 0,
    levelComplete: false,
    // TODO(enemies): spawn Ember/Frost/Marsh/Dusk at grid.denSpawn and advance
    // their pathfinding here once enemy AI lands in a later batch.
    // TODO(power-ups): start/tick a power-up timer here once power pellets do
    // more than add score.
  };
}

/**
 * Advances the game by one fixed timestep. Pure and deterministic: the same
 * (state, input, dtMs) always produces the same resulting state.
 */
export function step(state: GameState, input: InputState, dtMs: number): GameState {
  if (state.levelComplete) return state;

  const grid = getGrid(state.levelIndex);
  const distanceTiles = (state.player.speed * dtMs) / 1000;
  const player = stepPlayer(grid, state.player, input.direction, distanceTiles);
  const tile = { col: Math.round(player.pos.x), row: Math.round(player.pos.y) };
  const { state: collectables } = collectAt(grid, state.collectables, tile);

  return {
    ...state,
    player,
    collectables,
    elapsedMs: state.elapsedMs + dtMs,
    levelComplete: isLevelComplete(collectables),
  };
}
