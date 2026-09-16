# Audit Trail

Dated log of build/review/repair decisions for Glimmerdash. Newest entries
first.

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
