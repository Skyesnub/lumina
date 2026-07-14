import { el, clear } from './utils/dom.js';
import { on, getState, saveState, resetAllData } from './database/local-store.js';
import { initSupabase, getSession, signUp as remoteSignUp, signIn as remoteSignIn, signOut as remoteSignOut } from './database/supabase-client.js';
import { pullRemoteState, attachSync } from './database/sync.js';
import * as taskSystem from './task-system/tasks.js';
import { getLevelProgress } from './xp-system/leveling.js';

import { mountGlowBackground } from './components/glow-background.js';
import { mountNav } from './components/nav.js';
import { mountXpBar } from './components/xp-bar.js';
import { mountLevelUpModal } from './components/level-up-modal.js';
import { mountToastStack } from './components/xp-toast.js';
import { mountTaskForm } from './components/task-form.js';

import { mountDashboard, updateDashboard } from './pages/dashboard.js';
import { renderTasksView, renderAchievementsView, renderProfileView } from './pages/views.js';

const appRoot = document.getElementById('app');
const canvas = document.getElementById('glow-canvas');

let activeView = 'dashboard';
let freshAchievementKeys = new Set();
let dashboardRefs, navApi, xpBar, levelUpModal, toastStack, taskForm;
let dashboardContainer, tasksContainer, achievementsContainer, profileContainer;

function renderLoading(message) {
  clear(appRoot);
  appRoot.appendChild(
    el('div', { class: 'card', style: 'max-width:320px; margin:30vh auto 0; text-align:center; color:var(--ink-soft);' }, message)
  );
}

/* ---------------------------------------------------------------------------
   Auth screen — email + password, toggling between sign up and log in
--------------------------------------------------------------------------- */

function renderAuthScreen(initialMode = 'signup') {
  clear(appRoot);
  let mode = initialMode;

  const usernameField = el('div', { class: 'field' }, [el('label', {}, 'Your name'), el('input', { type: 'text', maxlength: 24 })]);
  const emailInput = el('input', { type: 'email', required: true, autocomplete: 'email' });
  const passwordInput = el('input', { type: 'password', required: true, minlength: 6, autocomplete: 'current-password' });
  const errorSlot = el('div', { style: 'color:var(--danger); font-size:0.82rem; min-height:1.2em;' }, '');
  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary' }, 'Start Playing');
  const toggleLink = el('button', { type: 'button', class: 'link-btn', style: 'align-self:center;' }, 'Already have an account? Log in');

  const heading = el('h1', { style: 'font-size:1.3rem' }, 'Welcome to Lumina');
  const sub = el('p', { style: 'color:var(--ink-soft); font-size:0.88rem' }, 'Turn your real tasks into XP, levels, and streaks.');

  const card = el('form', { class: 'card', style: 'max-width:360px; margin:14vh auto 0; display:flex; flex-direction:column; gap:16px;' });
  card.append(heading, sub, usernameField,
    el('div', { class: 'field' }, [el('label', {}, 'Email'), emailInput]),
    el('div', { class: 'field' }, [el('label', {}, 'Password'), passwordInput]),
    errorSlot, submitBtn, toggleLink,
  );

  function setMode(next) {
    mode = next;
    const isSignup = mode === 'signup';
    usernameField.classList.toggle('hidden', !isSignup);
    passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
    submitBtn.textContent = isSignup ? 'Start Playing' : 'Log In';
    toggleLink.textContent = isSignup ? 'Already have an account? Log in' : "New here? Create an account";
    errorSlot.textContent = '';
  }
  setMode(mode);

  toggleLink.addEventListener('click', () => setMode(mode === 'signup' ? 'login' : 'signup'));

  card.addEventListener('submit', async e => {
    e.preventDefault();
    errorSlot.textContent = '';
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'One sec…';

    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (mode === 'signup') {
        const usernameInput = usernameField.querySelector('input');
        const { session } = await remoteSignUp(email, password, usernameInput.value.trim() || 'Adventurer');
        if (!session) {
          renderCheckEmail(email);
          return;
        }
        await afterAuthSuccess(session);
      } else {
        const { session } = await remoteSignIn(email, password);
        await afterAuthSuccess(session);
      }
    } catch (err) {
      errorSlot.textContent = friendlyAuthError(err);
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  appRoot.appendChild(card);
}

function renderCheckEmail(email) {
  clear(appRoot);
  appRoot.appendChild(
    el('div', { class: 'card', style: 'max-width:360px; margin:20vh auto 0; text-align:center; display:flex; flex-direction:column; gap:12px;' }, [
      el('h1', { style: 'font-size:1.2rem' }, 'Check your inbox'),
      el('p', { style: 'color:var(--ink-soft); font-size:0.88rem' }, `We sent a confirmation link to ${email}. Click it, then come back and log in.`),
      el('button', { class: 'btn btn-ghost', onClick: () => renderAuthScreen('login') }, 'Back to log in'),
    ])
  );
}

function friendlyAuthError(err) {
  const msg = err?.message || String(err);
  if (/already registered|already exists/i.test(msg)) return 'That email already has an account — try logging in instead.';
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/password.*at least/i.test(msg)) return 'Password needs to be at least 6 characters.';
  return msg;
}

async function afterAuthSuccess(session) {
  renderLoading('Loading your progress…');
  const state = await pullRemoteState(session);
  attachSync(session.user.id);
  boot(state);
}

/* ---------------------------------------------------------------------------
   Main app boot (after remote state has been pulled into the local cache)
--------------------------------------------------------------------------- */

function boot() {
  clear(appRoot);
  applyTheme(getState().profile);

  const greeting = el('div', {}, [
    el('h1', { id: 'greeting-title' }, ''),
    el('div', { class: 'greeting-sub', id: 'greeting-sub' }, ''),
  ]);
  const topbar = el('div', { class: 'topbar' }, [greeting]);

  dashboardContainer = el('div');
  tasksContainer = el('div', { class: 'hidden' });
  achievementsContainer = el('div', { class: 'hidden' });
  profileContainer = el('div', { class: 'hidden' });

  appRoot.append(topbar, dashboardContainer, tasksContainer, achievementsContainer, profileContainer);

  xpBar = mountXpBar(document.createDocumentFragment());
  // xpBar.panel is appended into the dashboard layout itself (see mountDashboard)
  dashboardRefs = mountDashboard(dashboardContainer, xpBar.panel);

  const navHost = el('div');
  document.body.appendChild(navHost);
  navApi = mountNav(navHost, activeView, navigateTo);

  levelUpModal = mountLevelUpModal(document.body);
  toastStack = mountToastStack(document.body);
  taskForm = mountTaskForm(document.body, { onSubmit: handleTaskFormSubmit });

  appRoot.addEventListener('click', e => {
    if (e.target.closest('[data-nav-tasks]')) navigateTo('tasks');
    if (e.target.closest('[data-nav-achievements]')) navigateTo('achievements');
  });

  updateGreeting();
  refreshAll();
  renderTasksView(tasksContainer, getState(), taskHandlers);
  renderAchievementsView(achievementsContainer, getState(), freshAchievementKeys);
  renderProfileView(profileContainer, getState(), profileHandlers);

  on('task-created', refreshAll);
  on('task-updated', refreshAll);
  on('task-deleted', refreshAll);
  on('task-completed', e => handleCompletionReport(e.detail));
}

/* ---------------------------------------------------------------------------
   Navigation
--------------------------------------------------------------------------- */

function navigateTo(viewId) {
  activeView = viewId;
  navApi.setActive(viewId);
  [dashboardContainer, tasksContainer, achievementsContainer, profileContainer].forEach(c => c.classList.add('hidden'));
  ({
    dashboard: dashboardContainer,
    tasks: tasksContainer,
    achievements: achievementsContainer,
    profile: profileContainer,
  })[viewId].classList.remove('hidden');

  if (viewId === 'achievements') {
    renderAchievementsView(achievementsContainer, getState(), freshAchievementKeys);
    freshAchievementKeys = new Set();
  }
  if (viewId === 'tasks') renderTasksView(tasksContainer, getState(), taskHandlers);
  if (viewId === 'profile') renderProfileView(profileContainer, getState(), profileHandlers);
}

/* ---------------------------------------------------------------------------
   Shared refresh
--------------------------------------------------------------------------- */

function refreshAll() {
  const state = getState();
  updateDashboard(dashboardRefs, state, taskHandlers);
  xpBar.render(getLevelProgress(state.profile.total_xp));
  if (activeView === 'tasks') renderTasksView(tasksContainer, state, taskHandlers);
  if (activeView === 'achievements') renderAchievementsView(achievementsContainer, state, freshAchievementKeys);
  if (activeView === 'profile') renderProfileView(profileContainer, state, profileHandlers);
}

function updateGreeting() {
  const hour = new Date().getHours();
  const timeGreeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const { profile, tasks } = getState();
  document.getElementById('greeting-title').textContent = `${timeGreeting}, ${profile.username}`;
  const pending = taskSystem.todaysTasks(tasks).length;
  document.getElementById('greeting-sub').textContent = pending === 0
    ? "You're all caught up."
    : `${pending} task${pending === 1 ? '' : 's'} waiting for you.`;
}

/* ---------------------------------------------------------------------------
   Task completion — the core feedback loop (XP, level-up, streak, achievements)
--------------------------------------------------------------------------- */

function handleCompletionReport(report) {
  if (!report) return;
  const { xpResult, streakResult, newlyUnlocked } = report;

  xpBar.render(xpResult.progress, { animateGain: xpResult.xpGained });

  if (xpResult.leveledUp) {
    setTimeout(() => levelUpModal.show({
      fromLevel: xpResult.fromLevel,
      toLevel: xpResult.toLevel,
      xpGained: xpResult.xpGained,
    }), 400);
  }

  if (streakResult.isNewRecord) {
    toastStack.streakRecord(streakResult.currentStreak);
  }

  newlyUnlocked.forEach(def => {
    freshAchievementKeys.add(def.key);
    toastStack.achievementUnlocked(def);
  });

  updateGreeting();
  refreshAll();
}

/* ---------------------------------------------------------------------------
   Handlers passed down to page/component render functions
--------------------------------------------------------------------------- */

const taskHandlers = {
  onComplete(id, itemEl) {
    if (itemEl) itemEl.classList.add('completing', 'completed');
    setTimeout(() => {
      taskSystem.completeTask(id);
    }, 380);
  },
  onEdit(id) {
    const task = taskSystem.getTaskById(id);
    if (task) taskForm.showForEdit(task);
  },
  onDelete(id) {
    taskSystem.deleteTask(id);
  },
  onAddTask() {
    taskForm.showForCreate();
  },
};

function handleTaskFormSubmit(editingId, data) {
  if (editingId) taskSystem.updateTask(editingId, data);
  else taskSystem.createTask(data);
}

const profileHandlers = {
  onSetHue(hue) {
    const state = getState();
    state.profile.theme_hue = hue;
    saveState(state);
    applyTheme(state.profile);
    renderProfileView(profileContainer, state, profileHandlers);
  },
  onToggleDarkMode() {
    const state = getState();
    state.profile.dark_mode = !state.profile.dark_mode;
    saveState(state);
    applyTheme(state.profile);
    renderProfileView(profileContainer, state, profileHandlers);
  },
  onRename(name) {
    const state = getState();
    state.profile.username = name.trim() || 'Adventurer';
    saveState(state);
    updateGreeting();
  },
  onSignOut() {
    if (confirm('Sign out of Lumen RPG on this device?')) {
      remoteSignOut()
        .catch(err => console.warn('[lumen-rpg] sign out request failed, clearing local session anyway:', err))
        .finally(() => {
          resetAllData();
          location.reload();
        });
    }
  },
};

function applyTheme(profile) {
  document.documentElement.style.setProperty('--theme-hue', profile.theme_hue ?? 226);
  document.body.classList.toggle('dark-mode', !!profile.dark_mode);
}

/* ---------------------------------------------------------------------------
   Boot — must run after every const above (taskHandlers, profileHandlers)
   has been initialized, since a returning user's session check can lead
   straight into boot() before the rest of the file would otherwise have
   finished evaluating. Keep this at the bottom of the file.
--------------------------------------------------------------------------- */

async function start() {
  initSupabase();
  mountGlowBackground(canvas); // mounted once here, not per-screen — avoids stacking duplicate animation loops on screen transitions

  renderLoading('Loading…');
  let session;
  try {
    session = await getSession();
  } catch (err) {
    console.error('[lumen-rpg] could not reach Supabase to check for a session:', err);
    renderAuthScreen();
    return;
  }

  if (session) {
    await afterAuthSuccess(session);
  } else {
    renderAuthScreen();
  }
}

start();
