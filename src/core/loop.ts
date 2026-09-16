/**
 * Fixed-timestep accumulator for driving `state.step()` from a variable-rate
 * `requestAnimationFrame` loop. Pure and DOM-free so it can be unit tested
 * directly: given how much simulated time is still owed plus how long the
 * last rendered frame took, it reports how many fixed-size ticks to run now
 * and how much partial time is left over for next frame.
 */

export interface AccumulatorResult {
  /** Number of fixed-size simulation ticks to run this frame. */
  ticks: number;
  /** Leftover simulated time (ms), carried into the next frame. */
  remainderMs: number;
}

/**
 * `maxTicksPerFrame` guards against the "spiral of death": if a frame took
 * far longer than usual (e.g. the tab was backgrounded), owed time is capped
 * rather than run in full, and the excess beyond the cap is discarded - not
 * carried forward - so the simulation catches back up to wall-clock time
 * instead of permanently lagging behind it.
 */
export function accumulateTicks(
  remainderMs: number,
  frameDeltaMs: number,
  stepMs: number,
  maxTicksPerFrame: number,
): AccumulatorResult {
  let owed = remainderMs + Math.max(0, frameDeltaMs);
  let ticks = 0;
  while (owed >= stepMs && ticks < maxTicksPerFrame) {
    owed -= stepMs;
    ticks++;
  }
  if (ticks === maxTicksPerFrame) {
    owed = owed % stepMs;
  }
  return { ticks, remainderMs: owed };
}
