/**
 * Original synthesized sound effects for Glimmerdash, built entirely from
 * Web Audio oscillators - no audio files, no sampled/copyrighted material.
 * The AudioContext is created lazily on the first user gesture (autoplay
 * policies block unrequested audio), and every public function fails
 * silently if Web Audio is unavailable so the game keeps running.
 */

const MUTE_STORAGE_KEY = 'glimmerdash.muted';

let audioCtx: AudioContext | null = null;
let attemptedInit = false;
let muted = loadMutedPreference();

function loadMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistMutedPreference(value: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable (e.g. private browsing quota) - preference just
    // won't survive a reload, which is not worth failing over.
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  persistMutedPreference(value);
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

/**
 * Must be called from inside a user-gesture handler (keydown/click). Safe to
 * call repeatedly - only the first call actually constructs the context.
 */
export function unlockAudio(): void {
  if (attemptedInit) {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => undefined);
    }
    return;
  }
  attemptedInit = true;
  try {
    const AudioCtor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    audioCtx = new AudioCtor();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => undefined);
    }
  } catch {
    audioCtx = null;
  }
}

function playTone(freq: number, startOffsetSec: number, durationSec: number, type: OscillatorType, peakGain: number): void {
  if (!audioCtx || muted) return;
  try {
    const startAt = audioCtx.currentTime + startOffsetSec;
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(startAt + durationSec + 0.05);
  } catch {
    // Web Audio can throw in some headless/embedded contexts; never let a
    // sound effect crash the game loop.
  }
}

/** Short blip for an ordinary pellet/power-pellet pickup. */
export function playPickup(): void {
  playTone(880, 0, 0.08, 'square', 0.15);
}

/** Rising three-note sting for collecting a Bloomburst (empowerment start). */
export function playPowerUp(): void {
  playTone(440, 0, 0.1, 'sawtooth', 0.16);
  playTone(660, 0.07, 0.12, 'sawtooth', 0.16);
  playTone(880, 0.14, 0.16, 'sawtooth', 0.16);
}

/** Quick bright chime for defeating a Duskwisp while empowered. */
export function playDefeat(): void {
  playTone(1200, 0, 0.06, 'square', 0.2);
  playTone(1600, 0.05, 0.09, 'square', 0.2);
}

/** Descending tone for losing a life. */
export function playLifeLost(): void {
  playTone(440, 0, 0.12, 'sawtooth', 0.2);
  playTone(330, 0.1, 0.12, 'sawtooth', 0.2);
  playTone(220, 0.2, 0.2, 'sawtooth', 0.2);
}

/** Short ascending jingle for clearing a level. */
export function playLevelComplete(): void {
  const notes = [523.25, 659.25, 784.0, 1046.5];
  notes.forEach((freq, i) => playTone(freq, i * 0.12, 0.16, 'triangle', 0.2));
}

/** Low descending tone for game over. */
export function playGameOver(): void {
  playTone(300, 0, 0.2, 'sawtooth', 0.2);
  playTone(220, 0.18, 0.2, 'sawtooth', 0.2);
  playTone(140, 0.36, 0.4, 'sawtooth', 0.2);
}
