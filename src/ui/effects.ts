/**
 * Purely cosmetic, time-based particle/text effects layered over the canvas
 * render. Effects never read or write GameState - they only know tile-space
 * coordinates, a start time (performance.now()), and a duration - so they
 * cannot feed back into the deterministic simulation.
 */

export type EffectKind = 'ring' | 'burst' | 'popup';

interface Effect {
  kind: EffectKind;
  x: number;
  y: number;
  color: string;
  text?: string;
  startedAtMs: number;
  durationMs: number;
}

const effects: Effect[] = [];

/** Expanding ring, e.g. for a pellet/Bloomburst pickup. */
export function spawnRing(x: number, y: number, color: string, nowMs: number): void {
  effects.push({ kind: 'ring', x, y, color, startedAtMs: nowMs, durationMs: 420 });
}

/** Small outward particle burst, e.g. for a power-pellet pickup. */
export function spawnBurst(x: number, y: number, color: string, nowMs: number): void {
  effects.push({ kind: 'burst', x, y, color, startedAtMs: nowMs, durationMs: 380 });
}

/** Floating text that rises and fades, e.g. a "+150" enemy-defeat popup. */
export function spawnPopup(x: number, y: number, text: string, color: string, nowMs: number): void {
  effects.push({ kind: 'popup', x, y, text, color, startedAtMs: nowMs, durationMs: 900 });
}

export function clearEffects(): void {
  effects.length = 0;
}

export function drawEffects(ctx: CanvasRenderingContext2D, tileSizePx: number, nowMs: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    const t = (nowMs - effect.startedAtMs) / effect.durationMs;
    if (t >= 1) {
      effects.splice(i, 1);
      continue;
    }

    const cx = effect.x * tileSizePx + tileSizePx / 2;
    const cy = effect.y * tileSizePx + tileSizePx / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = effect.color;
    ctx.strokeStyle = effect.color;

    if (effect.kind === 'ring') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + t * 14, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.kind === 'burst') {
      const particleCount = 6;
      const dist = t * tileSizePx * 0.9;
      for (let p = 0; p < particleCount; p++) {
        const angle = (p / particleCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (effect.kind === 'popup') {
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(effect.text ?? '', cx, cy - t * 22);
    }

    ctx.restore();
  }
}
