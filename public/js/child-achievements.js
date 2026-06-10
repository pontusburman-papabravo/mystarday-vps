/**
 * child-achievements.js — Troférummet med riktiga prestationer (V2).
 */
(function () {
  'use strict';

  function renderRoom(universe) {
    var achievements = (universe && universe.achievements) || [];
    if (!achievements.length) {
      return '<div class="skatt-section"><div class="skatt-section-body" style="text-align:center;padding:28px 16px;">' +
        '<div style="font-size:2.5rem;opacity:0.4;margin-bottom:8px;">🏆</div>' +
        '<p style="font-size:0.85rem;color:#9AA0B8;">Klara aktiviteter och samla stjärnor — dina trofeer hamnar här!</p></div></div>';
    }

    var shelves = achievements.map(function (a, i) {
      var d = new Date(a.unlocked_at);
      var ds = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      return '<div class="skatt-trophy-item cu-ach-item" style="animation-delay:' + (i * 60) + 'ms;">' +
        '<span class="skatt-trophy-emoji">' + (a.emoji || '🏆') + '</span>' +
        '<span class="skatt-trophy-name">' + (a.name || '') + '</span>' +
        '<span style="font-size:0.6rem;color:#9AA0B8;">' + ds + '</span></div>';
    }).join('');

    return '<div class="skatt-section">' +
      '<div class="skatt-section-header">' +
        '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>' +
        '<span class="skatt-section-title" style="color:#c0392b;">Troférummet</span>' +
        '<span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#ffeaa7;color:#d4a017;border-radius:50px;padding:2px 10px;">' +
          achievements.length + ' st</span>' +
      '</div>' +
      '<div class="skatt-section-body">' +
        '<p style="font-size:0.75rem;color:#5A6178;margin:0 0 12px;">Riktiga prestationer — inte bara poäng!</p>' +
        '<div class="skatt-trophy-grid">' + shelves + '</div>' +
      '</div></div>';
  }

  window.ChildAchievements = { renderRoom: renderRoom };
})();
