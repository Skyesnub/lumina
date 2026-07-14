import { el, clear } from '../utils/dom.js';
import { statCard, streakPill } from '../components/stat-card.js';
import { renderTaskList } from '../components/task-list.js';
import { todaysTasks, recentlyCompleted } from '../task-system/tasks.js';
import { unlockedCount } from '../achievements/achievements.js';
import { ACHIEVEMENTS } from '../achievements/achievements-data.js';
import { getStreakStatus } from '../streaks/streaks.js';
import { formatNumber } from '../utils/format.js';

// Built once at startup. xpBarPanel is the already-mounted, persistent XP
// bar DOM node (see components/xp-bar.js) — it's inserted here but never
// rebuilt, so its CSS width-transition animation survives every dashboard
// refresh.
export function mountDashboard(container, xpBarPanel) {
  const streakSlot = el('div');
  const statGrid = el('div', { class: 'stat-grid' });
  const todayList = el('div');
  const recentList = el('div');
  const achievementSummary = el('div', { class: 'stat-grid', style: 'grid-template-columns: 1fr auto;' });

  const view = el('div', { class: 'view', id: 'view-dashboard' }, [
    xpBarPanel,
    el('div', { class: 'card' }, [
      el('div', { class: 'card-title-row' }, [el('h2', {}, 'Your Progress'), streakSlot]),
      statGrid,
    ]),
    el('div', { class: 'card' }, [
      el('div', { class: 'card-title-row' }, [
        el('h2', {}, "Today's Tasks"),
        el('button', { class: 'link-btn', 'data-nav-tasks': true }, 'View all'),
      ]),
      todayList,
    ]),
    el('div', { class: 'card' }, [
      el('div', { class: 'card-title-row' }, [el('h2', {}, 'Recently Completed')]),
      recentList,
    ]),
    el('div', { class: 'card' }, [
      el('div', { class: 'card-title-row' }, [
        el('h2', {}, 'Achievements'),
        el('button', { class: 'link-btn', 'data-nav-achievements': true }, 'View all'),
      ]),
      achievementSummary,
    ]),
  ]);

  container.appendChild(view);
  return { view, streakSlot, statGrid, todayList, recentList, achievementSummary };
}

export function updateDashboard(refs, state, handlers) {
  const { profile, tasks } = state;
  const streakStatus = getStreakStatus(profile);

  clear(refs.streakSlot);
  refs.streakSlot.appendChild(streakPill(profile.current_streak, streakStatus.state === 'at-risk'));

  clear(refs.statGrid);
  const completedTotal = tasks.filter(t => t.status === 'completed').length;
  refs.statGrid.append(
    statCard(profile.current_level, 'Level'),
    statCard(formatNumber(profile.total_xp), 'Total XP'),
    statCard(completedTotal, 'Tasks Done'),
  );

  renderTaskList(refs.todayList, todaysTasks(tasks).slice(0, 6), handlers, 'No tasks due — add one to start earning XP.');
  renderTaskList(refs.recentList, recentlyCompleted(tasks, 5), handlers, 'Complete a task to see it here.');

  clear(refs.achievementSummary);
  const total = ACHIEVEMENTS.length;
  const unlocked = unlockedCount(state);
  refs.achievementSummary.append(
    statCard(`${unlocked} / ${total}`, 'Unlocked'),
    statCard(profile.longest_streak, 'Best Streak'),
  );
}
