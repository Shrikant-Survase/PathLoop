import { LEVELS_PER_WORLD, WORLD_ORDER } from './difficulty.js';

export const ACHIEVEMENTS = [
  {
    id: 'first_solve',
    title: 'First Solve',
    description: 'Complete your first PathLoop puzzle',
    icon: 'checkmark-circle',
    check: (state) =>
      Object.keys(state.dailyResults || {}).length > 0 ||
      Object.keys(state.levels || {}).length > 0,
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Reach a 7-day daily streak',
    icon: 'flame',
    check: (state) => (state.streak?.best || 0) >= 7,
  },
  {
    id: 'streak_30',
    title: '30-Day Streak',
    description: 'Reach a 30-day daily streak',
    icon: 'flame',
    check: (state) => (state.streak?.best || 0) >= 30,
  },
  {
    id: 'streak_100',
    title: '100-Day Streak',
    description: 'Reach a 100-day daily streak',
    icon: 'trophy',
    check: (state) => (state.streak?.best || 0) >= 100,
  },
  {
    id: 'speedster',
    title: 'Speedster',
    description: 'Solve a daily puzzle under 30s',
    icon: 'flash',
    check: (state) =>
      Object.values(state.dailyResults || {}).some(
        (d) => typeof d.time === 'number' && d.time < 30
      ),
  },
  {
    id: 'pure_mind',
    title: 'Pure Mind',
    description: 'Solve 10 dailies with no hints',
    icon: 'sparkles',
    check: (state) =>
      Object.values(state.dailyResults || {}).filter((d) => (d.hintsUsed || 0) === 0).length >= 10,
  },
  {
    id: 'star_collector',
    title: 'Star Collector',
    description: 'Earn 100 total stars in Levels',
    icon: 'star',
    check: (state) =>
      Object.values(state.levels || {}).reduce((sum, l) => sum + (l.stars || 0), 0) >= 100,
  },
  {
    id: 'world_clear',
    title: 'World Clear',
    description: 'Complete all 50 levels in any world',
    icon: 'ribbon',
    check: (state) => {
      const levels = state.levels || {};
      return WORLD_ORDER.some((diff) => {
        let count = 0;
        for (let i = 1; i <= LEVELS_PER_WORLD; i += 1) {
          if (levels[`${diff}-${i}`]) count += 1;
        }
        return count >= LEVELS_PER_WORLD;
      });
    },
  },
  {
    id: 'expert_mind',
    title: 'Expert Mind',
    description: 'Solve an Expert difficulty puzzle',
    icon: 'diamond',
    check: (state) => {
      const hasExpertDaily = Object.values(state.dailyResults || {}).some(
        (d) => d.difficulty === 'expert'
      );
      if (hasExpertDaily) return true;
      const hasExpertLevel = Object.keys(state.levels || {}).some((k) => k.startsWith('expert-'));
      return hasExpertLevel || Boolean(state.solvedExpertPractice);
    },
  },
];

/**
 * Evaluate all earned achievement IDs for `state`.
 * @param {object} state
 * @returns {string[]}
 */
export function evaluateAchievements(state) {
  return ACHIEVEMENTS.filter((badge) => badge.check(state)).map((badge) => badge.id);
}

/**
 * Return achievement objects newly unlocked relative to `state.unlockedAchievements`.
 * @param {object} state
 * @returns {Array<object>}
 */
export function getNewlyUnlockedAchievements(state) {
  const existing = new Set(state.unlockedAchievements || []);
  return ACHIEVEMENTS.filter((badge) => !existing.has(badge.id) && badge.check(state));
}
