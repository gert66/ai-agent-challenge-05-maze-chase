import './style.css';
import type { Grid } from './core/grid';
import { parseLevel } from './core/grid';
import { LEVELS } from './core/levels';
import { accumulateTicks } from './core/loop';
import { advanceLevel, createInitialState, step } from './core/state';
import {
  BLOOMBURST_DEFEAT_SCORE,
  BLOOMBURST_DURATION_TICKS,
  BLOOMBURST_SCORE,
  COLORS,
  ENEMY_COLORS,
  GAME_TAGLINE,
  GAME_TITLE,
  POWER_PELLET_SCORE,
  TILE_SIZE_PX,
  type EnemyKey,
} from './core/theme';
import type { Direction, EnemyState, GameState, Vec2 } from './core/types';
import {
  isMuted,
  playDefeat,
  playGameOver,
  playLevelComplete,
  playLifeLost,
  playPickup,
  playPowerUp,
  toggleMuted,
  unlockAudio,
} from './ui/audio';
import { clearEffects, drawEffects, spawnBurst, spawnPopup, spawnRing } from './ui/effects';
import { interpolatePos } from './ui/render';

document.title = GAME_TITLE;

const app = document.getElementById('app');
if (!app) throw new Error('#app root element is missing');

const header = document.createElement('header');
header.className = 'game-header';

const heading = document.createElement('h1');
heading.textContent = GAME_TITLE;
heading.style.margin = '0';

const tagline = document.createElement('p');
tagline.textContent = GAME_TAGLINE;
tagline.className = 'tagline';

header.append(heading, tagline);

const hud = document.createElement('div');
hud.className = 'hud';
const scoreEl = document.createElement('span');
scoreEl.className = 'hud-score';
scoreEl.setAttribute('data-testid', 'hud-score');
const levelEl = document.createElement('span');
levelEl.className = 'hud-level';
levelEl.setAttribute('data-testid', 'hud-level');
const livesEl = document.createElement('span');
livesEl.setAttribute('data-testid', 'hud-lives');
const livesIconsEl = document.createElement('span');
livesIconsEl.className = 'lives-icons';
livesIconsEl.setAttribute('data-testid', 'hud-lives-icons');
const livesWrap = document.createElement('span');
livesWrap.className = 'lives-wrap';
livesWrap.append(livesEl, livesIconsEl);

const muteButton = document.createElement('button');
muteButton.type = 'button';
muteButton.className = 'mute-button';
muteButton.setAttribute('data-testid', 'mute-button');

hud.append(scoreEl, levelEl, livesWrap, muteButton);

const empoweredBarWrap = document.createElement('div');
empoweredBarWrap.className = 'empowered-bar-wrap hidden';
empoweredBarWrap.setAttribute('data-testid', 'empowered-bar');
const empoweredBarFill = document.createElement('div');
empoweredBarFill.className = 'empowered-bar-fill';
empoweredBarWrap.append(empoweredBarFill);

const controlsHint = document.createElement('p');
controlsHint.className = 'controls-hint';
controlsHint.textContent = 'Arrows/WASD move · Enter restart/continue · M mute';

const LEVEL_INDEX = 0;
const grid = parseLevel(LEVELS[LEVEL_INDEX].rows);

const stage = document.createElement('div');
stage.className = 'stage';

const canvas = document.createElement('canvas');
canvas.width = grid.width * TILE_SIZE_PX;
canvas.height = grid.height * TILE_SIZE_PX;
canvas.setAttribute('data-testid', 'game-canvas');

const flashOverlay = document.createElement('div');
flashOverlay.className = 'flash-overlay';

const startOverlay = document.createElement('div');
startOverlay.className = 'overlay overlay-start';
startOverlay.setAttribute('data-testid', 'overlay-start');
const startTitle = document.createElement('h2');
startTitle.textContent = GAME_TITLE;
const startPremise = document.createElement('p');
startPremise.textContent = GAME_TAGLINE;
const startControls = document.createElement('p');
startControls.className = 'hint';
startControls.textContent = 'Arrows/WASD to move · Enter to start/restart · M to mute';
const startButton = document.createElement('button');
startButton.type = 'button';
startButton.className = 'start-button';
startButton.textContent = 'Start';
startButton.setAttribute('data-testid', 'start-button');
const startHint = document.createElement('p');
startHint.className = 'hint';
startHint.textContent = 'Press Enter to begin';
startOverlay.append(startTitle, startPremise, startControls, startButton, startHint);

const gameOverOverlay = document.createElement('div');
gameOverOverlay.className = 'overlay overlay-game-over hidden';
gameOverOverlay.setAttribute('data-testid', 'overlay-game-over');
const gameOverTitle = document.createElement('h2');
gameOverTitle.textContent = 'Game Over';
const gameOverScore = document.createElement('p');
const gameOverHint = document.createElement('p');
gameOverHint.className = 'hint';
gameOverHint.textContent = 'Press Enter to try again';
gameOverOverlay.append(gameOverTitle, gameOverScore, gameOverHint);

const levelCompleteOverlay = document.createElement('div');
levelCompleteOverlay.className = 'overlay overlay-level-complete hidden';
levelCompleteOverlay.setAttribute('data-testid', 'overlay-level-complete');
const levelCompleteTitle = document.createElement('h2');
const levelCompleteScore = document.createElement('p');
const nextLevelButton = document.createElement('button');
nextLevelButton.type = 'button';
nextLevelButton.className = 'start-button';
nextLevelButton.textContent = 'Next Level';
nextLevelButton.setAttribute('data-testid', 'next-level-button');
const levelCompleteHint = document.createElement('p');
levelCompleteHint.className = 'hint';
levelCompleteOverlay.append(levelCompleteTitle, levelCompleteScore, nextLevelButton, levelCompleteHint);

stage.append(canvas, flashOverlay, startOverlay, gameOverOverlay, levelCompleteOverlay);
app.append(header, hud, empoweredBarWrap, stage, controlsHint);

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context is not available');

/** Simulation tick rate: independent of display refresh rate. */
const STEP_MS = 1000 / 60;
/** Caps ticks run in a single frame so a backgrounded tab can't cause a long catch-up burst. */
const MAX_TICKS_PER_FRAME = 5;
/** Frightened Duskwisps start flashing during the final quarter of empowerment. */
const FRIGHTEN_WARNING_TICKS = BLOOMBURST_DURATION_TICKS * 0.25;

const DIRECTION_VECTORS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

const DIRECTION_ANGLES: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
  none: 0,
};

/** Per-enemy idle-animation phase offset so all four don't bob in lockstep. */
const ENEMY_IDLE_PHASE: Record<EnemyKey, number> = {
  ember: 0,
  frost: 1.4,
  marsh: 2.8,
  dusk: 4.2,
};

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

let runId = 0;
let state: GameState = createInitialState(LEVEL_INDEX, runId);
/** The tick-boundary state immediately before `state`, used for render interpolation. */
let previousRenderState: GameState = state;
/**
 * The player's current desired direction, fed into `state.step()` every
 * tick as `InputState.direction`. `stepPlayer` (src/core/player.ts) already
 * buffers this - holding onto it until it becomes legal at a tile centre -
 * so this is just "last direction key pressed", never reset here.
 */
let desiredDirection: Direction = 'none';
/** Last non-'none' player facing, kept for sprite orientation while stationary. */
let lastFacing: Direction = 'right';
/** Lives count last rendered into `livesIconsEl`, so its DOM is only rebuilt when it changes. */
let lastRenderedLives = -1;
let remainderMs = 0;
let lastFrameTime: number | null = null;
/** Count of `state.step()` calls so far this run; exposed for E2E/debug use only. */
let tick = 0;
/** The simulation does not advance until the player dismisses the start overlay. */
let started = false;

function resetGame(): void {
  runId += 1;
  state = createInitialState(LEVEL_INDEX, runId);
  previousRenderState = state;
  desiredDirection = 'none';
  lastFacing = 'right';
  lastRenderedLives = -1;
  remainderMs = 0;
  tick = 0;
  clearEffects();
}

function beginGame(): void {
  if (started) return;
  started = true;
  unlockAudio();
  startOverlay.classList.add('hidden');
  lastFrameTime = null;
}

/** Continues play into the next level, preserving score/lives via core's advanceLevel(). */
function advanceToNextLevel(): void {
  if (!state.levelComplete) return;
  state = advanceLevel(state);
  previousRenderState = state;
  desiredDirection = 'none';
  lastFacing = 'right';
  lastRenderedLives = -1;
  remainderMs = 0;
  clearEffects();
}

declare global {
  interface Window {
    __mazeChase: {
      getState(): GameState;
      getTick(): number;
      restart(): void;
    };
  }
}

window.__mazeChase = {
  getState: () => state,
  getTick: () => tick,
  restart: () => resetGame(),
};

function updateMuteButton(): void {
  const mutedNow = isMuted();
  muteButton.textContent = mutedNow ? 'Unmute' : 'Mute';
  muteButton.setAttribute('aria-pressed', String(mutedNow));
}
updateMuteButton();

muteButton.addEventListener('click', () => {
  unlockAudio();
  toggleMuted();
  updateMuteButton();
});

startButton.addEventListener('click', () => {
  beginGame();
});

nextLevelButton.addEventListener('click', () => {
  unlockAudio();
  advanceToNextLevel();
});

window.addEventListener('keydown', (event) => {
  const direction = KEY_DIRECTIONS[event.key];
  if (direction) {
    desiredDirection = direction;
    event.preventDefault();
    return;
  }
  if (event.key === 'm' || event.key === 'M') {
    unlockAudio();
    toggleMuted();
    updateMuteButton();
    return;
  }
  if (event.key === 'Enter') {
    unlockAudio();
    if (!started) {
      beginGame();
      return;
    }
    if (state.gameOver) {
      resetGame();
    } else if (state.levelComplete) {
      advanceToNextLevel();
    }
  }
});

/** Cosmetic-only: triggers the CSS screen-shake/red-flash for losing a life. Never touches GameState. */
function triggerLifeLostFlash(): void {
  flashOverlay.classList.remove('flash-active');
  void flashOverlay.offsetWidth; // restart the CSS animation even on rapid repeats
  flashOverlay.classList.add('flash-active');

  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
}

/** Cosmetic-only: restarts the HUD score "bump" CSS animation. Never touches GameState. */
function bumpScoreHud(): void {
  scoreEl.classList.remove('bump');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('bump');
}

/**
 * Derives presentation events by diffing two consecutive GameStates and
 * triggers the matching cosmetic effect/sound. Purely observational: reads
 * `prev`/`curr` but never writes to either, and nothing here feeds back into
 * `state.step()`.
 */
function handleTransition(prev: GameState, curr: GameState, nowMs: number): void {
  const lifeLost = curr.lives < prev.lives;
  if (lifeLost) {
    triggerLifeLostFlash();
    playLifeLost();
  }

  const justEmpowered = curr.empoweredTicksRemaining > 0 && prev.empoweredTicksRemaining === 0;
  const scoreDelta = curr.collectables.score - prev.collectables.score;

  // resolveCollisions() (src/core/collisions.ts) resets `inDen` to true on
  // EVERY enemy when the player loses a life, not just defeated ones - so an
  // `inDen` false->true transition alone can't distinguish "this enemy was
  // eaten" from "the player just died". A life loss and a defeat are
  // mutually exclusive within one tick, so skip defeat detection on life
  // loss and otherwise derive how many enemies were defeated from the score
  // delta (each defeat is worth exactly BLOOMBURST_DEFEAT_SCORE); the inDen
  // transition is then only used to place popups on the right enemies.
  let defeatCount = 0;
  if (!lifeLost) {
    const nonDefeatDelta = justEmpowered ? BLOOMBURST_SCORE : 0;
    defeatCount = Math.max(0, Math.floor((scoreDelta - nonDefeatDelta) / BLOOMBURST_DEFEAT_SCORE));
  }

  if (defeatCount > 0) {
    let placed = 0;
    for (const enemy of curr.enemies) {
      if (placed >= defeatCount) break;
      const prevEnemy = prev.enemies.find((e) => e.id === enemy.id);
      if (prevEnemy && !prevEnemy.inDen && enemy.inDen) {
        spawnBurst(prevEnemy.pos.x, prevEnemy.pos.y, ENEMY_COLORS[enemy.id], nowMs);
        spawnPopup(prevEnemy.pos.x, prevEnemy.pos.y, `+${BLOOMBURST_DEFEAT_SCORE}`, COLORS.enemyEye, nowMs);
        placed += 1;
      }
    }
    playDefeat();
  }

  if (justEmpowered) {
    spawnRing(curr.player.pos.x, curr.player.pos.y, COLORS.bloomburst, nowMs);
    playPowerUp();
  }

  const explainedDelta = defeatCount * BLOOMBURST_DEFEAT_SCORE + (justEmpowered ? BLOOMBURST_SCORE : 0);
  const pickupDelta = scoreDelta - explainedDelta;
  if (pickupDelta > 0) {
    const color = pickupDelta >= POWER_PELLET_SCORE ? COLORS.powerPellet : COLORS.pellet;
    spawnRing(curr.player.pos.x, curr.player.pos.y, color, nowMs);
    playPickup();
  }

  if (scoreDelta > 0) bumpScoreHud();

  if (curr.levelComplete && !prev.levelComplete) playLevelComplete();
  if (curr.gameOver && !prev.gameOver) playGameOver();
}

function drawMaze(g: Grid): void {
  ctx!.fillStyle = COLORS.background;
  ctx!.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < g.height; row++) {
    for (let col = 0; col < g.width; col++) {
      const tile = g.tiles[row][col];
      if (tile === 'wall') {
        ctx!.fillStyle = COLORS.wall;
        ctx!.fillRect(col * TILE_SIZE_PX, row * TILE_SIZE_PX, TILE_SIZE_PX, TILE_SIZE_PX);
      } else if (tile === 'den') {
        ctx!.fillStyle = COLORS.den;
        ctx!.fillRect(col * TILE_SIZE_PX, row * TILE_SIZE_PX, TILE_SIZE_PX, TILE_SIZE_PX);
      }
    }
  }
}

const BLOOMBURST_PULSE_PERIOD_MS = 1000;

function drawCollectables(g: Grid, gameState: GameState, elapsedMs: number): void {
  const { pellets } = gameState.collectables;
  const pulsePhase = Math.sin((elapsedMs / BLOOMBURST_PULSE_PERIOD_MS) * Math.PI * 2);
  const bloomburstRadius = 6 + pulsePhase; // oscillates 5..7 px
  const bloomburstRingAlpha = 0.6 + 0.4 * pulsePhase; // oscillates 0.2..1.0

  for (let row = 0; row < g.height; row++) {
    for (let col = 0; col < g.width; col++) {
      if (!pellets[row][col]) continue;
      const tile = g.tiles[row][col];
      const cx = col * TILE_SIZE_PX + TILE_SIZE_PX / 2;
      const cy = row * TILE_SIZE_PX + TILE_SIZE_PX / 2;
      if (tile === 'pellet') {
        ctx!.fillStyle = COLORS.pellet;
        ctx!.beginPath();
        ctx!.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx!.fill();
      } else if (tile === 'power-pellet') {
        ctx!.fillStyle = COLORS.powerPellet;
        ctx!.beginPath();
        ctx!.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx!.fill();
      } else if (tile === 'bloomburst') {
        ctx!.fillStyle = COLORS.bloomburst;
        ctx!.beginPath();
        ctx!.arc(cx, cy, bloomburstRadius, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.save();
        ctx!.globalAlpha = bloomburstRingAlpha;
        ctx!.strokeStyle = COLORS.bloomburst;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      }
    }
  }
}

const MOUTH_CYCLE_MS = 240;
const MOUTH_MAX_ANGLE = 0.27 * Math.PI;

function drawPlayer(gameState: GameState, pos: Vec2, nowMs: number): void {
  const cx = pos.x * TILE_SIZE_PX + TILE_SIZE_PX / 2;
  const cy = pos.y * TILE_SIZE_PX + TILE_SIZE_PX / 2;
  const radius = TILE_SIZE_PX / 2 - 2;

  // Firefly glow: a soft halo behind Glim, brightest while empowered.
  ctx!.save();
  ctx!.globalAlpha = gameState.empoweredTicksRemaining > 0 ? 0.55 : 0.25;
  ctx!.fillStyle = COLORS.bloomburst;
  ctx!.beginPath();
  ctx!.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
  ctx!.fill();
  ctx!.restore();

  const moving = gameState.player.direction !== 'none';
  const mouthPhase = moving ? Math.abs(Math.sin((nowMs % MOUTH_CYCLE_MS) / MOUTH_CYCLE_MS * Math.PI)) : 0.15;
  const mouthAngle = MOUTH_MAX_ANGLE * mouthPhase;
  const facingAngle = DIRECTION_ANGLES[lastFacing];

  ctx!.fillStyle = COLORS.player;
  ctx!.beginPath();
  ctx!.moveTo(cx, cy);
  ctx!.arc(cx, cy, radius, facingAngle + mouthAngle, facingAngle - mouthAngle + Math.PI * 2);
  ctx!.closePath();
  ctx!.fill();
}

/** Duskwisps render as a glowing orb with a flame-like flicker and eyes facing their travel direction. */
function drawEnemy(enemy: EnemyState, empowered: boolean, frightenWarning: boolean, pos: Vec2, nowMs: number): void {
  const phase = ENEMY_IDLE_PHASE[enemy.id];
  const bob = Math.sin(nowMs / 220 + phase) * 1.4;
  const sway = Math.sin(nowMs / 170 + phase) * 1.1;

  const cx = pos.x * TILE_SIZE_PX + TILE_SIZE_PX / 2;
  const cy = pos.y * TILE_SIZE_PX + TILE_SIZE_PX / 2 + bob;
  const radius = TILE_SIZE_PX / 2 - 2;

  const flashingOff = frightenWarning && Math.floor(nowMs / 130) % 2 === 0;
  const bodyColor = empowered ? (flashingOff ? ENEMY_COLORS[enemy.id] : COLORS.enemyFrightened) : ENEMY_COLORS[enemy.id];

  ctx!.fillStyle = bodyColor;
  ctx!.beginPath();
  ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx!.fill();

  ctx!.beginPath();
  ctx!.moveTo(cx - radius / 2.5 + sway, cy - radius * 0.6);
  ctx!.lineTo(cx + sway, cy - radius * 1.4);
  ctx!.lineTo(cx + radius / 2.5 + sway, cy - radius * 0.6);
  ctx!.closePath();
  ctx!.fill();

  const vec = DIRECTION_VECTORS[enemy.direction];
  const eyeDx = vec.x * radius * 0.3;
  const eyeDy = vec.y * radius * 0.3;
  const empoweredNotFlashing = empowered && !flashingOff;
  ctx!.fillStyle = empoweredNotFlashing ? COLORS.wall : COLORS.enemyEye;
  ctx!.beginPath();
  ctx!.arc(cx - radius * 0.3 + eyeDx, cy - radius * 0.1 + eyeDy, radius * 0.18, 0, Math.PI * 2);
  ctx!.arc(cx + radius * 0.3 + eyeDx, cy - radius * 0.1 + eyeDy, radius * 0.18, 0, Math.PI * 2);
  ctx!.fill();
}

function renderLivesIcons(lives: number): void {
  if (lives === lastRenderedLives) return;
  lastRenderedLives = lives;
  livesIconsEl.innerHTML = '';
  for (let i = 0; i < lives; i++) {
    const icon = document.createElement('span');
    icon.className = 'life-icon';
    livesIconsEl.append(icon);
  }
}

function renderEmpoweredBar(ticksRemaining: number): void {
  const active = ticksRemaining > 0;
  empoweredBarWrap.classList.toggle('hidden', !active);
  if (active) {
    const pct = Math.max(0, Math.min(1, ticksRemaining / BLOOMBURST_DURATION_TICKS)) * 100;
    empoweredBarFill.style.width = `${pct}%`;
  }
}

function render(gameState: GameState, prevState: GameState, alpha: number, nowMs: number): void {
  drawMaze(grid);
  drawCollectables(grid, gameState, nowMs);

  const empowered = gameState.empoweredTicksRemaining > 0;
  const frightenWarning = empowered && gameState.empoweredTicksRemaining <= FRIGHTEN_WARNING_TICKS;

  for (const enemy of gameState.enemies) {
    const prevEnemy = prevState.enemies.find((e) => e.id === enemy.id) ?? enemy;
    const pos = interpolatePos(prevEnemy.pos, enemy.pos, alpha, grid.width);
    drawEnemy(enemy, empowered, frightenWarning, pos, nowMs);
  }

  const playerPos = interpolatePos(prevState.player.pos, gameState.player.pos, alpha, grid.width);
  drawPlayer(gameState, playerPos, nowMs);

  drawEffects(ctx!, TILE_SIZE_PX, nowMs);

  scoreEl.textContent = `Score: ${gameState.collectables.score}`;
  levelEl.textContent = `Level ${gameState.levelNumber}`;
  livesEl.textContent = `Lives: ${gameState.lives}`;
  renderLivesIcons(gameState.lives);
  renderEmpoweredBar(gameState.empoweredTicksRemaining);

  gameOverOverlay.classList.toggle('hidden', !gameState.gameOver);
  if (gameState.gameOver) {
    gameOverScore.textContent = `Final score: ${gameState.collectables.score}`;
  }

  levelCompleteOverlay.classList.toggle('hidden', !gameState.levelComplete);
  if (gameState.levelComplete) {
    levelCompleteTitle.textContent = `Level ${gameState.levelNumber} Clear!`;
    levelCompleteScore.textContent = `Score so far: ${gameState.collectables.score}`;
    levelCompleteHint.textContent = `Press Enter or click Next Level for Level ${gameState.levelNumber + 1}`;
  }
}

function frame(time: number): void {
  if (lastFrameTime === null) lastFrameTime = time;
  const frameDeltaMs = time - lastFrameTime;
  lastFrameTime = time;

  let alpha = 0;
  if (started) {
    const accumulated = accumulateTicks(remainderMs, frameDeltaMs, STEP_MS, MAX_TICKS_PER_FRAME);
    remainderMs = accumulated.remainderMs;

    for (let i = 0; i < accumulated.ticks; i++) {
      previousRenderState = state;
      const nextState = step(state, { direction: desiredDirection }, STEP_MS);
      handleTransition(state, nextState, time);
      if (nextState.player.direction !== 'none') lastFacing = nextState.player.direction;
      state = nextState;
      tick += 1;
    }

    alpha = remainderMs / STEP_MS;
  }

  render(state, previousRenderState, alpha, time);
  requestAnimationFrame(frame);
}

render(state, previousRenderState, 0, 0);
requestAnimationFrame(frame);
