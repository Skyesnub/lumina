import { el } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';

export function mountXpBar(container) {
  const fill = el('div', { class: 'xp-fill' });
  const track = el('div', { class: 'xp-track' }, [fill]);
  const levelNum = el('span', { class: 'level-num' }, '1');
  const readout = el('span', { class: 'xp-readout mono-num' }, '0 / 100 XP');
  const floatGain = el('div', { class: 'xp-float-gain' }, '');

  const panel = el('div', { class: 'card xp-panel' }, [
    el('div', { class: 'xp-header' }, [
      el('div', { class: 'xp-level-badge' }, [
        el('span', { class: 'level-label' }, 'Level'),
        levelNum,
      ]),
      readout,
    ]),
    track,
    floatGain,
  ]);

  container.appendChild(panel);

  function render(progress, { animateGain = 0 } = {}) {
    levelNum.textContent = progress.level;
    readout.textContent = progress.isMaxLevel
      ? `${formatNumber(progress.totalXp)} XP · MAX LEVEL`
      : `${formatNumber(progress.xpIntoLevel)} / ${formatNumber(progress.xpForNextLevel)} XP`;

    requestAnimationFrame(() => {
      fill.style.width = progress.percent + '%';
    });

    if (animateGain > 0) {
      fill.classList.remove('pulse');
      void fill.offsetWidth; // restart animation
      fill.classList.add('pulse');

      floatGain.textContent = `+${formatNumber(animateGain)} XP`;
      floatGain.classList.remove('rise');
      void floatGain.offsetWidth;
      floatGain.classList.add('rise');
    }
  }

  return { render, panel };
}
