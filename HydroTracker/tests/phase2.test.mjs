import assert from 'node:assert/strict';
import test from 'node:test';

import { ACHIEVEMENTS, evaluateAchievements } from '../src/game/achievements.js';
import {
  calculateLevelStars,
  DIFFICULTIES,
  getDailyDifficulty,
  getLevelSeed,
  isWorldUnlocked,
  LEVELS_PER_WORLD,
  WORLD_ORDER,
  WORLD_UNLOCK_REQUIREMENT,
} from '../src/game/difficulty.js';
import { generateDailyPuzzle, generatePuzzleBySeed } from '../src/game/generator.js';
import { analyzeHint, findCompletionFromPath } from '../src/game/hints.js';
import { LAUNCH_DATE } from '../src/game/seed.js';
import { computeStatsSummary, getMonthHeatmap } from '../src/game/stats.js';
import { applyDailySolveStreak, syncStreaksForDate } from '../src/game/streaks.js';
import { validatePath } from '../src/game/validator.js';
import {
  getHints,
  getProgress,
  migrateState,
  saveDailyResult,
  saveLevelResult,
  useHint,
} from '../src/storage/storage.js';

test('difficulty: configs, weekday rotation, level seeds, and star ratings', () => {
  assert.equal(DIFFICULTIES.easy.size, 5);
  assert.equal(DIFFICULTIES.medium.size, 6);
  assert.equal(DIFFICULTIES.hard.size, 7);
  assert.equal(DIFFICULTIES.expert.size, 8);
  assert.equal(LEVELS_PER_WORLD, 50);
  assert.equal(WORLD_UNLOCK_REQUIREMENT, 20);
  assert.deepEqual(WORLD_ORDER, ['easy', 'medium', 'hard', 'expert']);

  // 2026-11-30 is Monday, 2026-12-06 is Sunday
  assert.equal(getDailyDifficulty('2026-11-30').id, 'easy');
  assert.equal(getDailyDifficulty('2026-12-06').id, 'expert');

  assert.equal(getLevelSeed('hard', 12), 'level-hard-12');

  assert.equal(calculateLevelStars({ hintsUsed: 0, elapsedSeconds: 30, targetTimeSeconds: 45 }), 3);
  assert.equal(calculateLevelStars({ hintsUsed: 0, elapsedSeconds: 50, targetTimeSeconds: 45 }), 2);
  assert.equal(calculateLevelStars({ hintsUsed: 1, elapsedSeconds: 20, targetTimeSeconds: 45 }), 1);

  assert.equal(isWorldUnlocked('easy', {}), true);
  assert.equal(isWorldUnlocked('medium', { easy: 19 }), false);
  assert.equal(isWorldUnlocked('medium', { easy: 20 }), true);
});

test('generator: seeded level puzzles and daily puzzles match difficulty bounds and validate', () => {
  const daily = generateDailyPuzzle('2026-11-27');
  assert.equal(validatePath(daily, daily.solution).valid, true);

  for (const diffId of WORLD_ORDER) {
    const cfg = DIFFICULTIES[diffId];
    const p1 = generatePuzzleBySeed(getLevelSeed(diffId, 1), diffId);
    const p2 = generatePuzzleBySeed(getLevelSeed(diffId, 1), diffId);
    assert.deepEqual(p1, p2);
    assert.equal(p1.size, cfg.size);
    assert.ok(
      p1.checkpoints.length >= cfg.minCheckpoints && p1.checkpoints.length <= cfg.maxCheckpoints
    );
    assert.ok(p1.walls.length >= cfg.minWalls && p1.walls.length <= cfg.maxWalls);
    assert.equal(validatePath(p1, p1.solution).valid, true);
  }
});

test('hints: reveals next 3 on solution prefix, alternate valid path, and detects dead-end mistakes', () => {
  const puzzle = generatePuzzleBySeed('level-easy-1', 'easy');
  const prefix = puzzle.solution.slice(0, 3);
  const hint1 = analyzeHint(puzzle, prefix);
  assert.equal(hint1.type, 'reveal');
  assert.deepEqual(hint1.cells, puzzle.solution.slice(3, 6));

  // Hand-crafted 3x3 puzzle where an alternate valid path exists AND a dead-end exists
  const miniPuzzle = {
    size: 3,
    checkpoints: [
      { num: 1, row: 0, col: 0 },
      { num: 2, row: 2, col: 2 },
    ],
    checkpointMap: {
      '0,0': 1,
      '2,2': 2,
    },
    wallKeys: [],
    solution: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  };

  // Alternate valid start: (0,0) -> (1,0) -> (2,0) (diverges from stored solution, still solvable!)
  const altPrefix = [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
  ];
  const altCompletion = findCompletionFromPath(miniPuzzle, altPrefix);
  assert.ok(altCompletion !== null);
  assert.equal(validatePath(miniPuzzle, altCompletion).valid, true);

  const hintAlt = analyzeHint(miniPuzzle, altPrefix);
  assert.equal(hintAlt.type, 'reveal');
  assert.equal(hintAlt.cells.length, 3);

  // Dead-end path: (0,0) -> (0,1) -> (1,1) -> (1,0) strands (0,2) or isolates parity
  // Specifically: (0,0) -> (1,0) -> (1,1) -> (0,1) -> (0,2) -> (1,2) -> (2,2) hits final checkpoint too early,
  // or (0,0) -> (0,1) -> (1,1) -> (2,1) -> (2,0) leaves (1,0) isolated!
  const deadPath = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 0 },
  ];
  const mistakeHint = analyzeHint(miniPuzzle, deadPath);
  assert.equal(mistakeHint.type, 'mistake');
  assert.ok(mistakeHint.undoToIndex >= 0 && mistakeHint.undoToIndex < deadPath.length - 1);
  // Prefix up to undoToIndex must be completable
  assert.ok(findCompletionFromPath(miniPuzzle, deadPath.slice(0, mistakeHint.undoToIndex + 1)));
});

test('streaks: consecutive solves, 7-day freeze award, auto-freeze on missed day, and reset', () => {
  let streak = {
    current: 0,
    best: 0,
    freezes: 0,
    lastSolvedDate: null,
    lastEvaluatedDate: null,
    frozenDates: [],
    freezeNotice: null,
  };

  // Solve 7 consecutive days starting 2026-11-27
  for (let i = 0; i < 7; i += 1) {
    const d = `2026-11-${String(27 + i).padStart(2, '0')}`;
    const dateObj = new Date(2026, 10, 27 + i);
    const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    streak = applyDailySolveStreak(streak, iso);
    assert.ok(d);
  }
  assert.equal(streak.current, 7);
  assert.equal(streak.best, 7);
  assert.equal(streak.freezes, 1);

  // Miss 2026-12-04, open app on 2026-12-05 -> freeze should auto-activate!
  const afterMiss = syncStreaksForDate(streak, '2026-12-05');
  assert.equal(afterMiss.current, 7);
  assert.equal(afterMiss.freezes, 0);
  assert.deepEqual(afterMiss.frozenDates, ['2026-12-04']);
  assert.equal(afterMiss.freezeNotice, 'Your freeze saved your 7-day streak!');

  // Solve on 2026-12-05 -> continues to 8
  const solvedAfterFreeze = applyDailySolveStreak(afterMiss, '2026-12-05');
  assert.equal(solvedAfterFreeze.current, 8);
  assert.equal(solvedAfterFreeze.best, 8);

  // Miss 2026-12-06 and 2026-12-07 with 0 freezes -> resets on 2026-12-08
  const reset = syncStreaksForDate(solvedAfterFreeze, '2026-12-08');
  assert.equal(reset.current, 0);
  assert.equal(reset.best, 8);
});

test('stats & achievements: computes summary, heatmap, buckets, and all 9 badge unlocks', () => {
  assert.equal(LAUNCH_DATE, '2026-11-27');
  assert.equal(ACHIEVEMENTS.length, 9);

  const levels = {};
  for (let i = 1; i <= 50; i += 1) {
    levels[`easy-${i}`] = { stars: 3, bestTime: 25, hintsUsed: 0 };
  }

  const state = {
    dailyResults: {
      '2026-11-27': { time: 24, hintsUsed: 0, difficulty: 'easy', puzzleNumber: 1 },
      '2026-11-28': { time: 48, hintsUsed: 0, difficulty: 'hard', puzzleNumber: 2 },
      '2026-11-29': { time: 130, hintsUsed: 1, difficulty: 'expert', puzzleNumber: 3 },
    },
    levels,
    streak: { current: 7, best: 100, freezes: 1, frozenDates: ['2026-11-26'] },
    hintsUsedTotal: 4,
    unlockedAchievements: [],
  };

  const summary = computeStatsSummary(state);
  assert.equal(summary.dailiesSolved, 3);
  assert.equal(summary.levelsCompleted, 50);
  assert.equal(summary.totalStars, 150);
  assert.equal(summary.bestTime, 24);
  assert.equal(summary.bestByDifficulty.expert, 130);

  const heatmap = getMonthHeatmap(state, 2026, 11, '2026-11-29');
  assert.equal(heatmap.daysInMonth, 30);
  assert.equal(heatmap.cells.filter((c) => c.status === 'solved').length, 3);

  // Pure Mind needs 10 hintless dailies; all others should unlock here!
  const unlocked = evaluateAchievements(state);
  assert.ok(unlocked.includes('first_solve'));
  assert.ok(unlocked.includes('streak_7'));
  assert.ok(unlocked.includes('streak_30'));
  assert.ok(unlocked.includes('streak_100'));
  assert.ok(unlocked.includes('speedster'));
  assert.ok(unlocked.includes('star_collector'));
  assert.ok(unlocked.includes('world_clear'));
  assert.ok(unlocked.includes('expert_mind'));
  assert.ok(!unlocked.includes('pure_mind'));
});

test('storage: migrates safely, tracks hints/daily/levels, and falls back when native module is absent', async () => {
  const migrated = migrateState({ dailyResults: { '2026-11-27': { time: 40 } } }, '2026-11-27');
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.hintsAvailable, 3);

  const initial = await getProgress('2026-11-27');
  assert.equal(initial.hintsAvailable, 3);

  const used = await useHint('2026-11-27');
  assert.equal(used.ok, true);
  assert.equal(await getHints('2026-11-27'), 2);

  // Midnight next day refills back to 3
  assert.equal(await getHints('2026-11-28'), 3);

  const dailySave = await saveDailyResult({
    date: '2026-11-28',
    time: 28,
    hintsUsed: 0,
    difficulty: 'hard',
    puzzleNumber: 2,
    todayStr: '2026-11-28',
  });
  assert.equal(dailySave.state.streak.current, 1);
  assert.equal(dailySave.state.hintsAvailable, 4); // +1 for hintless daily

  const lvlSave = await saveLevelResult({
    difficulty: 'easy',
    number: 1,
    stars: 3,
    time: 20,
    hintsUsed: 0,
    todayStr: '2026-11-28',
  });
  assert.equal(lvlSave.earnedBonusHint, 1);
  assert.equal(lvlSave.state.hintsAvailable, 5);
});
