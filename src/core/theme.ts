/**
 * Original theming constants for Glimmerdash. No DOM/canvas dependencies -
 * safe to import from core logic, tests, or the rendering layer alike.
 */

export const GAME_TITLE = 'Glimmerdash';

export const GAME_TAGLINE =
  "Guide Glim the firefly through the Hollow Garden by night, gather dewdrop pollen, " +
  'and stay a wingbeat ahead of the four Duskwisps.';

export const PLAYER_NAME = 'Glim';

export const ENEMY_NAMES = {
  ember: 'Ember',
  frost: 'Frost',
  marsh: 'Marsh',
  dusk: 'Dusk',
} as const;

export type EnemyKey = keyof typeof ENEMY_NAMES;

/** Original per-Duskwisp colors, used to tell all four apart at a glance. */
export const ENEMY_COLORS: Record<EnemyKey, string> = {
  ember: '#ff6b4a',
  frost: '#57e0ff',
  marsh: '#8be36b',
  dusk: '#c88bff',
};

export const COLORS = {
  background: '#0b1021',
  wall: '#2a3a8f',
  floor: '#0b1021',
  pellet: '#ffe066',
  powerPellet: '#ff6b6b',
  bloomburst: '#7CFF9B',
  player: '#ffd23f',
  den: '#1b2559',
  tunnel: '#0b1021',
  /** Shared fill for every Duskwisp while Bloomburst empowerment is active. */
  enemyFrightened: '#3347c9',
  enemyEye: '#f4f7ff',
} as const;

export const TILE_SIZE_PX = 20;

export const PELLET_SCORE = 10;
export const POWER_PELLET_SCORE = 50;

/**
 * A Bloomburst is the maze's original time-limited power-up: collecting one
 * grants the player a fixed number of game steps during which touching a
 * Duskwisp defeats it (for bonus score) instead of costing a life.
 */
export const BLOOMBURST_SCORE = 20;
export const BLOOMBURST_DEFEAT_SCORE = 150;
/**
 * Counted down once per state.step() call. main.ts drives step() at a fixed
 * timestep of STEP_MS = 1000 / 60 (60 ticks/sec), so 420 ticks is ~7 seconds
 * of wall-clock frighten time. If the driving tick rate ever changes, this
 * value should be re-tuned to keep the power-up perceptible.
 */
export const BLOOMBURST_DURATION_TICKS = 420;

export const PLAYER_SPEED_TILES_PER_SEC = 6;
export const ENEMY_SPEED_TILES_PER_SEC = 5;
