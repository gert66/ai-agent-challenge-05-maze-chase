import type { Grid } from './grid';
import { BLOOMBURST_SCORE, PELLET_SCORE, POWER_PELLET_SCORE } from './theme';
import type { CollectablesState, TilePos } from './types';

export { PELLET_SCORE, POWER_PELLET_SCORE, BLOOMBURST_SCORE };

export function createCollectablesState(grid: Grid): CollectablesState {
  let pelletsRemaining = 0;
  let powerPelletsRemaining = 0;
  let bloomburstRemaining = 0;
  const pellets = grid.tiles.map((row) =>
    row.map((tile) => {
      if (tile === 'pellet') pelletsRemaining++;
      if (tile === 'power-pellet') powerPelletsRemaining++;
      if (tile === 'bloomburst') bloomburstRemaining++;
      return tile === 'pellet' || tile === 'power-pellet' || tile === 'bloomburst';
    }),
  );
  return { pellets, score: 0, pelletsRemaining, powerPelletsRemaining, bloomburstRemaining };
}

export type CollectedKind = 'pellet' | 'power-pellet' | 'bloomburst' | null;

/** Collects whatever is on `tile`, if anything. Pure: returns a new state. */
export function collectAt(
  grid: Grid,
  state: CollectablesState,
  tile: TilePos,
): { state: CollectablesState; collected: CollectedKind } {
  if (!state.pellets[tile.row]?.[tile.col]) {
    return { state, collected: null };
  }

  const tileType = grid.tiles[tile.row][tile.col];
  const pellets = state.pellets.map((row) => row.slice());
  pellets[tile.row][tile.col] = false;

  if (tileType === 'bloomburst') {
    return {
      state: {
        pellets,
        score: state.score + BLOOMBURST_SCORE,
        pelletsRemaining: state.pelletsRemaining,
        powerPelletsRemaining: state.powerPelletsRemaining,
        bloomburstRemaining: state.bloomburstRemaining - 1,
      },
      collected: 'bloomburst',
    };
  }

  const isPower = tileType === 'power-pellet';
  return {
    state: {
      pellets,
      score: state.score + (isPower ? POWER_PELLET_SCORE : PELLET_SCORE),
      pelletsRemaining: state.pelletsRemaining - (isPower ? 0 : 1),
      powerPelletsRemaining: state.powerPelletsRemaining - (isPower ? 1 : 0),
      bloomburstRemaining: state.bloomburstRemaining,
    },
    collected: isPower ? 'power-pellet' : 'pellet',
  };
}

export function isLevelComplete(state: CollectablesState): boolean {
  return (
    state.pelletsRemaining === 0 && state.powerPelletsRemaining === 0 && state.bloomburstRemaining === 0
  );
}
