/**
 * child-treasure-present.js — Barnets samling Skattkammare (Fas A/C, gate: barnets_samling).
 * Presentation only — reuses resolveSkattState/skattRewardState from child-dashboard-rewards.js.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function formatShortDate(d) {
    if (typeof window.formatChildShortDate === 'function') return formatChildShortDate(d);
    const loc = typeof window.getChildDateLocale === 'function' ? getChildDateLocale() : 'sv-SE';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  }

  const PROGRESS_COLORS = ['gold', 'purple', 'green', 'coral', 'blue'];
  const PROGRESS_STAR_MAX = 16;

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function shouldUse() {
    return !!(window.ChildWorlds
      && ChildWorlds.isBarnetsSamlingEnabled
      && ChildWorlds.isBarnetsSamlingEnabled());
  }

  function computeProgressStars(filled, target) {
    if (window.ChildRewardsEngine
        && typeof window.ChildRewardsEngine.computeStarGridProgress === 'function') {
      const engine = window.ChildRewardsEngine.computeStarGridProgress(filled, target);
      const totalTarget = engine.totalTarget;
      const totalFilled = engine.totalFilled;
      const displayTarget = Math.min(totalTarget, PROGRESS_STAR_MAX);
      let displayFilled;
      if (totalTarget <= PROGRESS_STAR_MAX) {
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
      };
    }
    const totalTarget = Math.max(1, parseInt(target, 10) || 1);
    const totalFilled = Math.max(0, parseInt(filled, 10) || 0);
    const displayTarget = Math.min(totalTarget, PROGRESS_STAR_MAX);
    let displayFilled;
    if (totalTarget <= PROGRESS_STAR_MAX) {
      displayFilled = Math.min(totalFilled, displayTarget);
    } else {
      displayFilled = Math.round((totalFilled / totalTarget) * displayTarget);
      displayFilled = Math.max(0, Math.min(displayFilled, displayTarget));
    }
    return { filled: displayFilled, target: displayTarget, totalFilled: totalFilled, totalTarget: totalTarget };
  }

  /**
   * Maps existing redemption row data to child-facing status copy.
   */
  function rewardPresentStatus(st) {
    if (st.isRedeemed) {
      return { key: 'done', label: t('rewards.statusDone'), className: 'btp-status-done' };
    }
    if (st.hasPending) {
      return { key: 'waiting', label: t('rewards.statusWaiting'), className: 'btp-status-waiting' };
    }
    if (st.ready) {
      return { key: 'redeem', label: t('rewards.statusRedeem'), className: 'btp-status-redeem' };
    }
    return { key: 'saving', label: t('rewards.statusSaving'), className: 'btp-status-saving' };
  }

  function rewardLabel(item) {
    if (typeof window.rewardDisplayName === 'function') return window.rewardDisplayName(item);
    if (!item) return '';
    return item.display_name || item.reward_name_display || item.reward_name || item.name || '';
  }

  function renderGoalMeter(starBalance, starCost, pct, remaining) {
    const progressText = t('treasure.starsProgress', { balance: starBalance || 0, cost: starCost });
    const clamped = Math.max(0, Math.min(100, pct || 0));
    const left = remaining > 0
      ? '<p class="btp-goal-remaining">' + t('treasure.starsLeft', { count: remaining }) + '</p>'
      : '<p class="btp-goal-remaining btp-goal-remaining--ready">' + t('treasure.readyToRedeem') + '</p>';
    return (
      '<div class="btp-hero-meter" role="progressbar" aria-valuenow="' + clamped +
        '" aria-valuemin="0" aria-valuemax="100" aria-label="' + progressText + '">' +
        '<div class="btp-hero-meter-fill" style="width:' + clamped + '%"></div>' +
      '</div>' +
      '<div class="btp-goal-progress-meta">' +
        '<p class="btp-goal-progress">' + progressText + '</p>' +
        left +
      '</div>'
    );
  }

  function renderHero(skatt, starBalance) {
    const count = Number(starBalance) || 0;
    const label = typeof window.childPlural === 'function'
      ? childPlural('treasure.starsToUse', count, { count: count })
      : t('treasure.starsToUse_other', { count: count });
    const title = t('treasure.title');
    const goal = skatt.goal;
    let goalHtml = '';

    if (!goal || !goal.reward_id) {
      goalHtml =
        '<div class="btp-hero-goal btp-hero-goal--empty">' +
          '<p class="btp-hero-goal-lead">' + t('treasure.chooseGoal') + '</p>' +
        '</div>';
    } else {
      const remaining = Math.max(0, (goal.star_cost || 0) - count);
      const icon = goal.reward_icon || '🎁';
      const pct = skatt.progressPct || 0;
      goalHtml =
        '<div class="btp-hero-goal">' +
          '<p class="btp-plaque-label">' + t('treasure.goalLabel') + '</p>' +
          '<p class="btp-plaque-sub">' + t('treasure.savingToward') + '</p>' +
          '<h2 class="btp-goal-title">' + icon + ' ' + esc(rewardLabel(goal)) + '</h2>' +
          renderGoalMeter(count, goal.star_cost, pct, remaining);
      if (skatt.showGoalChangeLink) {
        goalHtml += '<button type="button" class="btp-link" onclick="openGoalPicker()">🔄 ' + t('rewards.changeGoal') + '</button>';
      }
      goalHtml += '</div>';
    }

    return (
      '<header class="btp-hero" aria-label="' + esc(title) + '">' +
        '<p class="btp-kicker" aria-hidden="true">🎁</p>' +
        '<h1 class="btp-hero-title">' + esc(title) + '</h1>' +
        '<div class="btp-hero-stars" aria-label="' + esc(label) + '">' +
          '<span class="btp-balance-emoji" aria-hidden="true">⭐</span>' +
          '<span class="btp-balance-count">' + count + '</span>' +
        '</div>' +
        '<p class="btp-balance-label">' + esc(label) + '</p>' +
        goalHtml +
      '</header>'
    );
  }

  function renderPrimaryAction(skatt) {
    if (skatt.primaryAction && skatt.primaryAction.type === 'redeem') {
      return (
        '<div class="btp-primary">' +
          '<button type="button" class="btp-cta" onclick="requestRedeem(\'' +
            esc(skatt.primaryAction.rewardId) + '\')">' +
            '📨 ' + t('rewards.askToRedeem') +
          '</button>' +
        '</div>'
      );
    }
    if (skatt.primaryAction && skatt.primaryAction.type === 'pick_goal') {
      return (
        '<div class="btp-primary">' +
          '<button type="button" class="btp-cta btp-cta--soft" onclick="openGoalPicker()">' +
            '✨ ' + t('rewards.pickRewardToSave') +
          '</button>' +
        '</div>'
      );
    }
    return '';
  }

  function renderStatusStrip(skatt, deniedRecent) {
    let html = '';
    const SKATT_STATES = window.SKATT_STATES || {};

    if (skatt.pending && skatt.pending.length) {
      const count = skatt.pending.length;
      const text = count === 1
        ? t('rewards.pendingApprovalOne')
        : t('rewards.pendingApprovalMany', { count: count });
      html +=
        '<div class="btp-status-note btp-status-note--waiting" role="status">' +
          '<span class="btp-status-note-icon" aria-hidden="true">⏳</span>' +
          '<div><strong>' + t('rewards.pendingApprovalTitle') + '</strong><p>' + esc(text) + '</p></div>' +
        '</div>';
    }

    if (skatt.pendingChangeReq) {
      html +=
        '<div class="btp-status-note btp-status-note--waiting" role="status">' +
          '<span class="btp-status-note-icon" aria-hidden="true">⏳</span>' +
          '<div><strong>' + t('rewards.changingReward') + '</strong><p>' + t('rewards.changingRewardHint') + '</p></div>' +
        '</div>';
    }

    if (skatt.state === SKATT_STATES.COMPLETED && skatt.completedReward) {
      const cr = skatt.completedReward;
      html +=
        '<div class="btp-status-note btp-status-note--approved" role="status">' +
          '<span class="btp-status-note-icon" aria-hidden="true">' + (cr.reward_icon || '🎉') + '</span>' +
          '<div><strong>' + t('rewards.approvedTitle') + '</strong>' +
          '<p>' + esc(t('rewards.approvedEnjoy', { name: rewardLabel(cr) })) + '</p></div>' +
        '</div>';
    }

    if (deniedRecent && deniedRecent.length > 0) {
      deniedRecent.forEach(function (r) {
        html +=
          '<div class="btp-status-note btp-status-note--gentle" role="status">' +
            '<span class="btp-status-note-icon" aria-hidden="true">' + (r.reward_icon || '🎁') + '</span>' +
            '<div><strong>' + esc(rewardLabel(r)) + '</strong>' +
            '<p>' + t('rewards.deniedTryAgain') + '</p></div>' +
          '</div>';
      });
    }

    return html ? '<section class="btp-status-strip" aria-label="' + esc(t('rewards.rewardsSection')) + '">' + html + '</section>' : '';
  }

  function renderRewardCard(r, st, idx, starBalance) {
    const status = rewardPresentStatus(st);
    const color = PROGRESS_COLORS[idx % PROGRESS_COLORS.length];
    const rowClass = 'btp-card ' + status.className +
      (st.ready ? ' btp-card--actionable' : '');
    const tap = st.ready && !st.isRedeemed && !st.hasPending
      ? ' onclick="requestRedeem(\'' + r.id + '\')" role="button" tabindex="0"'
      : '';

    let cta = '';
    if (st.ready && !st.isRedeemed && !st.hasPending) {
      cta = '<button type="button" class="btp-card-cta" onclick="event.stopPropagation();requestRedeem(\'' +
        r.id + '\')">' + t('rewards.redeemButton') + '</button>';
    }

    return (
      '<article class="' + rowClass + '"' + tap + ' aria-label="' + esc(rewardLabel(r)) + '">' +
        '<div class="btp-card-icon" aria-hidden="true">' + (r.icon || '🎁') + '</div>' +
        '<div class="btp-card-body">' +
          '<div class="btp-card-top">' +
            '<h3 class="btp-card-name">' + esc(rewardLabel(r)) + '</h3>' +
            '<span class="btp-card-status">' + esc(status.label) + '</span>' +
          '</div>' +
          '<div class="btp-card-bar" aria-hidden="true">' +
            '<div class="btp-card-fill btp-card-fill--' + color + '" style="width:' + st.pct + '%"></div>' +
          '</div>' +
          '<p class="btp-card-meta">' +
            '<span>' + t('rewards.starsOf', { balance: starBalance, cost: r.star_cost }) + '</span>' +
            '<span class="btp-card-cost">⭐ ' + r.star_cost + '</span>' +
          '</p>' +
          cta +
        '</div>' +
      '</article>'
    );
  }

  function renderRewardsList(rewards, starBalance, redemptions, goal) {
    const activeGoalId = goal && goal.reward_id ? goal.reward_id : null;

    if (!rewards || rewards.length === 0) {
      if (activeGoalId) return '';
      return (
        '<section class="btp-rewards" aria-label="' + esc(t('rewards.rewardsSection')) + '">' +
          '<h2 class="btp-section-title">' + t('rewards.rewardsToSave') + '</h2>' +
          '<div class="btp-empty">' +
            '<p class="btp-empty-emoji" aria-hidden="true">🎁</p>' +
            '<p class="btp-empty-title">' + t('rewards.emptyChooseGoal') + '</p>' +
            '<p class="btp-empty-sub">' + t('rewards.emptyAskAdultRewards') + '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const listRewards = activeGoalId
      ? rewards.filter(function (r) { return r.id !== activeGoalId; })
      : rewards;

    if (!listRewards.length) {
      if (!activeGoalId) {
        return (
          '<section class="btp-rewards" aria-label="' + esc(t('rewards.rewardsSection')) + '">' +
            '<h2 class="btp-section-title">' + t('rewards.rewardsToSave') + '</h2>' +
            '<div class="btp-empty">' +
              '<p class="btp-empty-emoji" aria-hidden="true">🎁</p>' +
              '<p class="btp-empty-title">' + t('rewards.emptyChooseGoal') + '</p>' +
              '<p class="btp-empty-sub">' + t('rewards.emptyAskAdultRewards') + '</p>' +
            '</div>' +
          '</section>'
        );
      }
      return '';
    }

    const sortFn = window.sortRewardsForList;
    const stateFn = window.skattRewardState;
    const sorted = sortFn ? sortFn(listRewards, starBalance, redemptions, goal) : listRewards;

    let cards = '';
    sorted.forEach(function (r, idx) {
      const st = stateFn
        ? stateFn(r, starBalance, redemptions, goal)
        : { isRedeemed: false, hasPending: false, ready: false, pct: 0 };
      cards += renderRewardCard(r, st, idx, starBalance);
    });

    return (
      '<section class="btp-rewards" aria-label="' + esc(t('rewards.rewardsSection')) + '">' +
        '<h2 class="btp-section-title">' + t('rewards.rewardsToSave') + '</h2>' +
        '<div class="btp-card-list">' + cards + '</div>' +
      '</section>'
    );
  }

  function renderHistoryCard(r) {
    const d = new Date(r.created_at);
    const dateStr = formatShortDate(d);
    const cost = r.star_cost ? ' · ⭐ ' + r.star_cost : '';
    return (
      '<div class="btp-history-card">' +
        '<span class="btp-history-icon" aria-hidden="true">' + esc(r.reward_icon || '🎁') + '</span>' +
        '<div>' +
          '<p class="btp-history-name">' + esc(rewardLabel(r)) + '</p>' +
          '<p class="btp-history-when">' + esc(t('rewards.historyDone')) + ' · ' + esc(dateStr) + esc(cost) + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function renderHistory(trophies) {
    const items = (trophies || []).slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    }).slice(0, 10);

    if (!items.length) {
      return (
        '<section class="btp-history btp-history--empty" aria-label="' + esc(t('rewards.historyTitle')) + '">' +
          '<h2 class="btp-section-title">' + t('rewards.historyTitle') + '</h2>' +
          '<div class="btp-history-empty">' +
            '<p class="btp-history-empty-lead">' + esc(t('rewards.historyEmptyLead')) + '</p>' +
            '<p class="btp-history-empty-hint">' + esc(t('rewards.historyEmptyHint')) + '</p>' +
          '</div>' +
        '</section>'
      );
    }

    let cards = '';
    items.forEach(function (r) {
      cards += renderHistoryCard(r);
    });

    return (
      '<section class="btp-history" aria-label="' + esc(t('rewards.historyTitle')) + '">' +
        '<h2 class="btp-section-title">' + t('rewards.historyTitle') + '</h2>' +
        '<div class="btp-history-list">' + cards + '</div>' +
      '</section>'
    );
  }

  function renderBonusGrants(grants) {
    if (!grants || grants.length === 0) return '';
    let rows = '';
    grants.slice(0, 8).forEach(function (g) {
      const d = new Date(g.created_at);
      const dateStr = formatShortDate(d);
      rows +=
        '<div class="btp-grant">' +
          '<span class="btp-grant-stars">+' + g.star_count + ' ⭐</span>' +
          '<div class="btp-grant-body">' +
            '<p class="btp-grant-reason">' + esc(g.reason) + '</p>' +
            '<p class="btp-grant-meta">' + esc(g.parent_name || t('common.parent')) + ' · ' + esc(dateStr) + '</p>' +
          '</div>' +
        '</div>';
    });
    return (
      '<section class="btp-grants" aria-label="' + esc(t('rewards.extraStars')) + '">' +
        '<h2 class="btp-section-title">' + t('rewards.extraStars') + '</h2>' +
        rows +
      '</section>'
    );
  }

  function render(rewardsData, goalData, manualData) {
    const resolveFn = window.resolveSkattState;
    if (!resolveFn) return false;

    const { rewards, starBalance, redemptions } = rewardsData;
    const deniedRecent = (redemptions || []).filter(function (r) { return r.status === 'denied'; }).slice(0, 3);
    const grants = (manualData && manualData.grants) ? manualData.grants : [];
    const trophies = (redemptions || []).filter(function (r) {
      return r.status === 'approved' || r.status === 'auto';
    });
    const skatt = resolveFn(rewardsData, goalData);

    const loader = document.getElementById('skattkammarLoading');
    const view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (!view) return false;

    view.style.display = '';
    view.classList.add('btp-active');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      view.style.animation = 'btpEntrance 0.4s ease-out forwards';
    }

    let html = '<div class="btp-skatt"><div class="btp-skatt-stack">';
    html += renderHero(skatt, starBalance);
    html += renderPrimaryAction(skatt);
    html += renderRewardsList(rewards, starBalance, redemptions, skatt.goal);
    html += renderStatusStrip(skatt, deniedRecent);
    html += renderHistory(trophies);
    html += renderBonusGrants(grants);
    html += '</div></div>';

    view.innerHTML = html;
    return true;
  }

  window.ChildTreasurePresent = {
    shouldUse: shouldUse,
    render: render,
    rewardPresentStatus: rewardPresentStatus,
    computeProgressStars: computeProgressStars,
    PROGRESS_STAR_MAX: PROGRESS_STAR_MAX,
  };
})();
