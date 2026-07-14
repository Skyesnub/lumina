import { ACHIEVEMENTS } from './achievements-data.js';
import { logActivity } from '../database/local-store.js';

export function isUnlocked(state, key) {
  return state.achievements.some(a => a.key === key);
}

/**
 * Re-evaluate every achievement condition against current state and unlock
 * any that newly qualify. Called after task completion (state.achievements
 * is mutated directly, saveState is the caller's responsibility so this can
 * be composed with other mutations in the same transaction). Returns the
 * list of definitions that were newly unlocked, for the UI to celebrate.
 */
export function checkAchievements(state) {
  const newlyUnlocked = [];

  for (const def of ACHIEVEMENTS) {
    if (isUnlocked(state, def.key)) continue;
    if (def.condition(state)) {
      state.achievements.push({ key: def.key, unlocked_at: new Date().toISOString() });
      logActivity('achievement_unlock', { key: def.key, title: def.title });
      newlyUnlocked.push(def);
    }
  }

  return newlyUnlocked;
}

export function achievementsByCategory(state) {
  const groups = {};
  for (const def of ACHIEVEMENTS) {
    if (!groups[def.category]) groups[def.category] = [];
    const record = state.achievements.find(a => a.key === def.key);
    groups[def.category].push({ ...def, unlocked: !!record, unlocked_at: record?.unlocked_at ?? null });
  }
  return groups;
}

export function unlockedCount(state) {
  return state.achievements.length;
}
