# PathLoop — Phase 2 Design Spec

**Date:** 2026-11-27
**Launch Date:** `2026-11-27`
**Language:** Plain JavaScript only (`.js`), functional components + hooks.

## 1. Navigation (Expo Router)
- Root `Stack` in `src/app/_layout.js` wrapped in `GestureHandlerRootView`, `SafeAreaProvider`, and `GameProvider` (plus global `AchievementToast`).
- Tab navigator in `src/app/(tabs)/_layout.js` with 4 tabs:
  - `index` -> **Home** (`HomeScreen`)
  - `levels` -> **Levels** (`LevelsScreen`)
  - `stats` -> **Stats** (`StatsScreen`)
  - `profile` -> **Profile** (`ProfileScreen`)
- Stack routes outside tabs:
  - `src/app/game.js` (`GameScreen`, accepts route params `{ mode: 'daily' | 'level' | 'practice' | 'archive', date?, difficulty?, level? }`)
  - `src/app/archive.js` (`ArchiveScreen`)
  - `src/app/practice.js` (`PracticeScreen`)

## 2. Game Logic (`src/game/`)
- `src/game/difficulty.js`:
  - `DIFFICULTIES`: `easy` (5x5, 6-7 checkpoints, 0 walls, 45s), `medium` (6x6, 5-6 checkpoints, 0-2 walls, 75s), `hard` (7x7, 4-5 checkpoints, 3-5 walls, 120s), `expert` (8x8, 3-4 checkpoints, 5-8 walls, 180s).
  - `getDailyDifficulty(dateStr)`: rotates Mon->Sun from `easy` up to `expert`.
  - `WORLDS` & `LEVELS_PER_WORLD = 50`, `WORLD_UNLOCK_THRESHOLD = 20`.
  - `getLevelSeed(difficulty, number)` -> `"level-{difficulty}-{number}"`.
  - `calculateLevelStars({ hintsUsed, elapsedSeconds, targetTimeSeconds })` -> `1 | 2 | 3`.
- `src/game/generator.js`:
  - Supports seeded checkpoint/wall ranges and `generatePuzzleBySeed(seedStr, difficultyId, meta)` + async `generatePuzzleAsync(...)` so Expert 8x8 puzzles don't block UI frames.
- `src/game/hints.js`:
  - `findCompletionFromPath(puzzle, path, maxSteps)`: bounded Warnsdorff backtracking solver from current path tip.
  - `analyzeHint(puzzle, path)`:
    1. Prefix of `puzzle.solution` -> `{ type: 'reveal', cells }` (next 3 cells).
    2. Else `findCompletionFromPath` succeeds -> `{ type: 'reveal', cells }` (next 3 cells from found completion).
    3. Else scan longest completable prefix -> `{ type: 'mistake', undoToIndex, mistakeStartIndex }`.
- `src/game/streaks.js`:
  - Local `YYYY-MM-DD` date diffing, missed-day detection, 1 Streak Freeze earned per 7-day streak (max 2 stored), auto-use on missed day(s) when enough freezes exist, `"Your freeze saved your N-day streak!"` notice.
- `src/game/stats.js`:
  - Aggregates totals, monthly calendar heatmap cells, daily time-distribution buckets, and per-difficulty best times.
- `src/game/achievements.js`:
  - Config array of all 9 badges + `evaluateAchievements(state)` returning newly unlocked badge IDs.

## 3. Storage & Utilities (`src/storage/`, `src/utils/`)
- `src/storage/storage.js`: versioned key `@pathloop_v1`, `migrateState`, `getProgress`, `saveDailyResult`, `saveLevelResult`, `getHints`, `useHint`, `updateSettings`, `clearFreezeNotice`, etc.
- `src/storage/GameProvider.js`: reactive state provider + theme override (`system | light | dark`) + toast queue.
- `src/utils/share.js`: React Native `Share.share` formatter.
- `src/utils/notifications.js`: `expo-notifications` daily reminder & 10:00 PM streak-at-risk reminder scheduling/cancellation.
- `src/utils/sound.js`: settings-aware sound helper (no-op ready for audio assets).
