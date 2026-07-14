import { el } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';

export function mountLevelUpModal(container) {
  const fromEl = el('span', { class: 'from' }, '');
  const toEl = el('span', { class: 'to' }, '');
  const amtEl = el('span', { class: 'amt mono-num' }, '');

  const overlay = el('div', { class: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'modal-card' }, [
      el('div', { class: 'levelup-eyebrow' }, 'Level Up'),
      el('div', { class: 'levelup-transition' }, [
        fromEl,
        el('span', { class: 'arrow' }, '→'),
        toEl,
      ]),
      el('div', { class: 'levelup-xp' }, ['You gained ', amtEl, ' XP']),
      el('button', { class: 'btn btn-primary', style: 'width:100%', onClick: () => hide() }, 'Keep going'),
    ]),
  ]);
  container.appendChild(overlay);

  function hide() {
    overlay.classList.remove('show');
  }

  function show({ fromLevel, toLevel, xpGained }) {
    fromEl.textContent = fromLevel;
    toEl.textContent = toLevel;
    amtEl.textContent = formatNumber(xpGained);
    overlay.classList.add('show');
  }

  overlay.addEventListener('click', e => {
    if (e.target === overlay) hide();
  });

  return { show, hide };
}
