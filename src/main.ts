import './style.css';
import { parseLevel } from './core/grid';
import { LEVELS } from './core/levels';
import { COLORS, GAME_TAGLINE, GAME_TITLE, TILE_SIZE_PX } from './core/theme';

document.title = GAME_TITLE;

const app = document.getElementById('app');
if (!app) throw new Error('#app root element is missing');

const heading = document.createElement('h1');
heading.textContent = GAME_TITLE;
heading.style.margin = '0';

const tagline = document.createElement('p');
tagline.textContent = GAME_TAGLINE;
tagline.style.margin = '0';
tagline.style.maxWidth = '480px';
tagline.style.textAlign = 'center';

const level = LEVELS[0];
const grid = parseLevel(level.rows);

const canvas = document.createElement('canvas');
canvas.width = grid.width * TILE_SIZE_PX;
canvas.height = grid.height * TILE_SIZE_PX;

app.append(heading, tagline, canvas);

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context is not available');

ctx.fillStyle = COLORS.background;
ctx.fillRect(0, 0, canvas.width, canvas.height);

for (let row = 0; row < grid.height; row++) {
  for (let col = 0; col < grid.width; col++) {
    if (grid.tiles[row][col] !== 'wall') continue;
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(col * TILE_SIZE_PX, row * TILE_SIZE_PX, TILE_SIZE_PX, TILE_SIZE_PX);
  }
}

for (let row = 0; row < grid.height; row++) {
  for (let col = 0; col < grid.width; col++) {
    const tile = grid.tiles[row][col];
    const cx = col * TILE_SIZE_PX + TILE_SIZE_PX / 2;
    const cy = row * TILE_SIZE_PX + TILE_SIZE_PX / 2;
    if (tile === 'pellet') {
      ctx.fillStyle = COLORS.pellet;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tile === 'power-pellet') {
      ctx.fillStyle = COLORS.powerPellet;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Placeholder spawn marker - real sprite/animation/game loop land in a later batch.
ctx.fillStyle = COLORS.player;
ctx.beginPath();
ctx.arc(
  grid.playerSpawn.col * TILE_SIZE_PX + TILE_SIZE_PX / 2,
  grid.playerSpawn.row * TILE_SIZE_PX + TILE_SIZE_PX / 2,
  TILE_SIZE_PX / 2 - 2,
  0,
  Math.PI * 2,
);
ctx.fill();
