/**
 * The four Duskwisps that haunt the Hollow Garden. Each has an original name
 * (see ENEMY_NAMES in theme.ts) and a distinct, deterministic movement
 * behaviour. All tie-breaking between equally-good moves goes through the
 * seeded PRNG from rng.ts - no direct Math.random calls anywhere here.
 *
 * Mirrors the tile-centre-stepping style of player.ts: enemies travel in
 * straight lines between tile centres and only re-evaluate their direction
 * once they land exactly on one.
 */

import { isWall, wrapCol, type Grid } from './grid';
import { nextStepTowards } from './pathfinding';
import type { Rng } from './rng';
import { ENEMY_SPEED_TILES_PER_SEC, type EnemyKey } from './theme';
import type { Direction, EnemyBehaviourId, EnemyState, TilePos, Vec2 } from './types';

const DIRECTION_VECTORS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

const REVERSE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
};

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

/** How many tiles ahead of the player's facing the ambush behaviour targets. */
const AMBUSH_LOOKAHEAD_TILES = 4;

const ENEMY_DEFINITIONS: { id: EnemyKey; behaviour: EnemyBehaviourId }[] = [
  { id: 'ember', behaviour: 'chase' },
  { id: 'frost', behaviour: 'scatter' },
  { id: 'marsh', behaviour: 'ambush' },
  { id: 'dusk', behaviour: 'wander' },
];

export function createEnemies(grid: Grid): EnemyState[] {
  return ENEMY_DEFINITIONS.map((def, index) => {
    const spawn = grid.denTiles[index % grid.denTiles.length];
    return {
      id: def.id,
      pos: { x: spawn.col, y: spawn.row },
      direction: 'none',
      behaviour: def.behaviour,
      speed: ENEMY_SPEED_TILES_PER_SEC,
      inDen: true,
      patrolIndex: 0,
    };
  });
}

function mod1(v: number): number {
  return v - Math.floor(v);
}

function isAtTileCentre(pos: Vec2): boolean {
  const eps = 1e-9;
  return Math.abs(mod1(pos.x)) < eps && Math.abs(mod1(pos.y)) < eps;
}

function currentTile(pos: Vec2): TilePos {
  return { col: Math.round(pos.x), row: Math.round(pos.y) };
}

function distanceToNextCentre(pos: Vec2, direction: Direction): number {
  switch (direction) {
    case 'right':
      return 1 - mod1(pos.x);
    case 'left': {
      const f = mod1(pos.x);
      return f === 0 ? 1 : f;
    }
    case 'down':
      return 1 - mod1(pos.y);
    case 'up': {
      const f = mod1(pos.y);
      return f === 0 ? 1 : f;
    }
    default:
      return 0;
  }
}

function wrapPos(grid: Grid, pos: Vec2): Vec2 {
  let x = pos.x;
  if (x < 0) x += grid.width;
  if (x >= grid.width) x -= grid.width;
  return { x, y: pos.y };
}

function neighbourTile(grid: Grid, tile: TilePos, direction: Direction): TilePos {
  const vec = DIRECTION_VECTORS[direction];
  return { col: wrapCol(grid, tile.col + vec.x), row: tile.row + vec.y };
}

function canEnter(grid: Grid, tile: TilePos, direction: Direction): boolean {
  if (direction === 'none') return false;
  const next = neighbourTile(grid, tile, direction);
  return !isWall(grid, next.col, next.row);
}

/** Legal next directions from `tile`, excluding an immediate reversal unless it's the only option. */
function candidateDirections(grid: Grid, tile: TilePos, currentDirection: Direction): Direction[] {
  const reverse = REVERSE[currentDirection];
  const forward = ALL_DIRECTIONS.filter((d) => d !== reverse && canEnter(grid, tile, d));
  if (forward.length > 0) return forward;
  return ALL_DIRECTIONS.filter((d) => canEnter(grid, tile, d));
}

/** Tile-grid Manhattan distance, accounting for horizontal tunnel wrap-around. */
function tileDistance(grid: Grid, a: TilePos, b: TilePos): number {
  const dRow = Math.abs(a.row - b.row);
  const rawDCol = Math.abs(a.col - b.col);
  const dCol = Math.min(rawDCol, grid.width - rawDCol);
  return dRow + dCol;
}

function pickWithRng<T>(options: T[], rng: Rng): T {
  const index = Math.min(options.length - 1, Math.floor(rng() * options.length));
  return options[index];
}

/**
 * Greedy step toward `target`: picks the legal direction whose resulting
 * tile is closest to the target, breaking ties via the seeded PRNG.
 */
export function chooseDirectionTowards(
  grid: Grid,
  tile: TilePos,
  currentDirection: Direction,
  target: TilePos,
  rng: Rng,
): Direction {
  const options = candidateDirections(grid, tile, currentDirection);
  if (options.length === 0) return 'none';

  let bestDist = Infinity;
  let best: Direction[] = [];
  for (const direction of options) {
    const next = neighbourTile(grid, tile, direction);
    const dist = tileDistance(grid, next, target);
    if (dist < bestDist) {
      bestDist = dist;
      best = [direction];
    } else if (dist === bestDist) {
      best.push(direction);
    }
  }
  return pickWithRng(best, rng);
}

/** Picks uniformly among all legal directions via the seeded PRNG. */
export function chooseWanderDirection(
  grid: Grid,
  tile: TilePos,
  currentDirection: Direction,
  rng: Rng,
): Direction {
  const options = candidateDirections(grid, tile, currentDirection);
  if (options.length === 0) return 'none';
  return pickWithRng(options, rng);
}

/** Nearest non-wall tile to `seed`, found via breadth-first search. */
function nearestOpenTile(grid: Grid, seed: TilePos): TilePos {
  const start: TilePos = {
    col: Math.min(Math.max(seed.col, 0), grid.width - 1),
    row: Math.min(Math.max(seed.row, 0), grid.height - 1),
  };
  const key = (p: TilePos): string => `${p.col},${p.row}`;
  const seen = new Set<string>([key(start)]);
  const queue: TilePos[] = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    if (!isWall(grid, current.col, current.row)) return current;
    for (const direction of ALL_DIRECTIONS) {
      const next = neighbourTile(grid, current, direction);
      if (next.row < 0 || next.row >= grid.height) continue;
      const k = key(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }
  throw new Error('No open tile found near scatter corner seed');
}

/** The fixed four-corner patrol circuit used by the scatter behaviour. */
export function scatterCorners(grid: Grid): TilePos[] {
  const seeds: TilePos[] = [
    { col: 0, row: 0 },
    { col: grid.width - 1, row: 0 },
    { col: grid.width - 1, row: grid.height - 1 },
    { col: 0, row: grid.height - 1 },
  ];
  return seeds.map((seed) => nearestOpenTile(grid, seed));
}

/** The tile the ambush behaviour targets: as far ahead of the player as the maze allows, up to the lookahead. */
export function ambushTargetTile(
  grid: Grid,
  playerTile: TilePos,
  playerDirection: Direction,
  lookahead: number = AMBUSH_LOOKAHEAD_TILES,
): TilePos {
  const vec = DIRECTION_VECTORS[playerDirection];
  for (let distance = lookahead; distance >= 0; distance--) {
    const col = wrapCol(grid, playerTile.col + vec.x * distance);
    const row = playerTile.row + vec.y * distance;
    if (row < 0 || row >= grid.height) continue;
    if (!isWall(grid, col, row)) return { col, row };
  }
  return playerTile;
}

export interface EnemyStepContext {
  playerTile: TilePos;
  playerDirection: Direction;
}

/** The tile a (non-denned) enemy is currently pursuing, or null for a wandering enemy. */
export function computeEnemyTarget(grid: Grid, enemy: EnemyState, context: EnemyStepContext): TilePos | null {
  switch (enemy.behaviour) {
    case 'chase':
      return context.playerTile;
    case 'ambush':
      return ambushTargetTile(grid, context.playerTile, context.playerDirection);
    case 'scatter':
      return scatterCorners(grid)[enemy.patrolIndex % scatterCorners(grid).length];
    case 'wander':
      return null;
  }
}

/**
 * Advances one enemy by `distanceTiles` tiles, choosing a new direction each
 * time it lands exactly on a tile centre. While `inDen`, it paths toward the
 * den door; once it steps onto a non-den tile it switches to its normal
 * behaviour. Pure: returns a new EnemyState, never mutates.
 */
export function stepEnemy(
  grid: Grid,
  enemy: EnemyState,
  context: EnemyStepContext,
  rng: Rng,
  distanceTiles: number,
): EnemyState {
  let pos: Vec2 = { ...enemy.pos };
  let direction = enemy.direction;
  let inDen = enemy.inDen;
  let patrolIndex = enemy.patrolIndex;
  let remaining = distanceTiles;

  while (remaining > 1e-9) {
    if (isAtTileCentre(pos)) {
      const tile = currentTile(pos);

      if (inDen && grid.tiles[tile.row]?.[tile.col] !== 'den') {
        inDen = false;
      }

      if (!inDen && enemy.behaviour === 'scatter') {
        const corners = scatterCorners(grid);
        const corner = corners[patrolIndex % corners.length];
        if (tile.col === corner.col && tile.row === corner.row) {
          patrolIndex = (patrolIndex + 1) % corners.length;
        }
      }

      const target = inDen ? grid.denDoor : computeEnemyTarget(grid, { ...enemy, patrolIndex }, context);
      if (target === null) {
        direction = chooseWanderDirection(grid, tile, direction, rng);
      } else if (!inDen && enemy.behaviour === 'chase') {
        // Ember hunts via real shortest-path navigation; the greedy
        // heuristic is only a fallback for the rare case of no path.
        direction = nextStepTowards(grid, tile, target) ?? chooseDirectionTowards(grid, tile, direction, target, rng);
      } else {
        direction = chooseDirectionTowards(grid, tile, direction, target, rng);
      }
    }

    if (direction === 'none') break;

    const vec = DIRECTION_VECTORS[direction];
    const distToNextCentre = isAtTileCentre(pos) ? 1 : distanceToNextCentre(pos, direction);
    const step = Math.min(remaining, distToNextCentre);

    pos = wrapPos(grid, { x: pos.x + vec.x * step, y: pos.y + vec.y * step });
    remaining -= step;

    if (step >= distToNextCentre - 1e-9) {
      pos = { x: Math.round(pos.x), y: Math.round(pos.y) };
    } else {
      break;
    }
  }

  return { ...enemy, pos, direction, inDen, patrolIndex };
}
