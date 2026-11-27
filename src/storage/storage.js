import { getNewlyUnlockedAchievements } from '../game/achievements.js';
import { getLocalDateString } from '../game/seed.js';
import { applyDailySolveStreak, createInitialStreak, syncStreaksForDate } from '../game/streaks.js';

const memoryFallback = new Map();
let cachedStorage = null;
let warnedFallback = false;

async function getStorageBackend() {
  if (cachedStorage) return cachedStorage;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const storage = mod?.default || mod;
    if (storage && typeof storage.getItem === 'function') {
      cachedStorage = storage;
      return cachedStorage;
    }
  } catch (err) {
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(
        '[PathLoop] AsyncStorage native module is unavailable in this build; using temporary in-memory storage until you rebuild the native app.',
        err?.message || err
      );
    }
  }

  cachedStorage = {
    async getItem(key) {
      return memoryFallback.has(key) ? memoryFallback.get(key) : null;
    },
    async setItem(key, value) {
      memoryFallback.set(key, String(value));
    },
  };
  return cachedStorage;
}

export const STORAGE_KEY = '@pathloop_v1';
export const SCHEMA_VERSION = 1;
export const DAILY_FREE_HINTS = 3;

export function createDefaultSettings() {
  return {
    dailyReminderEnabled: false,
    reminderHour: 20,
    reminderMinute: 0,
    hapticsEnabled: true,
    soundEnabled: true,
    theme: 'system', // 'system' | 'light' | 'dark'
  };
}

export function createDefaultState(todayStr = getLocalDateString()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    dailyResults: {},
    levels: {},
    streak: createInitialStreak(),
    hintsAvailable: DAILY_FREE_HINTS,
    hintsResetDate: todayStr,
    hintsUsedTotal: 0,
    unlockedAchievements: [],
    solvedExpertPractice: false,
    settings: createDefaultSettings(),
  };
}

/**
 * Migrate persisted state from any older version to current schemaVersion.
 * @param {object | null | undefined} raw
 * @param {string} [todayStr]
 */
export function migrateState(raw, todayStr = getLocalDateString()) {
  const base = createDefaultState(todayStr);
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  return {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    dailyResults: raw.dailyResults && typeof raw.dailyResults === 'object' ? raw.dailyResults : {},
    levels: raw.levels && typeof raw.levels === 'object' ? raw.levels : {},
    streak: {
      ...createInitialStreak(),
      ...(raw.streak && typeof raw.streak === 'object' ? raw.streak : {}),
    },
    hintsAvailable: typeof raw.hintsAvailable === 'number' ? raw.hintsAvailable : DAILY_FREE_HINTS,
    hintsResetDate: raw.hintsResetDate || todayStr,
    hintsUsedTotal: typeof raw.hintsUsedTotal === 'number' ? raw.hintsUsedTotal : 0,
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    solvedExpertPractice: Boolean(raw.solvedExpertPractice),
    settings: {
      ...createDefaultSettings(),
      ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}),
    },
  };
}

/**
 * Apply midnight hint refill and daily streak sync for `todayStr`.
 */
export function syncStateForToday(state, todayStr = getLocalDateString()) {
  let next = migrateState(state, todayStr);
  const syncedStreak = syncStreaksForDate(next.streak, todayStr);
  if (syncedStreak !== next.streak) {
    next = { ...next, streak: syncedStreak };
  }

  if (next.hintsResetDate !== todayStr) {
    next = {
      ...next,
      hintsAvailable: Math.max(DAILY_FREE_HINTS, next.hintsAvailable),
      hintsResetDate: todayStr,
    };
  }

  return next;
}

async function persistState(state) {
  const storage = await getStorageBackend();
  await storage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export async function getProgress(todayStr = getLocalDateString()) {
  try {
    const storage = await getStorageBackend();
    const rawJson = await storage.getItem(STORAGE_KEY);
    const parsed = rawJson ? JSON.parse(rawJson) : null;
    const synced = syncStateForToday(parsed, todayStr);
    if (!rawJson || JSON.stringify(parsed) !== JSON.stringify(synced)) {
      await persistState(synced);
    }
    return synced;
  } catch {
    return createDefaultState(todayStr);
  }
}

export async function saveDailyResult({
  date,
  time,
  hintsUsed = 0,
  difficulty,
  puzzleNumber,
  isArchive = false,
  todayStr = getLocalDateString(),
}) {
  const current = await getProgress(todayStr);
  const prevEntry = current.dailyResults[date];
  const bestTime = prevEntry ? Math.min(prevEntry.time, time) : time;

  const dailyResults = {
    ...current.dailyResults,
    [date]: {
      time: bestTime,
      hintsUsed: prevEntry ? Math.min(prevEntry.hintsUsed || 0, hintsUsed) : hintsUsed,
      difficulty,
      puzzleNumber,
      solvedAt: prevEntry?.solvedAt || new Date().toISOString(),
    },
  };

  let nextStreak = current.streak;
  let nextHints = current.hintsAvailable;

  if (!isArchive && date === todayStr) {
    const alreadySolvedToday = Boolean(prevEntry);
    nextStreak = applyDailySolveStreak(current.streak, todayStr);
    if (!alreadySolvedToday && hintsUsed === 0) {
      nextHints += 1;
    }
  }

  let nextState = {
    ...current,
    dailyResults,
    streak: nextStreak,
    hintsAvailable: nextHints,
  };

  const newlyUnlocked = getNewlyUnlockedAchievements(nextState);
  if (newlyUnlocked.length > 0) {
    nextState = {
      ...nextState,
      unlockedAchievements: [...nextState.unlockedAchievements, ...newlyUnlocked.map((b) => b.id)],
    };
  }

  await persistState(nextState);
  return { state: nextState, newlyUnlocked };
}

export async function saveLevelResult({
  difficulty,
  number,
  stars,
  time,
  hintsUsed = 0,
  todayStr = getLocalDateString(),
}) {
  const current = await getProgress(todayStr);
  const key = `${difficulty}-${number}`;
  const prev = current.levels[key];
  const prevStars = prev?.stars || 0;
  const bestStars = Math.max(prevStars, stars);
  const bestTime = prev?.bestTime != null ? Math.min(prev.bestTime, time) : time;

  const earnedBonusHint = bestStars === 3 && prevStars < 3 ? 1 : 0;

  let nextState = {
    ...current,
    levels: {
      ...current.levels,
      [key]: {
        stars: bestStars,
        bestTime,
        hintsUsed: prev ? Math.min(prev.hintsUsed || 0, hintsUsed) : hintsUsed,
      },
    },
    hintsAvailable: current.hintsAvailable + earnedBonusHint,
  };

  const newlyUnlocked = getNewlyUnlockedAchievements(nextState);
  if (newlyUnlocked.length > 0) {
    nextState = {
      ...nextState,
      unlockedAchievements: [...nextState.unlockedAchievements, ...newlyUnlocked.map((b) => b.id)],
    };
  }

  await persistState(nextState);
  return { state: nextState, newlyUnlocked, earnedBonusHint };
}

export async function savePracticeResult({ difficulty, todayStr = getLocalDateString() }) {
  const current = await getProgress(todayStr);
  let nextState = difficulty === 'expert' ? { ...current, solvedExpertPractice: true } : current;

  const newlyUnlocked = getNewlyUnlockedAchievements(nextState);
  if (newlyUnlocked.length > 0) {
    nextState = {
      ...nextState,
      unlockedAchievements: [...nextState.unlockedAchievements, ...newlyUnlocked.map((b) => b.id)],
    };
  }

  if (nextState !== current) {
    await persistState(nextState);
  }
  return { state: nextState, newlyUnlocked };
}

export async function getHints(todayStr = getLocalDateString()) {
  const state = await getProgress(todayStr);
  return state.hintsAvailable;
}

export async function useHint(todayStr = getLocalDateString()) {
  const current = await getProgress(todayStr);
  if (current.hintsAvailable <= 0) {
    return { ok: false, state: current };
  }

  const nextState = {
    ...current,
    hintsAvailable: current.hintsAvailable - 1,
    hintsUsedTotal: current.hintsUsedTotal + 1,
  };
  await persistState(nextState);
  return { ok: true, state: nextState };
}

export async function updateSettings(partialSettings, todayStr = getLocalDateString()) {
  const current = await getProgress(todayStr);
  const nextState = {
    ...current,
    settings: {
      ...current.settings,
      ...partialSettings,
    },
  };
  await persistState(nextState);
  return nextState;
}

export async function clearFreezeNotice(todayStr = getLocalDateString()) {
  const current = await getProgress(todayStr);
  if (!current.streak?.freezeNotice) {
    return current;
  }
  const nextState = {
    ...current,
    streak: {
      ...current.streak,
      freezeNotice: null,
    },
  };
  await persistState(nextState);
  return nextState;
}
