# Final Report — Glimmerdash

## What it is

**Glimmerdash** is an original maze-chase browser game built with Vite +
TypeScript (no framework) and rendered to a `<canvas>`. You guide **Glim**, a
firefly, through **The Hollow Garden** at night, collecting glowing dewdrop
pellets, power pellets, and **Bloombursts** (an original power-up) while
evading four **Duskwisps** — Ember, Frost, Marsh, and Dusk — each with a
distinct, pathfinding- or behaviour-driven movement style. The game has
score, lives, win/lose conditions, level progression with a difficulty ramp,
smooth animation, cosmetic effects, and synthesized audio, all on top of a
deterministic, fully unit-tested core engine.

## How to run and play

See `README.md` for full details. Quick start:

```bash
npm install
npm run dev
```

Open the printed local URL in a desktop browser; press **Enter** or click
**Start**. Controls: arrow keys / WASD to move, **Enter** to
start/restart/continue, **M** to toggle sound.

## Acceptance criteria → evidence

| # | Criterion (from `PROMPT_AND_ACCEPTANCE.md`) | Implementing files/functions | Proven by |
| --- | --- | --- | --- |
| 1 | Volledig speelbare game loop | `src/main.ts` (rAF loop, keyboard input, rendering, overlays); `src/core/loop.ts` (`accumulateTicks`, fixed-timestep accumulator); `src/core/state.ts` (`step`) | `tests/core/loop.test.ts`, `tests/core/state.test.ts`, `tests/core/integration.test.ts` (full scripted level clear via real `step()` calls), `tests/e2e/smoke.spec.ts` (real browser start → move → pellet pickup) |
| 2 | Minimaal drie vijanden met aantoonbaar verschillend gedrag | `src/core/enemies.ts`: `chooseDirectionTowards` (Ember/chase), `scatterCorners` (Frost/scatter), `ambushTargetTile` (Marsh/ambush), `chooseWanderDirection` (Dusk/wander), dispatched via `computeEnemyTarget`/`stepEnemy` | `tests/core/enemies.test.ts` (18 tests, one behaviour distinguished from another on fixed maze fixtures) |
| 3 | Echte navigation/pathfinding voor vijanden | `src/core/pathfinding.ts`: `findPath` (deterministic breadth-first search, wall/tunnel-wrap/den-aware), `nextStepTowards`; wired into Ember's chase behaviour in `src/core/enemies.ts` (`stepEnemy`) | `tests/core/pathfinding.test.ts` (13 tests: shortest path around walls/den, tie-break determinism, unreachable targets), `tests/core/enemies.test.ts` (BFS route vs. naive-greedy dead end) |
| 4 | Score, collectibles en minimaal één power-up | `src/core/collectables.ts` (`createCollectablesState`, `collectAt`, `isLevelComplete`); Bloomburst power-up in `src/core/theme.ts`/`src/core/state.ts` (`empoweredTicksRemaining`, `bloomburstDurationTicks`); `src/core/collisions.ts` (empowered-mode enemy defeat + bonus score) | `tests/core/collectables.test.ts` (9), `tests/core/collisions.test.ts` (19, incl. one empowered/normal case per Duskwisp), `tests/core/state.test.ts` |
| 5 | Win- en lose-condities | `src/core/collisions.ts` (`resolveCollisions`: life loss/game over); `src/core/collectables.ts` (`isLevelComplete`); `src/core/state.ts` (`step`, `advanceLevel`) | `tests/core/collisions.test.ts`, `tests/core/state.test.ts`, `tests/core/progression.test.ts` (11), `tests/core/integration.test.ts` (full clear → win, then continues into level 2) |
| 6 | Originele assets en leveldesign | `src/core/levels.ts` (original 23×27 "Hollow Garden" ASCII maze, BFS-verified connectivity); original naming throughout (Glimmerdash/Glim/Duskwisps/Bloomburst); `src/main.ts`/`src/ui/` (hand-drawn canvas shapes, no image assets); `src/ui/audio.ts` (Web-Audio-synthesized cues, no audio files) | `tests/core/grid.test.ts` (12, incl. full-maze BFS reachability and Bloomburst placement), manual/E2E visual confirmation |
| 7 | Direct in de browser demonstreerbaar zonder handmatige reparatie | `npm run build` → static `dist/`; `src/main.ts` boots the whole game with no manual setup beyond `npm install` | `tests/e2e/smoke.spec.ts` (6 tests, headless Chromium against the real built-and-served `dist/` bundle, incl. a `pageerror`/console-`error` assertion on every test) |

## Final verification results (this batch, 2026-09-16)

Run from a clean `dist/`/`test-results/` (both removed before verifying; both
are gitignored and remain untracked):

| Command | Exit code | Result |
| --- | --- | --- |
| `npm run typecheck` | 0 | No errors |
| `npm run build` | 0 | `dist/index.html` + one CSS asset + one JS asset produced |
| `npm test` | 0 | **11 test files, 113 tests, all passed** |
| `npm run test:e2e` | 0 | **6/6 Playwright tests passed** (headless Chromium, `~5.3s`), including a new assertion in every test that no `pageerror` or console `error` event fired during start → move → pellet pickup and the rest of the flows |

No defects were found during this final verification pass, so no source
files under `src/` were changed. The only change in this batch is the added
`pageerror`/console-error assertion in `tests/e2e/smoke.spec.ts` plus this
report and README/audit-trail updates.

## Build/review/repair history

Nine batches total (`01`–`09`), each independently reviewed, with repairs
applied where review found real defects:

- `01-scaffold-core-engine` — repaired once (commands actually executed, not
  hand-traced; no bugs found).
- `02-enemy-ai-and-collisions` — no repairs needed.
- `03-power-ups-and-frighten-mode` — no repairs needed.
- `04-game-loop-and-rendering` — repaired once (imperceptible frighten
  duration, halo draw order, static-vs-pulsing Bloomburst render mismatch).
- `05-e2e-headless-smoke-test` — no repairs needed.
- `06-real-pathfinding-for-enemies` — no repairs needed.
- `07-visual-audio-polish` — repaired once (spurious multi-enemy-defeat
  event misfire on life loss, plus two minor render-purity/perf cleanups).
- `08-level-progression-and-integration-test` — no repairs needed.
- `09-final-verification-and-report` (this batch) — no defects found; added
  one E2E assertion and this documentation.

Full decisions, diffs-in-prose, and complete command output for every batch
and repair are in `docs/AUDIT_TRAIL.md`.

## Original-content statement

No original Pac-Man sprites, audio, or exact level layouts were used
anywhere in this project. All visuals are hand-drawn canvas primitives, all
audio is synthesized from Web Audio oscillators, and the maze layout, theme,
and naming (Glimmerdash, Glim, the Hollow Garden, the Duskwisps, Bloomburst)
are original. No external AI generation or prototyping tool (Lovable, Fable,
or similar) was used at any point in this project — every batch's audit
entry confirms "External generation prompts: None used," and this holds for
this batch too.

## Known limitations / future work

- A single maze layout ("The Hollow Garden") is reused across levels; only
  difficulty (enemy speed, Bloomburst duration) ramps with `levelNumber`,
  not the map itself.
- Desktop-only: keyboard controls (arrow keys/WASD), no touch/gamepad input
  or responsive mobile layout.
- Single-player only; no persistent high-score storage beyond the current
  page session.
- Audio is a small fixed set of synthesized cues rather than music or a
  larger sound library.
