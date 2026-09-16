import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';
import { createInitialState, step } from '../../src/core/state';
import { PELLET_SCORE } from '../../src/core/collectables';

describe('createInitialState', () => {
  it('places the player at the spawn tile with a full pellet count and no score', () => {
    const grid = parseLevel(LEVELS[0].rows);
    const state = createInitialState(0, 42);
    expect(state.player.pos).toEqual({ x: grid.playerSpawn.col, y: grid.playerSpawn.row });
    expect(state.collectables.score).toBe(0);
    expect(state.levelComplete).toBe(false);
    expect(state.elapsedMs).toBe(0);
  });

  it('spawns four Duskwisps in the den with three lives and no game over', () => {
    const state = createInitialState(0, 42);
    expect(state.enemies).toHaveLength(4);
    expect(state.enemies.every((enemy) => enemy.inDen)).toBe(true);
    expect(state.lives).toBe(3);
    expect(state.gameOver).toBe(false);
  });
});

describe('step', () => {
  it('moves the player and collects the pellet it lands on', () => {
    const state = createInitialState(0, 1);
    // Speed is 6 tiles/sec, so 500ms moves exactly three tiles left from
    // spawn, landing on a plain pellet tile.
    const next = step(state, { direction: 'left' }, 500);
    expect(next.player.pos).toEqual({ x: state.player.pos.x - 3, y: state.player.pos.y });
    expect(next.collectables.score).toBe(PELLET_SCORE);
    expect(next.elapsedMs).toBe(500);
  });

  it('does not advance once the level is already complete', () => {
    const state = createInitialState(0, 1);
    const finished = {
      ...state,
      levelComplete: true,
      collectables: { ...state.collectables, pelletsRemaining: 0, powerPelletsRemaining: 0 },
    };
    const next = step(finished, { direction: 'left' }, 1000);
    expect(next).toBe(finished);
  });

  it('flags level completion once the last pellet is collected', () => {
    const state = createInitialState(0, 1);
    const almostDone = {
      ...state,
      collectables: { ...state.collectables, pelletsRemaining: 1, powerPelletsRemaining: 0 },
    };
    // Moving left from spawn collects the one remaining pellet.
    const next = step(almostDone, { direction: 'left' }, 1000);
    expect(next.levelComplete).toBe(true);
  });

  it('resolves a player-enemy collision each tick: loses a life and resets both to their spawns', () => {
    const state = createInitialState(0, 42);
    const grid = parseLevel(LEVELS[0].rows);
    // Put one Duskwisp directly on the player's tile, out of the den, so this
    // tick's collision check (dt=0, no movement) detects the overlap.
    const withCollision = {
      ...state,
      enemies: state.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, pos: { ...state.player.pos }, inDen: false } : enemy,
      ),
    };

    const next = step(withCollision, { direction: 'none' }, 0);

    expect(next.lives).toBe(2);
    expect(next.gameOver).toBe(false);
    expect(next.player.pos).toEqual({ x: grid.playerSpawn.col, y: grid.playerSpawn.row });
    expect(next.enemies[0].inDen).toBe(true);
  });

  it('ends the game once the last life is lost to a collision', () => {
    const state = createInitialState(0, 42);
    const withOneLifeAndCollision = {
      ...state,
      lives: 1,
      enemies: state.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, pos: { ...state.player.pos }, inDen: false } : enemy,
      ),
    };

    const next = step(withOneLifeAndCollision, { direction: 'none' }, 0);

    expect(next.lives).toBe(0);
    expect(next.gameOver).toBe(true);
  });
});
