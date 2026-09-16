import { describe, expect, it } from 'vitest';
import { accumulateTicks } from '../../src/core/loop';

describe('accumulateTicks', () => {
  it('runs no ticks and keeps the full delta when less than one step has elapsed', () => {
    const result = accumulateTicks(0, 5, 20, 10);
    expect(result).toEqual({ ticks: 0, remainderMs: 5 });
  });

  it('runs exactly one tick and zeroes the remainder for an exact-step delta', () => {
    const result = accumulateTicks(0, 20, 20, 10);
    expect(result).toEqual({ ticks: 1, remainderMs: 0 });
  });

  it('carries a partial remainder into the next frame', () => {
    const result = accumulateTicks(0, 45, 20, 10);
    expect(result).toEqual({ ticks: 2, remainderMs: 5 });
  });

  it('adds the previous remainder to this frame delta before ticking', () => {
    const result = accumulateTicks(15, 10, 20, 10);
    expect(result).toEqual({ ticks: 1, remainderMs: 5 });
  });

  it('caps ticks per frame and discards owed time beyond the cap to avoid a spiral of death', () => {
    // 1000ms owed at a 20ms step would be 50 ticks; capped to 10, and the
    // remaining 800ms beyond the cap must be dropped, not carried forward,
    // or the simulation would permanently lag behind wall-clock time.
    const result = accumulateTicks(0, 1000, 20, 10);
    expect(result.ticks).toBe(10);
    expect(result.remainderMs).toBe(0);
  });

  it('treats a negative frame delta (clock irregularities) as zero', () => {
    const result = accumulateTicks(5, -50, 20, 10);
    expect(result).toEqual({ ticks: 0, remainderMs: 5 });
  });
});
