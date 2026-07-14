// =============================================================================
// SYNC — bridges local-store.js's synchronous cache with Supabase.
//
// task-system, xp-system, achievements, and streaks all read/write through
// local-store.js's getState()/saveState() and never talk to the network —
// that's what keeps the UI instant (no waiting on a round-trip to check a
// task off) and what let Phase 2 land without touching any of those files.
//
// This module does two things:
//   1. pullRemoteState()  — on sign-in, fetch profile/tasks/achievements
//      from Supabase and seed the local cache with them.
//   2. attachSync()       — after that, listen on the same event bus those
//      subsystems already emit to, and push each change to Supabase in the
//      background. Failures are logged, not thrown — a flaky connection
//      should never freeze the UI or lose local progress.
// =============================================================================

import { on, getState, saveState } from './local-store.js';
import * as remote from './supabase-client.js';

let currentUserId = null;
let profilePushTimer = null;

export async function pullRemoteState(session) {
  const userId = session.user.id;
  const [profile, tasks, achievementRows] = await Promise.all([
    remote.fetchProfile(userId),
    remote.fetchTasks(userId),
    remote.fetchAchievements(userId),
  ]);

  const state = {
    profile: { ...profile, email: session.user.email },
    tasks,
    achievements: achievementRows.map(r => ({ key: r.achievement_key, unlocked_at: r.unlocked_at })),
    activity: [],
  };

  saveState(state);
  return state;
}

// Call once, right after pullRemoteState resolves. Wires background pushes
// for the rest of the session — no need to call this again until the next
// sign-in (sign-out reloads the page, which clears these listeners).
export function attachSync(userId) {
  currentUserId = userId;

  on('task-created', e => pushTask(e.detail));
  on('task-updated', e => pushTask(e.detail));
  on('task-deleted', e => remote.deleteTaskRemote(e.detail.id).catch(logSyncError));
  on('task-completed', e => {
    pushTask(e.detail.task);
    e.detail.newlyUnlocked.forEach(def => pushAchievement(def.key));
  });

  // Profile fields (XP, level, streak, theme, username, ...) change as a
  // side effect of lots of different actions. Rather than wiring a push
  // call into every one of them, piggyback on the generic 'state-saved'
  // event every saveState() call already fires, debounced so a burst of
  // changes (e.g. several rapid task completions) collapses into one
  // network call instead of one per change.
  on('state-saved', () => {
    clearTimeout(profilePushTimer);
    profilePushTimer = setTimeout(pushProfile, 600);
  });
}

function pushTask(task) {
  if (!currentUserId) return;
  remote.upsertTask({ ...task, user_id: currentUserId }).catch(logSyncError);
}

function pushProfile() {
  if (!currentUserId) return;
  const { profile } = getState();
  // id and email aren't writable profiles columns (id is the primary key /
  // FK to auth.users, email lives on auth.users itself) — strip them
  // before sending the patch.
  const { id, email, ...patch } = profile;
  remote.updateProfile(currentUserId, patch).catch(logSyncError);
}

function pushAchievement(key) {
  if (!currentUserId) return;
  remote.unlockAchievementRemote(currentUserId, key).catch(logSyncError);
}

function logSyncError(err) {
  // A failed push doesn't roll back the local change or interrupt the UI —
  // the local cache stays authoritative for this session. Worth surfacing
  // in the console so a persistent connectivity problem is discoverable,
  // without being loud enough to distract from an app that otherwise works.
  console.warn('[lumen-rpg sync]', err.message || err);
}
