/**
 * Deterministic breadth-first pathfinding over the maze grid. Pure
 * TypeScript with no DOM/canvas dependency, so it can run in tests and in
 * the core engine alike. Used by enemies.ts to give the chase behaviour a
 * real shortest-path route to the player instead of only a greedy
 * distance heuristic.
 */

import { isWall, wrapCol, type Grid } from './grid';
import type { Direction, TilePos } from './types';

export interface PathOptions {
  /** When true (the default), only the den door tile is walkable among den tiles. */
  forbidDen?: boolean;
}

/** Fixed neighbour expansion order, kept stable so BFS results are fully deterministic. */
const NEIGHBOUR_STEPS: { direction: Direction; col: number; row: number }[] = [
  { direction: 'up', col: 0, row: -1 },
  { direction: 'left', col: -1, row: 0 },
  { direction: 'down', col: 0, row: 1 },
  { direction: 'right', col: 1, row: 0 },
];

function isDenTile(grid: Grid, tile: TilePos): boolean {
  return grid.tiles[tile.row]?.[tile.col] === 'den';
}

function isDoorTile(grid: Grid, tile: TilePos): boolean {
  return tile.col === grid.denDoor.col && tile.row === grid.denDoor.row;
}

function isPassable(grid: Grid, tile: TilePos, forbidDen: boolean): boolean {
  if (isWall(grid, tile.col, tile.row)) return false;
  if (forbidDen && isDenTile(grid, tile) && !isDoorTile(grid, tile)) return false;
  return true;
}

/**
 * Shortest tile sequence from `from` to `to` via orthogonal, walkable moves
 * (respecting horizontal tunnel wrap), found by breadth-first search. The
 * returned array is inclusive of both `from` (index 0) and `to` (last
 * index); a call with `from` equal to `to` returns a single-element array.
 * Returns null when `to` cannot be reached. Den tiles other than the door
 * are excluded from the search by default (`forbidDen: false` allows them).
 */
export function findPath(grid: Grid, from: TilePos, to: TilePos, options: PathOptions = {}): TilePos[] | null {
  const forbidDen = options.forbidDen ?? true;
  if (!isPassable(grid, from, forbidDen) || !isPassable(grid, to, forbidDen)) return null;

  const cols = grid.width;
  const cellCount = grid.width * grid.height;
  const index = (tile: TilePos): number => tile.row * cols + tile.col;

  const fromIndex = index(from);
  const toIndex = index(to);

  if (fromIndex === toIndex) return [from];

  const visited = new Uint8Array(cellCount);
  const cameFrom = new Int32Array(cellCount).fill(-1);
  const queue: TilePos[] = [from];
  visited[fromIndex] = 1;

  let head = 0;
  let reached = false;
  while (head < queue.length) {
    const current = queue[head++];
    const currentIndex = index(current);
    if (currentIndex === toIndex) {
      reached = true;
      break;
    }
    for (const step of NEIGHBOUR_STEPS) {
      const row = current.row + step.row;
      if (row < 0 || row >= grid.height) continue;
      const col = wrapCol(grid, current.col + step.col);
      const next: TilePos = { col, row };
      if (!isPassable(grid, next, forbidDen)) continue;
      const nextIndex = index(next);
      if (visited[nextIndex]) continue;
      visited[nextIndex] = 1;
      cameFrom[nextIndex] = currentIndex;
      queue.push(next);
    }
  }

  if (!reached) return null;

  const path: TilePos[] = [];
  let cursor = toIndex;
  while (cursor !== fromIndex) {
    path.push({ col: cursor % cols, row: Math.floor(cursor / cols) });
    cursor = cameFrom[cursor];
  }
  path.push(from);
  path.reverse();
  return path;
}

/**
 * The first move direction along the shortest path from `from` to `to`, or
 * null when `to` is unreachable (or already equal to `from`).
 */
export function nextStepTowards(grid: Grid, from: TilePos, to: TilePos, options?: PathOptions): Direction | null {
  const path = findPath(grid, from, to, options);
  if (!path || path.length < 2) return null;
  const next = path[1];
  for (const step of NEIGHBOUR_STEPS) {
    const row = from.row + step.row;
    if (row !== next.row) continue;
    if (wrapCol(grid, from.col + step.col) === next.col) return step.direction;
  }
  return null;
}
