import { describe, expect, it } from 'vitest';
import {
  ambushTargetTile,
  chooseDirectionTowards,
  chooseWanderDirection,
  computeEnemyTarget,
  createEnemies,
  scatterCorners,
  stepEnemy,
} from '../../src/core/enemies';
import { parseLevel } from '../../src/core/grid';
import { mulberry32 } from '../../src/core/rng';
import type { EnemyState } from '../../src/core/types';

/**
 * A small, purpose-built fixture maze (independent of the real Hollow
 * Garden level) with a 4-tile den: a single door tile at (4,2) that opens
 * onto the room above, and a 3-tile den row below it at row 3.
 */
const FIXTURE_ROWS = [
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

const grid = parseLevel(FIXTURE_ROWS);

function baseEnemy(overrides: Partial<EnemyState>): EnemyState {
  return {
    id: 'ember',
    pos: { x: 0, y: 0 },
    direction: 'none',
    behaviour: 'chase',
    speed: 5,
    inDen: false,
    patrolIndex: 0,
    ...overrides,
  };
}

describe('createEnemies', () => {
  it('spawns four Duskwisps inside the den, each with a distinct name and behaviour', () => {
    const enemies = createEnemies(grid);
    expect(enemies).toHaveLength(4);
    expect(enemies.map((e) => e.id)).toEqual(['ember', 'frost', 'marsh', 'dusk']);
    expect(enemies.map((e) => e.behaviour)).toEqual(['chase', 'scatter', 'ambush', 'wander']);
    for (const enemy of enemies) {
      expect(enemy.inDen).toBe(true);
      expect(grid.tiles[Math.round(enemy.pos.y)][Math.round(enemy.pos.x)]).toBe('den');
    }
  });
});

describe('chooseDirectionTowards (direct-chase style greedy stepping)', () => {
  it('picks the single legal direction that minimises distance to the target', () => {
    const rng = mulberry32(1);
    const direction = chooseDirectionTowards(grid, { col: 4, row: 4 }, 'none', { col: 4, row: 7 }, rng);
    expect(direction).toBe('down');
  });

  it('never reverses into the tile it just came from unless it is the only option', () => {
    const rng = mulberry32(1);
    // Travelling right through the open room with the target far to the left:
    // reversing would be the greedy choice, but a forward option (up/down) exists.
    const direction = chooseDirectionTowards(grid, { col: 4, row: 4 }, 'right', { col: 1, row: 4 }, rng);
    expect(direction).not.toBe('left');
  });
});

describe('PRNG-driven tie-breaking', () => {
  it('is deterministic for a given seed and can differ across seeds on a genuine tie', () => {
    // At (4,4) with target (4,4) itself, all four legal directions are
    // equally close (distance 1), so the pick is entirely down to the PRNG.
    const tile = { col: 4, row: 4 };
    const target = { col: 4, row: 4 };

    const pickA1 = chooseDirectionTowards(grid, tile, 'none', target, mulberry32(7));
    const pickA2 = chooseDirectionTowards(grid, tile, 'none', target, mulberry32(7));
    expect(pickA1).toBe(pickA2);
    expect(pickA1).toBe('up');

    const pickB = chooseDirectionTowards(grid, tile, 'none', target, mulberry32(1));
    expect(pickB).toBe('left');
    expect(pickB).not.toBe(pickA1);
  });
});

describe('chooseWanderDirection', () => {
  it('is deterministic for a given seed', () => {
    const tile = { col: 4, row: 4 };
    const first = chooseWanderDirection(grid, tile, 'none', mulberry32(7));
    const second = chooseWanderDirection(grid, tile, 'none', mulberry32(7));
    expect(first).toBe(second);
    expect(['up', 'down', 'left', 'right']).toContain(first);
  });
});

describe('ambushTargetTile (predictive behaviour)', () => {
  it('targets a tile ahead of the player along their current facing', () => {
    const target = ambushTargetTile(grid, { col: 4, row: 7 }, 'up', 4);
    expect(target).toEqual({ col: 4, row: 3 });
  });

  it('falls back to the nearest walkable tile short of the lookahead when it would land in a wall', () => {
    // Four tiles above (col 1, row 4) is row 0, which is solid wall for this
    // fixture; the ambush point should back off to the nearest open tile.
    const target = ambushTargetTile(grid, { col: 1, row: 4 }, 'up', 4);
    expect(target).toEqual({ col: 1, row: 1 });
  });

  it('falls back to the player tile itself when facing "none"', () => {
    const target = ambushTargetTile(grid, { col: 4, row: 4 }, 'none', 4);
    expect(target).toEqual({ col: 4, row: 4 });
  });
});

describe('scatterCorners (patrol/scatter behaviour)', () => {
  it('finds the nearest open tile to each of the four maze corners', () => {
    expect(scatterCorners(grid)).toEqual([
      { col: 1, row: 1 },
      { col: 7, row: 1 },
      { col: 7, row: 7 },
      { col: 1, row: 7 },
    ]);
  });
});

describe('computeEnemyTarget', () => {
  const context = { playerTile: { col: 4, row: 7 }, playerDirection: 'up' as const };

  it('targets the player tile directly for chase', () => {
    const enemy = baseEnemy({ behaviour: 'chase' });
    expect(computeEnemyTarget(grid, enemy, context)).toEqual({ col: 4, row: 7 });
  });

  it('targets a tile ahead of the player for ambush', () => {
    const enemy = baseEnemy({ behaviour: 'ambush' });
    expect(computeEnemyTarget(grid, enemy, context)).toEqual({ col: 4, row: 3 });
  });

  it('targets its current scatter corner and advances patrolIndex', () => {
    const enemy = baseEnemy({ behaviour: 'scatter', patrolIndex: 1 });
    expect(computeEnemyTarget(grid, enemy, context)).toEqual({ col: 7, row: 1 });
  });

  it('has no fixed target for wander', () => {
    const enemy = baseEnemy({ behaviour: 'wander' });
    expect(computeEnemyTarget(grid, enemy, context)).toBeNull();
  });
});

describe('stepEnemy - scatter patrol advancing between corners', () => {
  it('walks to the current corner then retargets the next one in the circuit', () => {
    const enemy = baseEnemy({ behaviour: 'scatter', pos: { x: 1, y: 2 }, patrolIndex: 0 });
    const context = { playerTile: { col: 4, row: 7 }, playerDirection: 'none' as const };

    const arrived = stepEnemy(grid, enemy, context, mulberry32(1), 1);
    expect(arrived.pos).toEqual({ x: 1, y: 1 });
    expect(arrived.patrolIndex).toBe(0);
    expect(arrived.direction).toBe('up');

    const retargeted = stepEnemy(grid, arrived, context, mulberry32(1), 0.001);
    expect(retargeted.patrolIndex).toBe(1);
    expect(retargeted.direction).toBe('right');
  });
});

describe('chase behaviour uses real pathfinding instead of only the greedy heuristic', () => {
  // From (4,1), the den door at (4,2) is one step closer (Manhattan distance)
  // to the target (4,4) than either side corridor, so the greedy heuristic
  // steps into the den - a dead end under den-avoidance, since the den's
  // only other tiles are blocked and require backtracking. The true
  // shortest route goes left (or right) around the den instead.
  it('the greedy heuristic alone would step toward the den dead end', () => {
    const rng = mulberry32(1);
    const greedy = chooseDirectionTowards(grid, { col: 4, row: 1 }, 'none', { col: 4, row: 4 }, rng);
    expect(greedy).toBe('down');
  });

  it('the chaser instead follows the BFS shortest path around the den', () => {
    const enemy = baseEnemy({ behaviour: 'chase', pos: { x: 4, y: 1 }, inDen: false });
    const context = { playerTile: { col: 4, row: 4 }, playerDirection: 'none' as const };

    const result = stepEnemy(grid, enemy, context, mulberry32(1), 1);

    expect(result.direction).not.toBe('down');
    expect(result.direction).toBe('left');
    expect(result.pos).toEqual({ x: 3, y: 1 });
  });
});

describe('stepEnemy - den-to-door exit', () => {
  it('paths through the door tile and resumes its normal behaviour once outside the den', () => {
    const enemy = baseEnemy({
      behaviour: 'chase',
      pos: { x: 4, y: 3 },
      inDen: true,
    });
    const context = { playerTile: { col: 7, row: 1 }, playerDirection: 'none' as const };

    const result = stepEnemy(grid, enemy, context, mulberry32(1), 3);

    expect(result.inDen).toBe(false);
    expect(result.pos).toEqual({ x: 5, y: 1 });
    expect(result.direction).toBe('right');
  });

  it('stays marked inDen while still standing on a den tile', () => {
    const enemy = baseEnemy({ behaviour: 'chase', pos: { x: 4, y: 3 }, inDen: true });
    const context = { playerTile: { col: 7, row: 1 }, playerDirection: 'none' as const };

    const result = stepEnemy(grid, enemy, context, mulberry32(1), 1);

    expect(result.inDen).toBe(true);
    expect(result.pos).toEqual({ x: 4, y: 2 });
  });
});
