// Each condition receives the full app state and returns true/false.
// Conditions must be cheap and side-effect free — they're re-evaluated
// after every task completion.

function completedCount(state) {
  return state.tasks.filter(t => t.status === 'completed').length;
}

export const ACHIEVEMENTS = [
  // ---- Task achievements ----
  { key: 'first_task', category: 'Tasks', title: 'First Step', description: 'Complete your first task', icon: 'check', condition: s => completedCount(s) >= 1 },
  { key: 'tasks_10', category: 'Tasks', title: 'Getting Momentum', description: 'Complete 10 tasks', icon: 'check', condition: s => completedCount(s) >= 10 },
  { key: 'tasks_100', category: 'Tasks', title: 'Centurion', description: 'Complete 100 tasks', icon: 'check', condition: s => completedCount(s) >= 100 },
  { key: 'tasks_500', category: 'Tasks', title: 'Relentless', description: 'Complete 500 tasks', icon: 'check', condition: s => completedCount(s) >= 500 },

  // ---- XP achievements ----
  { key: 'xp_1000', category: 'Experience', title: 'Rising', description: 'Earn 1,000 lifetime XP', icon: 'bolt', condition: s => s.profile.total_xp >= 1000 },
  { key: 'xp_10000', category: 'Experience', title: 'Seasoned', description: 'Earn 10,000 lifetime XP', icon: 'bolt', condition: s => s.profile.total_xp >= 10000 },
  { key: 'level_10', category: 'Experience', title: 'Double Digits', description: 'Reach Level 10', icon: 'star', condition: s => s.profile.current_level >= 10 },
  { key: 'level_50', category: 'Experience', title: 'Veteran', description: 'Reach Level 50', icon: 'star', condition: s => s.profile.current_level >= 50 },

  // ---- Streak achievements ----
  { key: 'streak_7', category: 'Streaks', title: 'One Week Strong', description: '7 day streak', icon: 'flame', condition: s => s.profile.longest_streak >= 7 },
  { key: 'streak_30', category: 'Streaks', title: 'Habit Formed', description: '30 day streak', icon: 'flame', condition: s => s.profile.longest_streak >= 30 },
  { key: 'streak_100', category: 'Streaks', title: 'Unstoppable', description: '100 day streak', icon: 'flame', condition: s => s.profile.longest_streak >= 100 },
];

export const ACHIEVEMENT_ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5-5.9-3.3-5.9 3.3 1.3-6.5-4.9-4.6 6.6-.8z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
};
