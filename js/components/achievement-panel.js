import { el, clear } from '../utils/dom.js';
import { ACHIEVEMENT_ICONS } from '../achievements/achievements-data.js';
import { formatDate } from '../utils/format.js';

const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>';

export function renderAchievementGrid(container, groups, freshlyUnlockedKeys = new Set()) {
  clear(container);
  for (const [category, defs] of Object.entries(groups)) {
    const grid = el('div', { class: 'achievement-grid' },
      defs.map(def => {
        const cls = ['achievement-badge', def.unlocked ? 'unlocked' : 'locked', freshlyUnlockedKeys.has(def.key) ? 'fresh' : null]
          .filter(Boolean).join(' ');
        return el('div', { class: cls, title: def.unlocked ? `Unlocked ${formatDate(def.unlocked_at)}` : def.description }, [
          el('div', { class: 'badge-icon', html: def.unlocked ? ACHIEVEMENT_ICONS[def.icon] : LOCK_ICON }),
          el('div', { class: 'badge-label' }, def.title),
        ]);
      })
    );
    container.appendChild(el('div', { class: 'achievement-group' }, [
      el('h3', {}, category),
      grid,
    ]));
  }
}
