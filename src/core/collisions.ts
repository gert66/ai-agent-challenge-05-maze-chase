/**
 * Player-enemy collision detection and resolution.
 *
 * Normal mode: any tile overlap between the player and a Duskwisp costs a
 * life and resets both the player and every enemy back to their spawns.
 *
 * Empowered mode (active for a fixed number of game steps after collecting a
 * Bloomburst - see state.ts/theme.ts): an overlap instead defeats the
 * colliding enemy/enemies. Each defeated enemy is sent back to the den door
 * (deterministically, no life lost) and the player earns a fixed bonus score
 * per enemy defeated. Enemies that are not touching the player are left
 * untouched, unlike the normal-mode reset-everyone behaviour.
 */

import { BLOOMBURST_DEFEAT_SCORE } from './theme';
import type { EnemyState, PlayerState, TilePos } from './types';

function tileOf(pos: { x: number; y: number }): TilePos {
  return { col: Math.round(pos.x), row: Math.round(pos.y) };
}

function sameTile(a: TilePos, b: TilePos): boolean {
  return a.col === b.col && a.row === b.row;
}

export interface CollisionResult {
  player: PlayerState;
  enemies: EnemyState[];
  lives: number;
  gameOver: boolean;
  collided: boolean;
  /** Score earned this tick from defeating enemies while empowered. */
  bonusScore: number;
}

/**
 * Checks the player's tile against every enemy's tile.
 *
 * When `empowered` is false (the default), any overlap decrements `lives`,
 * resets the player to `playerSpawn`, and resets every enemy to its den
 * spawn tile (cycling through `enemySpawns` by index, the same scheme
 * createEnemies uses).
 *
 * When `empowered` is true, only the enemy/enemies sharing the player's tile
 * are affected: each is sent back to `denDoor` (falling back to the first
 * `enemySpawns` entry if no door is given) and marked `inDen`, the player
 * keeps its position and lives, and `bonusScore` is
 * `BLOOMBURST_DEFEAT_SCORE` times the number of enemies defeated this tick.
 *
 * Pure: returns new player/enemy state, never mutates its inputs.
 */
export function resolveCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  lives: number,
  playerSpawn: TilePos,
  enemySpawns: TilePos[],
  empowered = false,
  denDoor?: TilePos,
): CollisionResult {
  const playerTile = tileOf(player.pos);
  const collidedIndexes = enemies.reduce<number[]>((indexes, enemy, index) => {
    if (sameTile(tileOf(enemy.pos), playerTile)) indexes.push(index);
    return indexes;
  }, []);

  if (collidedIndexes.length === 0) {
    return { player, enemies, lives, gameOver: lives <= 0, collided: false, bonusScore: 0 };
  }

  if (empowered) {
    const respawnPoint = denDoor ?? enemySpawns[0];
    const enemiesAfterDefeat = enemies.map((enemy, index) => {
      if (!collidedIndexes.includes(index)) return enemy;
      return {
        ...enemy,
        pos: { x: respawnPoint.col, y: respawnPoint.row },
        direction: 'none' as const,
        inDen: true,
        patrolIndex: 0,
      };
    });

    return {
      player,
      enemies: enemiesAfterDefeat,
      lives,
      gameOver: lives <= 0,
      collided: true,
      bonusScore: BLOOMBURST_DEFEAT_SCORE * collidedIndexes.length,
    };
  }

  const nextLives = lives - 1;

  const resetPlayer: PlayerState = {
    ...player,
    pos: { x: playerSpawn.col, y: playerSpawn.row },
    direction: 'none',
    queuedDirection: 'none',
  };

  const resetEnemies = enemies.map((enemy, index) => {
    const spawn = enemySpawns[index % enemySpawns.length];
    return {
      ...enemy,
      pos: { x: spawn.col, y: spawn.row },
      direction: 'none' as const,
      inDen: true,
      patrolIndex: 0,
    };
  });

  return {
    player: resetPlayer,
    enemies: resetEnemies,
    lives: nextLives,
    gameOver: nextLives <= 0,
    collided: true,
    bonusScore: 0,
  };
}
