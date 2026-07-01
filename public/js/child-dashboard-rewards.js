/**
 * Child dashboard rewards & goals (Fas 8 F3d).
 * Skattkammaren (treasure chamber) rendering, redeem flow, goal picker, coin FX —
 * extracted from child-dashboard.js. Group-exclusive state (_currentGoalData,
 * _currentRewardsData) moves here. Reads child-dashboard.js globals (me, currentDate,
 * escHtml, showToast, apiFetch, updateGoalBar, launchConfetti). Handlers exposed on window
 * for inline onclick + showTab callers.
 */
(function () {
// ── Rewards & Goals ────────────────────────────────────

let _currentGoalData = null; // cache for goal-picker
let _currentRewardsData = null;
let _loadRewardsInflight = null;

function childMe() {
  const bridge = window.ChildDashboardBridge;
  if (bridge && typeof bridge.getMe === 'function') {
    const session = bridge.getMe();
    if (session) return session;
  }
  return (window.Auth && typeof Auth.getUser === 'function') ? Auth.getUser() : null;
}

function childUiMagicEnabled() {
  const bridge = window.ChildDashboardBridge;
  if (bridge && typeof bridge.getChildUiMagic === 'function') {
    return bridge.getChildUiMagic();
  }
  return !!(window.AppViewMode && AppViewMode.isMagic());
}

function minimalUiEnabled() {
  const bridge = window.ChildDashboardBridge;
  if (bridge && typeof bridge.isMinimalUiActive === 'function') {
    return bridge.isMinimalUiActive();
  }
  return false;
}

function childWorldsV2Enabled() {
  return !!(window.ChildWorlds && ChildWorlds.V2_ENABLED);
}

function showRewardsLoadError(loader, message) {
  if (!loader) return;
  const text = message || 'Kunde inte ladda belöningar.';
  const safe = typeof escHtml === 'function' ? escHtml(text) : text;
  loader.style.display = '';
  loader.innerHTML =
    '<div class="text-center py-12">' +
    '<p class="text-4xl mb-3">😕</p>' +
    '<p class="text-text-soft mb-4">' + safe + '</p>' +
    '<button type="button" class="px-6 py-3 bg-gold text-navy font-semibold rounded-xl min-h-[44px]" ' +
    'onclick="window.rewardsLoaded=false;loadRewards({force:true})">🔄 Försök igen</button>' +
    '</div>';
}

async function loadRewards(options) {
  options = options || {};
  if (options.force) {
    _loadRewardsInflight = null;
  } else if (_loadRewardsInflight) {
    return _loadRewardsInflight;
  }

  _loadRewardsInflight = loadRewardsInner(options).finally(function () {
    _loadRewardsInflight = null;
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.clearPreferSkatt === 'function') {
      window.ChildMorgonhus.clearPreferSkatt();
    }
  });
  return _loadRewardsInflight;
}

async function loadRewardsInner(options) {
  // Show loader, hide content
  const loader = document.getElementById('skattkammarLoading');
  const view = document.getElementById('skattkammarView');

  // Use shimmer skeleton on Capacitor, spinner on web/PWA
  let skeletonTimer;
  const showBlockingLoader = !window.rewardsLoaded || options.force;
  if (showBlockingLoader) {
    if (window.Skeleton && window.Skeleton.isNative()) {
      if (loader) loader.style.display = 'none';
      skeletonTimer = window.Skeleton.createTimer(function () {
        window.Skeleton.showChildRewardsSkeleton();
      });
    } else if (loader) {
      loader.style.display = '';
      loader.innerHTML = '<p class="text-5xl mb-3" style="display:inline-block;animation:skattSpin 1.5s linear infinite">⭐</p><p class="text-text-soft font-semibold mt-3">Öppnar Skattkammaren...</p>';
    }
    if (view) view.style.display = 'none';
  }

  if (navigator.onLine && window.ChildMorgonhus && !window.ChildMorgonhus.isActive()) {
    let morgonhusAllowed = false;
    try {
      const features = window.fetchStjarndagFeatures
        ? await window.fetchStjarndagFeatures()
        : await fetch('/api/features', { credentials: 'include' }).then(function (r) {
          return r.ok ? r.json() : [];
        });
      morgonhusAllowed = features.some(function (f) {
        return f.slug === 'morgonhus_playable';
      });
    } catch {
      morgonhusAllowed = false;
    }

    if (morgonhusAllowed && !window.ChildMorgonhus.shouldPreferSkatt()) {
      const mounted = await window.ChildMorgonhus.tryMountWorld();
      if (mounted) {
        if (skeletonTimer) skeletonTimer.stop();
        rewardsLoaded = true;
        hideOfflineBanner();
        return;
      }
    }
    document.body.classList.remove('child-morgonhus-active');
  }

  // ── Offline path: serve cached rewards from IndexedDB ─────────
  if (!navigator.onLine) {
    const session = childMe();
    const cached = await (window.OfflineStore
      ? OfflineStore.getRewards(session?.id)
      : Promise.resolve(null));
    if (skeletonTimer) skeletonTimer.stop();
    if (cached) {
      window.rewardsLoaded = true;
      _currentRewardsData = cached;
      renderSkattkammaren(cached, _currentGoalData, { grants: [] });
      showOfflineBanner('📶 Offline — visar sparat data');
    } else {
      if (loader) loader.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">📶</p><p class="text-text-soft">Ingen uppkoppling. Koppla upp för att se belöningar.</p></div>';
    }
    return;
  }

  try {
    const [rewardsData, goalData, manualData] = await Promise.all([
      Auth.api('/api/me/rewards'),
      Auth.api('/api/me/goal').catch(() => null),
      Auth.api('/api/me/manual-stars').catch(() => ({ grants: [] })),
    ]);
    if (skeletonTimer) skeletonTimer.stop();

    // Cache rewards for offline use
    const session = childMe();
    if (window.OfflineStore && session?.id) {
      OfflineStore.saveRewards(session.id, rewardsData).catch(() => {});
    }

    hideOfflineBanner();
    window.rewardsLoaded = true;
    _currentGoalData = goalData;
    _currentRewardsData = rewardsData;
    updateGoalBar(goalData);
    try {
      await renderSkattkammaren(rewardsData, goalData, manualData);
      if (window.ChildRewardsEngine) {
        ChildRewardsEngine.setGoalData(goalData);
        ChildRewardsEngine.setRewardsData(rewardsData);
        ChildRewardsEngine.mountGoalProgress();
        ChildRewardsEngine.mountPendingBannerIfNeeded();
      }
    } catch (renderErr) {
      console.error('[loadRewards] renderSkattkammaren failed:', renderErr);
      window.rewardsLoaded = false;
      if (showBlockingLoader) showRewardsLoadError(loader, 'Kunde inte visa belöningarna. Försök igen.');
    }
  } catch (err) {
    console.error('[loadRewards] API failed:', err);
    // Fallback to IndexedDB cache on API failure
    const cached = await (window.OfflineStore
      ? OfflineStore.getRewards(childMe()?.id)
      : Promise.resolve(null));
    if (skeletonTimer) skeletonTimer.stop();
    if (cached) {
      window.rewardsLoaded = true;
      _currentRewardsData = cached;
      try {
        await renderSkattkammaren(cached, _currentGoalData, { grants: [] });
        showOfflineBanner('📶 Offline — visar sparat data');
      } catch (renderErr) {
        console.error('[loadRewards] cached render failed:', renderErr);
        window.rewardsLoaded = false;
        showRewardsLoadError(loader);
      }
    } else {
      window.rewardsLoaded = false;
      showRewardsLoadError(loader, err && err.message ? err.message : undefined);
    }
  }
}

// ══════════════════════════════════════════════════════════
// SKATTKAMMAREN — renderSkattkammaren()
// POS: skattkammaren-vision.md — Olle-test, priority ladder
// ══════════════════════════════════════════════════════════

const SKATT_PROGRESS_COLORS = ['gold', 'purple', 'green', 'coral', 'blue'];
const SKATT_COMPLETED_FLASH_MS = 2000;
const SKATT_DENIED_FLASH_MS = 120000;

const SKATT_STATES = {
  NO_GOAL: 'no_goal',
  COLLECTING: 'collecting',
  REDEEM_AVAILABLE: 'redeem_available',
  AWAITING_DECISION: 'awaiting_decision',
  DENIED: 'denied',
  COMPLETED: 'completed',
};

function skattRedemptionTime(rd) {
  return new Date(rd.approved_at || rd.updated_at || rd.created_at || 0).getTime();
}

function skattRewardState(r, starBalance, redemptions, goal) {
  const isRedeemed = redemptions.some(function (rd) {
    return rd.reward_id === r.id && (rd.status === 'approved' || rd.status === 'auto');
  });
  const hasPending = redemptions.some(function (rd) {
    return rd.reward_id === r.id && rd.status === 'pending';
  });
  const canAfford = starBalance >= r.star_cost;
  const pct = Math.min(100, Math.round((starBalance / r.star_cost) * 100));
  const isCurrentGoal = !!(goal && goal.reward_id === r.id);
  const ready = canAfford && !isRedeemed && !hasPending;
  return { isRedeemed, hasPending, canAfford, pct, isCurrentGoal, ready };
}

function skattListSortBucket(st) {
  if (st.isCurrentGoal) return 0;
  if (!st.isRedeemed && !st.hasPending) return 1;
  return 2;
}

function sortRewardsForList(rewards, starBalance, redemptions, goal) {
  return rewards.slice().sort(function (a, b) {
    const sa = skattRewardState(a, starBalance, redemptions, goal);
    const sb = skattRewardState(b, starBalance, redemptions, goal);
    const ba = skattListSortBucket(sa);
    const bb = skattListSortBucket(sb);
    if (ba !== bb) return ba - bb;
    if (ba === 1) {
      if (sa.ready !== sb.ready) return sa.ready ? -1 : 1;
      return sb.pct - sa.pct;
    }
    if (sa.hasPending !== sb.hasPending) return sa.hasPending ? -1 : 1;
    return sb.pct - sa.pct;
  });
}

/**
 * Exclusive Skattkammaren state — vision § Tillståndsmaskin.
 * Priority: Awaiting decision → Completed → Denied → Redeem available → Collecting → No goal.
 */
function resolveSkattState(rewardsData, goalData, options) {
  options = options || {};
  const now = options.now != null ? options.now : Date.now();
  const starBalance = rewardsData.starBalance || 0;
  const redemptions = rewardsData.redemptions || [];
  const goal = goalData && goalData.goal ? goalData.goal : null;
  const progressPct = goalData ? Math.min(100, goalData.progress_pct || 0) : 0;
  const pendingChangeReq = goalData ? goalData.pending_change_request : null;
  const hasGoal = !!(goal && goal.reward_id);
  const canAffordGoal = hasGoal && starBalance >= goal.star_cost;
  const pending = redemptions.filter(function (r) { return r.status === 'pending'; });
  const hasPending = pending.length > 0 || !!pendingChangeReq;

  const recentApproved = redemptions
    .filter(function (r) {
      return (r.status === 'approved' || r.status === 'auto') &&
        now - skattRedemptionTime(r) < SKATT_COMPLETED_FLASH_MS;
    })
    .sort(function (a, b) { return skattRedemptionTime(b) - skattRedemptionTime(a); });

  const recentDenied = redemptions
    .filter(function (r) {
      return r.status === 'denied' && now - skattRedemptionTime(r) < SKATT_DENIED_FLASH_MS;
    })
    .sort(function (a, b) { return skattRedemptionTime(b) - skattRedemptionTime(a); });

  let progressLabel = 'Välj vad du sparar till';
  if (hasGoal) {
    progressLabel = starBalance + ' av ' + goal.star_cost + ' till ' + goal.reward_name;
  }

  const base = {
    starBalance: starBalance,
    goal: goal,
    progressPct: hasGoal ? progressPct : 0,
    progressLabel: progressLabel,
    pending: pending,
    pendingChangeReq: pendingChangeReq,
    showGoalChangeLink: hasGoal && !pendingChangeReq,
    primaryAction: null,
    collectHint: null,
    completedReward: null,
    recentDenied: recentDenied,
    allowListRedeem: true,
  };

  if (hasPending) {
    return Object.assign({}, base, {
      state: SKATT_STATES.AWAITING_DECISION,
    });
  }
  if (recentApproved.length > 0) {
    return Object.assign({}, base, {
      state: SKATT_STATES.COMPLETED,
      completedReward: recentApproved[0],
    });
  }
  if (recentDenied.length > 0) {
    return Object.assign({}, base, {
      state: SKATT_STATES.DENIED,
    });
  }
  if (hasGoal && canAffordGoal) {
    return Object.assign({}, base, {
      state: SKATT_STATES.REDEEM_AVAILABLE,
      primaryAction: { type: 'redeem', rewardId: goal.reward_id },
    });
  }
  if (hasGoal) {
    return Object.assign({}, base, {
      state: SKATT_STATES.COLLECTING,
      collectHint: { starsToGo: Math.max(0, goal.star_cost - starBalance) },
    });
  }
  return Object.assign({}, base, {
    state: SKATT_STATES.NO_GOAL,
    primaryAction: { type: 'pick_goal' },
  });
}

async function renderSkattkammaren(rewardsData, goalData, manualData) {
  const { rewards, starBalance, redemptions } = rewardsData;
  const deniedRecent = redemptions.filter(r => r.status === 'denied').slice(0, 3);
  const grants = (manualData && manualData.grants) ? manualData.grants : [];
  const trophies = redemptions.filter(r => r.status === 'approved' || r.status === 'auto');
  const skatt = resolveSkattState(rewardsData, goalData);
  const goal = skatt.goal;
  const session = childMe();

  // ── Hide loader, show content ──────────────────────────
  const loader = document.getElementById('skattkammarLoading');
  const view = document.getElementById('skattkammarView');
  if (loader) loader.style.display = 'none';
  if (!view) return;
  view.style.display = '';
  view.style.animation = 'skattEntrance 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

  // ── Play coin sound (Web Audio API - generates sound without files) ──
  playCoinSound();

  let html = '';

  const totalEarned = starBalance + redemptions
    .filter(function (r) { return r.status === 'approved' || r.status === 'auto'; })
    .reduce(function (acc, r) { return acc + (r.star_cost || 0); }, 0);
  const childLabel = (session && session.name) ? escHtml(session.name) : 'Du';
  const heroTitle = minimalUiEnabled() ? '🤝 Be om hjälp' : 'Stjärnburken';

  // 1. Stjärnburken — hero (Olle-test: stjärnor + mål)
  html += '<div class="skatt-banner skatt-hero-v10">' +
    '<div class="skatt-hero-v10-inner">' +
    '<p class="skatt-hero-label">' + childLabel + ' · ' + heroTitle + '</p>' +
    '<div class="skatt-hero-count">' + starBalance + '</div>' +
    '<p class="skatt-hero-sublabel">stjärnor samlade</p>' +
    '<div class="skatt-hero-progress-track">' +
    '<div class="skatt-hero-progress-fill" id="skattGoalBar" style="width:' + skatt.progressPct + '%"></div>' +
    '</div>' +
    '<p class="skatt-hero-progress-label">' + escHtml(skatt.progressLabel) + '</p>' +
    (window.ChildDashboardWarmth
      ? window.ChildDashboardWarmth.renderEconomyHintHtml(starBalance, totalEarned)
      : (totalEarned > starBalance
        ? '<p class="skatt-hero-economy">Totalt tjänat: ⭐ ' + totalEarned + '</p>'
        : '')) +
    (skatt.showGoalChangeLink
      ? '<button type="button" class="skatt-hero-link" onclick="openGoalPicker()">🔄 Byt mål</button>'
      : '') +
  '</div></div>';

  // 2. Primär handling — driven by resolveSkattState (max en knapp)
  if (skatt.primaryAction && skatt.primaryAction.type === 'redeem') {
    html += '<div class="skatt-primary-wrap">' +
      '<button type="button" onclick="requestRedeem(\'' + skatt.primaryAction.rewardId + '\')" class="skatt-primary-cta skatt-redeem-btn">' +
      '📨 Fråga om att lösa in' +
      '</button></div>';
  } else if (skatt.primaryAction && skatt.primaryAction.type === 'pick_goal') {
    html += '<div class="skatt-primary-wrap">' +
      '<button type="button" onclick="openGoalPicker()" class="skatt-primary-cta skatt-redeem-btn">' +
      '✨ Välj mitt mål' +
      '</button></div>';
  } else if (skatt.collectHint) {
    html += '<div class="skatt-collect-hint">Samla ' + skatt.collectHint.starsToGo + ' ⭐ till! 💪</div>';
  }

  if (skatt.pendingChangeReq) {
    html += '<div class="skatt-status-card skatt-status-pending">' +
      '<span>⏳</span><div><strong>Byter mål</strong><p>Väntar på svar från förälder</p></div></div>';
  }

  // 3. Belöningslista med progress (mockup)
  html += '<div class="skatt-section skatt-rewards-list-section">' +
    '<div class="skatt-section-header">' +
    '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);">🎁</div>' +
    '<span class="skatt-section-title" style="color:#6c5ce7;">Belöningar</span>' +
    (rewards.length > 0
      ? '<span class="skatt-section-count">' + rewards.length + ' st</span>'
      : '') +
    '</div><div class="skatt-section-body">';

  if (rewards.length === 0) {
    html += '<div class="skatt-empty-rewards">' +
      '<div style="font-size:3rem;margin-bottom:10px;opacity:0.5;">🎁</div>' +
      '<p class="skatt-empty-title">Inga belöningar ännu!</p>' +
      '<p class="skatt-empty-sub">Be din förälder lägga till belöningar 🌟</p>' +
      '</div>';
  } else {
    html += '<div class="skatt-reward-list">';
    const sortedRewards = sortRewardsForList(rewards, starBalance, redemptions, goal);
    sortedRewards.forEach(function (r, idx) {
      const st = skattRewardState(r, starBalance, redemptions, goal);
      const color = SKATT_PROGRESS_COLORS[idx % SKATT_PROGRESS_COLORS.length];
      const rowClass = st.isRedeemed ? 'is-earned' : st.hasPending ? 'is-pending' : st.ready ? 'is-ready' : '';
      const tap = st.ready && !st.isRedeemed && !st.hasPending
        ? ' onclick="requestRedeem(\'' + r.id + '\')" role="button" tabindex="0"'
        : '';
      let tag = '';
      if (st.ready) tag = '<span class="skatt-reward-tag ready">Klar!</span>';
      else if (st.hasPending) tag = '<span class="skatt-reward-tag pending">⏳</span>';
      else if (st.isCurrentGoal) tag = '<span class="skatt-reward-tag goal">🎯</span>';
      else if (st.isRedeemed) tag = '<span class="skatt-reward-tag earned">✅</span>';

      html += '<div class="skatt-reward-row ' + rowClass + '"' + tap + '>' +
        tag +
        '<div class="skatt-reward-row-icon">' + (r.icon || '🎁') + '</div>' +
        '<div class="skatt-reward-row-body">' +
        '<div class="skatt-reward-row-name">' + escHtml(r.name) + '</div>' +
        '<div class="skatt-reward-row-bar"><div class="skatt-reward-row-fill ' + color + '" style="width:' + st.pct + '%"></div></div>' +
        '<div class="skatt-reward-row-labels">' +
        '<span>' + starBalance + ' av ' + r.star_cost + ' stjärnor</span>' +
        '<span class="skatt-reward-row-cost">⭐ ' + r.star_cost + '</span>' +
        '</div></div></div>';
    });
    html += '</div>';
  }
  html += '</div></div>';

  // 4. Status — pending / denied / completed (informativt, inte primär handling)
  const showStatus = skatt.pending.length > 0 || deniedRecent.length > 0 ||
    skatt.state === SKATT_STATES.COMPLETED;
  if (showStatus) {
    html += '<div class="skatt-section skatt-status-section"><div class="skatt-section-body">';
    if (skatt.state === SKATT_STATES.COMPLETED && skatt.completedReward) {
      const cr = skatt.completedReward;
      html += '<div class="skatt-status-card skatt-status-completed">' +
        '<span>' + (cr.reward_icon || '🎉') + '</span>' +
        '<div><strong>' + escHtml(cr.reward_name) + '</strong>' +
        '<p>🎉 Belöningen är din!</p></div></div>';
    }
    if (skatt.pending.length > 0) {
      for (const r of skatt.pending) {
        html += '<div class="skatt-status-card skatt-status-pending">' +
          '<span>' + (r.reward_icon || '🎁') + '</span>' +
          '<div><strong>' + escHtml(r.reward_name) + '</strong>' +
          '<p>⏳ Föräldern godkänner snart</p></div></div>';
      }
    }
    if (deniedRecent.length > 0) {
      for (const r of deniedRecent) {
        html += '<div class="skatt-status-card skatt-status-denied">' +
          '<span>' + (r.reward_icon || '🎁') + '</span>' +
          '<div><strong>' + escHtml(r.reward_name) + '</strong>' +
          '<p>Inte den här gången — fråga igen senare 💛</p></div></div>';
      }
    }
    html += '</div></div>';
  }

  // 5. Troféhylla — endast om innehåll (dölj tom state)
  if (trophies.length > 0) {
    html += '<div class="skatt-section">' +
      '<div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>' +
      '<span class="skatt-section-title" style="color:#c0392b;">Troféhyllan</span>' +
      '<span class="skatt-section-count">' + trophies.length + ' st</span>' +
      '</div><div class="skatt-section-body"><div class="skatt-trophy-grid">';

    trophies.slice(0, 9).forEach(function (r, i) {
      const d = new Date(r.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      html += '<div class="skatt-trophy-item" style="animation-delay:' + (i * 60) + 'ms;" title="' +
        escHtml(r.reward_name) + ' · ' + dateStr + '">' +
        '<span class="skatt-trophy-emoji">' + (r.reward_icon || '🎁') + '</span>' +
        '<span class="skatt-trophy-name">' + escHtml(r.reward_name) + '</span>' +
        '<span class="skatt-trophy-badge">✅</span></div>';
    });

    if (trophies.length > 9) {
      html += '<div class="skatt-trophy-item skatt-trophy-more">' +
        '<span class="skatt-trophy-emoji">+' + (trophies.length - 9) + '</span>' +
        '<span class="skatt-trophy-name">fler trofeer</span></div>';
    }
    html += '</div></div></div>';
  }

  // 6. Bonus-stjärnor (utforskning)
  if (grants.length > 0) {
    html += '<div class="skatt-section">' +
      '<div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#00b894,#55efc4);">✨</div>' +
      '<span class="skatt-section-title" style="color:#00864e;">Bonus-stjärnor</span>' +
      '</div><div class="skatt-section-body">';

    for (const g of grants.slice(0, 8)) {
      const d = new Date(g.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      html += '<div class="skatt-grant-card">' +
        (g.image_url
          ? '<img src="' + escHtml(g.image_url) + '" alt="" class="skatt-grant-img">'
          : '<div class="skatt-grant-icon">⭐</div>') +
        '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
        '<span class="skatt-grant-stars">+' + g.star_count + ' ⭐</span>' +
        '<span class="skatt-grant-date">' + dateStr + '</span></div>' +
        '<div class="skatt-grant-reason">' + escHtml(g.reason) + '</div>' +
        '<div class="skatt-grant-parent">— ' + escHtml(g.parent_name || 'Förälder') + '</div>' +
        '</div></div>';
    }
    html += '</div></div>';
  }

  // 7. Historikboken (utforskning)
  const historyWins = trophies.slice().sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (historyWins.length > 0) {
    html += '<div class="skatt-section" style="margin-bottom:24px;">' +
      '<div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3);">📖</div>' +
      '<span class="skatt-section-title" style="color:#0652c5;">Historikboken</span>' +
      '</div><div class="skatt-section-body" style="padding-bottom:8px;">';

    for (const r of historyWins.slice(0, 10)) {
      html += window.ChildDashboardWarmth
        ? window.ChildDashboardWarmth.renderHistoryStoryHtml(r)
        : '<div class="skatt-history-story"><div class="skatt-history-story-text">Du låste upp ' +
          escHtml(r.reward_name) + ' ' + (r.reward_icon || '🎁') + ' 🎉</div></div>';
    }
    html += '</div></div>';
  }

  // Done — render to DOM
  const hubMeta = {
    starBalance,
    trophies,
    economyHtml: totalEarned > starBalance
      ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.55);margin-top:12px;font-family:'Plus Jakarta Sans',sans-serif;">Totalt tjänat: ⭐ ${totalEarned}</div>`
      : '',
    childName: session && session.name,
    childEmoji: session && session.emoji,
    avatarUrl: session && session.avatar_url,
  };

  const useSkattHouse = !minimalUiEnabled() && window.ChildSkattHouse;
  const v2World = childWorldsV2Enabled();
  const magicView = childUiMagicEnabled();

  if (useSkattHouse && v2World) {
    await ChildSkattHouse.present(view, html, hubMeta);
  } else if (useSkattHouse && magicView) {
    const homeMount = document.getElementById('homeHubMount');
    const homeLoader = document.getElementById('homeHubLoading');
    if (homeMount) {
      await ChildSkattHouse.mountHome(homeMount, html, hubMeta);
      if (homeLoader) homeLoader.style.display = 'none';
      homeMount.style.display = '';
    }
    view.innerHTML = html;
  } else {
    view.innerHTML = html;
  }

  // Animate trophy items with staggered delays
  const trophyItems = view.querySelectorAll('.skatt-trophy-item');
  trophyItems.forEach((el, i) => {
    el.style.animationDelay = `${i * 70}ms`;
    el.style.opacity = '0';
    el.style.animationFillMode = 'forwards';
    setTimeout(() => { el.style.opacity = ''; }, i * 70 + 400);
  });
}

// ── Coin sound generator (Web Audio API) ──────────────
function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });
    setTimeout(() => { try { ctx.close(); } catch(e) {} }, 1200);
  } catch(e) { /* Audio not available - silent fail */ }
}

// ── Coin ripple visual on entry ─────────────────────────
function coinEntryRipple() {
  const banner = document.querySelector('.skatt-banner, .skatt-hero-v10');
  if (!banner) return;
  const r = document.createElement('div');
  r.className = 'coin-ripple';
  const rect = banner.getBoundingClientRect();
  r.style.left = (rect.left + rect.width / 2 - 10) + 'px';
  r.style.top = (rect.top + rect.height / 2 - 10) + 'px';
  document.body.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ── Redeem: sends request to parent ───────────────────
async function requestRedeem(rewardId) {
  // ── Offline: queue the request and show notice ──────────────────
  const isOffline = !navigator.onLine;
  if (isOffline) {
    const session = childMe();
    if (window.OfflineQueue && session?.id) {
      OfflineQueue.queueRedeem(session.id, rewardId).catch(() => {});
      showToast('📶 Sparas — skickas när nätverket är tillbaka', false);
    } else {
      showToast('Kräver internet för att lösa in.', true);
    }
    return;
  }

  try {
    const data = await Auth.api('/api/me/rewards/' + rewardId + '/redeem', { method: 'POST' });
    window.rewardsLoaded = false;
    if (window.Platform && window.Platform.haptics) {
      window.Platform.haptics.medium();
    }
    showToast('📨 Inlösningsförfrågan skickad till föräldern!');
    await loadRewards();
  } catch (err) {
    const netErr = err && (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.');
    if (netErr && window.OfflineQueue) {
      const session = childMe();
      if (session?.id) {
        OfflineQueue.queueRedeem(session.id, rewardId).catch(() => {});
      }
      showToast('📶 Sparas — skickas när nätverket är tillbaka', false);
    } else {
      showToast(err.message || 'Kunde inte lösa in.', true);
    }
  }
}

// Keep backward compat
async function redeemReward(rewardId) { return requestRedeem(rewardId); }

// ── Goal picker modal ─────────────────────────────────
function openGoalPicker() {
  const rewards = _currentRewardsData ? _currentRewardsData.rewards : [];
  const goal = _currentGoalData ? _currentGoalData.goal : null;
  const hasGoal = !!(goal && goal.reward_id);
  const modal = document.getElementById('goalPickerModal');
  const list = document.getElementById('goalPickerList');
  if (!modal || !list) return;

  if (rewards.length === 0) {
    list.innerHTML = '<p class="text-text-soft text-center py-6">Inga belöningar tillgängliga ännu.</p>';
  } else {
    list.innerHTML = rewards.map(r => `
      <button onclick="setGoal('${r.id}', ${hasGoal})" class="w-full flex items-center gap-3 bg-white hover:bg-gold-light rounded-xl p-3 text-left transition-colors border border-lavender mb-2 min-h-[56px]">
        <span class="text-3xl">${r.icon || '🎁'}</span>
        <div class="flex-1 min-w-0">
          <p class="font-heading font-bold text-sm text-navy truncate">${escHtml(r.name)}</p>
          <p class="text-xs text-text-soft">⭐ ${r.star_cost} stjärnor</p>
        </div>
        ${(goal && goal.reward_id === r.id) ? '<span class="text-xs bg-gold text-white px-2 py-0.5 rounded-full">Nuvarande</span>' : ''}
      </button>
    `).join('');
  }
  modal.classList.remove('hidden');
}

function closeGoalPicker() {
  const modal = document.getElementById('goalPickerModal');
  if (modal) modal.classList.add('hidden');
}

async function setGoal(rewardId, isChange) {
  closeGoalPicker();
  try {
    if (isChange) {
      // Send change request to parent
      const data = await Auth.api('/api/me/goal/change-request', {
        method: 'POST',
        body: JSON.stringify({ to_reward_id: rewardId }),
      });
      showToast('📨 Bytebegäran skickad till föräldern!');
    } else {
      // Set directly (no existing goal)
      const data = await Auth.api('/api/me/goal', {
        method: 'POST',
        body: JSON.stringify({ reward_id: rewardId }),
      });
      showToast('🎯 ' + data.message);
      launchMilestoneConfetti();
    }
    window.rewardsLoaded = false;
    await loadRewards();
  } catch (err) {
    showToast(err.message || 'Kunde inte sätta mål.', true);
  }
}

  // Exposed on window for inline onclick + cross-file callers
  window.loadRewards = loadRewards;
  window.renderSkattkammaren = renderSkattkammaren;
  window.resolveSkattState = resolveSkattState;
  window.skattRewardState = skattRewardState;
  window.sortRewardsForList = sortRewardsForList;
  window.SKATT_STATES = SKATT_STATES;
  window.playCoinSound = playCoinSound;
  window.coinEntryRipple = coinEntryRipple;
  window.requestRedeem = requestRedeem;
  window.redeemReward = redeemReward;
  window.openGoalPicker = openGoalPicker;
  window.closeGoalPicker = closeGoalPicker;
  window.setGoal = setGoal;
})();
