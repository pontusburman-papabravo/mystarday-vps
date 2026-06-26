/**
 * child-rewards-engine.js — Stars, goals, redemptions facade (barnmeny v2.1 Sprint 4).
 */
(function () {
  'use strict';

  let _goalData = null;
  let _rewardsData = null;

  function refreshRewards() {
    if (typeof window.loadRewards === 'function') return window.loadRewards();
    return Promise.resolve();
  }

  function setGoalData(data) {
    _goalData = data || null;
  }

  function setRewardsData(data) {
    _rewardsData = data || null;
  }

  function pendingBannerHtml() {
    if (!_rewardsData || !_rewardsData.redemptions) return '';
    const pending = _rewardsData.redemptions.filter(function (r) { return r.status === 'pending'; });
    if (!pending.length) return '';
    return '<div id="childPendingRedemptionMount" class="mx-4 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-2xl" role="status">' +
      '<p class="font-heading font-bold text-navy mb-1">⏳ Väntar på godkännande</p>' +
      '<p class="text-sm text-text-soft">' + pending.length + ' belöning' + (pending.length === 1 ? '' : 'ar') + ' väntar på en vuxen.</p></div>';
  }

  function mountPendingBannerIfNeeded() {
    const view = document.getElementById('rewardsView') || document.getElementById('skattkammarView');
    if (!view) return;
    const existing = document.getElementById('childPendingRedemptionMount');
    const html = pendingBannerHtml();
    if (!html) {
      if (existing) existing.remove();
      return;
    }
    if (existing) {
      existing.outerHTML = html;
      return;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const goalMount = document.getElementById('childGoalProgressMount');
    if (goalMount && goalMount.parentNode) {
      goalMount.parentNode.insertBefore(wrap.firstChild, goalMount.nextSibling);
    } else {
      view.insertBefore(wrap.firstChild, view.firstChild);
    }
  }

  function goalProgressHtml() {
    if (!_goalData || !_goalData.goal) return '';
    const goal = _goalData.goal;
    const pct = Math.min(100, _goalData.progress_pct || 0);
    const current = _goalData.stars_toward_goal != null ? _goalData.stars_toward_goal : (_goalData.current_stars || 0);
    const target = goal.star_cost || _goalData.target_stars || '?';
    return '<div id="childGoalProgressMount" class="mx-4 mb-4 p-4 bg-white border border-lavender rounded-2xl" aria-live="polite">' +
      '<p class="text-xs text-text-soft mb-1">Mål</p>' +
      '<p class="font-bold text-navy mb-2">' + (goal.icon || '🎁') + ' ' + (goal.name || '') + '</p>' +
      '<div class="h-2 bg-lavender rounded-full overflow-hidden"><div class="h-full bg-gold transition-all" style="width:' + pct + '%"></div></div>' +
      '<p class="text-sm font-semibold text-navy mt-2">' + current + ' av ' + target + ' stjärnor</p></div>';
  }

  function mountGoalProgress() {
    const view = document.getElementById('rewardsView') || document.getElementById('skattkammarView');
    if (!view || !_goalData || !_goalData.goal) return;
    const existing = document.getElementById('childGoalProgressMount');
    if (existing) existing.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = goalProgressHtml();
    view.insertBefore(wrap.firstChild, view.firstChild);
  }

  function flashStarEconomy() {
    const banner = document.querySelector('.skatt-banner');
    if (banner) {
      banner.classList.add('child-star-flash');
      setTimeout(function () { banner.classList.remove('child-star-flash'); }, 1200);
    }
  }

  window.ChildRewardsEngine = {
    refreshRewards: refreshRewards,
    setGoalData: setGoalData,
    setRewardsData: setRewardsData,
    goalProgressHtml: goalProgressHtml,
    mountGoalProgress: mountGoalProgress,
    mountPendingBannerIfNeeded: mountPendingBannerIfNeeded,
    flashStarEconomy: flashStarEconomy,
  };
})();
