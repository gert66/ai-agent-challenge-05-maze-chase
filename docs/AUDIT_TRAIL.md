# Audit Trail

Dated log of build/review/repair decisions for Glimmerdash. Newest entries
first.

## 2026-09-16 - Batch `04-game-loop-and-rendering`

### Decisions

- **Fixed-timestep accumulator as core logic, not inline in `main.ts`**: the
  rAF loop needs to decouple the simulation tick rate from the (variable,
  display-dependent) frame rate, and needs to cap ticks-per-frame so a
  backgrounded tab doesn't cause a long "catch-up" burst on refocus. That
  arithmetic is pure and non-trivial, so it lives in `src/core/loop.ts`
  (`accumulateTicks`) with its own unit tests, rather than being written
  untested inside `main.ts`. When capped, owed time beyond the cap is
  discarded (not carried forward), so the simulation catches back up to
  wall-clock time instead of permanently lagging behind it - `loop.test.ts`
  exercises this case explicitly.
- **Input wiring reuses the existing buffered-turn mechanism unchanged**:
  `main.ts` tracks only "last movement key pressed" as `desiredDirection`
  and passes it as `InputState.direction` into `state.step()` every tick,
  exactly as the existing tests already exercise (see `state.test.ts`,
  which calls `step(state, { direction: ... }, dtMs)` directly). The
  buffering - holding a queued turn until it's legal at a tile centre -
  is entirely `stepPlayer`'s existing behaviour (`src/core/player.ts`); no
  movement/turning logic was duplicated in `main.ts`.
- **Simulation tick rate**: `STEP_MS = 1000 / 60` (60 simulated ticks/sec),
  independent of `requestAnimationFrame`'s actual rate. `MAX_TICKS_PER_FRAME
  = 5` bounds the catch-up burst described above.
- **Rendering is additive, `src/core/*` semantics are untouched**: `main.ts`
  reads `GameState`/`Grid` fields already exposed by the core (player/enemy
  `pos`/`direction`, `collectables.pellets`, `lives`, `gameOver`,
  `levelComplete`, `empoweredTicksRemaining`) and renders them; it makes no
  behavioural changes to any `src/core/*` module. `theme.ts` gained two
  purely additive, non-logic exports - `ENEMY_COLORS` (one original color
  per Duskwisp) and `COLORS.enemyFrightened`/`COLORS.enemyEye` - so the
  renderer's colors stay centralized in the theme module per this batch's
  instructions, instead of being hardcoded in `main.ts`.
- **Enemy/player shapes are original, not Pac-Man-derived**: Duskwisps
  render as a glowing orb with a small flame/wisp flicker on top and two
  eyes that shift to face their current travel direction - deliberately not
  the classic scalloped-skirt "ghost" silhouette. All four share this shape
  but are individually colored (`ENEMY_COLORS`); while Bloomburst
  empowerment is active, every Duskwisp switches to a single shared
  `enemyFrightened` fill with darkened eyes, so frighten mode is legible at
  a glance. Glim (the player) renders as a solid circle with a soft halo
  that brightens while empowered.
- **Overlays over restart mechanics**: a `Game Over` overlay (final score,
  "Press Enter to try again") and a distinct `level-complete` overlay (final
  score, "Press Enter to play again") are absolutely-positioned over the
  canvas via CSS and toggled by `gameState.gameOver`/`gameState.levelComplete`.
  Enter, while either is showing, calls `createInitialState` again (with an
  incrementing run id as the new seed) to restart - reusing the existing
  state-creation logic rather than hand-resetting individual fields.

### What was built

- `src/core/loop.ts`: `accumulateTicks`, a pure fixed-timestep accumulator
  with tick-cap/spiral-of-death handling.
- `tests/core/loop.test.ts`: 6 new unit tests for the accumulator (zero
  delta, exact step, partial remainder, remainder carry-over, tick cap with
  discard, negative delta clamping).
- `src/core/theme.ts`: additive `ENEMY_COLORS` map and
  `COLORS.enemyFrightened`/`COLORS.enemyEye` swatches for the renderer.
- `src/main.ts`: replaced the static placeholder renderer with a real-time
  game - `requestAnimationFrame` + `accumulateTicks` driving `state.step()`
  unchanged, arrow-key/WASD keyboard input, full per-frame canvas rendering
  (walls, den, pellets/power-pellets/Bloombursts, player, all four
  Duskwisps with frighten-mode recoloring), a live score/lives HUD, and
  game-over/level-complete overlays with an Enter-to-restart control.
- `src/style.css`: HUD, controls-hint, stage/overlay layout and styling.
- `README.md`: new "How to play" section (controls, scoring, power-up,
  lose/win conditions) and an updated Status/project-structure section
  reflecting the real game loop.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm run build` (`vite build`): exited 0, produced `dist/`.
- `npm test` (`vitest run`): exited 0 - **8 test files, 84 tests, all
  passed** (78 pre-existing + 6 new in `loop.test.ts`). All pre-existing
  `src/core/*` tests are unchanged and still pass, confirming core semantics
  were not altered by this batch.
- Manually started the Vite dev server (`npm run dev -- --port 5183
  --strictPort`) and confirmed it served without startup errors; a
  headless-browser (Playwright/Chromium) screenshot smoke check was not
  possible in this environment (no browser automation tooling installed,
  and this batch's scope disallows installing packages) - real
  headless-browser E2E coverage is called out as a separate, later-batch
  deliverable in the job goal.

### External generation prompts

None used - no external/Lovable/Fable generation was used for this batch;
all code was written directly.

### Repair 1 (2026-09-16)

Review found that at `STEP_MS = 1000 / 60` (60 simulated ticks/sec), the
pre-existing `BLOOMBURST_DURATION_TICKS = 30` (unchanged from batch
`03-power-ups-and-frighten-mode`, where the tick rate was not yet fixed)
produced only `30 * 16.67ms ≈ 0.5s` of wall-clock frighten time - about 3
player tiles at 6 tiles/sec - making the Bloomburst power-up and the
enemies' frightened recolor practically imperceptible in real play.

- **Fix**: raised `BLOOMBURST_DURATION_TICKS` to `420` in `src/core/theme.ts`
  (`420 / 60 ≈ 7s` of empowerment), with a comment tying the constant to
  `state.step()` calls at `STEP_MS = 1000 / 60`. The tick rate itself
  (`STEP_MS`, `MAX_TICKS_PER_FRAME`) was left unchanged - lowering it instead
  would have made movement visibly jumpy since `main.ts` has no render
  interpolation. Existing tests reference the constant symbolically
  (`state.test.ts` loops `BLOOMBURST_DURATION_TICKS` times rather than
  hard-coding `30`), so no test needed updating and no `src/core/*` file
  other than `theme.ts` changed.
- **Halo draw order**: `drawPlayer` in `src/main.ts` drew Glim's semi-
  transparent halo *after* the solid body, so the halo visibly tinted the
  body instead of sitting behind it as the comment claimed. Reordered so the
  halo is drawn first, then the solid body on top.
- **Bloomburst pulse**: README described the Bloomburst as "the pulsing
  green orb," but the canvas render was a static circle and ring. Rather
  than weaken the README, `drawCollectables` now takes the current
  `requestAnimationFrame` timestamp and modulates the Bloomburst's fill
  radius (5-7px) and ring alpha with a sine wave (~1s period), so the
  rendering matches the README's description.

No external/Lovable/Fable generation was used for this repair; all changes
were written directly.

## 2026-09-16 - Batch `03-power-ups-and-frighten-mode`

### Decisions

- **Naming**: the power-up is called a **Bloomburst** (tile character `B`,
  `TileType` value `'bloomburst'`) - an original name distinct from
  "power pellet"/"energizer", consistent with the existing Hollow
  Garden/Duskwisp theme. It is a new, separate collectable from the
  pre-existing `'power-pellet'` (`*`) tile, which keeps its old
  score-only behaviour unchanged; `main.ts` was intentionally left
  untouched for this batch, so introducing a brand-new `TileType` (rather
  than repurposing `'power-pellet'`) avoids breaking its existing
  `tile === 'power-pellet'` render check.
- **Placement**: four Bloomburst tiles replace the outermost pellet on the
  level's two horizontal symmetry rows (just inside the corners, next to
  the existing power pellets), preserving the maze's left-right symmetry
  and its walkability - only the *collectable kind* on those tiles changed,
  not the wall layout, so connectivity is trivially preserved and is also
  re-verified by a dedicated BFS reachability test.
- **Determinism**: empowerment is tracked as `GameState.empoweredTicksRemaining`,
  a plain integer decremented by exactly one per `step()` call (a "game
  step", independent of `dtMs`/wall-clock time), not a millisecond timer.
  Collecting a Bloomburst resets it to the fixed `BLOOMBURST_DURATION_TICKS`
  constant (`theme.ts`). This keeps the mechanic fully deterministic and
  testable by driving `step()` a known number of times.
- **Collision resolution**: `resolveCollisions` gained two optional
  parameters, `empowered` (default `false`) and `denDoor`, so existing
  callers/tests are unaffected. When not empowered, behaviour is byte-for-byte
  identical to batch 02 (life lost, player and every enemy reset). When
  empowered, only the enemy/enemies actually sharing the player's tile are
  affected: each is sent to `denDoor` (deterministic, not `enemySpawns`
  cycling) and marked `inDen`, the player keeps its position and lives, and
  `bonusScore` (`BLOOMBURST_DEFEAT_SCORE` per enemy defeated) is added to the
  score in `state.ts`. All four Duskwisp behaviours (Ember/chase,
  Frost/scatter, Marsh/ambush, Dusk/wander) go through the same tile-overlap
  check, so each is exercised explicitly in `collisions.test.ts` for both the
  empowered and normal paths. No `Math.random` was introduced anywhere;
  the only tie-breaking (which enemy's collision to report first when
  several would qualify) is unnecessary here since every colliding enemy is
  handled, not just one.

### What was built

- `src/core/theme.ts`: `BLOOMBURST_SCORE`, `BLOOMBURST_DEFEAT_SCORE`,
  `BLOOMBURST_DURATION_TICKS`, and a `COLORS.bloomburst` swatch for a future
  rendering batch.
- `src/core/grid.ts`: new `'bloomburst'` `TileType` and `'B'` legend entry.
- `src/core/levels.ts`: four `'B'` tiles added to the Hollow Garden layout
  (legend comment updated to match).
- `src/core/types.ts`: `CollectablesState.bloomburstRemaining` and
  `GameState.empoweredTicksRemaining`.
- `src/core/collectables.ts`: Bloomburst counting/collection in
  `createCollectablesState`/`collectAt`, and `isLevelComplete` now also
  requires `bloomburstRemaining === 0`.
- `src/core/collisions.ts`: empowered-mode branch in `resolveCollisions`
  (per-enemy defeat + bonus score instead of a shared life loss/reset).
- `src/core/state.ts`: wires empowerment into `step()` - tracks
  `empoweredTicksRemaining`, passes the empowered flag and `grid.denDoor`
  into `resolveCollisions`, and folds `bonusScore` into the collectables
  score.
- 24 new Vitest tests across `tests/core/collectables.test.ts`,
  `tests/core/collisions.test.ts` (including one case per Duskwisp
  behaviour, empowered and normal), `tests/core/grid.test.ts` (Bloomburst
  reachability), and `tests/core/state.test.ts` (collection, countdown,
  expiry, and both collision outcomes end-to-end through `step()`).
- `src/main.ts` was not touched, per this batch's scope.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm run build` (`vite build`): exited 0, produced `dist/`.
- `npm test` (`vitest run`): exited 0 - **7 test files, 78 tests, all
  passed** (54 pre-existing + 24 new).

### External generation prompts

None used - no external/Lovable/Fable generation was used for this batch;
all code was written directly.

## 2026-09-16 - Batch `02-enemy-ai-and-collisions`

### Decisions

- **Behaviour-to-name mapping**: the four Duskwisps named in batch 01
  (Ember, Frost, Marsh, Dusk) each get one distinct, deterministic movement
  behaviour: **Ember** does a direct greedy chase toward the player's tile;
  **Frost** patrols a fixed four-corner scatter circuit; **Marsh** ambushes
  a tile ahead of the player's current facing; **Dusk** wanders, picking
  uniformly among legal moves. All four are pure functions of grid state
  plus the seeded PRNG - no Pac-Man ghost names, no `Math.random`.
- **Movement model**: enemies reuse the tile-centre-stepping approach from
  `player.ts` (travel in a straight line between tile centres, only
  re-evaluate direction on landing exactly on one) rather than a shared
  helper, to keep this batch's diff scoped to new files plus small,
  additive edits to `types.ts`/`grid.ts`/`theme.ts`/`state.ts`.
- **Tie-breaking**: whenever two or more legal directions are equally good
  for a behaviour's target, the choice is made via `Math.floor(rng() *
  options.length)` against the shared seeded PRNG (`rng.ts`), so identical
  seeds always reproduce identical enemy paths.
- **Den/door**: `grid.ts` now also exposes `denTiles` (every `'G'` tile) and
  `denDoor` (the one den tile bordering non-den, non-wall floor, found by
  scanning each den tile's neighbours). Enemies spawn on `denTiles` and path
  toward `denDoor` while `inDen`, flipping to their normal behaviour once
  they land on a tile that isn't a den tile.
- **Collisions**: `collisions.ts` checks player/enemy tile overlap each
  tick; any overlap costs one life and resets the player and every enemy to
  their spawn tiles (enemies re-enter the den). Power-ups/frightened mode
  are explicitly out of scope for this batch. `state.step` now short-circuits
  once `gameOver` is true, mirroring the existing `levelComplete` guard.
- **PRNG state as plain data**: `GameState` gained `rngSeed` (separate from
  the level `seed`) so the PRNG stream survives across ticks without storing
  a non-serializable closure - each tick reconstructs `mulberry32(rngSeed)`,
  draws whatever the enemies need, then derives the next tick's seed from
  one more draw.

### What was built

- `src/core/enemies.ts`: `createEnemies`, `stepEnemy`, and the underlying
  behaviour functions (`chooseDirectionTowards`, `chooseWanderDirection`,
  `scatterCorners`, `ambushTargetTile`, `computeEnemyTarget`).
- `src/core/collisions.ts`: `resolveCollisions` (lives decrement + spawn
  reset + game-over flag).
- `src/core/types.ts`: added `EnemyBehaviourId`, `EnemyState`, and extended
  `GameState` with `enemies`, `lives`, `gameOver`, `rngSeed`.
- `src/core/grid.ts`: added `denTiles`/`denDoor` to `Grid`.
- `src/core/theme.ts`: added `ENEMY_SPEED_TILES_PER_SEC`.
- `src/core/state.ts`: wired enemy stepping and collision resolution into
  `step`.
- `tests/core/enemies.test.ts`, `tests/core/collisions.test.ts`, plus
  additions to `tests/core/state.test.ts` (24 new tests: three distinct
  behaviours on a small fixed maze fixture, PRNG-seeded tie-breaking,
  den-to-door exit, and collision resolution including the zero-lives case).
- `src/main.ts` was not touched - it doesn't import `state.ts`, so the new
  `GameState` fields didn't require any rendering-layer changes.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm run build` (`vite build`): exited 0, produced `dist/`.
- `npm test` (`vitest run`): exited 0 - **7 test files, 54 tests, all
  passed** (30 pre-existing + 24 new: `enemies.test.ts` 16,
  `collisions.test.ts` 5, `state.test.ts` +3).

### External generation prompts

None used - no Lovable/Fable or other external generation was used for this
batch; all code was written directly.

## 2026-09-16 - Batch `01-scaffold-core-engine`

### Decisions

- **Stack**: Vite + vanilla TypeScript + Vitest. Chosen for a minimal,
  dependency-light setup that supports a DOM-free core engine, fast unit
  tests, and a simple `npm run build` static bundle - no framework needed for
  a single-screen arcade game.
- **Naming**: game title **Glimmerdash**; player **Glim** (a firefly); the
  four enemies are the **Duskwisps** - **Ember**, **Frost**, **Marsh**, and
  **Dusk**. All original, not derived from Pac-Man or any other existing
  game's naming.
- **Level design**: an original 23x27 ASCII maze (`src/core/levels.ts`),
  "The Hollow Garden". Rows are assembled from `wall(n)`/`floor(n)` repeat
  helpers rather than hand-typed long strings, so each row's width is
  guaranteed correct by arithmetic instead of manual character counting.
  The layout is left-right symmetric and was designed with a simple,
  provable connectivity invariant: a 1-tile-wide open frame runs along the
  innermost border (row 1, row H-2, col 1, col W-2) and every wall "pillar"
  is an isolated rectangle that never touches that frame or another pillar,
  so the walkable area can never be split into disconnected regions. The
  enemy den is a small enclosed room with exactly one door tile connecting
  it to the frame. This was verified both by that construction argument and
  by an automated BFS connectivity test (`tests/core/grid.test.ts`) that
  checks every non-wall tile, including every pellet, is reachable from the
  player spawn.
- **Core architecture**: game logic in `src/core/` has zero DOM/canvas
  imports so it can be unit tested directly under Vitest (Node
  environment) and reused later by any rendering layer. `state.step` is a
  pure function of `(state, input, dtMs)`; enemy AI and power-up timers are
  left as explicit `TODO` hooks for later batches.

### What was built

- Vite/TypeScript/Vitest project scaffold (`package.json`, `tsconfig.json`,
  `vite.config.ts`, `.gitignore`).
- `src/core/`: `theme.ts`, `levels.ts`, `types.ts`, `rng.ts`, `grid.ts`,
  `player.ts`, `collectables.ts`, `state.ts`.
- `tests/core/`: `grid.test.ts`, `player.test.ts`, `collectables.test.ts`,
  `state.test.ts`, `rng.test.ts` (30 tests).
- `index.html` + `src/main.ts` + `src/style.css`: boots the app and renders
  the maze walls, pellets, power pellets, and player spawn marker on a
  canvas (no game loop yet - out of scope for this batch).
- `README.md` rewritten with the game name, run instructions, controls,
  project structure, and an implementation Status section.

### Test results

Repaired on 2026-09-16 in a follow-up pass: `npm install`, `npm run
typecheck`, `npm test`, and `npm run build` were actually executed (not
hand-traced) with a human confirming npm/node command execution was
approved for this run.

- `npm install`: succeeded, `node_modules/` populated and
  `package-lock.json` generated/committed.
- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm test` (`vitest run`): exited 0 - **5 test files, 30 tests, all
  passed** (`grid.test.ts` 11, `player.test.ts` 6, `collectables.test.ts` 6,
  `state.test.ts` 4, `rng.test.ts` 3).
- `npm run build` (`vite build`): exited 0, produced `dist/` (`index.html`,
  a CSS asset, and a JS asset).

No bugs were found in the existing core logic or tests during this repair
pass - the hand-traced reasoning from the original batch held up under real
execution.

### External generation prompts

None used.
