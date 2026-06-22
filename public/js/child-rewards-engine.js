/**
 * child-rewards-engine.js — Stars, goals, redemptions facade (barnmeny v2.1 Sprint 4).
 */
(function () {
  'use strict';

  var _goalData = null;

  function refreshRewards() {
    if (typeof window.loadRewards === 'function') return window.loadRewards();
    return Promise.resolve();
  }

  function setGoalData(data) {
    _goalData = data || null;
  }

  function goalProgressHtml() {
    if (!_goalData || !_goalData.goal) return '';
    var goal = _goalData.goal;
    var pct = Math.min(100, _goalData.progress_pct || 0);
    var current = _goalData.stars_toward_goal != null ? _goalData.stars_toward_goal : (_goalData.current_stars || 0);
    var target = goal.star_cost || _goalData.target_stars || '?';
    return '<div id="childGoalProgressMount" class="mx-4 mb-4 p-4 bg-white border border-lavender rounded-2xl" aria-live="polite">' +
      '<p class="text-xs text-text-soft mb-1">Mål</p>' +
      '<p class="font-bold text-navy mb-2">' + (goal.icon || '🎁') + ' ' + (goal.name || '') + '</p>' +
      '<div class="h-2 bg-lavender rounded-full overflow-hidden"><div class="h-full bg-gold transition-all" style="width:' + pct + '%"></div></div>' +
      '<p class="text-sm font-semibold text-navy mt-2">' + current + ' av ' + target + ' stjärnor</p></div>';
  }

  function mountGoalProgress() {
    var view = document.getElementById('rewardsView') || document.getElementById('skattkammarView');
    if (!view || !_goalData || !_goalData.goal) return;
    var existing = document.getElementById('childGoalProgressMount');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.innerHTML = goalProgressHtml();
    view.insertBefore(wrap.firstChild, view.firstChild);
  }

  function flashStarEconomy() {
    var banner = document.querySelector('.skatt-banner');
    if (banner) {
      banner.classList.add('child-star-flash');
      setTimeout(function () { banner.classList.remove('child-star-flash'); }, 1200);
    }
  }

  window.ChildRewardsEngine = {
    refreshRewards: refreshRewards,
    setGoalData: setGoalData,
    goalProgressHtml: goalProgressHtml,
    mountGoalProgress: mountGoalProgress,
    flashStarEconomy: flashStarEconomy,
  };
})();
