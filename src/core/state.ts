import { collectAt, createCollectablesState, isLevelComplete } from './collectables';
import { resolveCollisions } from './collisions';
import { createEnemies, stepEnemy } from './enemies';
import { type Grid, parseLevel } from './grid';
import { LEVELS } from './levels';
import { createPlayerState, stepPlayer } from './player';
import { mulberry32 } from './rng';
import { BLOOMBURST_DURATION_TICKS } from './theme';
import type { GameState, InputState } from './types';

const START_LIVES = 3;

const gridCache = new Map<number, Grid>();

function getGrid(levelIndex: number): Grid {
  let grid = gridCache.get(levelIndex);
  if (!grid) {
    const level = LEVELS[levelIndex];
    if (!level) throw new Error(`Unknown level index ${levelIndex}`);
    grid = parseLevel(level.rows);
    gridCache.set(levelIndex, grid);
  }
  return grid;
}

/** Enemy speed grows 6% per level above 1, capped at 1.6x base speed (reached at level 11). */
const ENEMY_SPEED_RAMP_PER_LEVEL = 0.06;
const ENEMY_SPEED_RAMP_MAX_MULTIPLIER = 1.6;

/** Bloomburst duration shrinks 5% per level above 1, floored at 40% of the base duration (reached at level 13). */
const BLOOMBURST_DURATION_RAMP_PER_LEVEL = 0.05;
const BLOOMBURST_DURATION_FLOOR_MULTIPLIER = 0.4;

/**
 * Deterministic difficulty ramp, a pure function of levelNumber alone (see
 * the ramp constants above for the exact formulas and their floor/cap).
 * At levelNumber 1 both multipliers are exactly 1, so level 1 behaviour is
 * unchanged from before level progression existed.
 */
export function enemySpeedMultiplier(levelNumber: number): number {
  const raw = 1 + ENEMY_SPEED_RAMP_PER_LEVEL * (levelNumber - 1);
  return Math.min(raw, ENEMY_SPEED_RAMP_MAX_MULTIPLIER);
}

export function bloomburstDurationTicks(levelNumber: number): number {
  const raw = 1 - BLOOMBURST_DURATION_RAMP_PER_LEVEL * (levelNumber - 1);
  const multiplier = Math.max(raw, BLOOMBURST_DURATION_FLOOR_MULTIPLIER);
  return Math.round(BLOOMBURST_DURATION_TICKS * multiplier);
}

export function createInitialState(
  levelIndex: number,
  seed: number,
  levelNumber: number = 1,
  freezeEnemies: boolean = false,
): GameState {
  const grid = getGrid(levelIndex);
  const speedMultiplier = enemySpeedMultiplier(levelNumber);
  return {
    levelIndex,
    levelNumber,
    seed,
    rngSeed: seed,
    player: createPlayerState(grid),
    collectables: createCollectablesState(grid),
    enemies: createEnemies(grid).map((enemy) => ({ ...enemy, speed: enemy.speed * speedMultiplier })),
    lives: START_LIVES,
    elapsedMs: 0,
    levelComplete: false,
    gameOver: false,
    empoweredTicksRemaining: 0,
    freezeEnemies,
  };
}

/**
 * Advances from a completed level to the next one, carrying score and lives
 * forward and resetting everything else (collectables, player, enemies,
 * empowerment) for the next map - cycling back through LEVELS when there are
 * fewer maps than the next level number calls for. Pure and DOM-free.
 */
export function advanceLevel(state: GameState): GameState {
  if (!state.levelComplete) {
    throw new Error('advanceLevel can only be called once the current level is complete');
  }

  const nextLevelIndex = (state.levelIndex + 1) % LEVELS.length;
  const next = createInitialState(nextLevelIndex, state.seed, state.levelNumber + 1, state.freezeEnemies);

  return {
    ...next,
    lives: state.lives,
    collectables: { ...next.collectables, score: state.collectables.score },
  };
}

/**
 * Advances the game by one fixed timestep. Pure and deterministic: the same
 * (state, input, dtMs) always produces the same resulting state.
 */
export function step(state: GameState, input: InputState, dtMs: number): GameState {
  if (state.levelComplete || state.gameOver) return state;

  const grid = getGrid(state.levelIndex);
  const distanceTiles = (state.player.speed * dtMs) / 1000;
  const movedPlayer = stepPlayer(grid, state.player, input.direction, distanceTiles);
  const playerTile = { col: Math.round(movedPlayer.pos.x), row: Math.round(movedPlayer.pos.y) };

  const rng = mulberry32(state.rngSeed);
  const enemyContext = { playerTile, playerDirection: movedPlayer.direction };
  const movedEnemies = state.freezeEnemies
    ? state.enemies
    : state.enemies.map((enemy) => stepEnemy(grid, enemy, enemyContext, rng, (enemy.speed * dtMs) / 1000));
  const rngSeed = Math.floor(rng() * 0xffffffff) >>> 0;

  const { state: collectedState, collected } = collectAt(grid, state.collectables, playerTile);
  const justEmpowered = collected === 'bloomburst';
  const empowered = state.empoweredTicksRemaining > 0 || justEmpowered;

  const collision = resolveCollisions(
    movedPlayer,
    movedEnemies,
    state.lives,
    grid.playerSpawn,
    grid.denTiles,
    empowered,
    grid.denDoor,
  );

  const collectables =
    collision.bonusScore > 0
      ? { ...collectedState, score: collectedState.score + collision.bonusScore }
      : collectedState;

  const empoweredTicksRemaining = justEmpowered
    ? bloomburstDurationTicks(state.levelNumber)
    : Math.max(0, state.empoweredTicksRemaining - 1);

  return {
    ...state,
    player: collision.player,
    enemies: collision.enemies,
    collectables,
    lives: collision.lives,
    gameOver: collision.gameOver,
    rngSeed,
    elapsedMs: state.elapsedMs + dtMs,
    levelComplete: isLevelComplete(collectables),
    empoweredTicksRemaining,
  };
}
