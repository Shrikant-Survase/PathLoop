# PathLoop Phase 2 Implementation Plan

**Goal:** Expand PathLoop with multi-tab Expo Router navigation, 4 difficulty worlds (200 levels), solver-backed hints, streak freezes, SVG stats & calendar heatmap, 9 achievements, 30-day archive, sharing, notifications, and versioned AsyncStorage persistence.

**Build Order:**
1. Pure logic & tests: `difficulty.js`, `generator.js` updates, `hints.js`, `streaks.js`, `stats.js`, `achievements.js`
2. Versioned storage & utilities: `storage.js`, `GameProvider.js`, `theme.js`, `haptics.js`, `sound.js`, `share.js`, `notifications.js`
3. Shared UI updates: `Cell.js`, `Grid.js`, `ResultModal.js`, `AchievementToast.js`
4. Screens & Navigation: `HomeScreen.js`, `LevelsScreen.js`, `PracticeScreen.js`, `StatsScreen.js`, `ProfileScreen.js`, `ArchiveScreen.js`, `GameScreen.js`, `(tabs)/_layout.js`, `_layout.js`, stack routes
5. Automated unit tests (`node --test`) + `npx eslint` verification
