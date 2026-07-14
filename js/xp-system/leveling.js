// =============================================================================
// XP / LEVELING ENGINE
//
// XP required to advance FROM level L TO level L+1 follows a power curve:
//
//     requiredXp(L) = floor(BASE_XP * L ^ GROWTH_FACTOR)
//
// Tuning BASE_XP / GROWTH_FACTOR reshapes the entire curve — that's the one
// knob the spec asks for ("XP values should be adjustable"). With the
// defaults below:
//   L1  -> L2  :     100 XP  (a single easy task or two)
//   L10 -> L11 :   2,238 XP  (a good week of consistent tasks)
//   L50 -> L51 :  19,661 XP  (months of consistent productivity)
//   L99 -> L100:  49,443 XP for that one level alone — reaching Level 100
//                 requires just over 2.1M lifetime XP, a genuine long-term
//                 achievement.
// =============================================================================

export const MAX_LEVEL = 100;
export const BASE_XP = 100;
export const GROWTH_FACTOR = 1.35;

export function requiredXpForLevel(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(BASE_XP * Math.pow(level, GROWTH_FACTOR));
}

// Cumulative lifetime XP needed to *reach* a given level (i.e. cumulative[1] = 0).
// Precomputed once — only 100 entries, trivial cost — so lookups elsewhere
// in the app are O(1) instead of re-summing a series every render.
const CUMULATIVE = (() => {
  const table = [0, 0]; // index 0 unused, index 1 = level 1 = 0 XP
  for (let level = 2; level <= MAX_LEVEL; level++) {
    table[level] = table[level - 1] + requiredXpForLevel(level - 1);
  }
  return table;
})();

export function totalXpToReachLevel(level) {
  return CUMULATIVE[Math.min(level, MAX_LEVEL)];
}

/**
 * Given lifetime total XP, derive the full progress picture:
 * current level, XP earned within that level, XP needed for the next
 * level, and percent complete. This is the single source of truth the
 * rest of the app reads from — never store "current level" independently
 * of total XP, or the two can drift out of sync.
 */
export function getLevelProgress(totalXp) {
  const xp = Math.max(0, totalXp);

  if (xp >= CUMULATIVE[MAX_LEVEL]) {
    return {
      level: MAX_LEVEL,
      xpIntoLevel: xp - CUMULATIVE[MAX_LEVEL],
      xpForNextLevel: 0,
      percent: 100,
      isMaxLevel: true,
      totalXp: xp,
    };
  }

  let level = 1;
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xp >= CUMULATIVE[l]) { level = l; break; }
  }

  const xpIntoLevel = xp - CUMULATIVE[level];
  const xpForNextLevel = requiredXpForLevel(level);

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    percent: Math.min(100, (xpIntoLevel / xpForNextLevel) * 100),
    isMaxLevel: false,
    totalXp: xp,
  };
}

// Difficulty -> XP reward. Exported as a plain object so it's a one-line
// edit to rebalance rewards later.
export const DIFFICULTY_XP = {
  'very-easy': 5,
  'easy': 15,
  'medium': 35,
  'hard': 75,
  'very-hard': 150,
};

export const DIFFICULTY_LABELS = {
  'very-easy': 'Very Easy',
  'easy': 'Easy',
  'medium': 'Medium',
  'hard': 'Hard',
  'very-hard': 'Very Hard',
};

export function xpForDifficulty(difficulty) {
  return DIFFICULTY_XP[difficulty] ?? DIFFICULTY_XP.medium;
}

/**
 * Apply an XP gain to a profile object (mutates + returns a change report).
 * Handles multi-level-ups in one gain (e.g. a huge task pushing through
 * two level boundaries) by comparing before/after level.
 */
export function applyXpGain(profile, amount) {
  const before = getLevelProgress(profile.total_xp);
  profile.total_xp += amount;
  const after = getLevelProgress(profile.total_xp);
  profile.current_level = after.level;

  return {
    xpGained: amount,
    leveledUp: after.level > before.level,
    fromLevel: before.level,
    toLevel: after.level,
    progress: after,
  };
}
