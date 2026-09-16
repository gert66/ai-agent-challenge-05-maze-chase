import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';
import {
  advanceLevel,
  bloomburstDurationTicks,
  createInitialState,
  enemySpeedMultiplier,
} from '../../src/core/state';
import { BLOOMBURST_DURATION_TICKS, ENEMY_SPEED_TILES_PER_SEC } from '../../src/core/theme';

const grid = parseLevel(LEVELS[0].rows);

function completedState(score: number, lives: number) {
  const state = createInitialState(0, 1);
  return {
    ...state,
    levelComplete: true,
    lives,
    collectables: { ...state.collectables, score },
  };
}

describe('advanceLevel', () => {
  it('throws when the current level is not complete', () => {
    const state = createInitialState(0, 1);
    expect(state.levelComplete).toBe(false);
    expect(() => advanceLevel(state)).toThrow();
  });

  it('increments levelNumber by exactly one', () => {
    const state = completedState(120, 3);
    const next = advanceLevel(state);
    expect(next.levelNumber).toBe(state.levelNumber + 1);
    expect(next.levelNumber).toBe(2);
  });

  it('carries the score forward unchanged', () => {
    const state = completedState(340, 2);
    const next = advanceLevel(state);
    expect(next.collectables.score).toBe(340);
  });

  it('carries lives forward unchanged', () => {
    const state = completedState(50, 2);
    const next = advanceLevel(state);
    expect(next.lives).toBe(2);
  });

  it('fully resets collectables: no pellets collected and the level is no longer complete', () => {
    const state = completedState(999, 1);
    const next = advanceLevel(state);
    expect(next.levelComplete).toBe(false);
    expect(next.collectables.pelletsRemaining).toBeGreaterThan(0);
    // Every tile that holds a pellet/power-pellet/Bloomburst in the parsed
    // grid must be marked as not-yet-collected in the fresh state.
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const tile = grid.tiles[row][col];
        const isCollectableTile = tile === 'pellet' || tile === 'power-pellet' || tile === 'bloomburst';
        expect(next.collectables.pellets[row][col]).toBe(isCollectableTile);
      }
    }
  });

  it('resets the player and every enemy back to their spawn tiles', () => {
    const state = completedState(10, 3);
    const next = advanceLevel(state);
    expect(next.player.pos).toEqual({ x: grid.playerSpawn.col, y: grid.playerSpawn.row });
    expect(next.enemies.every((enemy) => enemy.inDen)).toBe(true);
    expect(next.enemies).toHaveLength(4);
  });

  it('resets empoweredTicksRemaining to zero', () => {
    const state = { ...completedState(10, 3), empoweredTicksRemaining: 250 };
    const next = advanceLevel(state);
    expect(next.empoweredTicksRemaining).toBe(0);
  });

  it('ramps enemy speed strictly higher on level 2 than level 1', () => {
    const level1 = createInitialState(0, 1, 1);
    const level2 = createInitialState(0, 1, 2);
    expect(level2.enemies[0].speed).toBeGreaterThan(level1.enemies[0].speed);
    expect(level1.enemies[0].speed).toBe(ENEMY_SPEED_TILES_PER_SEC);
  });

  it('ramps Bloomburst duration strictly lower on level 2 than level 1', () => {
    expect(bloomburstDurationTicks(2)).toBeLessThan(bloomburstDurationTicks(1));
    expect(bloomburstDurationTicks(1)).toBe(BLOOMBURST_DURATION_TICKS);
  });

  it('bounds the difficulty ramp with a floor/cap at a very high level', () => {
    const highSpeedMultiplier = enemySpeedMultiplier(500);
    const higherSpeedMultiplier = enemySpeedMultiplier(5000);
    expect(highSpeedMultiplier).toBe(higherSpeedMultiplier);
    expect(highSpeedMultiplier).toBeGreaterThan(1);

    const lowDuration = bloomburstDurationTicks(500);
    const lowerDuration = bloomburstDurationTicks(5000);
    expect(lowDuration).toBe(lowerDuration);
    expect(lowDuration).toBeGreaterThan(0);
  });

  it('is deterministic: advancing twice from equivalent completed states yields deep-equal results', () => {
    const stateA = completedState(200, 2);
    const stateB = completedState(200, 2);
    expect(advanceLevel(stateA)).toEqual(advanceLevel(stateB));
  });
});
