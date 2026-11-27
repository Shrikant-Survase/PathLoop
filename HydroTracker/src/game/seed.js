export const LAUNCH_DATE = '2026-11-27';

const MS_PER_DAY = 86400000;

/**
 * Parse a "YYYY-MM-DD" string into local year, month (1-12), and day (1-31).
 * @param {string} dateStr
 * @returns {{ year: number, month: number, day: number }}
 */
export function parseDateParts(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

/**
 * Format a Date as local calendar "YYYY-MM-DD".
 * @param {Date} [date]
 * @returns {string}
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Difference in whole calendar days between two "YYYY-MM-DD" strings (b - a).
 * Uses UTC noon internally to avoid DST shifts while keeping local calendar dates exact.
 * @param {string} fromDateStr
 * @param {string} toDateStr
 * @returns {number}
 */
export function diffCalendarDays(fromDateStr, toDateStr) {
  const a = parseDateParts(fromDateStr);
  const b = parseDateParts(toDateStr);
  const utcA = Date.UTC(a.year, a.month - 1, a.day, 12);
  const utcB = Date.UTC(b.year, b.month - 1, b.day, 12);
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/**
 * Add `deltaDays` calendar days to a "YYYY-MM-DD" string using local calendar math.
 * @param {string} dateStr
 * @param {number} deltaDays
 * @returns {string}
 */
export function addCalendarDays(dateStr, deltaDays) {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(year, month - 1, day + deltaDays);
  return getLocalDateString(d);
}

/**
 * Compute a deterministic 1-based daily puzzle number from LAUNCH_DATE.
 * @param {string} dateStr
 * @returns {number}
 */
export function getPuzzleNumber(dateStr) {
  return Math.max(1, diffCalendarDays(LAUNCH_DATE, dateStr) + 1);
}

/**
 * Deterministic 32-bit FNV-1a hash of a string.
 * @param {string} str
 * @returns {number}
 */
export function hashString(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Seeded PRNG (Mulberry32) yielding floats in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded RNG from a date or arbitrary seed string and optional salt.
 * @param {string} seedStr
 * @param {string} [salt]
 * @returns {() => number}
 */
export function createDateRng(seedStr, salt = '') {
  const key = salt ? `${seedStr}:${salt}` : seedStr;
  return mulberry32(hashString(key));
}
