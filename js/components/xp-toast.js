import { el } from '../utils/dom.js';
import { ACHIEVEMENT_ICONS } from '../achievements/achievements-data.js';

export function mountToastStack(container) {
  const stack = el('div', { class: 'toast-stack', 'aria-live': 'polite' });
  container.appendChild(stack);

  function push(iconSvg, message) {
    const toast = el('div', { class: 'toast' }, [
      el('span', { class: 'toast-icon', html: iconSvg }),
      el('span', {}, message),
    ]);
    stack.appendChild(toast);
    toast.addEventListener('animationend', e => {
      if (e.animationName === 'toast-out') toast.remove();
    });
  }

  const boltIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>';
  const flameIcon = ACHIEVEMENT_ICONS.flame;

  return {
    achievementUnlocked(def) {
      push(ACHIEVEMENT_ICONS[def.icon] || boltIcon, `Achievement unlocked: ${def.title}`);
    },
    streakRecord(days) {
      push(flameIcon, `New streak record — ${days} days!`);
    },
  };
}
