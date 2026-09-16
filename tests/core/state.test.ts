import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';
import { createInitialState, step } from '../../src/core/state';
import { PELLET_SCORE, BLOOMBURST_SCORE } from '../../src/core/collectables';
import { BLOOMBURST_DEFEAT_SCORE, BLOOMBURST_DURATION_TICKS } from '../../src/core/theme';

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

  it('starts with no active Bloomburst empowerment', () => {
    const state = createInitialState(0, 42);
    expect(state.empoweredTicksRemaining).toBe(0);
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
      collectables: {
        ...state.collectables,
        pelletsRemaining: 1,
        powerPelletsRemaining: 0,
        bloomburstRemaining: 0,
      },
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

  it('enters the empowered state for a fixed duration after collecting a Bloomburst', () => {
    const state = createInitialState(0, 1);
    // (1, 24) holds a Bloomburst on the player's spawn row; start three
    // tiles east of it so 500ms (3 tiles at speed 6) lands exactly on it.
    const nearBloomburst = {
      ...state,
      player: { ...state.player, pos: { x: 4, y: 24 }, direction: 'left' as const },
    };

    const next = step(nearBloomburst, { direction: 'left' }, 500);

    expect(next.player.pos).toEqual({ x: 1, y: 24 });
    expect(next.collectables.score).toBe(BLOOMBURST_SCORE);
    expect(next.empoweredTicksRemaining).toBe(BLOOMBURST_DURATION_TICKS);
  });

  it('counts the empowered duration down by exactly one game step per tick', () => {
    const state = createInitialState(0, 1);
    const empowered = { ...state, empoweredTicksRemaining: BLOOMBURST_DURATION_TICKS };

    const next = step(empowered, { direction: 'none' }, 0);

    expect(next.empoweredTicksRemaining).toBe(BLOOMBURST_DURATION_TICKS - 1);
  });

  it('expires the empowered state after exactly BLOOMBURST_DURATION_TICKS ticks and never goes negative', () => {
    const state = createInitialState(0, 1);
    let current = { ...state, empoweredTicksRemaining: BLOOMBURST_DURATION_TICKS };

    for (let i = 0; i < BLOOMBURST_DURATION_TICKS; i++) {
      current = step(current, { direction: 'none' }, 0);
    }
    expect(current.empoweredTicksRemaining).toBe(0);

    const oneMoreTick = step(current, { direction: 'none' }, 0);
    expect(oneMoreTick.empoweredTicksRemaining).toBe(0);
  });

  it('resolves a collision while empowered as a defeat: bonus score, no life lost, enemy sent to the den door', () => {
    const state = createInitialState(0, 42);
    const grid = parseLevel(LEVELS[0].rows);
    const empoweredWithCollision = {
      ...state,
      empoweredTicksRemaining: BLOOMBURST_DURATION_TICKS,
      enemies: state.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, pos: { ...state.player.pos }, inDen: false } : enemy,
      ),
    };

    const next = step(empoweredWithCollision, { direction: 'none' }, 0);

    expect(next.lives).toBe(3);
    expect(next.gameOver).toBe(false);
    expect(next.collectables.score).toBe(BLOOMBURST_DEFEAT_SCORE);
    expect(next.player.pos).toEqual(state.player.pos);
    expect(next.enemies[0].pos).toEqual({ x: grid.denDoor.col, y: grid.denDoor.row });
    expect(next.enemies[0].inDen).toBe(true);
  });

  it('reverts to normal collision handling (life lost) once the empowered duration has expired', () => {
    const state = createInitialState(0, 42);
    const expiredWithCollision = {
      ...state,
      empoweredTicksRemaining: 0,
      enemies: state.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, pos: { ...state.player.pos }, inDen: false } : enemy,
      ),
    };

    const next = step(expiredWithCollision, { direction: 'none' }, 0);

    expect(next.lives).toBe(2);
    expect(next.collectables.score).toBe(0);
  });
});
