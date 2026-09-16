import type { TilePos, Vec2 } from './types';

export type TileType = 'wall' | 'floor' | 'pellet' | 'power-pellet' | 'tunnel' | 'den';

export interface Grid {
  width: number;
  height: number;
  /** Tiles indexed as tiles[row][col]. */
  tiles: TileType[][];
  playerSpawn: TilePos;
  /** Anchor tile inside the enemy den, used as the default enemy spawn point. */
  denSpawn: TilePos;
  tunnelRows: number[];
}

const LEGEND: Record<string, TileType> = {
  '#': 'wall',
  o: 'pellet',
  '*': 'power-pellet',
  '.': 'floor',
  P: 'floor',
  G: 'den',
  T: 'tunnel',
};

export function parseLevel(rows: string[]): Grid {
  if (rows.length === 0) throw new Error('Level must have at least one row');
  const height = rows.length;
  const width = rows[0].length;

  const tiles: TileType[][] = [];
  let playerSpawn: TilePos | null = null;
  const denTiles: TilePos[] = [];
  const tunnelRows = new Set<number>();

  for (let row = 0; row < height; row++) {
    const line = rows[row];
    if (line.length !== width) {
      throw new Error(`Level row ${row} has width ${line.length}, expected ${width}`);
    }
    const tileRow: TileType[] = [];
    for (let col = 0; col < width; col++) {
      const ch = line[col];
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`Unknown level tile "${ch}" at (${col}, ${row})`);
      tileRow.push(tile);
      if (ch === 'P') playerSpawn = { col, row };
      if (ch === 'G') denTiles.push({ col, row });
      if (ch === 'T') tunnelRows.add(row);
    }
    tiles.push(tileRow);
  }

  if (!playerSpawn) throw new Error('Level is missing a player spawn tile ("P")');
  if (denTiles.length === 0) throw new Error('Level is missing an enemy den ("G")');

  return {
    width,
    height,
    tiles,
    playerSpawn,
    denSpawn: denTiles[Math.floor(denTiles.length / 2)],
    tunnelRows: [...tunnelRows].sort((a, b) => a - b),
  };
}

/** Wraps a column index around the grid width (used for horizontal tunnels). */
export function wrapCol(grid: Grid, col: number): number {
  if (col < 0) return grid.width - 1;
  if (col >= grid.width) return 0;
  return col;
}

export function tileAt(grid: Grid, col: number, row: number): TileType | undefined {
  if (row < 0 || row >= grid.height) return undefined;
  return grid.tiles[row][wrapCol(grid, col)];
}

export function isWall(grid: Grid, col: number, row: number): boolean {
  const tile = tileAt(grid, col, row);
  return tile === undefined || tile === 'wall';
}

/** Orthogonal, walkable neighbours of a tile, respecting horizontal tunnel wrap. */
export function neighbours(grid: Grid, pos: TilePos): TilePos[] {
  const deltas: TilePos[] = [
    { col: 0, row: -1 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
    { col: 1, row: 0 },
  ];
  const result: TilePos[] = [];
  for (const d of deltas) {
    const row = pos.row + d.row;
    if (row < 0 || row >= grid.height) continue;
    const col = wrapCol(grid, pos.col + d.col);
    if (!isWall(grid, col, row)) result.push({ col, row });
  }
  return result;
}

/** Centre coordinates of a tile, in tile-space (1 unit == 1 tile). */
export function tileCentre(col: number, row: number): Vec2 {
  return { x: col, y: row };
}

/** All tiles reachable from `start` via orthogonal, non-wall moves. */
export function reachableTiles(grid: Grid, start: TilePos): Set<string> {
  const key = (p: TilePos): string => `${p.col},${p.row}`;
  const seen = new Set<string>([key(start)]);
  const queue: TilePos[] = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const next of neighbours(grid, current)) {
      const k = key(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }
  return seen;
}
