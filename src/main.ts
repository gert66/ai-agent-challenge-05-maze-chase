import './style.css';
import type { Grid } from './core/grid';
import { parseLevel } from './core/grid';
import { LEVELS } from './core/levels';
import { accumulateTicks } from './core/loop';
import { createInitialState, step } from './core/state';
import {
  COLORS,
  ENEMY_COLORS,
  GAME_TAGLINE,
  GAME_TITLE,
  TILE_SIZE_PX,
} from './core/theme';
import type { Direction, EnemyState, GameState, Vec2 } from './core/types';

document.title = GAME_TITLE;

const app = document.getElementById('app');
if (!app) throw new Error('#app root element is missing');

const heading = document.createElement('h1');
heading.textContent = GAME_TITLE;
heading.style.margin = '0';

const tagline = document.createElement('p');
tagline.textContent = GAME_TAGLINE;
tagline.className = 'tagline';

const hud = document.createElement('div');
hud.className = 'hud';
const scoreEl = document.createElement('span');
const livesEl = document.createElement('span');
hud.append(scoreEl, livesEl);

const controlsHint = document.createElement('p');
controlsHint.className = 'controls-hint';
controlsHint.textContent = 'Arrow keys or WASD to move.';

const LEVEL_INDEX = 0;
const grid = parseLevel(LEVELS[LEVEL_INDEX].rows);

const stage = document.createElement('div');
stage.className = 'stage';

const canvas = document.createElement('canvas');
canvas.width = grid.width * TILE_SIZE_PX;
canvas.height = grid.height * TILE_SIZE_PX;

const gameOverOverlay = document.createElement('div');
gameOverOverlay.className = 'overlay overlay-game-over hidden';
const gameOverTitle = document.createElement('h2');
gameOverTitle.textContent = 'Game Over';
const gameOverScore = document.createElement('p');
const gameOverHint = document.createElement('p');
gameOverHint.className = 'hint';
gameOverHint.textContent = 'Press Enter to try again';
gameOverOverlay.append(gameOverTitle, gameOverScore, gameOverHint);

const levelCompleteOverlay = document.createElement('div');
levelCompleteOverlay.className = 'overlay overlay-level-complete hidden';
const levelCompleteTitle = document.createElement('h2');
levelCompleteTitle.textContent = 'The Hollow Garden is Clear!';
const levelCompleteScore = document.createElement('p');
const levelCompleteHint = document.createElement('p');
levelCompleteHint.className = 'hint';
levelCompleteHint.textContent = 'Press Enter to play again';
levelCompleteOverlay.append(levelCompleteTitle, levelCompleteScore, levelCompleteHint);

stage.append(canvas, gameOverOverlay, levelCompleteOverlay);
app.append(heading, tagline, hud, stage, controlsHint);

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context is not available');

/** Simulation tick rate: independent of display refresh rate. */
const STEP_MS = 1000 / 60;
/** Caps ticks run in a single frame so a backgrounded tab can't cause a long catch-up burst. */
const MAX_TICKS_PER_FRAME = 5;

const DIRECTION_VECTORS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
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
/**
 * The player's current desired direction, fed into `state.step()` every
 * tick as `InputState.direction`. `stepPlayer` (src/core/player.ts) already
 * buffers this - holding onto it until it becomes legal at a tile centre -
 * so this is just "last direction key pressed", never reset here.
 */
let desiredDirection: Direction = 'none';
let remainderMs = 0;
let lastFrameTime: number | null = null;

function resetGame(): void {
  runId += 1;
  state = createInitialState(LEVEL_INDEX, runId);
  desiredDirection = 'none';
  remainderMs = 0;
}

window.addEventListener('keydown', (event) => {
  const direction = KEY_DIRECTIONS[event.key];
  if (direction) {
    desiredDirection = direction;
    event.preventDefault();
    return;
  }
  if (event.key === 'Enter' && (state.gameOver || state.levelComplete)) {
    resetGame();
  }
});

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

function drawPlayer(gameState: GameState): void {
  const { pos } = gameState.player;
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

  ctx!.fillStyle = COLORS.player;
  ctx!.beginPath();
  ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx!.fill();
}

/** Duskwisps render as a glowing orb with a flame-like flicker and eyes facing their travel direction. */
function drawEnemy(enemy: EnemyState, empowered: boolean): void {
  const cx = enemy.pos.x * TILE_SIZE_PX + TILE_SIZE_PX / 2;
  const cy = enemy.pos.y * TILE_SIZE_PX + TILE_SIZE_PX / 2;
  const radius = TILE_SIZE_PX / 2 - 2;
  const bodyColor = empowered ? COLORS.enemyFrightened : ENEMY_COLORS[enemy.id];

  ctx!.fillStyle = bodyColor;
  ctx!.beginPath();
  ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx!.fill();

  ctx!.beginPath();
  ctx!.moveTo(cx - radius / 2.5, cy - radius * 0.6);
  ctx!.lineTo(cx, cy - radius * 1.4);
  ctx!.lineTo(cx + radius / 2.5, cy - radius * 0.6);
  ctx!.closePath();
  ctx!.fill();

  const vec = DIRECTION_VECTORS[enemy.direction];
  const eyeDx = vec.x * radius * 0.3;
  const eyeDy = vec.y * radius * 0.3;
  ctx!.fillStyle = empowered ? COLORS.wall : COLORS.enemyEye;
  ctx!.beginPath();
  ctx!.arc(cx - radius * 0.3 + eyeDx, cy - radius * 0.1 + eyeDy, radius * 0.18, 0, Math.PI * 2);
  ctx!.arc(cx + radius * 0.3 + eyeDx, cy - radius * 0.1 + eyeDy, radius * 0.18, 0, Math.PI * 2);
  ctx!.fill();
}

function render(gameState: GameState, elapsedMs: number): void {
  drawMaze(grid);
  drawCollectables(grid, gameState, elapsedMs);

  const empowered = gameState.empoweredTicksRemaining > 0;
  for (const enemy of gameState.enemies) {
    drawEnemy(enemy, empowered);
  }
  drawPlayer(gameState);

  scoreEl.textContent = `Score: ${gameState.collectables.score}`;
  livesEl.textContent = `Lives: ${gameState.lives}`;

  gameOverOverlay.classList.toggle('hidden', !gameState.gameOver);
  if (gameState.gameOver) {
    gameOverScore.textContent = `Final score: ${gameState.collectables.score}`;
  }

  levelCompleteOverlay.classList.toggle('hidden', !gameState.levelComplete);
  if (gameState.levelComplete) {
    levelCompleteScore.textContent = `Final score: ${gameState.collectables.score}`;
  }
}

function frame(time: number): void {
  if (lastFrameTime === null) lastFrameTime = time;
  const frameDeltaMs = time - lastFrameTime;
  lastFrameTime = time;

  const accumulated = accumulateTicks(remainderMs, frameDeltaMs, STEP_MS, MAX_TICKS_PER_FRAME);
  remainderMs = accumulated.remainderMs;

  for (let i = 0; i < accumulated.ticks; i++) {
    state = step(state, { direction: desiredDirection }, STEP_MS);
  }

  render(state, time);
  requestAnimationFrame(frame);
}

render(state, 0);
requestAnimationFrame(frame);
