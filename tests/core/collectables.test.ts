import { describe, expect, it } from 'vitest';
import {
  BLOOMBURST_SCORE,
  collectAt,
  createCollectablesState,
  isLevelComplete,
  PELLET_SCORE,
  POWER_PELLET_SCORE,
} from '../../src/core/collectables';
import { parseLevel } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';

const grid = parseLevel(LEVELS[0].rows);

function countTiles(): { pellets: number; powerPellets: number; bloombursts: number } {
  let pellets = 0;
  let powerPellets = 0;
  let bloombursts = 0;
  for (const row of grid.tiles) {
    for (const tile of row) {
      if (tile === 'pellet') pellets++;
      if (tile === 'power-pellet') powerPellets++;
      if (tile === 'bloomburst') bloombursts++;
    }
  }
  return { pellets, powerPellets, bloombursts };
}

describe('createCollectablesState', () => {
  it('counts every pellet and power pellet in the level', () => {
    const state = createCollectablesState(grid);
    const expected = countTiles();
    expect(state.pelletsRemaining).toBe(expected.pellets);
    expect(state.powerPelletsRemaining).toBe(expected.powerPellets);
    expect(state.score).toBe(0);
  });

  it('counts every Bloomburst tile in the level', () => {
    const state = createCollectablesState(grid);
    const expected = countTiles();
    expect(expected.bloombursts).toBeGreaterThan(0);
    expect(state.bloomburstRemaining).toBe(expected.bloombursts);
  });
});

describe('collectAt', () => {
  it('awards points and decrements the count for a pellet', () => {
    const initial = createCollectablesState(grid);
    // (2, 2) holds a power pellet in this level; (2, 3) is a plain pellet.
    const { state, collected } = collectAt(grid, initial, { col: 2, row: 3 });
    expect(collected).toBe('pellet');
    expect(state.score).toBe(PELLET_SCORE);
    expect(state.pelletsRemaining).toBe(initial.pelletsRemaining - 1);
    expect(state.powerPelletsRemaining).toBe(initial.powerPelletsRemaining);
  });

  it('awards more points and decrements the power-pellet count for a power pellet', () => {
    const initial = createCollectablesState(grid);
    const { state, collected } = collectAt(grid, initial, { col: 2, row: 2 });
    expect(collected).toBe('power-pellet');
    expect(state.score).toBe(POWER_PELLET_SCORE);
    expect(state.powerPelletsRemaining).toBe(initial.powerPelletsRemaining - 1);
  });

  it('does nothing when collecting an already-empty tile', () => {
    const initial = createCollectablesState(grid);
    const first = collectAt(grid, initial, { col: 2, row: 3 });
    const second = collectAt(grid, first.state, { col: 2, row: 3 });
    expect(second.collected).toBeNull();
    expect(second.state).toBe(first.state);
  });

  it('awards Bloomburst points and decrements the Bloomburst count for a Bloomburst tile', () => {
    const initial = createCollectablesState(grid);
    // (1, 2) holds a Bloomburst in this level.
    const { state, collected } = collectAt(grid, initial, { col: 1, row: 2 });
    expect(collected).toBe('bloomburst');
    expect(state.score).toBe(BLOOMBURST_SCORE);
    expect(state.bloomburstRemaining).toBe(initial.bloomburstRemaining - 1);
    expect(state.pelletsRemaining).toBe(initial.pelletsRemaining);
    expect(state.powerPelletsRemaining).toBe(initial.powerPelletsRemaining);
  });
});

describe('isLevelComplete', () => {
  it('is false while pellets remain', () => {
    expect(
      isLevelComplete({
        pellets: [],
        score: 0,
        pelletsRemaining: 1,
        powerPelletsRemaining: 0,
        bloomburstRemaining: 0,
      }),
    ).toBe(false);
  });

  it('is false while only a Bloomburst remains', () => {
    expect(
      isLevelComplete({
        pellets: [],
        score: 0,
        pelletsRemaining: 0,
        powerPelletsRemaining: 0,
        bloomburstRemaining: 1,
      }),
    ).toBe(false);
  });

  it('is true once every pellet, power pellet, and Bloomburst is gone', () => {
    expect(
      isLevelComplete({
        pellets: [],
        score: 0,
        pelletsRemaining: 0,
        powerPelletsRemaining: 0,
        bloomburstRemaining: 0,
      }),
    ).toBe(true);
  });
});
