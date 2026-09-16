import type { Grid } from './grid';
import { PELLET_SCORE, POWER_PELLET_SCORE } from './theme';
import type { CollectablesState, TilePos } from './types';

export { PELLET_SCORE, POWER_PELLET_SCORE };

export function createCollectablesState(grid: Grid): CollectablesState {
  let pelletsRemaining = 0;
  let powerPelletsRemaining = 0;
  const pellets = grid.tiles.map((row) =>
    row.map((tile) => {
      if (tile === 'pellet') pelletsRemaining++;
      if (tile === 'power-pellet') powerPelletsRemaining++;
      return tile === 'pellet' || tile === 'power-pellet';
    }),
  );
  return { pellets, score: 0, pelletsRemaining, powerPelletsRemaining };
}

export type CollectedKind = 'pellet' | 'power-pellet' | null;

/** Collects whatever is on `tile`, if anything. Pure: returns a new state. */
export function collectAt(
  grid: Grid,
  state: CollectablesState,
  tile: TilePos,
): { state: CollectablesState; collected: CollectedKind } {
  if (!state.pellets[tile.row]?.[tile.col]) {
    return { state, collected: null };
  }

  const isPower = grid.tiles[tile.row][tile.col] === 'power-pellet';
  const pellets = state.pellets.map((row) => row.slice());
  pellets[tile.row][tile.col] = false;

  return {
    state: {
      pellets,
      score: state.score + (isPower ? POWER_PELLET_SCORE : PELLET_SCORE),
      pelletsRemaining: state.pelletsRemaining - (isPower ? 0 : 1),
      powerPelletsRemaining: state.powerPelletsRemaining - (isPower ? 1 : 0),
    },
    collected: isPower ? 'power-pellet' : 'pellet',
  };
}

export function isLevelComplete(state: CollectablesState): boolean {
  return state.pelletsRemaining === 0 && state.powerPelletsRemaining === 0;
}
