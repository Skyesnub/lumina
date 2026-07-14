import { el } from '../utils/dom.js';

const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>',
  achievements: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/></svg>',
};

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'profile', label: 'Profile' },
];

export function mountNav(container, activeView, onNavigate) {
  const nav = el('nav', { class: 'dock-nav', role: 'navigation', 'aria-label': 'Main' },
    VIEWS.map(v => el('button', {
      class: v.id === activeView ? 'active' : '',
      'data-view': v.id,
      'aria-label': v.label,
      onClick: () => onNavigate(v.id),
      html: ICONS[v.id],
    }))
  );
  container.appendChild(nav);
  return {
    setActive(viewId) {
      nav.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
      });
    },
  };
}
