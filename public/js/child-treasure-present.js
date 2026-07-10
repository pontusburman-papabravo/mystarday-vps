/**
 * child-treasure-present.js — Barnets samling Skattkammare (Fas A/C, gate: barnets_samling).
 * Presentation only — reuses resolveSkattState/skattRewardState from child-dashboard-rewards.js.
 */
(function () {
  'use strict';

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
      return { key: 'done', label: 'Genomförd', className: 'btp-status-done' };
    }
    if (st.hasPending) {
      return { key: 'waiting', label: 'Väntar på vuxen', className: 'btp-status-waiting' };
    }
    if (st.ready) {
      return { key: 'redeem', label: 'Kan lösas in', className: 'btp-status-redeem' };
    }
    return { key: 'saving', label: 'Sparar', className: 'btp-status-saving' };
  }

  function renderScene() {
    return (
      '<div class="btp-scene" aria-hidden="true">' +
        '<div class="btp-scene-vignette"></div>' +
        '<div class="btp-scene-lantern"></div>' +
        '<div class="btp-scene-shelf"></div>' +
        '<div class="btp-scene-chest"></div>' +
        '<div class="btp-scene-sparkles">' +
          '<span class="btp-scene-sparkle btp-scene-sparkle--1">✦</span>' +
          '<span class="btp-scene-sparkle btp-scene-sparkle--2">✦</span>' +
          '<span class="btp-scene-sparkle btp-scene-sparkle--3">·</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderRewardBadge(icon) {
    return (
      '<div class="btp-reward-badge" aria-hidden="true">' +
        '<span class="btp-reward-badge-ring"></span>' +
        '<span class="btp-reward-badge-icon">' + icon + '</span>' +
      '</div>'
    );
  }

  function renderProgressStars(filled, target) {
    const progress = computeProgressStars(filled, target);
    if (!progress.target) return '';
    let html =
      '<div class="btp-progress-stars" role="img" aria-label="' +
        progress.totalFilled + ' av ' + progress.totalTarget + ' stjärnor mot målet">';
    for (let i = 0; i < progress.target; i++) {
      html += '<span class="btp-progress-star' + (i < progress.filled ? ' is-filled' : '') + '"></span>';
    }
    html += '</div>';
    return html;
  }

  function renderProgressBlock(starBalance, starCost, pct) {
    const progressText = esc(String(starBalance || 0)) + ' av ' + esc(String(starCost)) + ' stjärnor';
    return (
      renderProgressStars(starBalance, starCost) +
      '<div class="btp-goal-track" role="progressbar" aria-valuenow="' + pct +
        '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="btp-goal-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<p class="btp-goal-progress">' + progressText + '</p>'
    );
  }

  function renderHeader(starBalance) {
    const count = Number(starBalance) || 0;
    const label = count === 1
      ? 'Du har 1 stjärna att använda'
      : 'Du har ' + count + ' stjärnor att använda';
    return (
      '<header class="btp-header" aria-label="Dina stjärnor">' +
        '<p class="btp-kicker">🎁 Skattkammaren</p>' +
        '<div class="btp-balance" aria-hidden="true">' +
          '<span class="btp-balance-emoji">⭐</span>' +
          '<span class="btp-balance-count">' + count + '</span>' +
        '</div>' +
        '<p class="btp-balance-label">' + esc(label) + '</p>' +
      '</header>'
    );
  }

  function renderGoalSection(skatt) {
    const goal = skatt.goal;
    if (!goal || !goal.reward_id) {
      return (
        '<section class="btp-plaque btp-plaque--empty" aria-label="Aktivt mål">' +
          '<div class="btp-plaque-inner">' +
            '<p class="btp-plaque-label">Mål</p>' +
            '<p class="btp-goal-empty-text">Här kan du välja vad du vill spara till</p>' +
            '<button type="button" class="btp-cta btp-cta--soft" onclick="openGoalPicker()">' +
              '✨ Välj belöning' +
            '</button>' +
          '</div>' +
        '</section>'
      );
    }

    const remaining = Math.max(0, (goal.star_cost || 0) - (skatt.starBalance || 0));
    const icon = goal.reward_icon || '🎁';
    const pct = skatt.progressPct || 0;
    let html =
      '<section class="btp-plaque" aria-label="Aktivt mål">' +
        '<div class="btp-plaque-frame" aria-hidden="true"></div>' +
        '<div class="btp-plaque-inner">' +
          renderRewardBadge(icon) +
          '<p class="btp-plaque-label">Mål</p>' +
          '<p class="btp-plaque-sub">Du sparar till</p>' +
          '<h2 class="btp-goal-title">' + icon + ' ' + esc(goal.reward_name) + '</h2>';

    if (remaining > 0) {
      html += '<p class="btp-goal-remaining">Bara ' + remaining + ' kvar</p>';
    } else {
      html += '<p class="btp-goal-remaining btp-goal-remaining--ready">Du kan lösa in den här nu.</p>';
    }

    html += renderProgressBlock(skatt.starBalance, goal.star_cost, pct);

    if (skatt.showGoalChangeLink) {
      html += '<button type="button" class="btp-link" onclick="openGoalPicker()">🔄 Byt belöning</button>';
    }

    html += '</div></section>';
    return html;
  }

  function renderPendingCard(pending) {
    if (!pending || !pending.length) return '';
    const count = pending.length;
    const text = count === 1
      ? '1 belöning väntar på en vuxen.'
      : count + ' belöningar väntar på en vuxen.';
    return (
      '<section class="btp-pending-card" role="status" aria-label="Väntar på godkännande">' +
        '<span class="btp-pending-icon" aria-hidden="true">⏳</span>' +
        '<div class="btp-pending-body">' +
          '<h3 class="btp-pending-title">Väntar på godkännande</h3>' +
          '<p class="btp-pending-text">' + esc(text) + '</p>' +
        '</div>' +
      '</section>'
    );
  }

  function renderPrimaryAction(skatt) {
    if (skatt.primaryAction && skatt.primaryAction.type === 'redeem') {
      return (
        '<div class="btp-primary">' +
          '<button type="button" class="btp-cta" onclick="requestRedeem(\'' +
            esc(skatt.primaryAction.rewardId) + '\')">' +
            '📨 Fråga om att lösa in' +
          '</button>' +
        '</div>'
      );
    }
    if (skatt.primaryAction && skatt.primaryAction.type === 'pick_goal') {
      return (
        '<div class="btp-primary">' +
          '<button type="button" class="btp-cta btp-cta--soft" onclick="openGoalPicker()">' +
            '✨ Välj en belöning att spara till' +
          '</button>' +
        '</div>'
      );
    }
    return '';
  }

  function renderStatusBanners(skatt, deniedRecent) {
    let html = '';
    const SKATT_STATES = window.SKATT_STATES || {};

    if (skatt.pendingChangeReq) {
      html +=
        '<div class="btp-banner btp-banner--waiting" role="status">' +
          '<span aria-hidden="true">⏳</span>' +
          '<div><strong>Byter belöning</strong><p>Väntar på svar från vuxen</p></div>' +
        '</div>';
    }

    if (skatt.state === SKATT_STATES.COMPLETED && skatt.completedReward) {
      const cr = skatt.completedReward;
      html +=
        '<div class="btp-banner btp-banner--approved" role="status">' +
          '<span aria-hidden="true">' + (cr.reward_icon || '🎉') + '</span>' +
          '<div><strong>Godkänd</strong>' +
          '<p>' + esc(cr.reward_name) + ' — njut av belöningen 🌟</p></div>' +
        '</div>';
    }

    if (deniedRecent && deniedRecent.length > 0) {
      deniedRecent.forEach(function (r) {
        html +=
          '<div class="btp-banner btp-banner--gentle" role="status">' +
            '<span aria-hidden="true">' + (r.reward_icon || '🎁') + '</span>' +
            '<div><strong>' + esc(r.reward_name) + '</strong>' +
            '<p>Inte den här gången — du kan försöka igen senare 💛</p></div>' +
          '</div>';
      });
    }

    return html ? '<section class="btp-status-banners">' + html + '</section>' : '';
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
        r.id + '\')">Lös in</button>';
    }

    return (
      '<article class="' + rowClass + '"' + tap + ' aria-label="' + esc(r.name) + '">' +
        '<div class="btp-card-icon" aria-hidden="true">' + (r.icon || '🎁') + '</div>' +
        '<div class="btp-card-body">' +
          '<div class="btp-card-top">' +
            '<h3 class="btp-card-name">' + esc(r.name) + '</h3>' +
            '<span class="btp-card-status">' + esc(status.label) + '</span>' +
          '</div>' +
          '<div class="btp-card-bar" aria-hidden="true">' +
            '<div class="btp-card-fill btp-card-fill--' + color + '" style="width:' + st.pct + '%"></div>' +
          '</div>' +
          '<p class="btp-card-meta">' +
            '<span>' + starBalance + ' av ' + r.star_cost + ' stjärnor</span>' +
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
        '<section class="btp-rewards" aria-label="Belöningar">' +
          '<h2 class="btp-section-title">Belöningar att spara till</h2>' +
          '<div class="btp-empty">' +
            '<p class="btp-empty-emoji" aria-hidden="true">🎁</p>' +
            '<p class="btp-empty-title">Här kan du välja vad du vill spara till</p>' +
            '<p class="btp-empty-sub">Be en vuxen lägga till belöningar åt dig.</p>' +
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
          '<section class="btp-rewards" aria-label="Belöningar">' +
            '<h2 class="btp-section-title">Belöningar att spara till</h2>' +
            '<div class="btp-empty">' +
              '<p class="btp-empty-emoji" aria-hidden="true">🎁</p>' +
              '<p class="btp-empty-title">Här kan du välja vad du vill spara till</p>' +
              '<p class="btp-empty-sub">Be en vuxen lägga till belöningar åt dig.</p>' +
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
      '<section class="btp-rewards" aria-label="Belöningar">' +
        '<h2 class="btp-section-title">Belöningar att spara till</h2>' +
        '<div class="btp-shelf-stage" role="img" aria-label="Belöningshylla">' +
          '<div class="btp-shelf-board" aria-hidden="true"></div>' +
          '<div class="btp-card-list btp-shelf-items">' + cards + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderHistoryCard(r) {
    const d = new Date(r.created_at);
    const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    const cost = r.star_cost ? ' · ⭐ ' + r.star_cost : '';
    return (
      '<div class="btp-history-card">' +
        '<span class="btp-history-icon" aria-hidden="true">' + esc(r.reward_icon || '🎁') + '</span>' +
        '<div>' +
          '<p class="btp-history-name">' + esc(r.reward_name) + '</p>' +
          '<p class="btp-history-when">Genomförd · ' + esc(dateStr) + esc(cost) + '</p>' +
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
        '<section class="btp-history btp-history--empty" aria-label="Inlösta belöningar">' +
          '<h2 class="btp-section-title">Belöningar jag sparat ihop till</h2>' +
          '<div class="btp-history-empty">' +
            '<p class="btp-history-empty-lead">' +
              esc('Här kommer belöningar du sparat ihop till att synas.') +
            '</p>' +
            '<p class="btp-history-empty-hint">' +
              esc('När du löser in något dyker det upp här som ett minne.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    let cards = '';
    items.forEach(function (r) {
      cards += renderHistoryCard(r);
    });

    return (
      '<section class="btp-history" aria-label="Inlösta belöningar">' +
        '<h2 class="btp-section-title">Belöningar jag sparat ihop till</h2>' +
        '<div class="btp-chest" role="img" aria-label="Minnesskattkista">' +
          '<div class="btp-chest-lid" aria-hidden="true">📦</div>' +
          '<div class="btp-history-list btp-chest-body">' + cards + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderBonusGrants(grants) {
    if (!grants || grants.length === 0) return '';
    let rows = '';
    grants.slice(0, 8).forEach(function (g) {
      const d = new Date(g.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      rows +=
        '<div class="btp-grant">' +
          '<span class="btp-grant-stars">+' + g.star_count + ' ⭐</span>' +
          '<div class="btp-grant-body">' +
            '<p class="btp-grant-reason">' + esc(g.reason) + '</p>' +
            '<p class="btp-grant-meta">' + esc(g.parent_name || 'Vuxen') + ' · ' + esc(dateStr) + '</p>' +
          '</div>' +
        '</div>';
    });
    return (
      '<section class="btp-grants" aria-label="Bonusstjärnor">' +
        '<h2 class="btp-section-title">Extra stjärnor</h2>' +
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

    let html = '<div class="btp-skatt">';
    html += renderScene();
    html += '<div class="btp-skatt-stack">';
    html += renderHeader(starBalance);
    html += renderPendingCard(skatt.pending);
    html += renderStatusBanners(skatt, deniedRecent);
    html += renderGoalSection(skatt);
    html += renderPrimaryAction(skatt);
    html += renderRewardsList(rewards, starBalance, redemptions, skatt.goal);
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
