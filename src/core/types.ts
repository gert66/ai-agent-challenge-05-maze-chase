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
  /** Remaining pellets/power-pellets by [row][col]. */
  pellets: boolean[][];
  score: number;
  pelletsRemaining: number;
  powerPelletsRemaining: number;
}

export interface GameState {
  levelIndex: number;
  seed: number;
  player: PlayerState;
  collectables: CollectablesState;
  elapsedMs: number;
  levelComplete: boolean;
  // TODO(enemies): add `enemies: EnemyState[]` once Duskwisp AI/pathfinding lands.
  // TODO(power-ups): add active power-up timer state once power-ups are implemented.
}

export interface InputState {
  /** Desired direction from player input this frame; buffered until legal. */
  direction: Direction;
}
