import { addCalendarDays, diffCalendarDays } from './seed.js';

export const MAX_STREAK_FREEZES = 2;
export const STREAK_FREEZE_INTERVAL = 7;

export function createInitialStreak() {
  return {
    current: 0,
    best: 0,
    freezes: 0,
    lastSolvedDate: null,
    lastEvaluatedDate: null,
    frozenDates: [],
    freezeNotice: null,
  };
}

/**
 * Evaluate missed days up to `todayStr` (local YYYY-MM-DD) using stored freezes if available.
 * Safe to call repeatedly on app open / foreground / midnight rollover.
 * @param {object} rawStreak
 * @param {string} todayStr
 * @returns {object}
 */
export function syncStreaksForDate(rawStreak, todayStr) {
  const streak = { ...createInitialStreak(), ...(rawStreak || {}) };
  if (!streak.lastSolvedDate || streak.current <= 0) {
    return { ...streak, lastEvaluatedDate: todayStr };
  }

  if (streak.lastEvaluatedDate === todayStr) {
    return streak;
  }

  const daysSinceLastSolve = diffCalendarDays(streak.lastSolvedDate, todayStr);
  if (daysSinceLastSolve <= 1) {
    return { ...streak, lastEvaluatedDate: todayStr };
  }

  // Gather un-frozen missed days between lastSolvedDate and yesterday.
  const frozenSet = new Set(streak.frozenDates || []);
  const unguardedMissedDates = [];
  for (let offset = 1; offset < daysSinceLastSolve; offset += 1) {
    const missedDate = addCalendarDays(streak.lastSolvedDate, offset);
    if (!frozenSet.has(missedDate)) {
      unguardedMissedDates.push(missedDate);
    }
  }

  if (unguardedMissedDates.length === 0) {
    return { ...streak, lastEvaluatedDate: todayStr };
  }

  if (streak.freezes >= unguardedMissedDates.length) {
    const savedStreak = streak.current;
    return {
      ...streak,
      freezes: streak.freezes - unguardedMissedDates.length,
      frozenDates: [...(streak.frozenDates || []), ...unguardedMissedDates],
      lastEvaluatedDate: todayStr,
      freezeNotice: `Your freeze saved your ${savedStreak}-day streak!`,
    };
  }

  return {
    ...streak,
    current: 0,
    lastEvaluatedDate: todayStr,
    freezeNotice: null,
  };
}

/**
 * Update streak state when today's daily puzzle is solved.
 * Only today's daily puzzle affects streak (archive/practice do not call this).
 * @param {object} rawStreak
 * @param {string} todayStr
 * @returns {object}
 */
export function applyDailySolveStreak(rawStreak, todayStr) {
  const synced = syncStreaksForDate(rawStreak, todayStr);
  if (synced.lastSolvedDate === todayStr) {
    return synced;
  }

  let continuesStreak = false;
  if (synced.lastSolvedDate && synced.current > 0) {
    const daysSinceLast = diffCalendarDays(synced.lastSolvedDate, todayStr);
    if (daysSinceLast === 1) {
      continuesStreak = true;
    } else if (daysSinceLast > 1) {
      const frozenSet = new Set(synced.frozenDates || []);
      continuesStreak = true;
      for (let offset = 1; offset < daysSinceLast; offset += 1) {
        if (!frozenSet.has(addCalendarDays(synced.lastSolvedDate, offset))) {
          continuesStreak = false;
          break;
        }
      }
    }
  }

  const nextCurrent = continuesStreak ? synced.current + 1 : 1;
  const nextBest = Math.max(synced.best || 0, nextCurrent);
  let nextFreezes = synced.freezes || 0;

  if (nextCurrent > 0 && nextCurrent % STREAK_FREEZE_INTERVAL === 0) {
    nextFreezes = Math.min(MAX_STREAK_FREEZES, nextFreezes + 1);
  }

  return {
    ...synced,
    current: nextCurrent,
    best: nextBest,
    freezes: nextFreezes,
    lastSolvedDate: todayStr,
    lastEvaluatedDate: todayStr,
  };
}

/**
 * Build the 7-day rolling indicator dots ending on `todayStr`.
 * @param {object} state
 * @param {string} todayStr
 */
export function getLast7DaysStatus(state, todayStr) {
  const dailyResults = state?.dailyResults || {};
  const frozenSet = new Set(state?.streak?.frozenDates || []);
  const days = [];

  for (let offset = -6; offset <= 0; offset += 1) {
    const dateStr = addCalendarDays(todayStr, offset);
    let status = 'missed';
    if (dailyResults[dateStr]) {
      status = 'solved';
    } else if (frozenSet.has(dateStr)) {
      status = 'frozen';
    } else if (offset === 0) {
      status = 'today';
    }
    days.push({ dateStr, status, isToday: offset === 0 });
  }

  return days;
}
