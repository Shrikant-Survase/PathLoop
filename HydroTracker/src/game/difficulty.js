import { parseDateParts } from './seed.js';

export const LEVELS_PER_WORLD = 50;
export const WORLD_UNLOCK_REQUIREMENT = 20;
export const WORLD_ORDER = ['easy', 'medium', 'hard', 'expert'];

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'Easy',
    size: 5,
    minCheckpoints: 6,
    maxCheckpoints: 7,
    minWalls: 0,
    maxWalls: 0,
    targetTimeSeconds: 45,
    color: '#12B76A',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    size: 6,
    minCheckpoints: 5,
    maxCheckpoints: 6,
    minWalls: 0,
    maxWalls: 2,
    targetTimeSeconds: 75,
    color: '#4F46E5',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    size: 7,
    minCheckpoints: 4,
    maxCheckpoints: 5,
    minWalls: 3,
    maxWalls: 5,
    targetTimeSeconds: 120,
    color: '#F79009',
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    size: 8,
    minCheckpoints: 3,
    maxCheckpoints: 4,
    minWalls: 5,
    maxWalls: 8,
    targetTimeSeconds: 180,
    color: '#F04438',
  },
};

// Mon (1) easy -> Sun (0) expert
const WEEKDAY_TO_DIFFICULTY = {
  1: 'easy',
  2: 'easy',
  3: 'medium',
  4: 'medium',
  5: 'hard',
  6: 'hard',
  0: 'expert',
};

/**
 * Rotate daily difficulty by local weekday (Mon Easy -> Sun Expert).
 * @param {string} dateStr
 * @returns {object}
 */
export function getDailyDifficulty(dateStr) {
  const { year, month, day } = parseDateParts(dateStr);
  const weekday = new Date(year, month - 1, day).getDay();
  const id = WEEKDAY_TO_DIFFICULTY[weekday] || 'medium';
  return DIFFICULTIES[id];
}

/**
 * Deterministic level seed string.
 * @param {string} difficultyId
 * @param {number} number
 * @returns {string}
 */
export function getLevelSeed(difficultyId, number) {
  return `level-${difficultyId}-${number}`;
}

/**
 * World unlock check: Easy is always unlocked; each subsequent world unlocks
 * after completing 20 levels of the previous world.
 * @param {string} difficultyId
 * @param {Record<string, number>} completedCounts
 * @returns {boolean}
 */
export function isWorldUnlocked(difficultyId, completedCounts = {}) {
  const idx = WORLD_ORDER.indexOf(difficultyId);
  if (idx <= 0) return true;
  const prevWorld = WORLD_ORDER[idx - 1];
  return (completedCounts[prevWorld] || 0) >= WORLD_UNLOCK_REQUIREMENT;
}

/**
 * Compute 1-3 star rating for a completed level.
 * 1★ finish | 2★ no hints | 3★ no hints + under target time.
 * @param {{ hintsUsed: number, elapsedSeconds: number, targetTimeSeconds: number }} params
 * @returns {1 | 2 | 3}
 */
export function calculateLevelStars({ hintsUsed, elapsedSeconds, targetTimeSeconds }) {
  if (hintsUsed > 0) return 1;
  if (elapsedSeconds <= targetTimeSeconds) return 3;
  return 2;
}
