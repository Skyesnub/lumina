import { el } from '../utils/dom.js';

export function statCard(value, label) {
  return el('div', { class: 'stat-card' }, [
    el('div', { class: 'stat-value mono-num' }, String(value)),
    el('div', { class: 'stat-label' }, label),
  ]);
}

export function streakPill(days, atRisk = false) {
  const flame = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>';
  return el('span', { class: 'streak-pill' + (atRisk ? ' at-risk' : '') }, [
    el('span', { html: flame }),
    `${days} Day${days === 1 ? '' : 's'}`,
  ]);
}
