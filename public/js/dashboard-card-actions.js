/**
 * Dashboard card actions + quick header buttons (Fas 8 F2i).
 * Inline redemption/goal-change approvals on child cards, pause/ledig-dag toggles,
 * quick give-stars picker, and parent check-off — extracted from dashboard.js.
 * Calls globals (loadDashboardCards, openGiveStarsModal, showToast, escHtml, apiFetch,
 * dashboardStats, children). Handlers exposed on window for inline onclick.
 */
(function () {
function pt(key, params) {
  return window.pt ? window.pt(key, params) : key;
}

async function toggleInlineRedemption(childId, childName) {
  const panel = document.getElementById(`inline-redemption-${childId}`);
  if (!panel) return;

  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = `<div class="dash-inline-redemption mt-2"><p class="text-center text-xs text-text-soft py-2">Laddar förfrågningar...</p></div>`;
  panel.classList.remove('hidden');

  try {
    const res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    const childRedemptions = (data.pending_redemptions || []).filter(r => r.child_id === childId);
    const childGoalChanges = (data.pending_goal_changes || []).filter(r => r.child_id === childId);

    if (childRedemptions.length === 0 && childGoalChanges.length === 0) {
      panel.innerHTML = `<div class="dash-inline-redemption mt-2 text-center text-xs text-text-soft py-2">Inga väntande förfrågningar 🎉</div>`;
      return;
    }

    let html = '<div class="dash-inline-redemption mt-2 space-y-2">';
    for (const req of childGoalChanges) {
      html += `<div class="flex items-center gap-2">
        <span class="flex-1 text-xs font-semibold text-navy">🎯 Vill byta mål till ${escHtml(req.to_reward_name || '')} ${req.to_reward_icon || ''}</span>
        <button onclick="event.stopPropagation(); inlineApproveGoalChange('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">✅</button>
        <button onclick="event.stopPropagation(); inlineDenyGoalChange('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors">❌</button>
      </div>`;
    }
    for (const req of childRedemptions) {
      html += `<div class="flex items-center gap-2">
        <span class="flex-1 text-xs font-semibold text-navy">🎁 ${escHtml(req.reward_name || '')} (⭐ ${req.star_cost || 0})</span>
        <button onclick="event.stopPropagation(); inlineApproveRedemption('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">✅</button>
        <button onclick="event.stopPropagation(); inlineDenyRedemption('${req.id}', '${childId}')" class="min-h-[36px] px-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors">❌</button>
      </div>`;
    }
    html += '</div>';
    panel.innerHTML = html;
  } catch (err) {
    panel.innerHTML = `<div class="dash-inline-redemption mt-2 text-center text-xs text-red-500 py-2">Kunde inte ladda förfrågningar.</div>`;
  }
}

async function inlineApproveGoalChange(requestId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎯 Målbyte godkänt!');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function inlineDenyGoalChange(requestId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Målbyte nekat.');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function inlineApproveRedemption(redemptionId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎉 Inlösen godkänd!');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function inlineDenyRedemption(redemptionId, childId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Inlösen nekad.');
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

// ── Pause / unpause today ────────────────────────────────
async function togglePauseDay(childId, logId, currentlyPaused) {
  if (!logId) { showToast('Inget schema genererat för idag', true); return; }
  const action = currentlyPaused ? 'unpause' : 'pause';
  try {
    const res = await window.apiFetch(`/api/daily-logs/${logId}/${action}`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast(currentlyPaused ? 'Dagen återupptagen!' : 'Dagen pausad!');
    await loadDashboardCards();
  } catch (err) {
    showToast('Nätverksfel', true);
  }
}

// ── Ge extra stjärnor quick button (header) ───────────────
// If 1 child → open giveStarsModal directly.
// If multiple → show child picker first.
function openGiveStarsQuick() {
  const ch = dashboardStats?.children || children || [];
  if (ch.length === 0) { showToast('Inga barn hittade', true); return; }
  if (ch.length === 1) {
    const c = ch[0];
    openGiveStarsModal(c.id, c.name, c.emoji || '⭐');
    return;
  }
  // Render picker list
  const list = document.getElementById('giveStarsPickerList');
  list.innerHTML = ch.map(c => `
    <button onclick="document.getElementById('giveStarsPickerModal').classList.add('hidden'); openGiveStarsModal('${c.id}', '${escHtml(c.name)}', '${c.emoji || '⭐'}')"
      class="flex items-center gap-3 p-3 rounded-xl border-2 border-lavender hover:border-gold hover:bg-gold-light text-left transition-all w-full">
      <span class="text-2xl">${c.emoji || '⭐'}</span>
      <span class="font-semibold text-navy">${escHtml(c.name)}</span>
    </button>`).join('');
  document.getElementById('giveStarsPickerModal').classList.remove('hidden');
}

// ── Ledig dag quick button (header) ───────────────────────
// Shows each child with their current pause state; click to toggle.
async function openLedigDagModal() {
  const ch = dashboardStats?.children || children || [];
  if (ch.length === 0) { showToast(pt('home.dayOffModal.noChildren'), true); return; }

  const list = document.getElementById('ledigDagList');
  list.innerHTML = ch.map(c => {
    const isPaused = c.today_is_paused || false;
    const logId = c.today_log_id || '';
    const stateLabel = isPaused ? pt('home.dayOffModal.pausedToday') : pt('home.dayOffModal.activeSchedule');
    const stateCls = isPaused
      ? 'border-red-200 bg-red-50 text-red-700 ledig-dag-row-paused'
      : 'border-lavender bg-white text-navy ledig-dag-row-active';
    const btnLabel = isPaused ? pt('home.dayOffModal.resumeSchedule') : pt('home.dayOffModal.markDayOff');
    const btnCls = isPaused
      ? 'bg-green-500 hover:bg-green-600 text-white'
      : 'bg-coral hover:bg-red-200 text-red-800 border-red-200';
    const noLogTitle = escHtml(pt('home.dayOffModal.noLogTitle'));
    const disabled = !logId ? `disabled title="${noLogTitle}"` : '';
    return `
      <div class="p-3 rounded-xl border-2 ${stateCls}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${c.emoji || '⭐'}</span>
            <div>
              <div class="font-semibold text-sm">${escHtml(c.name)}</div>
              <div class="text-xs text-text-soft ledig-dag-state">${stateLabel}</div>
            </div>
          </div>
          <button ${disabled}
            onclick="ledigDagToggle('${c.id}', '${logId}', ${isPaused})"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${btnCls} ${!logId ? 'opacity-40 cursor-not-allowed' : ''}">
            ${btnLabel}
          </button>
        </div>
      </div>`;
  }).join('');

  const modal = document.getElementById('ledigDagModal');
  if (window.I18n && typeof I18n.apply === 'function') {
    I18n.apply(modal);
  }
  modal.classList.remove('hidden');
}

async function ledigDagToggle(childId, logId, currentlyPaused) {
  if (!logId) { showToast(pt('home.dayOffModal.noLogTitle'), true); return; }
  const action = currentlyPaused ? 'unpause' : 'pause';
  try {
    const res = await window.apiFetch(`/api/daily-logs/${logId}/${action}`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || pt('home.dayOffModal.errorGeneric'), true); return; }
    showToast(currentlyPaused ? pt('home.dayOffModal.successResumed') : pt('home.dayOffModal.successPaused'));
    await loadDashboardCards();
    document.getElementById('ledigDagModal').classList.add('hidden');
  } catch (err) {
    showToast(pt('home.dayOffModal.networkError'), true);
  }
}

// ── Parent checkoff from dashboard panel ─────────────────
async function dashToggleActivity(itemId, childId, currentlyCompleted) {
  const action = currentlyCompleted ? 'uncomplete' : 'complete';
  // Optimistic UI: update check button immediately
  const btn = document.querySelector(`.dash-activity-check[onclick*="${itemId}"]`);
  if (btn) {
    btn.classList.add('checking');
    btn.disabled = true;
  }
  try {
    const res = await window.apiFetch(`/api/daily-log-items/${itemId}/${action}`, { method: 'PUT' });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      showToast(e.error || 'Fel vid uppdatering', true);
      if (btn) { btn.classList.remove('checking'); btn.disabled = false; }
      return;
    }
    if (action === 'complete' && window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
      const body = await res.clone().json().catch(() => ({}));
      MetaAppEvents.handleServerMilestones(body && body.meta_milestones);
    }
    // Refresh dashboard cards to get updated state
    await loadDashboardCards();
    showToast(currentlyCompleted ? 'Avmarkerad!' : '✅ Klar!');
  } catch (err) {
    showToast('Nätverksfel', true);
    if (btn) { btn.classList.remove('checking'); btn.disabled = false; }
  }
}

  // Exposed on window for inline onclick + cross-file callers
  window.toggleInlineRedemption = toggleInlineRedemption;
  window.inlineApproveGoalChange = inlineApproveGoalChange;
  window.inlineDenyGoalChange = inlineDenyGoalChange;
  window.inlineApproveRedemption = inlineApproveRedemption;
  window.inlineDenyRedemption = inlineDenyRedemption;
  window.togglePauseDay = togglePauseDay;
  window.openGiveStarsQuick = openGiveStarsQuick;
  window.openLedigDagModal = openLedigDagModal;
  window.ledigDagToggle = ledigDagToggle;
  window.dashToggleActivity = dashToggleActivity;
})();
