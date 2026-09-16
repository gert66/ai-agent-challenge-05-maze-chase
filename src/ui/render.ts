import type { Vec2 } from '../core/types';

/**
 * Interpolates a tile-space position between the previous and current
 * simulation tick by `alpha` (0..1, the fixed-timestep accumulator's leftover
 * fraction), so rendering looks smooth at 60fps even though the simulation
 * itself advances in discrete tiles-per-tick steps.
 *
 * Teleports - the horizontal tunnel wrap, or a life-lost respawn snapping an
 * entity back to its spawn tile - must never be interpolated across (that
 * would draw a streak sweeping across the whole maze), so any jump larger
 * than a single tick could plausibly cover is rendered as an instant snap to
 * the current position instead.
 */
export function interpolatePos(prev: Vec2, curr: Vec2, alpha: number, gridWidth: number): Vec2 {
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;

  const wrapped = Math.abs(dx) > gridWidth / 2;
  const teleported = Math.abs(dx) > 1 || Math.abs(dy) > 1;
  if (wrapped || teleported) return { x: curr.x, y: curr.y };

  const t = Math.min(1, Math.max(0, alpha));
  return { x: prev.x + dx * t, y: prev.y + dy * t };
}
