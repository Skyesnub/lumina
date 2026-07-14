import { el, clear } from '../utils/dom.js';
import { renderTaskList } from '../components/task-list.js';
import { filterTasks, sortTasks, CATEGORIES } from '../task-system/tasks.js';
import { achievementsByCategory } from '../achievements/achievements.js';
import { renderAchievementGrid } from '../components/achievement-panel.js';
import { statCard } from '../components/stat-card.js';
import { formatNumber, formatDate } from '../utils/format.js';

/* ---------------------------------------------------------------------------
   TASKS VIEW
--------------------------------------------------------------------------- */

const SORT_OPTIONS = [
  ['created_at', 'Newest'],
  ['due_date', 'Due Date'],
  ['priority', 'Priority'],
  ['xp_reward', 'XP Reward'],
];

let taskFilterState = { status: null, category: null, sort: 'created_at' };

export function renderTasksView(container, state, handlers) {
  clear(container);
  const list = el('div');

  const statusChips = el('div', { class: 'filter-bar' }, [
    chip('All', !taskFilterState.status, () => setFilter('status', null)),
    chip('Pending', taskFilterState.status === 'pending', () => setFilter('status', 'pending')),
    chip('Completed', taskFilterState.status === 'completed', () => setFilter('status', 'completed')),
  ]);

  const categoryChips = el('div', { class: 'filter-bar' }, [
    chip('All Categories', !taskFilterState.category, () => setFilter('category', null)),
    ...CATEGORIES.map(c => chip(c, taskFilterState.category === c, () => setFilter('category', c))),
  ]);

  const sortSelect = el('select', {
    onChange: e => { taskFilterState.sort = e.target.value; refresh(); },
  }, SORT_OPTIONS.map(([val, label]) =>
    el('option', { value: val, selected: taskFilterState.sort === val || undefined }, label)
  ));

  function chip(label, active, onClick) {
    return el('button', { type: 'button', class: 'chip' + (active ? ' active' : ''), onClick }, label);
  }

  function setFilter(key, value) {
    taskFilterState[key] = value;
    refresh();
  }

  function refresh() {
    const filtered = filterTasks(state.tasks, taskFilterState);
    const sorted = sortTasks(filtered, taskFilterState.sort);
    renderTaskList(list, sorted, handlers, 'No tasks match these filters.');
    statusChips.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', [!taskFilterState.status, taskFilterState.status === 'pending', taskFilterState.status === 'completed'][i]));
    categoryChips.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.textContent === (taskFilterState.category || 'All Categories')));
  }

  const view = el('div', { class: 'view', id: 'view-tasks' }, [
    el('div', { class: 'card' }, [
      el('div', { class: 'card-title-row' }, [
        el('h2', {}, 'All Tasks'),
        el('button', { class: 'btn btn-primary', onClick: () => handlers.onAddTask() }, '+ New'),
      ]),
      statusChips,
      el('div', { style: 'height:8px' }),
      categoryChips,
      el('div', { style: 'display:flex; justify-content:flex-end; margin-top:12px;' }, [
        el('div', { class: 'field', style: 'width:160px' }, [el('label', {}, 'Sort by'), sortSelect]),
      ]),
      el('div', { style: 'margin-top:8px' }, [list]),
    ]),
  ]);

  container.appendChild(view);
  refresh();
  return { refresh };
}

/* ---------------------------------------------------------------------------
   ACHIEVEMENTS VIEW
--------------------------------------------------------------------------- */

export function renderAchievementsView(container, state, freshKeys = new Set()) {
  clear(container);
  const grid = el('div');
  const view = el('div', { class: 'view', id: 'view-achievements' }, [
    el('div', { class: 'card' }, [
      el('h2', { style: 'margin-bottom:16px' }, 'Achievements'),
      grid,
    ]),
  ]);
  container.appendChild(view);
  renderAchievementGrid(grid, achievementsByCategory(state), freshKeys);
}

/* ---------------------------------------------------------------------------
   PROFILE VIEW
--------------------------------------------------------------------------- */

const HUE_STOPS = [12, 38, 152, 188, 226, 258, 322];

export function renderProfileView(container, state, handlers) {
  clear(container);
  const { profile, tasks } = state;

  const hueSwatches = el('div', { class: 'hue-picker' },
    HUE_STOPS.map(hue => el('button', {
      type: 'button',
      class: 'hue-swatch' + (profile.theme_hue === hue ? ' active' : ''),
      style: `background: hsl(${hue}, 70%, 56%)`,
      'aria-label': `Set theme hue ${hue}`,
      onClick: () => handlers.onSetHue(hue),
    }))
  );

  const darkSwitch = el('div', { class: 'switch' + (profile.dark_mode ? ' on' : '') });
  darkSwitch.addEventListener('click', () => handlers.onToggleDarkMode());

  const usernameInput = el('input', { type: 'text', value: profile.username, maxlength: 24 });
  usernameInput.addEventListener('change', () => handlers.onRename(usernameInput.value));

  const completedTotal = tasks.filter(t => t.status === 'completed').length;

  const view = el('div', { class: 'view', id: 'view-profile' }, [
    el('div', { class: 'card' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Display name'), usernameInput]),
    ]),
    el('div', { class: 'card' }, [
      el('h2', { style: 'margin-bottom:14px' }, 'Lifetime Stats'),
      el('div', { class: 'stat-grid' }, [
        statCard(profile.current_level, 'Level'),
        statCard(formatNumber(profile.total_xp), 'Lifetime XP'),
        statCard(completedTotal, 'Tasks Done'),
      ]),
      el('div', { class: 'stat-grid', style: 'margin-top:10px' }, [
        statCard(profile.longest_streak, 'Best Streak'),
        statCard(formatDate(profile.created_at), 'Joined'),
      ]),
    ]),
    el('div', { class: 'card' }, [
      el('h2', {}, 'Appearance'),
      el('div', { class: 'field', style: 'margin-top:14px' }, [el('label', {}, 'Theme color'), hueSwatches]),
      el('div', { class: 'toggle-row' }, [
        el('span', {}, 'Dark mode'),
        darkSwitch,
      ]),
    ]),
    el('div', { class: 'card' }, [
      el('button', { class: 'btn btn-danger-ghost', style: 'width:100%', onClick: () => handlers.onSignOut() }, 'Sign out & erase local data'),
    ]),
  ]);

  container.appendChild(view);
}
