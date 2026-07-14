// =============================================================================
// AUTH — Phase 1: local guest profile (no server, no password).
//
// This exists so the full app — dashboard, tasks, XP, achievements, streaks —
// is usable immediately with zero setup. The function names below
// (signUp/signIn/signOut/currentUser) intentionally match the Supabase
// auth calls in database/supabase-client.js, so Phase 2 is a matter of
// swapping which module main.js imports these from, not a rewrite of any
// screen that calls them.
// =============================================================================

import { loadState, hasExistingProfile, getState, saveState, resetAllData } from '../database/local-store.js';

export function isSignedIn() {
  return hasExistingProfile();
}

export function currentUser() {
  return getState().profile;
}

// Phase 1 "sign up" just names your guest profile — no email/password yet.
export function signUp(username) {
  const state = loadState(username || 'Adventurer');
  state.profile.username = username || state.profile.username;
  saveState(state);
  return state.profile;
}

export function signIn() {
  return loadState().profile;
}

export function signOut() {
  resetAllData();
}

export function updateUsername(username) {
  const state = getState();
  state.profile.username = username;
  saveState(state);
  return state.profile;
}
