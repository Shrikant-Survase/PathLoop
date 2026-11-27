# PathLoop Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of PathLoop — a plain-JS daily 6x6 Zip-style path puzzle in `HydroTracker` with deterministic seeded generation, rule validation, 60fps gesture + SVG path drawing, haptics, timer, undo/clear, light/dark theme, and win modal.

**Architecture:** Pure deterministic puzzle generation and validation live in `src/game/` (`seed.js`, `generator.js`, `validator.js`) tested via `node --experimental-detect-module --test`. UI components in `src/components/` use `react-native-gesture-handler` v3 (`usePanGesture` + `GestureDetector`), `react-native-reanimated` + `react-native-worklets` (`scheduleOnRN`), and `react-native-svg` for smooth path rendering, wired into `src/screens/GameScreen.js` and `src/app/index.js`.

**Tech Stack:** Expo SDK 58, React Native 0.88.1, Expo Router, plain JavaScript (`.js`), `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-svg`, `expo-haptics`, `@react-native-async-storage/async-storage`.

**Spec:** `docs/superpowers/specs/2026-11-27-pathloop-phase1-design.md`

## Global Constraints
- Plain JavaScript only — no `.ts` or `.tsx` files created.
- Functional components + hooks only; compatible with `reactCompiler: true`.
- Phase 1 scope only (no Phase 2 streaks/stats/share/notifications or Phase 3 difficulty/practice/archive/hints).

---

### Task 1: Seeded PRNG (`src/game/seed.js`)
**Files:**
- Create: `src/game/seed.js`
- Test: `tests/game.test.mjs`
- [ ] Write failing tests for `getLocalDateString`, `getPuzzleNumber`, `hashString`, `mulberry32`, `createDateRng`
- [ ] Verify failure with `node --experimental-detect-module --test`
- [ ] Implement `src/game/seed.js`
- [ ] Verify tests pass

### Task 2: Rule Validator (`src/game/validator.js`)
**Files:**
- Create: `src/game/validator.js`
- Test: `tests/game.test.mjs`
- [ ] Write failing tests for `cellKey`, `wallKey`, `isAdjacent`, `hasWallBetween`, `canStep`, `validatePath`
- [ ] Verify failure
- [ ] Implement `src/game/validator.js`
- [ ] Verify tests pass

### Task 3: Puzzle Generator (`src/game/generator.js`)
**Files:**
- Create: `src/game/generator.js`
- Test: `tests/game.test.mjs`
- [ ] Write failing tests for deterministic daily puzzle generation, full Hamiltonian coverage, checkpoint spacing, non-blocking wall placement, and `validatePath(puzzle, puzzle.solution) === true` across 30 dates and grid sizes 5..8
- [ ] Verify failure
- [ ] Implement `src/game/generator.js`
- [ ] Verify tests pass

### Task 4: Theme & Haptics Utilities (`src/utils/theme.js`, `src/utils/haptics.js`)
**Files:**
- Create: `src/utils/theme.js`, `src/utils/haptics.js`
- [ ] Implement light/dark palette tokens and safe `expo-haptics` wrappers

### Task 5: Grid, Cell, PathLayer, Timer, ResultModal (`src/components/*`)
**Files:**
- Create: `src/components/Cell.js`, `src/components/PathLayer.js`, `src/components/Grid.js`, `src/components/Timer.js`, `src/components/ResultModal.js`
- [ ] Implement crisp cell rendering with checkpoints and walls
- [ ] Implement SVG path rendering with rounded caps/joins and active tip
- [ ] Implement `usePanGesture` + shared-value cell mapping with corner interpolation and backtracking
- [ ] Implement formatted timer and win modal

### Task 6: GameScreen & Expo Router Wiring (`src/screens/GameScreen.js`, `src/app/index.js`, `src/app/_layout.js`)
**Files:**
- Create: `src/screens/GameScreen.js`, `src/app/index.js`
- Modify: `src/app/_layout.js` (dynamic StatusBar style for light/dark mode)
- Remove: `src/app/(tabs)/*`
- [ ] Implement `GameScreen` with daily puzzle, timer, Undo/Clear, haptics, and `ResultModal`
- [ ] Wire `src/app/index.js` and update `src/app/_layout.js`
- [ ] Run `node --experimental-detect-module --test tests/game.test.mjs` and `npx expo lint`
