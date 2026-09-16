import { isWall, wrapCol, type Grid } from './grid';
import { PLAYER_SPEED_TILES_PER_SEC } from './theme';
import type { Direction, PlayerState, TilePos, Vec2 } from './types';

const DIRECTION_VECTORS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

export function createPlayerState(grid: Grid): PlayerState {
  return {
    pos: { x: grid.playerSpawn.col, y: grid.playerSpawn.row },
    direction: 'none',
    queuedDirection: 'none',
    speed: PLAYER_SPEED_TILES_PER_SEC,
  };
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

function canMove(grid: Grid, tile: TilePos, direction: Direction): boolean {
  if (direction === 'none') return false;
  const vec = DIRECTION_VECTORS[direction];
  const col = wrapCol(grid, tile.col + vec.x);
  const row = tile.row + vec.y;
  return !isWall(grid, col, row);
}

/** Remaining distance (in tiles) to the next tile centre in the given direction. */
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

/**
 * Advances the player by `distanceTiles` tiles, applying the buffered turn
 * at the next legal tile centre, blocking on walls, and wrapping through
 * horizontal tunnels. Pure: returns a new PlayerState, never mutates.
 */
export function stepPlayer(
  grid: Grid,
  player: PlayerState,
  queuedDirection: Direction,
  distanceTiles: number,
): PlayerState {
  let pos: Vec2 = { ...player.pos };
  let direction = player.direction;
  let remaining = distanceTiles;

  while (remaining > 1e-9) {
    if (isAtTileCentre(pos)) {
      const tile = currentTile(pos);
      if (queuedDirection !== 'none' && canMove(grid, tile, queuedDirection)) {
        direction = queuedDirection;
      } else if (direction !== 'none' && !canMove(grid, tile, direction)) {
        direction = 'none';
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

  return { ...player, pos, direction, queuedDirection };
}
