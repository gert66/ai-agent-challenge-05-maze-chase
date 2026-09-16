import type { EnemyKey } from './theme';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TilePos {
  col: number;
  row: number;
}

export interface PlayerState {
  /** Position in tile-space: integer coordinates sit exactly on a tile centre. */
  pos: Vec2;
  direction: Direction;
  queuedDirection: Direction;
  speed: number;
}

export interface CollectablesState {
  /** Remaining pellets/power-pellets/Bloombursts by [row][col]. */
  pellets: boolean[][];
  score: number;
  pelletsRemaining: number;
  powerPelletsRemaining: number;
  bloomburstRemaining: number;
}

/**
 * A Duskwisp's movement strategy: `chase` steps greedily toward the player's
 * current tile, `scatter` loops a fixed circuit of maze corners, `ambush`
 * targets a tile ahead of the player's facing, and `wander` picks uniformly
 * among legal moves via the seeded PRNG.
 */
export type EnemyBehaviourId = 'chase' | 'scatter' | 'ambush' | 'wander';

export interface EnemyState {
  id: EnemyKey;
  /** Position in tile-space, same convention as PlayerState.pos. */
  pos: Vec2;
  direction: Direction;
  behaviour: EnemyBehaviourId;
  speed: number;
  /** True while still inside the den, pathing toward the door tile. */
  inDen: boolean;
  /** Index into the scatter-corner circuit; only meaningful for 'scatter'. */
  patrolIndex: number;
}

export interface GameState {
  levelIndex: number;
  /** 1-based level counter, carried and incremented across advanceLevel() calls. */
  levelNumber: number;
  seed: number;
  /** Evolving seed for the tick-by-tick PRNG stream (enemy tie-breaking, wander). */
  rngSeed: number;
  player: PlayerState;
  collectables: CollectablesState;
  enemies: EnemyState[];
  lives: number;
  elapsedMs: number;
  levelComplete: boolean;
  gameOver: boolean;
  /** Game steps left with the Bloomburst empowerment active; 0 when not empowered. */
  empoweredTicksRemaining: number;
  /**
   * Test-only debug flag: when true, step() never moves enemies (they stay
   * put) and so never collides with the player. Lets integration tests
   * script a deterministic full level clear without depending on enemy
   * escape timing or a specific seed's collision outcome.
   */
  freezeEnemies: boolean;
}

export interface InputState {
  /** Desired direction from player input this frame; buffered until legal. */
  direction: Direction;
}
