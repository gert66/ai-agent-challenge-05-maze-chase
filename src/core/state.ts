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

export function createInitialState(levelIndex: number, seed: number): GameState {
  const grid = getGrid(levelIndex);
  return {
    levelIndex,
    seed,
    rngSeed: seed,
    player: createPlayerState(grid),
    collectables: createCollectablesState(grid),
    enemies: createEnemies(grid),
    lives: START_LIVES,
    elapsedMs: 0,
    levelComplete: false,
    gameOver: false,
    empoweredTicksRemaining: 0,
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
  const movedEnemies = state.enemies.map((enemy) =>
    stepEnemy(grid, enemy, enemyContext, rng, (enemy.speed * dtMs) / 1000),
  );
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
    ? BLOOMBURST_DURATION_TICKS
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
