import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';
import { createPlayerState, stepPlayer } from '../../src/core/player';
import type { PlayerState } from '../../src/core/types';

const grid = parseLevel(LEVELS[0].rows);

describe('createPlayerState', () => {
  it('starts exactly at the level spawn tile with no movement', () => {
    const player = createPlayerState(grid);
    expect(player.pos).toEqual({ x: grid.playerSpawn.col, y: grid.playerSpawn.row });
    expect(player.direction).toBe('none');
  });
});

describe('stepPlayer', () => {
  it('moves one full tile per second of travel at the configured speed', () => {
    const player = createPlayerState(grid);
    const moved = stepPlayer(grid, player, 'left', 1);
    expect(moved.pos).toEqual({ x: grid.playerSpawn.col - 1, y: grid.playerSpawn.row });
    expect(moved.direction).toBe('left');
  });

  it('refuses to move into a wall and stops', () => {
    const blocked: PlayerState = {
      pos: { x: 2, y: 3 },
      direction: 'none',
      queuedDirection: 'none',
      speed: 6,
    };
    const result = stepPlayer(grid, blocked, 'right', 0.5);
    expect(result.pos).toEqual({ x: 2, y: 3 });
    expect(result.direction).toBe('none');
  });

  it('keeps moving straight when the buffered turn is not yet legal', () => {
    const travelling: PlayerState = {
      pos: { x: 9, y: 6 },
      direction: 'right',
      queuedDirection: 'none',
      speed: 6,
    };
    // "down" is illegal at columns 9-13 on row 6 (a pillar sits at row 7); the
    // player should keep travelling right instead of stalling.
    const result = stepPlayer(grid, travelling, 'down', 2);
    expect(result.pos).toEqual({ x: 11, y: 6 });
    expect(result.direction).toBe('right');
  });

  it('applies a buffered turn as soon as it becomes legal at a tile centre', () => {
    const travelling: PlayerState = {
      pos: { x: 9, y: 6 },
      direction: 'right',
      queuedDirection: 'none',
      speed: 6,
    };
    // At column 14 the pillar ends, so "down" becomes legal; the remaining
    // 0.5 tiles of travel should continue downward after the turn.
    const result = stepPlayer(grid, travelling, 'down', 5.5);
    expect(result.direction).toBe('down');
    expect(result.pos).toEqual({ x: 14, y: 6.5 });
  });

  it('wraps through the horizontal tunnel', () => {
    const atTunnel: PlayerState = {
      pos: { x: 0, y: 13 },
      direction: 'left',
      queuedDirection: 'none',
      speed: 6,
    };
    const result = stepPlayer(grid, atTunnel, 'left', 1);
    expect(result.pos).toEqual({ x: 22, y: 13 });
  });
});
