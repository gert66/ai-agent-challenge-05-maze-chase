import { describe, expect, it } from 'vitest';
import { findPath, nextStepTowards } from '../../src/core/pathfinding';
import { parseLevel } from '../../src/core/grid';

/**
 * Same fixture shape as tests/core/enemies.test.ts: a 4-tile den with a
 * single door at (4,2) opening onto the room above it, and a 3-tile den
 * row (non-door) at row 3 that blocks a straight route from (4,1) to (4,4).
 */
const MAIN_FIXTURE_ROWS = [
  '#########',
  '#.......#',
  '#.##G##.#',
  '#.#GGG#.#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#P......#',
  '#########',
];
const mainGrid = parseLevel(MAIN_FIXTURE_ROWS);

/** A fixture with a horizontal tunnel row (both edges open and wrapping). */
const TUNNEL_FIXTURE_ROWS = [
  '#########',
  '#.......#',
  '#.#####.#',
  'T.......T',
  '#.......#',
  '#P.....G#',
  '#########',
];
const tunnelGrid = parseLevel(TUNNEL_FIXTURE_ROWS);

/** Two rooms with no opening between them anywhere - genuinely disconnected. */
const DISCONNECTED_FIXTURE_ROWS = ['#########', '#P..#...#', '#...#...#', '#...#...#', '#...#..G#', '#########'];
const disconnectedGrid = parseLevel(DISCONNECTED_FIXTURE_ROWS);

describe('findPath - straight corridor', () => {
  it('returns the unique shortest tile sequence along an open corridor', () => {
    const path = findPath(mainGrid, { col: 1, row: 1 }, { col: 7, row: 1 });
    expect(path).toEqual([
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 3, row: 1 },
      { col: 4, row: 1 },
      { col: 5, row: 1 },
      { col: 6, row: 1 },
      { col: 7, row: 1 },
    ]);
  });
});

describe('findPath - detour around a wall/den obstruction', () => {
  it('matches the hand-counted shortest length when the direct route is blocked', () => {
    // Direct route (4,1)->(4,2)->(4,3)->(4,4) is blocked: (4,2) is the den
    // door (a dead end under forbidDen) and (4,3) is a forbidden den tile.
    // The true shortest route goes around via column 1 or column 7: 9 edges,
    // 10 tiles - hand-counted by tracing the maze.
    const path = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 });
    expect(path).not.toBeNull();
    expect(path).toHaveLength(10);
  });

  it('picks the fixed-order tie-break deterministically (left side of the two equal-length routes)', () => {
    const path = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 });
    expect(path?.[1]).toEqual({ col: 3, row: 1 });
  });
});

describe('findPath - unreachable target', () => {
  it('returns null when no route exists between two disconnected rooms', () => {
    const path = findPath(disconnectedGrid, { col: 1, row: 1 }, { col: 6, row: 2 });
    expect(path).toBeNull();
  });
});

describe('findPath - from equals to', () => {
  it('returns a trivial single-tile path', () => {
    const path = findPath(mainGrid, { col: 4, row: 4 }, { col: 4, row: 4 });
    expect(path).toEqual([{ col: 4, row: 4 }]);
  });
});

describe('findPath - horizontal tunnel wrap', () => {
  it('uses the wrap edge when it is shorter than crossing the row directly', () => {
    const direct = 7 - 1; // naive straight-through distance, for comparison only
    const path = findPath(tunnelGrid, { col: 1, row: 3 }, { col: 7, row: 3 });
    expect(path).not.toBeNull();
    expect(path).toHaveLength(4);
    expect(path!.length - 1).toBeLessThan(direct);
    expect(path).toEqual([
      { col: 1, row: 3 },
      { col: 0, row: 3 },
      { col: 8, row: 3 },
      { col: 7, row: 3 },
    ]);
  });
});

describe('findPath - den avoidance', () => {
  it('excludes non-door den tiles by default', () => {
    const path = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 });
    const blocked = [
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 5, row: 3 },
    ];
    for (const tile of blocked) {
      expect(path).not.toContainEqual(tile);
    }
  });

  it('excludes non-door den tiles when forbidDen is explicitly true', () => {
    const path = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 }, { forbidDen: true });
    expect(path).toHaveLength(10);
  });

  it('allows cutting straight through the den when forbidDen is false', () => {
    const path = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 }, { forbidDen: false });
    expect(path).toEqual([
      { col: 4, row: 1 },
      { col: 4, row: 2 },
      { col: 4, row: 3 },
      { col: 4, row: 4 },
    ]);
  });
});

describe('findPath - determinism', () => {
  it('returns an identical array across repeated calls with the same arguments', () => {
    const a = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 });
    const b = findPath(mainGrid, { col: 4, row: 1 }, { col: 4, row: 4 });
    expect(a).toEqual(b);
  });
});

describe('nextStepTowards', () => {
  it('returns the direction of the first step of findPath', () => {
    const path = findPath(mainGrid, { col: 1, row: 1 }, { col: 7, row: 1 });
    const direction = nextStepTowards(mainGrid, { col: 1, row: 1 }, { col: 7, row: 1 });
    expect(path).not.toBeNull();
    expect(direction).toBe('right');
  });

  it('returns null when the target is unreachable', () => {
    const direction = nextStepTowards(disconnectedGrid, { col: 1, row: 1 }, { col: 6, row: 2 });
    expect(direction).toBeNull();
  });

  it('returns null when already at the target', () => {
    const direction = nextStepTowards(mainGrid, { col: 4, row: 4 }, { col: 4, row: 4 });
    expect(direction).toBeNull();
  });
});
