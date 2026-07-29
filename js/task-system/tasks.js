import { getState, saveState, emit, logActivity } from '../database/local-store.js';
import { xpForDifficulty, applyXpGain } from '../xp-system/leveling.js';
import { recordCompletionForStreak } from '../streaks/streaks.js';
import { checkAchievements } from '../achievements/achievements.js';
import { todayKey } from '../utils/format.js';

export const CATEGORIES = ['School', 'Training', 'Personal', 'Chores', 'Health', 'Other'];
export const PRIORITIES = ['low', 'medium', 'high'];
export const REPEAT_OPTIONS = ['none', 'daily', 'weekly', 'monthly'];

function nextRepeatDate(repeat, fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);

  if (repeat === 'daily') date.setDate(date.getDate() + 1);
  if (repeat === 'weekly') date.setDate(date.getDate() + 7);
  if (repeat === 'monthly') {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }

  return todayKey(date);
}

export function taskCompletionCount(task) {
  // Existing saved tasks predate completion_count. Preserve their one
  // completion when calculating lifetime stats after the upgrade.
  return Number(task.completion_count || 0) + (task.status === 'completed' && !task.completion_count ? 1 : 0);
}

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
    repeat: REPEAT_OPTIONS.includes(input.repeat) ? input.repeat : 'none',
    completion_count: 0,
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
  if (patch.repeat && !REPEAT_OPTIONS.includes(patch.repeat)) task.repeat = 'none';
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
 * Reopen recurring tasks only once their next scheduled date has arrived.
 * This runs at startup and after each local midnight, so completed recurring
 * tasks stay visible in the completion history until they are due again.
 */
export function activateDueRepeatingTasks(now = new Date()) {
  const state = getState();
  const today = todayKey(now);
  const changedTasks = [];

  for (const task of state.tasks) {
    if (!task.repeat || task.repeat === 'none' || !task.due_date) continue;

    if (task.status === 'completed' && task.due_date <= today) {
      task.status = 'pending';
      task.completed_at = null;
      changedTasks.push(task);
      continue;
    }

    // Repair tasks completed with the previous recurrence behavior: those
    // were incorrectly saved as pending even though their next due date is
    // still in the future.
    if (task.status === 'pending' && taskCompletionCount(task) > 0 && task.due_date > today) {
      task.status = 'completed';
      task.completed_at ||= now.toISOString();
      changedTasks.push(task);
    }
  }

  if (changedTasks.length) {
    saveState(state);
    changedTasks.forEach(task => emit('task-updated', task));
  }
  return changedTasks;
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

  const completedAt = new Date().toISOString();
  task.completion_count = taskCompletionCount(task) + 1;

  // A repeating task remains a single record. It stays completed (and in
  // Recent) until its next scheduled day, when activateDueRepeatingTasks()
  // moves it back to pending.
  if (task.repeat && task.repeat !== 'none') {
    task.status = 'completed';
    task.completed_at = completedAt;
    task.due_date = nextRepeatDate(task.repeat);
  } else {
    task.status = 'completed';
    task.completed_at = completedAt;
  }

  const xpResult = applyXpGain(state.profile, task.xp_reward);
  const streakResult = recordCompletionForStreak(state.profile);

  logActivity('task_complete', {
    taskId: task.id,
    name: task.name,
    xp: task.xp_reward,
    completionCount: task.completion_count,
    repeat: task.repeat || 'none',
  });
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
  return [...tasks].sort((a, b) => {
    // Completed tasks always sink below pending ones. Pending work is
    // always prioritized high-to-low; the selected sort only breaks ties.
    // Completed tasks remain in creation order, independent of the pending
    // task sort, so their history stays stable and easy to scan.
    if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
    if (a.status !== 'completed') {
      const priorityDifference = PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
      if (priorityDifference) return priorityDifference;
      return sorter(a, b);
    }
    return SORTERS.created_at(a, b);
  });
}

export function todaysTasks(tasks) {
  // The dashboard uses this helper directly rather than the Tasks page's
  // sorter, so apply the same high-to-low priority ordering here as well.
  return sortTasks(tasks.filter(t => t.status === 'pending'));
}

export function recentlyCompleted(tasks, limit = 5) {
  return tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, limit);
}

/**
 * Caps the COMPLETED portion of a mixed task list to the N most recently
 * completed, leaving every pending task untouched regardless of count.
 * "Most recent" is always by completed_at, independent of whatever sort
 * key the caller later displays the list in — this decides which tasks
 * make the cut, not what order they end up shown in.
 */
export function capCompletedTasks(tasks, limit = 5) {
  const pending = tasks.filter(t => t.status !== 'completed');
  const completed = recentlyCompleted(tasks, limit);
  return [...pending, ...completed];
}
