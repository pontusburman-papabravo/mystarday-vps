/**
 * child-rewards-engine.js — Stars, goals, redemptions facade (barnmeny v2.1 Sprint 4).
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  const STAR_GRID_MAX_CELLS = 24;

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
    const totalTarget = Math.max(1, parseInt(target, 10) || 1);
    const totalFilled = Math.max(0, parseInt(filled, 10) || 0);
    const displayTarget = Math.min(totalTarget, STAR_GRID_MAX_CELLS);
    let displayFilled;
    if (totalTarget <= STAR_GRID_MAX_CELLS) {
      displayFilled = Math.min(totalFilled, displayTarget);
    } else {
      displayFilled = Math.round((totalFilled / totalTarget) * displayTarget);
      displayFilled = Math.max(0, Math.min(displayFilled, displayTarget));
    }
    return {
      filled: displayFilled,
      target: displayTarget,
      totalFilled: totalFilled,
      totalTarget: totalTarget,
      truncated: totalTarget > STAR_GRID_MAX_CELLS,
    };
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
      t('rewards.starGridAria', { filled: progress.totalFilled, target: progress.totalTarget }) + '">';
    cells.forEach(function (cell) {
      html += '<span class="skatt-star-cell' + (cell.filled ? ' is-filled' : '') + '" aria-hidden="true">' +
        (cell.filled ? '⭐' : '☆') + '</span>';
    });
    html += '</div>';
    if (goalIcon) {
      html += '<div class="skatt-star-grid-goal" aria-hidden="true">' + goalIcon + '</div>';
    }
    if (progress.truncated) {
      html += '<p class="skatt-star-grid-more">' + t('rewards.starGridMore', {
        count: progress.totalTarget - progress.target,
      }) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function pendingBannerHtml() {
    if (!_rewardsData || !_rewardsData.redemptions) return '';
    const pending = _rewardsData.redemptions.filter(function (r) { return r.status === 'pending'; });
    if (!pending.length) return '';
    const pendingText = pending.length === 1
      ? t('rewards.pendingApprovalOne')
      : t('rewards.pendingApprovalMany', { count: pending.length });
    return '<div id="childPendingRedemptionMount" class="mx-4 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-2xl" role="status">' +
      '<p class="font-heading font-bold text-navy mb-1">⏳ ' + t('rewards.pendingApprovalTitle') + '</p>' +
      '<p class="text-sm text-text-soft">' + pendingText + '</p></div>';
  }

  function isBarnetsSamlingPresentation() {
    return !!(window.ChildWorlds
      && ChildWorlds.isBarnetsSamlingEnabled
      && ChildWorlds.isBarnetsSamlingEnabled());
  }

  function isWorldSceneActive() {
    if (window.ChildWorlds && ChildWorlds.isWorldHubEntryDisabled
        && ChildWorlds.isWorldHubEntryDisabled()) {
      return false;
    }
    if (window.LivingWorldTransition
        && typeof window.LivingWorldTransition.isActive === 'function'
        && window.LivingWorldTransition.isActive()) {
      return true;
    }
    if (window.ChildMorgonhus
        && typeof window.ChildMorgonhus.isActive === 'function'
        && window.ChildMorgonhus.isActive()) {
      return true;
    }
    if (window.ChildGarden
        && typeof window.ChildGarden.isActive === 'function'
        && window.ChildGarden.isActive()) {
      return true;
    }
    if (window.ChildMemoryHall
        && typeof window.ChildMemoryHall.isActive === 'function'
        && window.ChildMemoryHall.isActive()) {
      return true;
    }
    return false;
  }

  function clearGoalChrome() {
    ['childGoalProgressMount', 'childPendingRedemptionMount'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function mountPendingBannerIfNeeded() {
    if (isBarnetsSamlingPresentation() || isWorldSceneActive()) return;
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
      '<p class="text-xs text-text-soft mb-1">' + t('treasure.goalLabel') + '</p>' +
      '<p class="font-bold text-navy mb-2">' + goalIcon + ' ' + goalLabel + '</p>' +
      gridHtml +
      '<div class="h-2 bg-lavender rounded-full overflow-hidden mt-3"><div class="h-full bg-gold transition-all" style="width:' + pct + '%"></div></div>' +
      '<p class="text-sm font-semibold text-navy mt-2">' + t('treasure.starsProgress', { balance: current, cost: target }) + '</p></div>';
  }

  function mountGoalProgress() {
    if (isBarnetsSamlingPresentation() || isWorldSceneActive()) return;
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
    isWorldSceneActive: isWorldSceneActive,
    clearGoalChrome: clearGoalChrome,
    mountGoalProgress: mountGoalProgress,
    mountPendingBannerIfNeeded: mountPendingBannerIfNeeded,
    flashStarEconomy: flashStarEconomy,
    STAR_GRID_MAX_CELLS: STAR_GRID_MAX_CELLS,
  };
})();
