/**
 * child-achievements.js — Troférummet med riktiga prestationer (V2).
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function formatShortDate(d) {
    if (typeof window.formatChildShortDate === 'function') return formatChildShortDate(d);
    const loc = typeof window.getChildDateLocale === 'function' ? getChildDateLocale() : 'sv-SE';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  }

  function renderRoom(universe) {
    const achievements = (universe && universe.achievements) || [];
    if (!achievements.length) {
      return '<div class="skatt-section"><div class="skatt-section-body" style="text-align:center;padding:28px 16px;">' +
        '<div style="font-size:2.5rem;opacity:0.4;margin-bottom:8px;">🏆</div>' +
        '<p style="font-size:0.85rem;color:#9AA0B8;">' + esc(t('achievements.empty')) + '</p></div></div>';
    }

    const shelves = achievements.map(function (a, i) {
      const d = new Date(a.unlocked_at);
      const ds = formatShortDate(d);
      const trophyName = window.ChildAchievementI18n
        ? ChildAchievementI18n.resolveName(a)
        : (a.name || '');
      return '<div class="skatt-trophy-item cu-ach-item" style="animation-delay:' + (i * 60) + 'ms;">' +
        '<span class="skatt-trophy-emoji">' + (a.emoji || '🏆') + '</span>' +
        '<span class="skatt-trophy-name">' + esc(trophyName) + '</span>' +
        '<span style="font-size:0.6rem;color:#9AA0B8;">' + ds + '</span></div>';
    }).join('');

    return '<div class="skatt-section">' +
      '<div class="skatt-section-header">' +
        '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>' +
        '<span class="skatt-section-title" style="color:#c0392b;">' + esc(t('achievements.title')) + '</span>' +
        '<span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#ffeaa7;color:#d4a017;border-radius:50px;padding:2px 10px;">' +
          esc(t('achievements.countShort', { count: achievements.length })) + '</span>' +
      '</div>' +
      '<div class="skatt-section-body">' +
        '<p style="font-size:0.75rem;color:#5A6178;margin:0 0 12px;">' + esc(t('achievements.lead')) + '</p>' +
        '<div class="skatt-trophy-grid">' + shelves + '</div>' +
      '</div></div>';
  }

  window.ChildAchievements = { renderRoom: renderRoom };
})();
