# Audit Trail

Dated log of build/review/repair decisions for Glimmerdash. Newest entries
first.

## 2026-09-16 - Batch `09-final-verification-and-report`

### Decisions

- **Verification-and-documentation batch only, scope held strictly**: no
  dependency changes, no `src/core/*` changes, no redesign. `dist/` and
  `test-results/` were deleted before verifying (both gitignored/untracked)
  so every command below ran from a genuinely clean state, not stale
  build/test output from batch `08`.
- **One small addition to `tests/e2e/smoke.spec.ts`**: a shared
  `pageErrors` array populated by `page.on('pageerror', ...)` and
  `page.on('console', msg => msg.type() === 'error' ? ... )` listeners
  registered in a new `test.beforeEach`, asserted empty in a new
  `test.afterEach`. This applies to every existing test in the file,
  including "keyboard input starts the game, moves the player, and collects
  a pellet" (already covers start -> move -> pellet pickup), so no new test
  case was needed - only the pass/fail criterion for the existing ones
  tightened. No test assertions were weakened or removed.
- **No source fix was needed**: `npm run typecheck`, `npm run build`,
  `npm test`, and `npm run test:e2e` all passed cleanly on the first run
  after the `dist/`/`test-results/` wipe, and the new
  pageerror/console-error check found zero errors across all 6 E2E tests.
  Per the batch's own instructions, since nothing failed, no other source
  file was touched.
- **`docs/FINAL_REPORT.md`** was written as the "kort eindrapport" required
  by `PROMPT_AND_ACCEPTANCE.md`: game description, how to run/play, a table
  mapping each of the 7 Dutch acceptance criteria to implementing
  files/functions and the tests proving them, this batch's verification
  results, a one-line-per-batch build/repair history summary (pointing to
  this file for detail), an explicit no-original-Pac-Man-assets and
  no-external-generation-tool statement, and a known-limitations list.
- **README.md**: added a "Documentation" section linking
  `docs/FINAL_REPORT.md` and `docs/AUDIT_TRAIL.md`, and appended an explicit
  "Complete and verified as of 2026-09-16" statement to the end of the
  Status section (the existing "Implemented"/"Planned" content was left
  intact, not rewritten).

### What was built

- `tests/e2e/smoke.spec.ts`: `beforeEach`/`afterEach` hooks asserting no
  `pageerror` or console `error` event fired during any test.
- `docs/FINAL_REPORT.md`: new file, the short final report.
- `README.md`: new "Documentation" section plus a "Complete and verified"
  line in Status.
- `docs/AUDIT_TRAIL.md`: this entry.

### Test results

All run from a clean state (`dist/` and `test-results/` removed first):

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm run build` (`vite build`): exited 0.
  ```
  vite v5.4.21 building for production...
  transforming...
  ✓ 18 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                  0.40 kB │ gzip: 0.27 kB
  dist/assets/index-34FdyVHZ.css   2.62 kB │ gzip: 1.01 kB
  dist/assets/index-BKu-Wwpw.js   23.66 kB │ gzip: 8.66 kB
  ✓ built in 264ms
  ```
- `npm test` (`vitest run`): exited 0 - **11 test files, 113 tests, all
  passed** (unchanged from batch `08`, confirming no regression):
  ```
   ✓ tests/core/enemies.test.ts (18 tests) 14ms
   ✓ tests/core/collisions.test.ts (19 tests) 11ms
   ✓ tests/core/state.test.ts (13 tests) 16ms
   ✓ tests/core/pathfinding.test.ts (13 tests) 17ms
   ✓ tests/core/integration.test.ts (3 tests) 38ms
   ✓ tests/core/progression.test.ts (11 tests) 22ms
   ✓ tests/core/collectables.test.ts (9 tests) 6ms
   ✓ tests/core/grid.test.ts (12 tests) 10ms
   ✓ tests/core/player.test.ts (6 tests) 5ms
   ✓ tests/core/loop.test.ts (6 tests) 5ms
   ✓ tests/core/rng.test.ts (3 tests) 8ms

   Test Files  11 passed (11)
        Tests  113 passed (113)
  ```
- `npm run test:e2e` (`playwright test`, headless Chromium, run from a
  clean `dist/`): exited 0 - **6 passed (5.3s)**, including the new
  pageerror/console-error assertion on every test:
  ```
  Running 6 tests using 1 worker

    ✓  1 [chromium] › tests/e2e/smoke.spec.ts:17:1 › shows a start overlay that is dismissed by starting the game (436ms)
    ✓  2 [chromium] › tests/e2e/smoke.spec.ts:27:1 › renders the maze, canvas, and initial HUD (311ms)
    ✓  3 [chromium] › tests/e2e/smoke.spec.ts:40:1 › keyboard input starts the game, moves the player, and collects a pellet (524ms)
    ✓  4 [chromium] › tests/e2e/smoke.spec.ts:68:1 › restart resets score, lives, and game-over state (467ms)
    ✓  5 [chromium] › tests/e2e/smoke.spec.ts:87:1 › HUD shows the current level number after starting (378ms)
    ✓  6 [chromium] › tests/e2e/smoke.spec.ts:100:1 › mute button toggles its pressed state and label (370ms)

    6 passed (5.3s)
  ```
- `git diff --stat -- src/core package.json package-lock.json`: empty,
  confirming the core engine and dependencies are byte-identical to
  batch `08`.
- Final re-check before finishing, as required by this batch's
  instructions: `npm run typecheck` (exit 0) and `npm test` (exit 0, 113/113
  passed) were run once more after writing the documentation changes above,
  confirming the documentation-only edits did not affect the engine or
  break typechecking.

### External generation prompts

None used - no Lovable/Fable or other external generation was used for this
batch; all changes were written directly.

## 2026-09-16 - Batch `08-level-progression-and-integration-test`

### Decisions

- **`levelNumber` and `advanceLevel()` live in `src/core/state.ts`, not a
  new module**: level progression is a thin extension of the existing
  `GameState`/`createInitialState`/`step` trio - a 1-based `levelNumber`
  field, and a pure `advanceLevel(state)` that only runs once
  `state.levelComplete` is true (throws otherwise, matching the "no-op or
  throw" choice required by the batch - throwing was chosen because calling
  it before completion is a caller bug, not a valid game state to silently
  ignore). It builds the next level via the existing `createInitialState`
  and then splices in the carried-over `lives` and `collectables.score`, so
  every other reset (pellets, player, enemies, empowerment) is guaranteed to
  match a brand-new level exactly - there is no separate reset code path to
  drift out of sync with `createInitialState`.
- **Deterministic difficulty ramp is a pure function of `levelNumber`
  alone**: `enemySpeedMultiplier(levelNumber)` and
  `bloomburstDurationTicks(levelNumber)` (both exported from `state.ts`) are
  plain arithmetic, no RNG involved, matching the job goal's
  "deterministic/testable core logic" requirement. Enemy speed ramps +6%
  per level above 1, capped at 1.6x (reached at level 11); Bloomburst
  duration shrinks 5% per level above 1, floored at 40% of the base duration
  (reached at level 13). Both floors/caps mean the ramp saturates instead of
  degenerating to zero speed or an unbounded frighten timer at very high
  levels. At `levelNumber === 1` both multipliers are exactly `1`, so this
  batch changes zero observable behaviour for existing level-1 gameplay or
  tests.
- **`LEVELS` has one map, so "next level" cycles it**: `advanceLevel` computes
  `nextLevelIndex = (state.levelIndex + 1) % LEVELS.length`, which is always
  `0` today; the modulo is there so a future batch can add a second map
  without touching this function.
- **Test-only `freezeEnemies` flag added as an explicit `GameState` field and
  `createInitialState` parameter**, exactly as the batch instructions
  required for any enemy-disabling test hook: when `true`, `step()` skips
  `stepEnemy` entirely and leaves `state.enemies` untouched (they stay put in
  the den). This lets `tests/core/integration.test.ts` script a full,
  deterministic level clear via real `step()` calls without its outcome
  depending on enemy escape timing or a hand-picked "safe" seed - collision
  and respawn behaviour is already covered by `state.test.ts` and
  `collisions.test.ts`, so this integration test's job is to prove pellet
  collection and level completion end-to-end, not to re-prove collisions.
  The flag defaults to `false` for every existing call site (including all
  pre-existing tests and `main.ts`), so real gameplay is unaffected.
- **Integration test walks a real BFS path, one tile per `step()` call**:
  `tests/core/integration.test.ts` repeatedly finds the first remaining
  pellet in row-major order via `findPath` (`src/core/pathfinding.ts`) from
  the player's current tile, then issues one `step()` call per tile in that
  path with `dtMs = 1000 / PLAYER_SPEED_TILES_PER_SEC` (the exact time to
  cross one tile at the player's fixed speed - the same relationship the
  pre-existing `state.test.ts` movement tests already rely on), so the
  simulated playthrough is indistinguishable from real keyboard-driven
  movement. It re-scans for the next target after each full path walk
  (not after every tile) so any pellets incidentally collected en route are
  picked up for free, matching real play.
- **`main.ts` gets a HUD level indicator and a level-complete "continue"
  flow, no core logic added**: a new `data-testid="hud-level"` span shows
  `Level N`; the level-complete overlay's title/hint update to name the next
  level and a `data-testid="next-level-button"` button appears; Enter now
  branches on `gameOver` (restart, unchanged) vs. `levelComplete` (calls the
  new `advanceToNextLevel()`, which just calls `core`'s `advanceLevel()` and
  resets the same presentation-only variables `resetGame()` already resets -
  `previousRenderState`, `desiredDirection`, `lastFacing`,
  `lastRenderedLives`, `remainderMs`, and the effects list). The existing
  level-complete sound cue still fires exactly once, from the pre-existing
  `handleTransition()` diff (`curr.levelComplete && !prev.levelComplete`),
  since that transition happens during normal `step()` ticking before the
  player ever presses Enter/clicks the button - `advanceToNextLevel()` does
  not need to (and does not) trigger any additional audio.
- **Manual browser verification used a throwaway debug hook, not a shipped
  one**: to confirm the Enter/button-driven level-complete-to-level-2 flow
  actually works in a real headless browser (forcing a full level clear
  purely to test UI wiring would have taken an impractically long scripted
  playthrough), a temporary `window.__mazeChase.__debugForceLevelComplete()`
  method and a throwaway Playwright spec were added, run, and then both were
  fully removed before finishing this batch - `git diff` after this batch
  shows no trace of either. The temporary spec confirmed: the level-complete
  overlay shows "Level 1 Clear!" with the Next Level button, lives are
  preserved, Enter advances to `levelNumber: 2` with `levelComplete: false`
  and the HUD updates to "Level 2", the Next Level button does the same, and
  a game-over restart still resets to level 1 with score 0.

### What was built

- `src/core/types.ts`: `GameState.levelNumber` (1-based) and
  `GameState.freezeEnemies` (test-only, documented in a doc comment).
- `src/core/state.ts`: `enemySpeedMultiplier()`, `bloomburstDurationTicks()`,
  and `advanceLevel()`, all exported; `createInitialState()` gained
  `levelNumber` and `freezeEnemies` parameters (both optional, defaulting to
  today's behaviour); `step()` now skips enemy movement when frozen and uses
  the ramped Bloomburst duration instead of the flat constant.
- `tests/core/progression.test.ts` (11 tests): `advanceLevel` throwing before
  completion, `levelNumber` incrementing, score/lives carrying over,
  collectables/player/enemies/empowerment resetting, the ramp being strictly
  harder at level 2 than level 1, the ramp's floor/cap saturating at a very
  high level, and same-input determinism.
- `tests/core/integration.test.ts` (3 tests): a full deterministic Hollow
  Garden clear via scripted `step()` calls with the exact expected score,
  continuing into level 2 via `advanceLevel()` and collecting a pellet
  there, and same-seed determinism across a full replay (including the
  level-2 continuation).
- `src/main.ts`: `hud-level` HUD span, level-complete overlay next-level
  button/copy, `advanceToNextLevel()`, and the Enter-key branch update.
- `tests/e2e/smoke.spec.ts`: one new test asserting `hud-level` reads
  "Level 1" after starting.
- `README.md`: level-progression coverage in the feature list, how-to-play,
  and testing sections.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm test` (`vitest run`): exited 0 - **11 test files, 113 tests, all
  passed** (102 pre-existing + 11 new `progression.test.ts` + re-counted;
  net new files: `progression.test.ts` 11 tests, `integration.test.ts` 3
  tests).
- `npm run build` (`vite build`): exited 0, produced `dist/` (`index.html`,
  one CSS asset, one JS asset).
- `npx playwright test` (Chromium, already installed): exited 0 - **6
  tests, all passed**, including the new "HUD shows the current level
  number after starting" test.
- Manual browser-flow verification (temporary debug hook + throwaway spec,
  removed afterward - see Decisions above): 3/3 passed, confirming the
  level-complete overlay, Next Level button, Enter-to-continue, HUD level
  update, and game-over-restarts-at-level-1 behaviour all work in a real
  headless Chromium browser, not just in unit tests.

### External generation prompts

None used - no Lovable/Fable or other external generation was used for this
batch; all code was written directly.

## 2026-09-16 - Batch `07-visual-audio-polish`

### Decisions

- **Presentation-only scope, `src/core/` untouched**: every change lives in
  `src/main.ts`, three new `src/ui/*.ts` modules, `src/style.css`,
  `tests/e2e/smoke.spec.ts`, and docs. Confirmed with
  `git diff --stat -- src/core` returning empty before and after this
  batch's work, so the deterministic engine and its 99 existing unit tests
  are byte-identical.
- **New `src/ui/` modules instead of growing `main.ts` further**:
  `src/ui/audio.ts` (Web Audio synthesis + mute persistence),
  `src/ui/effects.ts` (cosmetic particle/popup effect list), and
  `src/ui/render.ts` (the render-interpolation helper) are small,
  single-purpose, DOM-light modules with no GameState imports beyond
  `Vec2`, matching the existing pattern of small core modules. `main.ts`
  still owns all DOM construction, the game loop, and event diffing, so
  there is exactly one place that reads `GameState`.
- **Title kept as "Glimmerdash", not renamed to "The Hollow Garden"**: the
  job description used "The Hollow Garden" only as an example of existing
  theme naming to reuse; `Glimmerdash` was already the one consistent
  title across `index.html`, `theme.ts`'s `GAME_TITLE`, and the README
  since batch 01, so the start overlay and `document.title` reuse it
  as-is rather than introducing a second, conflicting name. "The Hollow
  Garden" remains the in-fiction location name, used in the start
  overlay's premise line and the existing level-complete overlay text.
- **Start gate is a boolean, not a new `GameState` field**: `let started =
  false` in `main.ts` gates whether `frame()` calls `accumulateTicks`/
  `step()` at all; when `false`, the loop still renders every frame (so the
  start screen and idle sprite animation are visible) but never advances
  simulated time, so `remainderMs` can't build up a burst of ticks while
  the overlay is up. Chosen over a `GameState.started` field because
  "has the run begun" is a presentation concern, not something `step()`,
  collisions, or any test in `tests/core/` needs to know about.
- **Enter dismisses the start overlay; the existing E2E movement test was
  updated to press Enter first** (one of the two documented options in the
  batch instructions) rather than also dismissing on the first arrow key,
  since Enter-to-start reads unambiguously as an intentional action versus
  a movement key that could be pressed to explore controls without meaning
  to start.
- **Render interpolation via a pure helper, not stored on `GameState`**:
  `src/ui/render.ts`'s `interpolatePos(prev, curr, alpha, gridWidth)` takes
  two tile-space `Vec2`s and lerps between them by the accumulator's
  leftover fraction (`remainderMs / STEP_MS`). `main.ts` keeps a
  `previousRenderState` module variable, reassigned to the pre-step
  `GameState` only when a tick actually fires (so it correctly holds its
  value across frames where zero ticks ran, letting `alpha` climb smoothly
  toward 1 between ticks). Two teleport cases are explicitly excluded from
  interpolation and snapped to the current position instead: a tunnel wrap
  (`|dx| > gridWidth / 2`) and any other jump bigger than one tile in a
  single step (`|dx| > 1 || |dy| > 1`, e.g. a life-lost respawn back to
  spawn) - both would otherwise render as a streak sweeping across the
  maze. Enemies are matched between `prev`/`curr` by `EnemyState.id`
  (stable across the whole run), not array index, defensively - even
  though `createEnemies` always returns the same four ids in the same
  order today.
- **Events are derived by diffing states in `main.ts`, never fed back into
  `state`**: `handleTransition(prev, curr, nowMs)` runs once per tick
  (inside the same loop that calls `step()`), comparing `lives`,
  `enemies[].inDen` transitions (used instead of raw score deltas to
  detect enemy defeats, since it stays correct even if several Duskwisps
  are defeated in the same tick), `empoweredTicksRemaining` transitioning
  from `0`, and `collectables.score` deltas with the already-explained
  defeat/empowerment portion subtracted out to isolate a plain
  pellet/power-pellet pickup. It only calls into `src/ui/effects.ts`
  (`spawnRing`/`spawnBurst`/`spawnPopup`, which push into a private,
  module-local array) and `src/ui/audio.ts`'s `play*` functions, and reads
  `GameState` fields without writing any of them - so cosmetic effects
  cannot influence the deterministic simulation.
- **Screen shake / red flash / HUD score bump via CSS animations, not
  canvas drawing**: `stage.shake` and `flashOverlay.flash-active` are
  plain keyframe animations retriggered by removing the class, forcing a
  reflow (`void el.offsetWidth`), then re-adding it, so rapid repeats (e.g.
  losing two lives close together) restart visibly instead of being
  no-ops. This was simpler and more robust than hand-rolling the same
  effect as time-based canvas transforms, and keeps `src/ui/effects.ts`
  focused on effects that need to be drawn in tile-space on the canvas
  (rings/bursts/popups).
- **Frighten-flash threshold reuses the existing `BLOOMBURST_DURATION_TICKS`
  constant** (`theme.ts`, untouched): `FRIGHTEN_WARNING_TICKS =
  BLOOMBURST_DURATION_TICKS * 0.25` in `main.ts`, so Duskwisps start
  flashing between their frightened and normal colors during the last
  quarter of empowerment without introducing a second, possibly
  inconsistent constant in the core theme module.
- **Audio: lazy `AudioContext`, graceful failure, six original synthesized
  cues**: `src/ui/audio.ts`'s `unlockAudio()` is only ever called from
  inside a user-gesture handler (the Start button click, the first
  keydown, or the mute button click) and is a no-op on repeat calls beyond
  resuming a suspended context. Every `play*` function and `unlockAudio`
  itself is wrapped in `try/catch` and silently no-ops if `AudioContext`
  construction or scheduling throws, so the game runs identically in
  environments without Web Audio. All six cues (`playPickup`,
  `playPowerUp`, `playDefeat`, `playLifeLost`, `playLevelComplete`,
  `playGameOver`) are built purely from `OscillatorNode`/`GainNode`
  envelopes (square/sawtooth/triangle waves, short attack/decay) - no audio
  files, no recognizable melody. Mute state persists to `localStorage`
  under `glimmerdash.muted` (read/write both wrapped in `try/catch` for
  storage-disabled contexts) and is exposed via the `M` key and the
  on-screen `data-testid="mute-button"` button, which also sets
  `aria-pressed` and swaps its label.
- **`tests/e2e/smoke.spec.ts` restructured, not just patched**: added a new
  first test asserting the start overlay is visible on load and hidden
  after clicking `data-testid="start-button"`; the existing movement test
  now clicks the body, presses `Enter` (asserting the overlay becomes
  hidden), then proceeds exactly as before; the restart test also presses
  `Enter` before its `ArrowUp`; a new final test clicks
  `data-testid="mute-button"` and asserts `aria-pressed` and its text
  label both change, then change back on a second click. No test was
  removed or weakened.

### What was built

- `src/ui/render.ts`: `interpolatePos` - the pure tile-space lerp/snap
  helper described above.
- `src/ui/effects.ts`: `spawnRing`, `spawnBurst`, `spawnPopup`,
  `clearEffects` (called on restart), and `drawEffects` (canvas draw +
  expiry sweep), backing a private module-local effect list.
- `src/ui/audio.ts`: `unlockAudio`, `isMuted`/`setMuted`/`toggleMuted`
  (localStorage-backed), and six `play*` synthesized sound effects.
- `src/main.ts`: start overlay + Start button + "Press Enter to begin"
  gating simulation start; a `previousRenderState`-tracking game loop that
  calls `interpolatePos` for the player and every enemy each render;
  direction-aware player mouth animation and per-enemy idle
  bob/sway/frighten-flash in `drawPlayer`/`drawEnemy`; `handleTransition`
  wiring state diffs to `src/ui/effects.ts`/`src/ui/audio.ts`; an
  empowered-timer HUD bar, lives icons (alongside the existing `Lives: N`
  text), and the mute button/`M`-key handler.
- `src/style.css`: header layout, HUD score-bump keyframes, lives-icon and
  empowered-bar styling, mute-button styling, start-overlay/start-button
  styling, and the shake/flash keyframes.
- `tests/e2e/smoke.spec.ts`: rewritten/extended to 5 tests as described
  above (was 3).
- `README.md`: "How to play" reworked into a controls table plus the M-mute
  control, a new "Polish & feedback" section, updated "Testing"/"Project
  structure"/"Status" sections.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm run build` (`vite build`): exited 0.
  ```
  vite v5.4.21 building for production...
  transforming...
  ✓ 18 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                  0.40 kB │ gzip: 0.27 kB
  dist/assets/index-34FdyVHZ.css   2.62 kB │ gzip: 1.01 kB
  dist/assets/index-Be2-6nu0.js   22.49 kB │ gzip: 8.26 kB
  ✓ built in 269ms
  ```
- `npm test` (`vitest run`): exited 0 - **9 test files, 99 tests, all
  passed** (unchanged from batch `06`, confirming `src/core/*` semantics
  are untouched):
  ```
   ✓ tests/core/enemies.test.ts (18 tests) 15ms
   ✓ tests/core/collisions.test.ts (19 tests) 10ms
   ✓ tests/core/state.test.ts (13 tests) 16ms
   ✓ tests/core/pathfinding.test.ts (13 tests) 11ms
   ✓ tests/core/collectables.test.ts (9 tests) 6ms
   ✓ tests/core/grid.test.ts (12 tests) 12ms
   ✓ tests/core/player.test.ts (6 tests) 6ms
   ✓ tests/core/loop.test.ts (6 tests) 4ms
   ✓ tests/core/rng.test.ts (3 tests) 8ms

   Test Files  9 passed (9)
        Tests  99 passed (99)
  ```
- `git diff --stat -- src/core`: empty output, confirming no core-engine
  file changed.
- `npm run test:e2e` (`playwright test`): exited 0 - **5 passed (4.9s)**:
  ```
  Running 5 tests using 1 worker

    ✓  1 [chromium] › tests/e2e/smoke.spec.ts:3:1 › shows a start overlay that is dismissed by starting the game (444ms)
    ✓  2 [chromium] › tests/e2e/smoke.spec.ts:13:1 › renders the maze, canvas, and initial HUD (318ms)
    ✓  3 [chromium] › tests/e2e/smoke.spec.ts:26:1 › keyboard input starts the game, moves the player, and collects a pellet (531ms)
    ✓  4 [chromium] › tests/e2e/smoke.spec.ts:54:1 › restart resets score, lives, and game-over state (476ms)
    ✓  5 [chromium] › tests/e2e/smoke.spec.ts:73:1 › mute button toggles its pressed state and label (383ms)

    5 passed (4.9s)
  ```

### External generation prompts

None used - no external/Lovable/Fable generation was used for this batch;
all code (sprite animation, cosmetic effects, synthesized audio, start
screen, HUD polish) was written directly by hand, not generated by an
external design/prototyping tool.

### Repair 1 (2026-09-16)

Independent review found a real defect in `handleTransition()`'s event
diffing: enemy defeats were detected purely from an enemy's `inDen`
transitioning `false -> true`. `resolveCollisions()`
(`src/core/collisions.ts`) resets `inDen` to `true` on *every* enemy - not
just a defeated one - when the player loses a life, so each life loss was
misread as N simultaneous enemy defeats: every enemy that had been out of
its den got a spurious `+150` popup and particle burst, and `playDefeat()`
fired alongside `playLifeLost()`.

- **Fix**: `handleTransition()` now derives `defeatCount` from the score
  delta instead of trusting `inDen` alone. When `curr.lives < prev.lives`
  (a life was lost), defeat detection is skipped entirely for that tick -
  a life loss and an enemy defeat are mutually exclusive within one
  `state.step()` call. Otherwise, `defeatCount = Math.floor((scoreDelta -
  (justEmpowered ? BLOOMBURST_SCORE : 0)) / BLOOMBURST_DEFEAT_SCORE)`, which
  correctly isolates defeats even when a plain pellet or the Bloomburst
  itself is picked up in the same tick (their scores are far smaller than
  `BLOOMBURST_DEFEAT_SCORE = 150`, so they land in the `floor` remainder,
  not the defeat count). The `inDen` `false -> true` transition is still
  used, but only to choose *which* enemies get a popup/burst, capped at
  `defeatCount` - it is no longer the sole signal for *whether* a defeat
  happened. A comment in `src/main.ts` explains why `inDen` alone is
  insufficient.
- **`renderLivesIcons()` DOM churn (MINOR)**: it was called from `render()`
  every animation frame and rebuilt `livesIconsEl.innerHTML` every time,
  even though the lives count changes only on life loss/restart. Added a
  module-level `lastRenderedLives` cache (reset to `-1` in `resetGame()`)
  so the icon DOM is only rebuilt when the lives count actually changes.
- **`drawPlayer()` mutating `lastFacing` (MINOR)**: render functions should
  be read-only. Moved the `lastFacing` update out of `drawPlayer()` and
  into the tick loop in `frame()`, right after `state.step()` returns each
  tick, so `drawPlayer()` now only reads `lastFacing`.
- **Audit count (INFO)**: corrected "two new `src/ui/*.ts` modules" to
  "three new `src/ui/*.ts` modules" in this entry's first Decisions bullet
  (`audio.ts`, `effects.ts`, `render.ts`).

Verification after the fix - real command output:

```
$ npm run typecheck
> glimmerdash@0.1.0 typecheck
> tsc --noEmit

$ npm run build
> glimmerdash@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 18 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.40 kB │ gzip: 0.27 kB
dist/assets/index-34FdyVHZ.css   2.62 kB │ gzip: 1.01 kB
dist/assets/index-D_OjEnGq.js   22.60 kB │ gzip: 8.32 kB
✓ built in 264ms

$ npm test
> glimmerdash@0.1.0 test
> vitest run

 RUN  v2.1.9 /home/myngle/Myngle/Mingo/AI-Agent-Challenge/repos/ai-agent-challenge-05-maze-chase

 ✓ tests/core/enemies.test.ts (18 tests) 20ms
 ✓ tests/core/collisions.test.ts (19 tests) 8ms
 ✓ tests/core/state.test.ts (13 tests) 20ms
 ✓ tests/core/pathfinding.test.ts (13 tests) 9ms
 ✓ tests/core/collectables.test.ts (9 tests) 7ms
 ✓ tests/core/grid.test.ts (12 tests) 10ms
 ✓ tests/core/player.test.ts (6 tests) 7ms
 ✓ tests/core/loop.test.ts (6 tests) 5ms
 ✓ tests/core/rng.test.ts (3 tests) 8ms

 Test Files  9 passed (9)
      Tests  99 passed (99)

$ npm run test:e2e
> glimmerdash@0.1.0 test:e2e
> playwright test

Running 5 tests using 1 worker

  ✓  1 [chromium] › tests/e2e/smoke.spec.ts:3:1 › shows a start overlay that is dismissed by starting the game (428ms)
  ✓  2 [chromium] › tests/e2e/smoke.spec.ts:13:1 › renders the maze, canvas, and initial HUD (299ms)
  ✓  3 [chromium] › tests/e2e/smoke.spec.ts:26:1 › keyboard input starts the game, moves the player, and collects a pellet (535ms)
  ✓  4 [chromium] › tests/e2e/smoke.spec.ts:54:1 › restart resets score, lives, and game-over state (476ms)
  ✓  5 [chromium] › tests/e2e/smoke.spec.ts:73:1 › mute button toggles its pressed state and label (356ms)

  5 passed (4.8s)
```

`git diff --stat HEAD -- src/core` and `git diff --stat HEAD -- package.json`
were both empty before and after this repair - the deterministic engine and
dependencies are unchanged.

No external/Lovable/Fable generation was used for this repair; all changes
were written directly by hand.

## 2026-09-16 - Batch `06-real-pathfinding-for-enemies`

### Decisions

- **New pure module, not folded into `enemies.ts`**: `src/core/pathfinding.ts`
  is a standalone module with zero DOM/canvas imports, exporting `findPath`
  (breadth-first search) and `nextStepTowards` (its first-step convenience
  wrapper). Keeping it separate from `enemies.ts` matches the existing
  pattern of small, single-purpose core modules (`grid.ts`, `collisions.ts`,
  etc.) and makes the BFS itself directly unit-testable without going
  through enemy-stepping machinery.
- **Reused existing maze primitives instead of duplicating them**: `isWall`
  and `wrapCol` from `grid.ts` are imported directly, so wall-blocking and
  horizontal tunnel wrap behave identically to every other place in the
  codebase that walks the grid (`neighbours`, `chooseDirectionTowards`,
  etc.) - there is exactly one definition of "is this tile passable" for
  walls/wrap, just extended with a den-aware check local to pathfinding.
- **Den handling**: den tiles other than `grid.denDoor` are impassable by
  default (`forbidDen` defaults to `true`), matching the task's requirement
  that outside navigation not cut through the ghost house. The door tile
  itself is always passable regardless of the flag, since it is the
  intended den-to-maze connection point. `forbidDen: false` exists for
  completeness/testing (an enemy that's allowed to cut through) but nothing
  in `enemies.ts` currently passes it.
- **Fixed neighbour order (up, left, down, right)**: chosen arbitrarily but
  fixed, so that when multiple shortest paths tie in length, `findPath`
  deterministically and reproducibly picks the same one every time (needed
  for both testability and for enemy movement to not flicker between
  equally-good routes). This differs from `grid.ts`'s `neighbours()` order
  (up, down, left, right) - reordering it for BFS determinism is not a
  change to maze/wall logic, just to traversal order, so `grid.ts` was left
  untouched.
- **Allocation-light BFS**: visited/`cameFrom` are flat `Uint8Array`/
  `Int32Array` indexed by `row * cols + col` (no per-tile object allocation,
  no string-keyed `Set`/`Map`), and the queue is a plain array with a `head`
  index instead of `Array.shift()`, so it's cheap enough to call once per
  enemy per tile-centre decision without a perceptible cost at 60 ticks/sec.
- **Inclusive path convention**: `findPath` returns both endpoints inclusive
  (`from` at index 0, `to` at the end); `from === to` returns the
  single-element array `[from]` rather than `[]`, and `nextStepTowards`
  returns `null` whenever the path has fewer than two tiles (unreachable or
  already there) rather than distinguishing those two cases, since Ember's
  fallback-to-greedy behaviour treats them identically.
- **Only Ember (chase) was switched to BFS, not Marsh (ambush)**: the batch
  instructions made ambush's pathfinder use optional ("may also use");
  leaving Frost (scatter), Marsh (ambush), and Dusk (wander) on their
  existing greedy/random logic keeps the four Duskwisps visibly distinct in
  play and keeps this batch's diff to `enemies.ts` minimal - one new
  `else if` branch in `stepEnemy` for `behaviour === 'chase' && !inDen`,
  nothing else changed. The existing greedy heuristic
  (`chooseDirectionTowards`) is kept as Ember's fallback for the case where
  `nextStepTowards` returns `null` (target unreachable under den
  restrictions), and remains untouched/reused as-is for every other
  behaviour and for path-to-the-den-door movement while `inDen`.
- **`src/main.ts` untouched**: this batch is core-logic-only; rendering
  already draws each Duskwisp from its `EnemyState.pos`/`direction`, which
  are unaffected in shape by how the direction was chosen internally.

### What was built

- `src/core/pathfinding.ts`: `findPath` (deterministic BFS shortest path,
  wall/tunnel-wrap/den-aware) and `nextStepTowards` (first-move direction
  along that path).
- `src/core/enemies.ts`: `stepEnemy`'s per-tile-centre direction choice now
  special-cases `chase` behaviour outside the den to call
  `nextStepTowards`, falling back to `chooseDirectionTowards` (the existing
  greedy heuristic) only when no path exists. Scatter, ambush, wander, and
  in-den door-seeking movement are unchanged.
- `tests/core/pathfinding.test.ts`: 13 new Vitest tests - straight corridor,
  a wall/den detour with a hand-counted shortest length (10 tiles) plus its
  deterministic tie-break, unreachable target, `from === to`, tunnel wrap
  taken because it's shorter, den avoidance by default/explicit/disabled,
  cross-call determinism, and `nextStepTowards` matching `findPath`'s first
  step (including its two null cases).
- `tests/core/enemies.test.ts`: 2 new tests showing the greedy heuristic
  alone would step Ember into a den dead end (`down`, minimal Manhattan
  distance to the door) while `stepEnemy` with the new BFS-backed chase
  logic instead steps `left`, matching the true shortest route around the
  den.
- `README.md`: Status section now mentions the breadth-first pathfinding
  module and that Ember uses it (with the greedy heuristic only as a
  fallback), rather than implying chase is purely heuristic-driven.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm test` (`vitest run`): exited 0 - **9 test files, 99 tests, all
  passed** (84 pre-existing + 13 in `pathfinding.test.ts` + 2 in
  `enemies.test.ts`).
- `npm run build` (`vite build`): exited 0, produced `dist/`.
- `npx playwright test`: exited 0 - **3 passed (2.6s)**, unaffected by this
  batch since `src/main.ts` was not touched:
  ```
  Running 3 tests using 1 worker

    ✓  1 [chromium] › tests/e2e/smoke.spec.ts:3:1 › renders the maze, canvas, and initial HUD (255ms)
    ✓  2 [chromium] › tests/e2e/smoke.spec.ts:16:1 › keyboard input moves the player and collects a pellet (364ms)
    ✓  3 [chromium] › tests/e2e/smoke.spec.ts:41:1 › restart resets score, lives, and game-over state (339ms)

    3 passed (2.6s)
  ```

### External generation prompts

None used - no external/Lovable/Fable generation was used for this batch;
all code was written directly.

## 2026-09-16 - Batch `05-e2e-headless-smoke-test`

### Decisions

- **Debug hook, not a new game mode**: `src/main.ts` now assigns a
  read-only `window.__mazeChase` object (`getState()`, `getTick()`,
  `restart()`) right after `state`/`tick`/`resetGame` are declared.
  `getState()`/`getTick()` are plain closures over the existing `state`/
  `tick` module variables (no new fields on `GameState`, no behavioural
  change), and `restart()` just calls the existing `resetGame()`. This
  keeps the hook additive and side-effect-free for normal play - it exists
  purely so the E2E test can read simulation state and trigger a restart
  deterministically instead of scraping the DOM or guessing timing.
- **`tick` counter**: a new `let tick = 0` in `main.ts`, incremented once
  per `state.step()` call inside `frame()` and reset to `0` in
  `resetGame()`. This is a rendering-layer concern only (not part of
  `GameState`), so no `src/core/*` file changed.
- **`data-testid` attributes, not CSS classes, for test hooks**: added
  `data-testid` to the canvas (`game-canvas`), the two HUD spans
  (`hud-score`, `hud-lives`), and both overlays (`overlay-game-over`,
  `overlay-level-complete`) so `tests/e2e/smoke.spec.ts` can locate them
  via Playwright's `getByTestId`, independent of CSS class names (which
  are still used for styling and toggling `.hidden`) or visible text.
- **Chosen movement key**: `tests/e2e/smoke.spec.ts` presses `ArrowUp`
  because the player spawn tile (`{ x: 11, y: 24 }` in `The Hollow
  Garden`, confirmed by temporarily running `createInitialState`/`step`
  under Vitest before writing the test, then discarding that scratch
  file) has an open, pellet-bearing floor tile directly above it, so one
  key press both moves the player and increases the score inside the
  test's 5s `waitForFunction` window.
- **Vitest/Playwright separation**: `vite.config.ts`'s Vitest `test.include`
  was already scoped to `tests/**/*.test.ts` (the new spec is named
  `smoke.spec.ts`, so it was never matched), but an explicit
  `test.exclude: ['tests/e2e/**', 'node_modules/**']` was added anyway so
  the separation is explicit and doesn't silently depend on a naming
  convention.
- **`playwright.config.ts` builds and serves the real production bundle**:
  `webServer.command` runs `npm run build && npm run preview -- --port
  4173 --strictPort`, so the E2E test exercises the same `dist/` output a
  real user would get, not the dev server. `reuseExistingServer:
  !process.env.CI` matches the task's spec.
- **Browser binaries not committed**: `@playwright/test` is a
  `devDependency` (`package.json`/`package-lock.json` updated); the
  Chromium binary downloaded by `npx playwright install chromium` lives in
  the Playwright browser cache outside the repo and was never added to
  git. `test-results/` and `playwright-report/` were added to
  `.gitignore` (Playwright's default failure-screenshot/report output
  dirs); neither existed after this batch's run since all tests passed.

### What was built

- `src/main.ts`: `window.__mazeChase` debug hook (`getState`, `getTick`,
  `restart`) with an in-file `declare global` augmentation, a `tick`
  counter, and `data-testid` attributes on the canvas, HUD spans, and both
  overlays. No rendering or game-loop behaviour changed otherwise.
- `playwright.config.ts`: headless Chromium project, `testDir:
  'tests/e2e'`, 30s test timeout, and a `webServer` that builds and serves
  the production bundle on a fixed port (4173).
- `tests/e2e/smoke.spec.ts`: three tests - initial render (canvas visible
  with non-zero size, HUD shows `Score: 0`/`Lives: 3`), keyboard-driven
  movement (`ArrowUp` from spawn moves the player tile and increases score,
  polled via `page.waitForFunction` against `window.__mazeChase.getState()`,
  capped at 5s), and restart (`window.__mazeChase.restart()` resets score
  to 0, lives to 3, `gameOver` to `false`).
- `vite.config.ts`: explicit Vitest `exclude` for `tests/e2e/**`.
- `package.json`/`package-lock.json`: added `@playwright/test` devDependency
  and `test:e2e`/`test:all` npm scripts.
- `.gitignore`: added `test-results/` and `playwright-report/`.
- `README.md`: new "Testing" section covering `npm test`, the one-time
  `npx playwright install chromium` step, `npm run test:e2e`, and
  `npm run test:all`; Status section updated to list the E2E smoke test as
  implemented rather than planned.

### Test results

- `npm run typecheck` (`tsc --noEmit`): exited 0, no errors.
- `npm run build` (`vite build`): exited 0, produced `dist/`.
- `npm test` (`vitest run`): exited 0 - **8 test files, 84 tests, all
  passed** (unchanged from batch `04`; confirms `tests/e2e` is not picked
  up by Vitest and no `src/core/*` semantics were touched).
- `npm run test:e2e` (`playwright test`): exited 0 - **3 passed (3.8s)**,
  running headless Chromium against the built-and-served production
  bundle:
  ```
  Running 3 tests using 1 worker

    ✓  1 [chromium] › tests/e2e/smoke.spec.ts:3:1 › renders the maze, canvas, and initial HUD (495ms)
    ✓  2 [chromium] › tests/e2e/smoke.spec.ts:16:1 › keyboard input moves the player and collects a pellet (375ms)
    ✓  3 [chromium] › tests/e2e/smoke.spec.ts:41:1 › restart resets score, lives, and game-over state (336ms)

    3 passed (3.8s)
  ```
- `npx playwright install chromium`: succeeded without needing
  `--with-deps` or sudo; a direct `chromium.launch()` smoke check (run via
  a scratch script, then deleted) confirmed the browser actually launches
  in this environment before writing the real spec.

### External generation prompts

None used - no external/Lovable/Fable generation was used for this batch;
all code was written directly.

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
