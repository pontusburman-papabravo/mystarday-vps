/**
 * for-dig-goal-badge.js — shared För dig goal marker (icon + color) for activities.
 */
(function () {
  'use strict';

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render(forDigGoal) {
    if (!forDigGoal || !forDigGoal.slug) return '';
    const color = forDigGoal.accentColor || '#F5A623';
    const bg = forDigGoal.accentBg || '#FFF3D6';
    const icon = forDigGoal.icon || '⭐';
    const title = forDigGoal.title || 'För dig';
    return `<span class="for-dig-goal-badge" style="--fdg-accent:${esc(color)};--fdg-bg:${esc(bg)}" title="${esc(title)}" aria-label="Från För dig: ${esc(title)}"><span class="for-dig-goal-badge__icon" aria-hidden="true">${icon}</span></span>`;
  }

  window.ForDigGoalBadge = { render: render };
})();
