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

  function canAskForGoal() {
    if (!_goalData || !_goalData.goal || !_goalData.goal.reward_id) return false;
    const balance = _goalData.star_balance != null ? _goalData.star_balance : (_goalData.current_stars || 0);
    const cost = _goalData.goal.star_cost || 0;
    if (balance < cost) return false;
    if (!_rewardsData || !_rewardsData.redemptions) return true;
    const goalRewardId = _goalData.goal.reward_id;
    return !_rewardsData.redemptions.some(function (r) {
      return r.status === 'pending' && r.reward_id === goalRewardId;
    });
  }

  function redeemNudgeHtml() {
    if (!canAskForGoal()) return '';
    const goal = _goalData.goal;
    const balance = _goalData.star_balance != null ? _goalData.star_balance : (_goalData.current_stars || 0);
    const icon = goal.reward_icon || '🎁';
    const name = goal.reward_name || 'målet';
    return '<div id="childRedeemNudgeMount" class="mx-4 mb-4 p-4 bg-gold-light border-2 border-gold rounded-2xl" role="status">' +
      '<p class="font-heading font-bold text-navy mb-1">🎉 Du har tillräckligt!</p>' +
      '<p class="text-sm text-navy mb-3">Du har ⭐ ' + balance + ' — dags att fråga om ' + icon + ' ' + name + '!</p>' +
      '<button type="button" class="child-redeem-nudge-btn w-full py-3 rounded-xl bg-gold hover:bg-yellow-500 text-white font-semibold text-sm transition-colors">📨 Fråga nu</button>' +
      '</div>';
  }

  function mountRedeemNudgeIfNeeded() {
    const scheduleView = document.getElementById('scheduleView');
    const rewardsView = document.getElementById('rewardsView') || document.getElementById('skattkammarView');
    const targets = [scheduleView, rewardsView].filter(Boolean);
    if (!targets.length) return;

    const html = redeemNudgeHtml();
    for (const view of targets) {
      const existing = view.querySelector('#childRedeemNudgeMount');
      if (!html) {
        if (existing) existing.remove();
        continue;
      }
      if (existing) {
        existing.outerHTML = html;
      } else {
        const focusMount = view.querySelector('#todayFocusMount');
        const goalMount = view.querySelector('#childGoalProgressMount');
        const insertAfter = focusMount || goalMount;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const node = wrap.firstChild;
        if (insertAfter && insertAfter.parentNode) {
          insertAfter.parentNode.insertBefore(node, insertAfter.nextSibling);
        } else {
          view.insertBefore(node, view.firstChild);
        }
      }
      const btn = view.querySelector('.child-redeem-nudge-btn');
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
          if (typeof showTab === 'function') showTab('rewards');
          else if (typeof window.showTab === 'function') window.showTab('rewards');
        });
      }
    }
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
    mountRedeemNudgeIfNeeded: mountRedeemNudgeIfNeeded,
    mountPendingBannerIfNeeded: mountPendingBannerIfNeeded,
    flashStarEconomy: flashStarEconomy,
  };
})();
