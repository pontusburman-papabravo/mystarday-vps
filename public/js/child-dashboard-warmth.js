/**
 * child-dashboard-warmth.js — focused barnvy, narrative historik, tydlig stjärnekonomi.
 */
(function () {
  'use strict';

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Narrative line for Historikboken (wins only). */
  function buildHistoryNarrative(r) {
    var icon = r.reward_icon || '🎁';
    var name = r.reward_name || 'belöning';
    var lower = name.toLowerCase();

    if (/film|tv|skärm|bio/.test(lower)) return 'Du fick välja film ' + icon + ' 🍿';
    if (/saga|bok|läsa|bibliotek/.test(lower)) return 'Du låste upp extra saga ' + icon + ' ⭐';
    if (/park|utflykt|lekplats|äventyr/.test(lower)) return 'Du åkte på ' + name.toLowerCase() + ' ' + icon + ' 🎉';
    if (/godis|glass|fika|mums/.test(lower)) return 'Du fick njuta av ' + name.toLowerCase() + ' ' + icon + '😋';
    if (/spel|lek/.test(lower)) return 'Du fick leka extra ' + icon + ' 🎮';
    if (/stjärn|bonus/.test(lower)) return 'Du fick extra stjärnor ' + icon + ' ✨';
    return 'Du låste upp ' + name + ' ' + icon + ' 🎉';
  }

  /** HTML for one history story card. */
  function renderHistoryStoryHtml(r) {
    var d = new Date(r.created_at);
    var dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    return (
      '<div class="skatt-history-story">' +
        '<span style="font-size:1.6rem;line-height:1;">' + esc(r.reward_icon || '🎁') + '</span>' +
        '<div>' +
          '<div class="skatt-history-story-text">' + esc(buildHistoryNarrative(r)) + '</div>' +
          '<div class="skatt-history-story-when">' + dateStr + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /** Economy explainer under star balance in Skattkammaren banner. */
  function renderEconomyHintHtml(starBalance, totalEarned) {
    var parts = '<p class="skatt-economy-hint">Dina sparade stjärnor — de går åt när du låser upp en belöning 🎁</p>';
    if (totalEarned > starBalance) {
      parts += '<p class="skatt-economy-hint" style="margin-top:4px;">Totalt har du tjänat ⭐ ' + totalEarned + '</p>';
    }
    return parts;
  }

  /** Update compact goal teaser on schedule tab. */
  function updateGoalTeaser(goalData) {
    var btn = document.getElementById('goalTeaserBtn');
    if (!btn) return;

    var nameEl = document.getElementById('goalTeaserName');
    var subEl = document.getElementById('goalTeaserSub');
    var iconEl = document.getElementById('goalTeaserIcon');

    if (!goalData || !goalData.goal || !goalData.goal.reward_id) {
      if (iconEl) iconEl.textContent = '🎯';
      if (nameEl) nameEl.textContent = 'Välj ett mål i Skattkammaren';
      if (subEl) subEl.textContent = 'Tryck här för att välja';
      return;
    }

    var balance = goalData.star_balance || 0;
    var cost = goalData.goal.star_cost || 1;
    var toGo = Math.max(0, cost - balance);
    var icon = goalData.goal.reward_icon || '🎯';
    var name = goalData.goal.reward_name || '';

    if (iconEl) iconEl.textContent = icon;
    if (nameEl) nameEl.textContent = name;
    if (subEl) {
      subEl.textContent = toGo === 0
        ? 'Du har råd! Tryck för att fråga 🎉'
        : 'Bara ' + toGo + ' stjärnor kvar ⭐';
    }
  }

  /** Sync today's earned stars row. */
  function updateTodayStars(earned) {
    var el = document.getElementById('todayStarsEarned');
    if (el) el.textContent = earned === 1 ? '1 stjärna' : earned + ' stjärnor';
  }

  function init() {
    // Week nav starts collapsed — details element handles this
    var details = document.getElementById('weekNavDetails');
    if (details) details.removeAttribute('open');
  }

  window.ChildDashboardWarmth = {
    init: init,
    buildHistoryNarrative: buildHistoryNarrative,
    renderHistoryStoryHtml: renderHistoryStoryHtml,
    renderEconomyHintHtml: renderEconomyHintHtml,
    updateGoalTeaser: updateGoalTeaser,
    updateTodayStars: updateTodayStars,
  };
})();
