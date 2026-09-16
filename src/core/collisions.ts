/**
 * Player-enemy collision detection and resolution. Power-ups/frightened
 * mode are out of scope here: any tile overlap between the player and a
 * Duskwisp always costs a life and resets both back to their spawns.
 */

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
}

/**
 * Checks the player's tile against every enemy's tile. On overlap,
 * decrements `lives`, resets the player to `playerSpawn`, and resets every
 * enemy to its den spawn tile (cycling through `enemySpawns` by index, the
 * same scheme createEnemies uses). Pure: returns new player/enemy state,
 * never mutates its inputs.
 */
export function resolveCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  lives: number,
  playerSpawn: TilePos,
  enemySpawns: TilePos[],
): CollisionResult {
  const playerTile = tileOf(player.pos);
  const collided = enemies.some((enemy) => sameTile(tileOf(enemy.pos), playerTile));

  if (!collided) {
    return { player, enemies, lives, gameOver: lives <= 0, collided: false };
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
  };
}
