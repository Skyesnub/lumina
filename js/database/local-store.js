// =============================================================================
// LOCAL STORE (Phase 1 persistence)
//
// This app is designed to run in two modes against the SAME state shape:
//   Phase 1 (now):     data lives in localStorage, single browser/device.
//   Phase 2 (planned): database/supabase-client.js takes over persistence,
//                       auth/auth.js switches from guest mode to real accounts,
//                       and data syncs across devices per-user via RLS.
//
// Every field name here (snake_case) intentionally matches the Supabase
// column names in supabase/schema.sql, so the swap is a storage-adapter
// change, not a data-model rewrite.
// =============================================================================

const STORAGE_KEY = 'lumen-rpg:state:v1';

// Central pub/sub so subsystems (xp-system, task-system, achievements,
// streaks) can announce changes without importing each other directly,
// and UI components can react without polling.
export const bus = new EventTarget();

export function emit(eventName, detail) {
  bus.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function on(eventName, handler) {
  bus.addEventListener(eventName, handler);
}

function defaultProfile(username) {
  return {
    id: crypto.randomUUID(),
    username: username || 'Adventurer',
    email: null,
    total_xp: 0,
    current_level: 1,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null, // Y-M-D key, set on first task completion
    theme_hue: 226,
    dark_mode: false,
    created_at: new Date().toISOString(),
  };
}

function defaultState(username) {
  return {
    profile: defaultProfile(username),
    tasks: [],
    achievements: [],       // [{ key, unlocked_at }]
    activity: [],           // append-only log, newest first
  };
}

let cache = null;

export function hasExistingProfile() {
  return localStorage.getItem(STORAGE_KEY) != null;
}

export function loadState(usernameIfNew) {
  if (cache) return cache;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw);
      return cache;
    } catch {
      // fall through to a fresh default state if the saved JSON is corrupt
    }
  }
  cache = defaultState(usernameIfNew);
  saveState(cache);
  return cache;
}

export function saveState(state = cache) {
  cache = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit('state-saved', state);
}

export function getState() {
  return cache ?? loadState();
}

export function logActivity(type, payload) {
  const state = getState();
  state.activity.unshift({
    id: crypto.randomUUID(),
    type, // 'task_complete' | 'xp_gain' | 'level_up' | 'streak_update' | 'achievement_unlock'
    payload,
    created_at: new Date().toISOString(),
  });
  // keep the log bounded — this is a UI history feed, not an audit trail
  if (state.activity.length > 200) state.activity.length = 200;
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  cache = null;
}
