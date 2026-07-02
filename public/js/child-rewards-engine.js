/**
 * child-rewards-engine.js — Stars, goals, redemptions facade (barnmeny v2.1 Sprint 4).
 */
(function () {
  'use strict';

  const STAR_GRID_MAX_CELLS = 50;

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

  function computeStarGridProgress(filled, target) {
    const safeTarget = Math.max(1, parseInt(target, 10) || 1);
    const cappedTarget = Math.min(safeTarget, STAR_GRID_MAX_CELLS);
    const safeFilled = Math.max(0, Math.min(parseInt(filled, 10) || 0, cappedTarget));
    return { filled: safeFilled, target: cappedTarget, truncated: safeTarget > STAR_GRID_MAX_CELLS };
  }

  function buildStarGridCells(filled, target) {
    const progress = computeStarGridProgress(filled, target);
    const cells = [];
    for (let i = 0; i < progress.target; i++) {
      cells.push({ filled: i < progress.filled });
    }
    return cells;
  }

  function starGridHtml(filled, target, goalIcon) {
    const progress = computeStarGridProgress(filled, target);
    if (!progress.target) return '';
    const cells = buildStarGridCells(filled, target);
    let html = '<div class="skatt-star-grid-wrap">';
    html += '<div class="skatt-star-grid" role="img" aria-label="' +
      progress.filled + ' av ' + target + ' stjärnor mot målet">';
    cells.forEach(function (cell) {
      html += '<span class="skatt-star-cell' + (cell.filled ? ' is-filled' : '') + '" aria-hidden="true">' +
        (cell.filled ? '⭐' : '☆') + '</span>';
    });
    html += '</div>';
    if (goalIcon) {
      html += '<div class="skatt-star-grid-goal" aria-hidden="true">' + goalIcon + '</div>';
    }
    if (progress.truncated) {
      html += '<p class="skatt-star-grid-more">+' + (parseInt(target, 10) - progress.target) + ' stjärnor till</p>';
    }
    html += '</div>';
    return html;
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
    const current = _goalData.stars_toward_goal != null
      ? _goalData.stars_toward_goal
      : (_goalData.star_balance != null ? _goalData.star_balance : (_goalData.current_stars || 0));
    const target = goal.star_cost || _goalData.target_stars || '?';
    const goalLabel = goal.reward_name || goal.name || '';
    const goalIcon = goal.reward_icon || goal.icon || '🎁';
    const gridHtml = starGridHtml(current, target, goalIcon);
    return '<div id="childGoalProgressMount" class="mx-4 mb-4 p-4 bg-white border border-lavender rounded-2xl" aria-live="polite">' +
      '<p class="text-xs text-text-soft mb-1">Mål</p>' +
      '<p class="font-bold text-navy mb-2">' + goalIcon + ' ' + goalLabel + '</p>' +
      gridHtml +
      '<div class="h-2 bg-lavender rounded-full overflow-hidden mt-3"><div class="h-full bg-gold transition-all" style="width:' + pct + '%"></div></div>' +
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
    computeStarGridProgress: computeStarGridProgress,
    buildStarGridCells: buildStarGridCells,
    starGridHtml: starGridHtml,
    goalProgressHtml: goalProgressHtml,
    mountGoalProgress: mountGoalProgress,
    mountPendingBannerIfNeeded: mountPendingBannerIfNeeded,
    flashStarEconomy: flashStarEconomy,
    STAR_GRID_MAX_CELLS: STAR_GRID_MAX_CELLS,
  };
})();
