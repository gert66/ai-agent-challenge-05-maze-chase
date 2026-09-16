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

Then open the printed local URL in a desktop browser. A start screen greets
you first - press **Enter** or click **Start** to begin.

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

| Control | Action |
| --- | --- |
| Arrow keys / WASD | Move (turns are buffered — press a direction slightly before a junction and Glim turns as soon as it's legal) |
| Enter | Start the game from the title screen; restart after game over; continue to the next level after clearing one |
| M | Toggle sound on/off (also available as the on-screen Mute button) |

- **Start**: on load, a title screen shows the premise and controls. Press
  **Enter** or click **Start** to begin — the simulation does not advance
  until then.
- **Score**: pellets, power pellets, and Bloombursts each add points; the
  live score is shown in the HUD above the maze, with a short "bump"
  animation on every increase.
- **Power up**: collecting a Bloomburst (the pulsing green orb) empowers
  Glim for a short time, shown by a draining timer bar under the HUD —
  Duskwisps touched while empowered visibly change color (flashing as a
  warning near the end) and are defeated (sent back to the den) for bonus
  score instead of costing a life.
- **Lose a life**: touching a Duskwisp while not empowered costs one of
  Glim's three lives (shown as both text and small icons in the HUD),
  triggers a brief screen shake and red flash, and resets Glim and all four
  Duskwisps to their spawns.
- **Game over**: losing all three lives ends the run; a **Game Over**
  overlay shows the final score. Press **Enter** to restart.
- **Win a level**: collecting every pellet, power pellet, and Bloomburst
  clears the level; a **level-complete** overlay shows the level's score so
  far and the current level number, shown live in the HUD (`Level N`).
  Press **Enter** or click **Next Level** to continue — score and remaining
  lives carry over into the next level, which cycles back through The Hollow
  Garden with every Duskwisp faster and the Bloomburst empowerment shorter
  than the level before (see the difficulty ramp formulas in
  `src/core/state.ts`, floored/capped so neither ever becomes trivial or
  unfair).

## Polish & feedback

- **Start screen**: an original title/premise/controls overlay gates the
  simulation until the player is ready.
- **Smooth movement**: player and enemy positions are interpolated between
  simulation ticks using the fixed-timestep accumulator's leftover fraction,
  so motion reads smoothly at 60fps instead of snapping tile-to-tile
  (tunnel-wraps and life-lost respawns snap instead of interpolating, so
  entities never appear to streak across the maze).
- **Sprite animation**: Glim's mouth opens and closes while moving, oriented
  to the current facing direction; each Duskwisp has a subtle idle bob/sway
  and eyes that track its travel direction; frightened Duskwisps flash
  between colors during the final quarter of empowerment as a warning.
- **Cosmetic effects**: a ring/particle burst on pellet, power-pellet, and
  Bloomburst pickup; a floating "+150" popup on each enemy defeat; a screen
  shake and red flash on losing a life; a score "bump" animation in the HUD.
  All of these are purely time-based and read-only against `GameState` -
  they never influence the simulation.
- **Synthesized audio**: original sound effects (pickup blip, power-up
  sting, enemy-defeat chime, life-lost tone, level-complete jingle,
  game-over tone) built from Web Audio oscillators - no audio files. The
  audio context is created lazily on the first key press or click to
  satisfy browser autoplay policies, and the game runs fine even if Web
  Audio is unavailable.

## Testing

- **Unit/integration tests** (`npm test`): Vitest specs in `tests/core/`
  covering the deterministic game engine (grid, player, enemies,
  collisions, collectables, power-ups, level progression, and the loop
  accumulator), plus `tests/core/integration.test.ts`, which drives the real
  Hollow Garden level through `step()` with a scripted BFS-pathed playthrough
  (via `src/core/pathfinding.ts`) to fully clear it, checks the exact
  expected score, advances to level 2 with `advanceLevel()`, and verifies
  same-seed determinism. No browser required.
- **End-to-end smoke test** (`npm run test:e2e`): a headless-Chromium
  Playwright test in `tests/e2e/smoke.spec.ts` that builds the app, serves
  it, and drives a real browser to confirm: the start overlay is visible on
  load and is dismissed by the Start button/Enter, the canvas renders, the
  HUD shows the initial score/lives/level (`Level 1`), keyboard input starts
  the game and actually moves the player and collects a pellet, `restart()`
  resets state, and the mute button toggles its `aria-pressed` state and
  label.
  One-time setup before the first run: `npx playwright install chromium`
  (downloads the browser binary; it is not committed to the repo).
- **Everything** (`npm run test:all`): runs the unit suite, then the E2E
  suite.

## Project structure

```
src/
  core/        Deterministic game logic (grid, player, enemies, collisions,
               collectables, state, fixed-timestep loop accumulator, RNG,
               level data, theme) - no DOM/canvas imports, fully unit tested.
  main.ts      Boots the app: real-time game loop, keyboard input, canvas
               rendering, HUD, and start/game-over/level-complete overlays.
  ui/          Presentation-only helpers: audio.ts (synthesized Web Audio
               sound effects + mute state), effects.ts (cosmetic particle/
               popup effects), render.ts (render interpolation). No
               DOM/canvas side effects of their own, no GameState writes.
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
- Level progression (`src/core/state.ts`): a 1-based `levelNumber` on
  `GameState` and a pure `advanceLevel()` that, once a level is cleared,
  carries score and lives forward into a freshly reset next level (pellets,
  player, enemies, and empowerment all reset; cycling back through `LEVELS`
  when there are fewer maps than the next level number) with a deterministic
  difficulty ramp - enemy speed and Bloomburst duration are pure functions of
  `levelNumber` alone, each floored/capped so the ramp never reaches zero or
  an unfairly extreme multiplier.
- Real navigation, not just heuristic steering: `src/core/pathfinding.ts`
  runs a deterministic breadth-first search over the maze (respecting walls,
  the horizontal tunnel wrap, and den restrictions) to find true
  shortest-path routes. Ember, the chase Duskwisp, uses this at every tile
  centre to hunt Glim, falling back to a greedy distance heuristic only when
  no path exists.
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
  covering the start overlay, initial render/HUD, keyboard-driven movement
  and pellet collection, restart, and the mute toggle, driven through a
  `window.__mazeChase` debug hook exposed by `src/main.ts`.
- A presentation polish layer (`src/main.ts`, `src/ui/`): a title/start
  screen gating simulation start, render interpolation for smooth 60fps
  movement (with a tunnel-wrap/respawn snap guard), direction-aware player
  animation, idle enemy animation with a frightened warning flash,
  diff-driven cosmetic effects (pickup rings/bursts, defeat score popups,
  life-lost screen shake/flash, HUD score bump), an empowered-timer HUD
  bar, lives icons, and original Web-Audio-synthesized sound effects with a
  persisted mute toggle.

**Planned (later batches)**

- None outstanding from the original job goal; future batches would be
  additional levels/content rather than core mechanics or polish.
