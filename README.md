# Glimmerdash

Glimmerdash is an original maze-chase browser game. You guide **Glim**, a
firefly, through **The Hollow Garden** at night, gathering glowing dewdrop
pollen while staying ahead of the four **Duskwisps** — Ember, Frost, Marsh,
and Dusk — who each patrol and hunt the garden differently.

## Requirements

- Node.js 20 or newer
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in a desktop browser.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check and produce an optimized production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest unit/integration test suite |
| `npm run test:e2e` | Run the headless-Chromium Playwright E2E smoke test |
| `npm run test:all` | Run the unit suite, then the E2E suite |
| `npm run typecheck` | Run `tsc --noEmit` across `src/` and `tests/` |

## How to play

Guide Glim through The Hollow Garden, eating every dewdrop pellet, power
pellet, and Bloomburst while avoiding the four Duskwisps.

- **Move**: Arrow keys or WASD. Turns are buffered — press a direction
  slightly before a junction and Glim turns as soon as it's legal.
- **Score**: pellets, power pellets, and Bloombursts each add points; the
  live score is shown in the HUD above the maze.
- **Power up**: collecting a Bloomburst (the pulsing green orb) empowers
  Glim for a short time — Duskwisps touched while empowered visibly change
  color and are defeated (sent back to the den) for bonus score instead of
  costing a life.
- **Lose a life**: touching a Duskwisp while not empowered costs one of
  Glim's three lives and resets Glim and all four Duskwisps to their spawns.
- **Game over**: losing all three lives ends the run; a **Game Over**
  overlay shows the final score. Press **Enter** to restart.
- **Win**: collecting every pellet, power pellet, and Bloomburst clears the
  level; a **level-complete** overlay shows the final score. Press **Enter**
  to play again.

## Testing

- **Unit/integration tests** (`npm test`): Vitest specs in `tests/core/`
  covering the deterministic game engine (grid, player, enemies,
  collisions, collectables, power-ups, and the loop accumulator). No
  browser required.
- **End-to-end smoke test** (`npm run test:e2e`): a headless-Chromium
  Playwright test in `tests/e2e/smoke.spec.ts` that builds the app, serves
  it, and drives a real browser to confirm the canvas renders, the HUD
  shows the initial score/lives, keyboard input actually moves the player
  and collects a pellet, and `restart()` resets state. One-time setup
  before the first run: `npx playwright install chromium` (downloads the
  browser binary; it is not committed to the repo).
- **Everything** (`npm run test:all`): runs the unit suite, then the E2E
  suite.

## Project structure

```
src/
  core/        Deterministic game logic (grid, player, enemies, collisions,
               collectables, state, fixed-timestep loop accumulator, RNG,
               level data, theme) - no DOM/canvas imports, fully unit tested.
  main.ts      Boots the app: real-time game loop, keyboard input, canvas
               rendering, HUD, and game-over/level-complete overlays.
  style.css    Page, HUD, and overlay styling.
tests/
  core/        Vitest specs for the core engine.
  e2e/         Playwright headless-browser smoke test.
docs/
  AUDIT_TRAIL.md   Dated log of build/review/repair decisions.
```

## Status

**Implemented**

- Original maze layout (`src/core/levels.ts`), fully connected, with a
  horizontal tunnel and an enemy den.
- Deterministic core: grid parsing, buffered-turn player movement with wall
  blocking and tunnel wrap, four Duskwisps with distinct chase/scatter/
  ambush/wander behaviours, collisions, a Bloomburst power-up with a timed
  frighten mode, pellet/power-pellet/Bloomburst collection, scoring, lives,
  game-over, and level-complete detection (`src/core/`).
- Seeded PRNG (`mulberry32`) driving all enemy tie-breaking/wandering.
- A pure, unit-tested fixed-timestep accumulator (`src/core/loop.ts`)
  decoupling the simulation tick rate from the display refresh rate.
- A real-time game loop in `src/main.ts`: `requestAnimationFrame` +
  the fixed-timestep accumulator drive `state.step()`, arrow-key/WASD input
  steers the player through the existing buffered-turn logic, and every
  frame renders the maze, pellets, Bloombursts, player, and all four
  Duskwisps (with a distinct color/appearance while frightened) to a canvas,
  plus a live score/lives HUD and game-over/level-complete overlays with a
  restart control.
- Unit test suite covering connectivity, wall blocking, buffered turning,
  tunnel wrap, enemy behaviours, collisions, power-ups, scoring, level
  completion, PRNG determinism, and the loop accumulator.
- A headless-Chromium Playwright E2E smoke test (`tests/e2e/smoke.spec.ts`)
  covering initial render/HUD, keyboard-driven movement and pellet
  collection, and restart, driven through a `window.__mazeChase` debug
  hook exposed by `src/main.ts`.

**Planned (later batches)**

- Sprite art, animations, and audio feedback polish.
