# PathLoop — Phase 1 Design Spec

**Date:** 2026-11-27
**App:** `HydroTracker` (Expo SDK 58, plain JavaScript only — no `.ts`/`.tsx` files)
**Game Name:** PathLoop

## Scope (Phase 1 Only)

Build the playable daily puzzle core and nothing from Phase 2 or Phase 3:
- `GameScreen` with a 6x6 daily puzzle seeded from today's local date (`YYYY-MM-DD`) and light walls.
- Drag-to-draw continuous path with backtracking, Undo button, Clear button, live Timer, and Win Detection Modal showing elapsed time.
- Haptic tick on entering/backtracking a cell, success haptic on win.
- Clean, minimal UI with soft colors supporting automatic light and dark mode (`useColorScheme`).
- Replace the existing HydroTracker tab route flow (`src/app/(tabs)/*`) with `src/app/index.js` opening directly into `GameScreen`, while preserving `src/app/_layout.js` (`GestureHandlerRootView` + `SafeAreaProvider` + `Stack`).

## Architecture

### Pure Game Logic (`src/game/`)
1. `src/game/seed.js`
   - `getLocalDateString(date)`: formats local calendar date as `"YYYY-MM-DD"`.
   - `getPuzzleNumber(dateStr)`: deterministic 1-based day index from `"2026-01-01"`.
   - `hashString(str)`: FNV-1a 32-bit unsigned hash.
   - `mulberry32(seed)`: deterministic PRNG returning floats in `[0, 1)`.
   - `createDateRng(dateStr, salt)`: combines date string and optional salt into a PRNG.
2. `src/game/generator.js`
   - `generateHamiltonianPath(size, rng)`: Warnsdorff's heuristic (fewest unvisited orthogonal neighbors) with seeded random tie-breaking, dead-end pruning (no unvisited non-target cell left with degree 0), bounded backtracking (`maxSteps = 50000`), and retry loop.
   - `generateDailyPuzzle(dateStr, options)`: defaults to `size = 6`, `checkpointCount = 7`, `wallCount = 6`. Places checkpoints `1` at start, `K` at end, and evenly spaced indices in between. Places walls only between orthogonal pairs NOT consecutive in `solution`. Returns `{ id, puzzleNumber, date, size, checkpoints, checkpointMap, walls, wallKeys, solution }`.
3. `src/game/validator.js`
   - `cellKey(row, col)` and `wallKey(a, b)` canonical edge keys.
   - `isAdjacent(a, b)` and `hasWallBetween(puzzle, a, b)`.
   - `getNextExpectedCheckpoint(puzzle, path)`: scans `path` for checkpoints hit in order.
   - `canStep(puzzle, path, nextCell)`: enforces starting on checkpoint `1`, stopping once last checkpoint is reached, orthogonal adjacency, no walls, no revisits, and sequential checkpoint order.
   - `validatePath(puzzle, path)`: verifies complete win state (all `size * size` cells visited once, starts at `1`, ends at `K`, valid consecutive steps, all checkpoints hit in order).

### UI & Platform (`src/components/`, `src/screens/`, `src/utils/`, `src/app/`)
- `src/utils/theme.js`: light/dark color palettes with soft neutral surfaces and vibrant indigo/teal path accent.
- `src/utils/haptics.js`: `triggerCellTick()` (`selectionAsync`), `triggerWinHaptic()` (`notificationAsync(Success)`), wrapped safely for unsupported platforms.
- `src/components/Cell.js`: cell surface, visited tint, numbered checkpoint badge (highlighted when reached), and crisp wall segments on blocked borders.
- `src/components/PathLayer.js`: `react-native-svg` `<Path>` with `strokeLinecap="round"`, `strokeLinejoin="round"`, soft outer glow/halo and active tip indicator.
- `src/components/Grid.js`: `usePanGesture` + `GestureDetector` (`react-native-gesture-handler` v3) with Reanimated shared-value cell tracking and `scheduleOnRN` (`react-native-worklets`) callbacks on cell change, corner-swipe interpolation, and smooth drag backtracking.
- `src/components/Timer.js`: `MM:SS` tabular-nums display.
- `src/components/ResultModal.js`: clean win summary modal showing completion time, puzzle number, and Replay / Close actions.
- `src/screens/GameScreen.js`: coordinates puzzle state, path history, timer lifecycle (starts on first move, stops on win), Undo/Clear controls, and `ResultModal`.
- `src/app/index.js`: Expo Router root screen rendering `GameScreen`.
