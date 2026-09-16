import { describe, expect, it } from 'vitest';
import { resolveCollisions } from '../../src/core/collisions';
import type { EnemyState, PlayerState } from '../../src/core/types';

const playerSpawn = { col: 11, row: 24 };
const enemySpawns = [
  { col: 10, row: 12 },
  { col: 11, row: 12 },
  { col: 12, row: 12 },
];

function makePlayer(pos: { x: number; y: number }): PlayerState {
  return { pos, direction: 'left', queuedDirection: 'none', speed: 6 };
}

function makeEnemy(id: string, pos: { x: number; y: number }, inDen = false): EnemyState {
  return { id: id as EnemyState['id'], pos, direction: 'right', behaviour: 'chase', speed: 5, inDen, patrolIndex: 2 };
}

describe('resolveCollisions', () => {
  it('leaves state untouched when no enemy shares the player tile', () => {
    const player = makePlayer({ x: 5, y: 5 });
    const enemies = [makeEnemy('ember', { x: 5, y: 6 }), makeEnemy('frost', { x: 6, y: 5 })];

    const result = resolveCollisions(player, enemies, 3, playerSpawn, enemySpawns);

    expect(result.collided).toBe(false);
    expect(result.lives).toBe(3);
    expect(result.gameOver).toBe(false);
    expect(result.player).toBe(player);
    expect(result.enemies).toBe(enemies);
  });

  it('decrements lives and resets the player and every enemy to their spawns on overlap', () => {
    const player = makePlayer({ x: 5, y: 5 });
    const enemies = [makeEnemy('ember', { x: 5, y: 5 }), makeEnemy('frost', { x: 8, y: 8 })];

    const result = resolveCollisions(player, enemies, 3, playerSpawn, enemySpawns);

    expect(result.collided).toBe(true);
    expect(result.lives).toBe(2);
    expect(result.gameOver).toBe(false);
    expect(result.player.pos).toEqual({ x: playerSpawn.col, y: playerSpawn.row });
    expect(result.player.direction).toBe('none');
    expect(result.enemies[0].pos).toEqual({ x: enemySpawns[0].col, y: enemySpawns[0].row });
    expect(result.enemies[1].pos).toEqual({ x: enemySpawns[1].col, y: enemySpawns[1].row });
    expect(result.enemies.every((e) => e.inDen)).toBe(true);
    expect(result.enemies.every((e) => e.patrolIndex === 0)).toBe(true);
  });

  it('detects an overlap caused by any of several enemies, not just the first', () => {
    const player = makePlayer({ x: 3, y: 3 });
    const enemies = [makeEnemy('ember', { x: 1, y: 1 }), makeEnemy('marsh', { x: 3, y: 3 })];

    const result = resolveCollisions(player, enemies, 3, playerSpawn, enemySpawns);

    expect(result.collided).toBe(true);
  });

  it('flags game over once the last life is lost on collision', () => {
    const player = makePlayer({ x: 5, y: 5 });
    const enemies = [makeEnemy('ember', { x: 5, y: 5 })];

    const result = resolveCollisions(player, enemies, 1, playerSpawn, enemySpawns);

    expect(result.lives).toBe(0);
    expect(result.gameOver).toBe(true);
  });

  it('reports game over when already out of lives, even without a fresh collision', () => {
    const player = makePlayer({ x: 5, y: 5 });
    const enemies = [makeEnemy('ember', { x: 9, y: 9 })];

    const result = resolveCollisions(player, enemies, 0, playerSpawn, enemySpawns);

    expect(result.collided).toBe(false);
    expect(result.gameOver).toBe(true);
  });
});
