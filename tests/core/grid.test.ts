import { describe, expect, it } from 'vitest';
import { isWall, neighbours, parseLevel, reachableTiles } from '../../src/core/grid';
import { LEVELS } from '../../src/core/levels';

const grid = parseLevel(LEVELS[0].rows);

describe('parseLevel', () => {
  it('parses the declared width and height', () => {
    expect(grid.width).toBe(23);
    expect(grid.height).toBe(27);
  });

  it('locates the player spawn tile', () => {
    expect(grid.playerSpawn).toEqual({ col: 11, row: 24 });
  });

  it('locates a den anchor tile for enemy spawns', () => {
    expect(grid.tiles[grid.denSpawn.row][grid.denSpawn.col]).toBe('den');
  });

  it('rejects rows of inconsistent width', () => {
    expect(() => parseLevel(['##', '#'])).toThrow();
  });

  it('rejects an unknown tile character', () => {
    expect(() => parseLevel(['#P#', '#X#', '#G#'])).toThrow();
  });
});

describe('wall blocking', () => {
  it('flags pillar tiles as walls', () => {
    expect(isWall(grid, 3, 3)).toBe(true);
  });

  it('does not flag floor tiles next to a pillar as walls', () => {
    expect(isWall(grid, 2, 3)).toBe(false);
  });

  it('excludes walled-off tiles from neighbours', () => {
    const result = neighbours(grid, { col: 2, row: 3 });
    expect(result).not.toContainEqual({ col: 3, row: 3 });
  });
});

describe('horizontal tunnel wrap', () => {
  it('wraps neighbours across the tunnel row', () => {
    const result = neighbours(grid, { col: 0, row: 13 });
    expect(result).toContainEqual({ col: 22, row: 13 });
    expect(result).toContainEqual({ col: 1, row: 13 });
  });

  it('does not wrap on a non-tunnel row', () => {
    const result = neighbours(grid, { col: 0, row: 5 });
    expect(result).not.toContainEqual({ col: 22, row: 5 });
  });
});

describe('connectivity', () => {
  it('reaches every non-wall tile (including every pellet) from the player spawn', () => {
    const reached = reachableTiles(grid, grid.playerSpawn);

    let totalWalkable = 0;
    let reachedWalkable = 0;
    let totalPellets = 0;
    let reachedPellets = 0;
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const tile = grid.tiles[row][col];
        if (tile === 'wall') continue;
        totalWalkable++;
        const isReached = reached.has(`${col},${row}`);
        if (isReached) reachedWalkable++;
        if (tile === 'pellet' || tile === 'power-pellet') {
          totalPellets++;
          if (isReached) reachedPellets++;
        }
      }
    }

    expect(totalPellets).toBeGreaterThan(0);
    expect(reachedPellets).toBe(totalPellets);
    expect(reachedWalkable).toBe(totalWalkable);
  });
});
