import { getState, saveState, emit, logActivity } from '../database/local-store.js';
import { xpForDifficulty, applyXpGain } from '../xp-system/leveling.js';
import { recordCompletionForStreak } from '../streaks/streaks.js';
import { checkAchievements } from '../achievements/achievements.js';

export const CATEGORIES = ['School', 'Training', 'Personal', 'Chores', 'Health', 'Other'];
export const PRIORITIES = ['low', 'medium', 'high'];

export function getTasks() {
  return getState().tasks;
}

export function getTaskById(id) {
  return getState().tasks.find(t => t.id === id);
}

export function createTask(input) {
  const state = getState();
  const task = {
    id: crypto.randomUUID(),
    user_id: state.profile.id,
    name: input.name.trim(),
    description: (input.description || '').trim(),
    category: input.category || 'Other',
    difficulty: input.difficulty || 'medium',
    priority: input.priority || 'medium',
    due_date: input.due_date || null,
    estimated_minutes: input.estimated_minutes ? Number(input.estimated_minutes) : null,
    status: 'pending',
    xp_reward: xpForDifficulty(input.difficulty || 'medium'),
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  state.tasks.unshift(task);
  saveState(state);
  emit('task-created', task);
  return task;
}

export function updateTask(id, patch) {
  const state = getState();
  const task = state.tasks.find(t => t.id === id);
  if (!task) return null;
  Object.assign(task, patch);
  if (patch.difficulty) task.xp_reward = xpForDifficulty(patch.difficulty);
  saveState(state);
  emit('task-updated', task);
  return task;
}

export function deleteTask(id) {
  const state = getState();
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState(state);
  emit('task-deleted', { id });
}

/**
 * Complete a task: marks it done, awards XP, updates level, updates the
 * streak, logs activity, and checks whether any achievements just unlocked.
 * Returns a single report object the UI uses to drive every piece of
 * feedback (XP bar animation, level-up modal, toasts, badge pop) at once.
 */
export function completeTask(id) {
  const state = getState();
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.status === 'completed') return null;

  task.status = 'completed';
  task.completed_at = new Date().toISOString();

  const xpResult = applyXpGain(state.profile, task.xp_reward);
  const streakResult = recordCompletionForStreak(state.profile);

  logActivity('task_complete', { taskId: task.id, name: task.name, xp: task.xp_reward });
  if (xpResult.leveledUp) {
    logActivity('level_up', { fromLevel: xpResult.fromLevel, toLevel: xpResult.toLevel });
  }

  const newlyUnlocked = checkAchievements(state);

  saveState(state);

  const report = { task, xpResult, streakResult, newlyUnlocked };
  emit('task-completed', report);
  return report;
}

export function reopenTask(id) {
  // Undo a completion (doesn't claw back XP already granted — keeps the
  // mental model simple: XP is a reward for having done the work at all).
  const state = getState();
  const task = state.tasks.find(t => t.id === id);
  if (!task) return null;
  task.status = 'pending';
  task.completed_at = null;
  saveState(state);
  emit('task-updated', task);
  return task;
}

export function filterTasks(tasks, { status, category, priority } = {}) {
  return tasks.filter(t =>
    (!status || t.status === status) &&
    (!category || t.category === category) &&
    (!priority || t.priority === priority)
  );
}

const SORTERS = {
  'due_date': (a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1,
  'priority': (a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority),
  'xp_reward': (a, b) => b.xp_reward - a.xp_reward,
  'created_at': (a, b) => new Date(b.created_at) - new Date(a.created_at),
};

export function sortTasks(tasks, key = 'created_at') {
  const sorter = SORTERS[key] || SORTERS.created_at;
  return [...tasks].sort(sorter);
}

export function todaysTasks(tasks) {
  return tasks.filter(t => t.status === 'pending');
}

export function recentlyCompleted(tasks, limit = 5) {
  return tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, limit);
}
