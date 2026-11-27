import { WORLD_ORDER } from './difficulty.js';
import { getLocalDateString } from './seed.js';

export const TIME_BUCKETS = [
  { key: 'under30', label: '<30s', min: 0, max: 29 },
  { key: '30to60', label: '30-60s', min: 30, max: 59 },
  { key: '1to2m', label: '1-2m', min: 60, max: 119 },
  { key: '2to3m', label: '2-3m', min: 120, max: 179 },
  { key: 'over3m', label: '3m+', min: 180, max: Infinity },
];

/**
 * Aggregate totals, per-difficulty best times, and daily time distribution buckets.
 * @param {object} state
 */
export function computeStatsSummary(state) {
  const dailyEntries = Object.values(state?.dailyResults || {});
  const levelEntries = Object.values(state?.levels || {});

  const dailiesSolved = dailyEntries.length;
  const levelsCompleted = levelEntries.length;
  const totalStars = levelEntries.reduce((sum, entry) => sum + (entry.stars || 0), 0);

  const dailyTimes = dailyEntries.map((d) => d.time).filter((t) => typeof t === 'number');
  const allTimes = [
    ...dailyTimes,
    ...levelEntries.map((l) => l.bestTime).filter((t) => typeof t === 'number'),
  ];

  const averageTime =
    dailyTimes.length > 0
      ? Math.round(dailyTimes.reduce((sum, t) => sum + t, 0) / dailyTimes.length)
      : null;

  const bestTime = allTimes.length > 0 ? Math.min(...allTimes) : null;

  const bestByDifficulty = {};
  for (const diff of WORLD_ORDER) {
    bestByDifficulty[diff] = null;
  }

  for (const entry of dailyEntries) {
    const diff = entry.difficulty;
    if (diff && typeof entry.time === 'number') {
      const prev = bestByDifficulty[diff];
      if (prev === null || entry.time < prev) {
        bestByDifficulty[diff] = entry.time;
      }
    }
  }

  for (const [key, entry] of Object.entries(state?.levels || {})) {
    const diff = key.split('-')[0];
    if (diff in bestByDifficulty && typeof entry.bestTime === 'number') {
      const prev = bestByDifficulty[diff];
      if (prev === null || entry.bestTime < prev) {
        bestByDifficulty[diff] = entry.bestTime;
      }
    }
  }

  const buckets = TIME_BUCKETS.map((b) => ({
    ...b,
    count: dailyTimes.filter((t) => t >= b.min && t <= b.max).length,
  }));

  return {
    dailiesSolved,
    levelsCompleted,
    totalStars,
    averageTime,
    bestTime,
    currentStreak: state?.streak?.current || 0,
    bestStreak: state?.streak?.best || 0,
    hintsUsed: state?.hintsUsedTotal || 0,
    bestByDifficulty,
    buckets,
  };
}

/**
 * Build monthly calendar heatmap cells for `year` and 1-based `month`.
 * @param {object} state
 * @param {number} year
 * @param {number} month1Based
 * @param {string} [todayStr]
 */
export function getMonthHeatmap(state, year, month1Based, todayStr = getLocalDateString()) {
  const daysInMonth = new Date(year, month1Based, 0).getDate();
  const startWeekday = new Date(year, month1Based - 1, 1).getDay();
  const dailyResults = state?.dailyResults || {};
  const frozenSet = new Set(state?.streak?.frozenDates || []);

  const cells = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month1Based).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let status = 'empty';
    if (dailyResults[dateStr]) {
      status = 'solved';
    } else if (frozenSet.has(dateStr)) {
      status = 'frozen';
    }
    cells.push({
      day,
      dateStr,
      status,
      isToday: dateStr === todayStr,
    });
  }

  return {
    year,
    month: month1Based,
    daysInMonth,
    startWeekday,
    cells,
  };
}
