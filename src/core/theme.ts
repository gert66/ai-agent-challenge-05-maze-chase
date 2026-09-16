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
export const BLOOMBURST_DURATION_TICKS = 30;

export const PLAYER_SPEED_TILES_PER_SEC = 6;
export const ENEMY_SPEED_TILES_PER_SEC = 5;
