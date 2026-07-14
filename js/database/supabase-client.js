// =============================================================================
// SUPABASE CLIENT — Phase 2 (active)
//
// Reads the Supabase JS client off `window.supabase`, set by the classic
// CDN script tag in index.html (see the comment there for why — the ESM
// CDN build currently has a browser bug). The rest of this file mirrors
// local-store.js's field names on purpose, so task-system, xp-system,
// achievements, and streaks never had to change at all.
// =============================================================================

const SUPABASE_URL = 'https://pocbjhazrqjjqjqaqikx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MryTZXVSIWezav6g6StNUA_427eIJZH';

export let supabase = null;

export function initSupabase() {
  if (!window.supabase) {
    throw new Error('window.supabase is missing — check that the Supabase <script> tag in index.html loaded before js/main.js.');
  }
  if (!supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

/* ---------------------------------------------------------------------------
   Auth
--------------------------------------------------------------------------- */

// Returns { user, session }. session is null when Supabase requires email
// confirmation before the account is usable — the caller uses that to show
// a "check your email" message instead of logging straight in.
export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Checked once on app load to skip the auth screen for a returning,
// already-logged-in user (Supabase persists the session token itself).
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

/* ---------------------------------------------------------------------------
   Data — each function returns/accepts the same shapes local-store.js uses,
   scoped to auth.uid() automatically via Postgres row-level security
   (see supabase/schema.sql), so no user_id filtering is needed client-side.
--------------------------------------------------------------------------- */

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function fetchTasks(userId) {
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertTask(task) {
  const { data, error } = await supabase.from('tasks').upsert(task).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTaskRemote(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function fetchAchievements(userId) {
  const { data, error } = await supabase.from('achievements').select('*').eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function unlockAchievementRemote(userId, achievementKey) {
  // upsert + ignoreDuplicates rather than insert: a sync retry re-sending
  // an already-unlocked achievement should be a harmless no-op, not a
  // unique-constraint error.
  const { error } = await supabase.from('achievements').upsert(
    { user_id: userId, achievement_key: achievementKey, unlocked_at: new Date().toISOString() },
    { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
  );
  if (error) throw error;
}

export async function logActivityRemote(userId, type, payload) {
  const { error } = await supabase.from('activity_history').insert({ user_id: userId, type, payload });
  if (error) throw error;
}
