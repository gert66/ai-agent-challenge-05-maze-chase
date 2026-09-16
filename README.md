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
| `npm run typecheck` | Run `tsc --noEmit` across `src/` and `tests/` |

## Controls

Arrow keys / WASD move Glim through the maze (planned — see Status below;
input wiring lands in a later build batch).

## Project structure

```
src/
  core/        Deterministic game logic (grid, player, collectables, state,
               RNG, level data, theme) - no DOM/canvas imports, fully unit
               tested.
  main.ts      Boots the app and renders the maze to a canvas.
  style.css    Minimal page styling.
tests/
  core/        Vitest specs for the core engine.
docs/
  AUDIT_TRAIL.md   Dated log of build/review/repair decisions.
```

## Status

**Implemented**

- Original maze layout (`src/core/levels.ts`), fully connected, with a
  horizontal tunnel and an enemy den.
- Deterministic core: grid parsing, buffered-turn player movement with wall
  blocking and tunnel wrap, pellet/power-pellet collection, scoring, and
  level-complete detection (`src/core/`).
- Seeded PRNG (`mulberry32`) for future deterministic enemy behaviour.
- Unit test suite covering connectivity, wall blocking, buffered turning,
  tunnel wrap, scoring, level completion, and PRNG determinism.
- Placeholder canvas rendering of the maze, pellets, and player spawn point.

**Planned (later batches)**

- Keyboard input wiring and a real-time game loop.
- Four Duskwisps with distinct navigation/pathfinding behaviours.
- Power-up effects (beyond scoring) with timers.
- Lives, collisions, game-over and win-screen UI.
- Sprite art, animations, and audio feedback.
- End-to-end headless-browser smoke test.
