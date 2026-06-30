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
  if (_loadRewardsInflight) return _loadRewardsInflight;

  _loadRewardsInflight = loadRewardsInner(options).finally(function () {
    _loadRewardsInflight = null;
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

  // ── Offline path: serve cached rewards from IndexedDB ─────────
  if (!navigator.onLine) {
    const cached = await (window.OfflineStore
      ? OfflineStore.getRewards(me?.id)
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
    if (window.OfflineStore && me?.id) {
      OfflineStore.saveRewards(me.id, rewardsData).catch(() => {});
    }

    hideOfflineBanner();
    window.rewardsLoaded = true;
    _currentGoalData = goalData;
    _currentRewardsData = rewardsData;
    updateGoalBar(goalData);
    try {
      renderSkattkammaren(rewardsData, goalData, manualData);
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
      ? OfflineStore.getRewards(me?.id)
      : Promise.resolve(null));
    if (skeletonTimer) skeletonTimer.stop();
    if (cached) {
      window.rewardsLoaded = true;
      _currentRewardsData = cached;
      try {
        renderSkattkammaren(cached, _currentGoalData, { grants: [] });
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
// ══════════════════════════════════════════════════════════

function renderSkattkammaren(rewardsData, goalData, manualData) {
  const { rewards, starBalance, redemptions } = rewardsData;
  const pending = redemptions.filter(r => r.status === 'pending');
  const deniedRecent = redemptions.filter(r => r.status === 'denied').slice(0, 3);
  const goal = goalData ? goalData.goal : null;
  const progressPct = goalData ? Math.min(100, goalData.progress_pct || 0) : 0;
  const pendingChangeReq = goalData ? goalData.pending_change_request : null;
  const grants = (manualData && manualData.grants) ? manualData.grants : [];
  const trophies = redemptions.filter(r => r.status === 'approved' || r.status === 'auto');

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

  // ══════════════════════════════════════════════════════
  // 1. FESTIVE BANNER — Stjärnkistan
  // ══════════════════════════════════════════════════════
  const totalEarned = starBalance + redemptions
    .filter(r => r.status === 'approved' || r.status === 'auto')
    .reduce((acc, r) => acc + (r.star_cost || 0), 0);

  // Twinkle stars positions
  const twinkleStars = [
    { top: '15%', left: '8%', dur: '1.8s', delay: '0s' },
    { top: '30%', left: '90%', dur: '2.2s', delay: '0.5s' },
    { top: '60%', left: '5%', dur: '1.5s', delay: '0.8s' },
    { top: '75%', left: '92%', dur: '2.5s', delay: '0.3s' },
    { top: '20%', left: '50%', dur: '1.9s', delay: '1.1s' },
    { top: '80%', left: '40%', dur: '2.1s', delay: '0.6s' },
    { top: '45%', left: '85%', dur: '1.7s', delay: '1.4s' },
    { top: '10%', left: '70%', dur: '2.3s', delay: '0.2s' },
  ];
  const twinkleHtml = twinkleStars.map(s =>
    `<span class="skatt-banner-star" style="top:${s.top};left:${s.left};--dur:${s.dur};--delay:${s.delay}">✦</span>`
  ).join('');

  html += `
  <div class="skatt-banner">
    <div class="skatt-banner-stars">${twinkleHtml}</div>
    <div style="position:relative;z-index:2;">
      <!-- Title -->
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Outfit',sans-serif;font-size:0.7rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;">Min</div>
        <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:white;letter-spacing:0.02em;">${minimalUiActive ? '🤝 Be om hjälp' : '💎 Skattkammaren'}</div>
      </div>

      <!-- Chest + balance -->
      <div style="display:flex;align-items:center;justify-content:center;gap:20px;">
        <div style="text-align:center;">
          <div class="skatt-chest" style="font-size:3rem;line-height:1;">🪙</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:'Outfit',sans-serif;font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,215,0,0.7);margin-bottom:2px;">Dina sparade stjärnor</div>
          <div style="font-family:'Outfit',sans-serif;font-size:3.2rem;font-weight:800;color:#FFD700;line-height:1;text-shadow:0 0 20px rgba(255,215,0,0.5);">⭐ ${starBalance}</div>
          ${window.ChildDashboardWarmth ? window.ChildDashboardWarmth.renderEconomyHintHtml(starBalance, totalEarned) : (totalEarned > starBalance ? `<div style="font-size:0.65rem;color:rgba(255,255,255,0.45);margin-top:4px;">Totalt tjänat: ⭐ ${totalEarned}</div>` : '')}
        </div>
        <div style="text-align:center;">
          <div class="skatt-chest" style="font-size:3rem;line-height:1;animation-delay:-1.5s;">🎁</div>
        </div>
      </div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════════
  // 2. ÖNSKELISTAN — Active Goal
  // ══════════════════════════════════════════════════════
  html += `<div class="skatt-section">
    <div class="skatt-section-header">
      <div class="skatt-section-icon" style="background:linear-gradient(135deg,#ff6b6b,#ffd93d);">🎯</div>
      <span class="skatt-section-title" style="color:#d63031;">Önskelistan</span>
    </div>
    <div class="skatt-section-body">`;

  if (goal && goal.reward_id) {
    const starsToGo = Math.max(0, goal.star_cost - starBalance);
    const canAffordGoal = starBalance >= goal.star_cost;
    html += `
      <div class="skatt-goal-wrap">
        <div class="skatt-goal-shine"></div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;position:relative;z-index:1;">
          <div style="width:60px;height:60px;min-width:60px;background:rgba(245,166,35,0.15);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:2rem;border:1.5px solid rgba(245,166,35,0.3);">${escHtml(goal.reward_icon || '🎯')}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B8860B;margin-bottom:2px;font-family:'Outfit',sans-serif;">Mitt drömtid</div>
            <div style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:#1B2340;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(goal.reward_name)}</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="margin-bottom:8px;position:relative;z-index:1;">
          <div class="skatt-progress-track">
            <div class="skatt-progress-fill" id="skattGoalBar" style="width:${progressPct}%">
              ${progressPct > 20 ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-family:'Outfit',sans-serif;font-weight:800;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.4);">⭐ ${starBalance} av ${goal.star_cost}</span>` : ''}
            </div>
            <!-- Milestone marks -->
            <div style="position:absolute;left:25%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.5);border-radius:1px;"></div>
            <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.5);border-radius:1px;"></div>
            <div style="position:absolute;left:75%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.5);border-radius:1px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:5px;">
            <span style="font-size:0.65rem;color:#B8860B;font-weight:600;font-family:'Outfit',sans-serif;">${progressPct}%${starsToGo > 0 ? ` — ${starsToGo} ⭐ kvar` : ''}</span>
            ${progressPct <= 20 ? `<span style="font-size:0.65rem;color:#5A6178;">⭐ ${starBalance} av ${goal.star_cost}</span>` : ''}
          </div>
        </div>

        <!-- Action -->
        <div style="display:flex;gap:8px;margin-top:12px;position:relative;z-index:1;">
          ${canAffordGoal ?
            `<button onclick="requestRedeem('${goal.reward_id}')" class="skatt-redeem-btn" style="flex:1;">
              📨 Fråga om att lösa in
            </button>` :
            `<div style="flex:1;background:rgba(245,166,35,0.1);border-radius:14px;padding:12px;text-align:center;border:1.5px dashed rgba(245,166,35,0.4);">
              <div style="font-size:0.75rem;font-weight:700;color:#B8860B;font-family:'Outfit',sans-serif;">Samla ${starsToGo} ⭐ till! 💪</div>
            </div>`
          }
          ${pendingChangeReq ?
            `<div style="min-height:44px;display:flex;align-items:center;justify-content:center;background:#EDE7F6;border-radius:14px;padding:8px 14px;font-size:0.75rem;font-weight:700;color:#1B2340;white-space:nowrap;">⏳ Väntar på svar</div>` :
            `<button onclick="openGoalPicker()" style="min-height:44px;background:#EDE7F6;border:none;border-radius:14px;padding:8px 14px;font-size:0.75rem;font-weight:700;color:#1B2340;cursor:pointer;white-space:nowrap;transition:background 0.15s;" onmouseover="this.style.background='#DDD6FE'" onmouseout="this.style.background='#EDE7F6'">🔄 Byt mål</button>`
          }
        </div>
      </div>`;
  } else {
    html += `
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:3rem;margin-bottom:12px;animation:skattFloat 3s ease-in-out infinite;display:inline-block;">🎯</div>
        <div style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:#1B2340;margin-bottom:6px;">Välj ett drömtid!</div>
        <div style="font-size:0.82rem;color:#5A6178;margin-bottom:18px;">Vad sparar du stjärnor till?</div>
        <button onclick="openGoalPicker()" class="skatt-redeem-btn" style="width:auto;padding:14px 28px;">
          ✨ Välj mitt mål
        </button>
      </div>`;
  }

  html += `</div></div>`;

  // ══════════════════════════════════════════════════════
  // 3. TROFÉHYLLAN — Trophies
  // ══════════════════════════════════════════════════════
  if (trophies.length > 0) {
    html += `<div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>
        <span class="skatt-section-title" style="color:#c0392b;">Troféhyllan</span>
        <span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#ffeaa7;color:#d4a017;border-radius:50px;padding:2px 10px;">${trophies.length} st</span>
      </div>
      <div class="skatt-section-body">
        <div class="skatt-trophy-grid">`;

    trophies.slice(0, 9).forEach((r, i) => {
      const d = new Date(r.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      html += `<div class="skatt-trophy-item" style="animation-delay:${i * 60}ms;" title="${escHtml(r.reward_name)} · ${dateStr}">
        <span class="skatt-trophy-emoji">${r.reward_icon || '🎁'}</span>
        <span class="skatt-trophy-name">${escHtml(r.reward_name)}</span>
        <span class="skatt-trophy-badge">✅</span>
      </div>`;
    });

    if (trophies.length > 9) {
      html += `<div class="skatt-trophy-item" style="background:linear-gradient(135deg,#f0f0f0,#e8e8e8);">
        <span class="skatt-trophy-emoji" style="font-size:1.2rem;">+${trophies.length - 9}</span>
        <span class="skatt-trophy-name">fler trofeer</span>
      </div>`;
    }

    html += `</div>`;

    // Pending redemptions (inside trophy shelf)
    if (pending.length > 0) {
      html += `<div style="margin-top:14px;border-top:1.5px dashed rgba(0,0,0,0.06);padding-top:12px;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9AA0B8;margin-bottom:8px;font-family:'Outfit',sans-serif;">Väntar på godkännande</div>`;
      for (const r of pending) {
        html += `<div style="display:flex;align-items:center;gap:10px;background:#faf0ff;border:1.5px solid rgba(168,85,247,0.2);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:1.5rem;">${r.reward_icon || '🎁'}</span>
          <div style="flex:1;">
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;">${escHtml(r.reward_name)}</div>
            <div style="font-size:0.7rem;color:#A855F7;">⏳ Föräldern godkänner snart</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    if (deniedRecent.length > 0) {
      html += `<div style="margin-top:14px;border-top:1.5px dashed rgba(0,0,0,0.06);padding-top:12px;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9AA0B8;margin-bottom:8px;font-family:'Outfit',sans-serif;">Inte den här gången</div>`;
      for (const r of deniedRecent) {
        html += `<div style="display:flex;align-items:center;gap:10px;background:#FEF2F2;border:1.5px solid rgba(239,68,68,0.2);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:1.5rem;">${r.reward_icon || '🎁'}</span>
          <div style="flex:1;">
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;">${escHtml(r.reward_name)}</div>
            <div style="font-size:0.7rem;color:#EF4444;">En vuxen sa nej — fråga igen senare 💛</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
  } else {
    // Empty trophy shelf — show placeholder
    html += `<div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055);">🏆</div>
        <span class="skatt-section-title" style="color:#c0392b;">Troféhyllan</span>
      </div>
      <div class="skatt-section-body" style="text-align:center;padding:20px 16px;">
        ${pending.length > 0 ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9AA0B8;margin-bottom:8px;font-family:'Outfit',sans-serif;">Väntar på godkännande</div>
            ${pending.map(r => `<div style="display:flex;align-items:center;gap:10px;background:#faf0ff;border:1.5px solid rgba(168,85,247,0.2);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
              <span style="font-size:1.5rem;">${r.reward_icon || '🎁'}</span>
              <div style="flex:1;text-align:left;">
                <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;">${escHtml(r.reward_name)}</div>
                <div style="font-size:0.7rem;color:#A855F7;">⏳ Föräldern godkänner snart</div>
              </div>
            </div>`).join('')}
          </div>` : ''}
        <div style="font-size:2.5rem;margin-bottom:8px;opacity:0.4;">🏆</div>
        <div style="font-size:0.85rem;color:#9AA0B8;">Lös in en belöning — och vinn din första trofé!</div>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════
  // 4. BELÖNINGSHYLLAN — All Rewards Grid (locked + unlocked)
  // ══════════════════════════════════════════════════════
  html += `<div class="skatt-section">
    <div class="skatt-section-header">
      <div class="skatt-section-icon" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);">🛍️</div>
      <span class="skatt-section-title" style="color:#6c5ce7;">Belöningshyllan</span>
      ${rewards.length > 0 ? `<span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#EDE7F6;color:#6c5ce7;border-radius:50px;padding:2px 10px;">${rewards.length} st</span>` : ''}
    </div>
    <div class="skatt-section-body">`;

  if (rewards.length === 0) {
    html += `<div style="text-align:center;padding:20px 0;">
      <div style="font-size:3rem;margin-bottom:10px;opacity:0.5;">🎁</div>
      <div style="font-family:'Outfit',sans-serif;font-weight:700;color:#1B2340;margin-bottom:4px;">Inga belöningar ännu!</div>
      <div style="font-size:0.82rem;color:#9AA0B8;">Be din förälder lägga till belöningar 🌟</div>
    </div>`;
  } else {
    // Grid: 3 columns on mobile, 4 on wider screens
    html += `<div class="skatt-reward-grid">`;
    for (const r of rewards) {
      const isRedeemed = redemptions.some(rd => rd.reward_id === r.id && (rd.status === 'approved' || rd.status === 'auto'));
      const hasPending = redemptions.some(rd => rd.reward_id === r.id && rd.status === 'pending');
      const canAfford = starBalance >= r.star_cost;
      const isCurrentGoal = goal && goal.reward_id === r.id;
      const pct = Math.min(100, Math.round((starBalance / r.star_cost) * 100));
      const isLocked = !canAfford && !isRedeemed && !hasPending;

      // Determine badge
      let badge = '';
      if (isRedeemed) badge = `<span class="skatt-rg-badge earned">✅</span>`;
      else if (hasPending) badge = `<span class="skatt-rg-badge pending">⏳</span>`;
      else if (isCurrentGoal) badge = `<span class="skatt-rg-badge goal">🎯</span>`;
      else if (isLocked) badge = `<span class="skatt-rg-badge locked">🔒</span>`;

      const cardClass = isRedeemed ? 'earned' : hasPending ? 'pending' : canAfford ? 'affordable' : 'locked';

      html += `<div class="skatt-rg-item ${cardClass}" ${!isLocked && !isRedeemed && !hasPending ? `onclick="requestRedeem('${r.id}')" style="cursor:pointer;"` : ''}>
        ${badge}
        <div class="skatt-rg-icon">${r.icon || '🎁'}</div>
        <div class="skatt-rg-name">${escHtml(r.name)}</div>
        <div class="skatt-rg-cost">⭐ ${r.star_cost}</div>
        ${isLocked ? `<div class="skatt-rg-bar"><div class="skatt-rg-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`;
    }
    html += `</div>`;

    // Affordables CTA strip — full-width redeem buttons for affordable rewards not yet redeemed
    const affordableUnredeemed = rewards.filter(r => {
      const isRedeemed = redemptions.some(rd => rd.reward_id === r.id && (rd.status === 'approved' || rd.status === 'auto'));
      const hasPending = redemptions.some(rd => rd.reward_id === r.id && rd.status === 'pending');
      return starBalance >= r.star_cost && !isRedeemed && !hasPending;
    });
    if (affordableUnredeemed.length > 0) {
      html += `<div style="margin-top:14px;border-top:1.5px dashed rgba(245,166,35,0.3);padding-top:14px;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#B8860B;margin-bottom:8px;font-family:'Outfit',sans-serif;">✨ Du har råd nu!</div>`;
      for (const r of affordableUnredeemed) {
        html += `<div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#FFFBEB,#FFF3D6);border:1.5px solid rgba(245,166,35,0.4);border-radius:14px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:1.5rem;">${r.icon || '🎁'}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:#1B2340;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(r.name)}</div>
            <div style="font-size:0.7rem;color:#B8860B;">⭐ ${r.star_cost} stjärnor</div>
          </div>
          <button onclick="requestRedeem('${r.id}')" class="skatt-redeem-btn" style="min-height:40px;font-size:0.8rem;padding:8px 14px;width:auto;flex-shrink:0;">📨 Fråga</button>
        </div>`;
      }
      html += `</div>`;
    }
  }

  html += `</div></div>`;

  // ══════════════════════════════════════════════════════
  // 5. STJÄRNFRONTEN — Manual Star Grants
  // ══════════════════════════════════════════════════════
  if (grants.length > 0) {
    html += `<div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#00b894,#55efc4);">✨</div>
        <span class="skatt-section-title" style="color:#00864e;">Bonus-stjärnor</span>
      </div>
      <div class="skatt-section-body">`;

    for (const g of grants.slice(0, 8)) {
      const d = new Date(g.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      html += `<div class="skatt-grant-card">
        ${g.image_url ? `<img src="${escHtml(g.image_url)}" alt="" style="width:52px;height:52px;border-radius:14px;object-fit:cover;flex-shrink:0;border:2px solid rgba(34,197,94,0.2);">` :
          `<div style="width:44px;height:44px;min-width:44px;background:rgba(34,197,94,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;border:1.5px solid rgba(34,197,94,0.2);">⭐</div>`
        }
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-family:'Outfit',sans-serif;font-weight:800;font-size:0.9rem;color:#00864e;">+${g.star_count} ⭐</span>
            <span style="font-size:0.68rem;color:#9AA0B8;">${dateStr}</span>
          </div>
          <div style="font-size:0.82rem;color:#1B2340;line-height:1.35;">${escHtml(g.reason)}</div>
          <div style="font-size:0.68rem;color:#9AA0B8;margin-top:4px;">— ${escHtml(g.parent_name || 'Förälder')}</div>
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }

  // ══════════════════════════════════════════════════════
  // 6. HISTORIKBOKEN — Redemption History
  // ══════════════════════════════════════════════════════
  const historyWins = [...trophies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (historyWins.length > 0) {
    html += `<div class="skatt-section" style="margin-bottom:24px;">
      <div class="skatt-section-header">
        <div class="skatt-section-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3);">📖</div>
        <span class="skatt-section-title" style="color:#0652c5;">Historikboken</span>
      </div>
      <div class="skatt-section-body" style="padding-bottom:8px;">`;

    for (const r of historyWins.slice(0, 10)) {
      html += window.ChildDashboardWarmth
        ? window.ChildDashboardWarmth.renderHistoryStoryHtml(r)
        : `<div class="skatt-history-story"><div class="skatt-history-story-text">Du låste upp ${escHtml(r.reward_name)} ${r.reward_icon || '🎁'} 🎉</div></div>`;
    }

    html += `</div></div>`;
  }

  // Done — render to DOM
  const hubMeta = {
    starBalance,
    trophies,
    economyHtml: totalEarned > starBalance
      ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.55);margin-top:12px;font-family:'Plus Jakarta Sans',sans-serif;">Totalt tjänat: ⭐ ${totalEarned}</div>`
      : '',
    childName: me && me.name,
    childEmoji: me && me.emoji,
    avatarUrl: me && me.avatar_url,
  };

  if (!minimalUiActive && childUiMagic && window.ChildSkattHouse) {
    const homeMount = document.getElementById('homeHubMount');
    const homeLoader = document.getElementById('homeHubLoading');
    if (homeMount) {
      ChildSkattHouse.mountHome(homeMount, html, hubMeta).then(function () {
        if (homeLoader) homeLoader.style.display = 'none';
        homeMount.style.display = '';
      });
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
  const banner = document.querySelector('.skatt-banner');
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
    if (window.OfflineQueue && me?.id) {
      OfflineQueue.queueRedeem(me.id, rewardId).catch(() => {});
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
    if (netErr && window.OfflineQueue && me?.id) {
      OfflineQueue.queueRedeem(me.id, rewardId).catch(() => {});
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
  window.playCoinSound = playCoinSound;
  window.coinEntryRipple = coinEntryRipple;
  window.requestRedeem = requestRedeem;
  window.redeemReward = redeemReward;
  window.openGoalPicker = openGoalPicker;
  window.closeGoalPicker = closeGoalPicker;
  window.setGoal = setGoal;
})();
