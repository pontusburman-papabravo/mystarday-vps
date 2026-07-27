/**
 * child-dashboard-warmth.js — focused barnvy, narrative historik, tydlig stjärnekonomi.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatShortDate(d) {
    if (typeof window.formatChildShortDate === 'function') return formatChildShortDate(d);
    const loc = typeof window.getChildDateLocale === 'function' ? getChildDateLocale() : 'sv-SE';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  }

  /** Narrative line for Historikboken (wins only). */
  function buildHistoryNarrative(r) {
    const icon = r.reward_icon || '🎁';
    const name = r.reward_name || t('warmth.rewardDefault');
    const lower = name.toLowerCase();

    if (/film|tv|skärm|bio/.test(lower)) return t('warmth.narrativeFilm', { icon: icon });
    if (/saga|bok|läsa|bibliotek/.test(lower)) return t('warmth.narrativeStory', { icon: icon });
    if (/park|utflykt|lekplats|äventyr/.test(lower)) {
      return t('warmth.narrativeOuting', { name: name.toLowerCase(), icon: icon });
    }
    if (/godis|glass|fika|mums/.test(lower)) {
      return t('warmth.narrativeTreat', { name: name.toLowerCase(), icon: icon });
    }
    if (/spel|lek/.test(lower)) return t('warmth.narrativePlay', { icon: icon });
    if (/stjärn|bonus/.test(lower)) return t('warmth.narrativeBonus', { icon: icon });
    return t('warmth.narrativeDefault', { name: name, icon: icon });
  }

  /** HTML for one history story card. */
  function renderHistoryStoryHtml(r) {
    const d = new Date(r.created_at);
    const dateStr = formatShortDate(d);
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
    let parts = '<p class="skatt-economy-hint">' + esc(t('warmth.economyHint')) + '</p>';
    if (totalEarned > starBalance) {
      parts += '<p class="skatt-economy-hint" style="margin-top:4px;">' +
        esc(t('warmth.totalEarned', { count: totalEarned })) + '</p>';
    }
    return parts;
  }

  /** Update compact goal teaser on schedule tab. */
  function updateGoalTeaser(goalData) {
    const btn = document.getElementById('goalTeaserBtn');
    if (!btn) return;

    const nameEl = document.getElementById('goalTeaserName');
    const subEl = document.getElementById('goalTeaserSub');
    const iconEl = document.getElementById('goalTeaserIcon');

    if (!goalData || !goalData.goal || !goalData.goal.reward_id) {
      if (iconEl) iconEl.textContent = '🎯';
      if (nameEl) nameEl.textContent = t('warmth.goalTeaserPick');
      if (subEl) subEl.textContent = t('warmth.goalTeaserTap');
      return;
    }

    const balance = goalData.star_balance || 0;
    const cost = goalData.goal.star_cost || 1;
    const toGo = Math.max(0, cost - balance);
    const icon = goalData.goal.reward_icon || '🎯';
    const name = goalData.goal.reward_name || '';

    if (iconEl) iconEl.textContent = icon;
    if (nameEl) nameEl.textContent = name;
    if (subEl) {
      subEl.textContent = toGo === 0
        ? t('warmth.goalTeaserAffordable')
        : t('warmth.goalTeaserStarsLeft', { count: toGo });
    }
  }

  /** Sync today's earned stars row. */
  function updateTodayStars(earned) {
    const el = document.getElementById('todayStarsEarned');
    if (!el) return;
    const n = Number(earned) || 0;
    if (typeof window.childPlural === 'function') {
      el.textContent = childPlural('warmth.todayStars', n, { count: n });
    } else {
      el.textContent = n === 1 ? t('warmth.todayStars_one') : t('warmth.todayStars_other', { count: n });
    }
  }

  function init() {
    const details = document.getElementById('weekNavDetails');
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
