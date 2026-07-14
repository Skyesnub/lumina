import { todayKey, daysBetween } from '../utils/format.js';

/**
 * Called whenever a task is completed. Mutates profile.current_streak /
 * longest_streak / last_active_date in place.
 *
 * Rules:
 *  - First completion ever: streak starts at 1.
 *  - Completing again on the same day: streak unchanged (already counted).
 *  - Completing exactly one day after the last active day: streak += 1.
 *  - Completing after a gap of 2+ days: streak resets to 1 (today counts).
 */
export function recordCompletionForStreak(profile) {
  const today = todayKey();

  if (!profile.last_active_date) {
    profile.current_streak = 1;
  } else {
    const gap = daysBetween(profile.last_active_date, today);
    if (gap === 0) {
      // already active today, no change
    } else if (gap === 1) {
      profile.current_streak += 1;
    } else if (gap > 1) {
      profile.current_streak = 1;
    }
    // gap < 0 (clock skew / timezone edge case) is ignored defensively
  }

  profile.last_active_date = today;
  profile.longest_streak = Math.max(profile.longest_streak, profile.current_streak);

  return {
    currentStreak: profile.current_streak,
    longestStreak: profile.longest_streak,
    isNewRecord: profile.current_streak === profile.longest_streak && profile.current_streak > 1,
  };
}

/**
 * Called on app load (not on task completion) to detect a streak that has
 * silently lapsed because a day was missed since the user last opened the
 * app. Does NOT mutate state — the dashboard uses this to show an
 * "at risk" warning or to zero the displayed streak, and the reset itself
 * is applied lazily the next time recordCompletionForStreak runs.
 */
export function getStreakStatus(profile) {
  if (!profile.last_active_date || profile.current_streak === 0) {
    return { state: 'none', daysSinceActive: null };
  }
  const gap = daysBetween(profile.last_active_date, todayKey());
  if (gap === 0) return { state: 'active-today', daysSinceActive: 0 };
  if (gap === 1) return { state: 'at-risk', daysSinceActive: 1 }; // must complete something today
  return { state: 'lapsed', daysSinceActive: gap };
}
