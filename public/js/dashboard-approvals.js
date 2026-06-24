/**
 * Dashboard give-stars + request panel (Fas 8 F2f).
 * Manual star giving modal + per-child pending approvals (redemptions + goal changes),
 * extracted from dashboard.js. Calls globals (loadDashboardCards, loadStarHistory,
 * showToast, escHtml, apiFetch). Handlers exposed on window for inline onclick.
 */
(function () {
function openGiveStarsModal(childId, childName, childEmoji) {
  document.getElementById('giveStarsChildId').value = childId;
  document.getElementById('giveStarsChildName').textContent = `${childEmoji} ${childName}`;
  document.getElementById('giveStarsCount').value = '5';
  document.getElementById('giveStarsReason').value = '';
  document.getElementById('giveStarsError').classList.add('hidden');
  document.getElementById('giveStarsModal').classList.remove('hidden');
}

async function submitGiveStars() {
  const childId = document.getElementById('giveStarsChildId').value;
  const starCount = parseInt(document.getElementById('giveStarsCount').value, 10);
  const reason = document.getElementById('giveStarsReason').value.trim();
  const errEl = document.getElementById('giveStarsError');

  errEl.classList.add('hidden');
  if (isNaN(starCount) || starCount < 1 || starCount > 100) {
    errEl.textContent = 'Ange 1–100 stjärnor';
    errEl.classList.remove('hidden');
    return;
  }
  if (!reason) {
    errEl.textContent = 'Anledning krävs';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('giveStarsSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Sparar…';

  try {
    const res = await window.apiFetch('/api/rewards/manual-stars', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, star_count: starCount, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Fel';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Ge stjärnor';
      return;
    }
    document.getElementById('giveStarsModal').classList.add('hidden');
    showToast(`⭐ ${starCount} stjärnor givna!`);
    await loadDashboardCards();
    await loadStarHistory();
  } catch (err) {
    errEl.textContent = 'Nätverksfel';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Ge stjärnor';
  }
}


// ── Request Panel (pending approvals for a child) ─────────
async function openRequestPanel(childId, childName) {
  const modal = document.getElementById('requestPanelModal');
  const nameEl = document.getElementById('requestPanelChildName');
  const content = document.getElementById('requestPanelContent');
  nameEl.textContent = childName;
  content.innerHTML = '<p class="text-center text-text-soft py-6">Laddar förfrågningar...</p>';
  modal.classList.remove('hidden');

  try {
    const res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    // Filter to this child
    const childRedemptions = (data.pending_redemptions || []).filter(r => r.child_id === childId);
    const childGoalChanges = (data.pending_goal_changes || []).filter(r => r.child_id === childId);

    if (childRedemptions.length === 0 && childGoalChanges.length === 0) {
      content.innerHTML = '<p class="text-center text-text-soft py-6">Inga väntande förfrågningar! 🎉</p>';
      return;
    }

    let html = '';

    // Goal change requests
    for (const req of childGoalChanges) {
      html += `
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🎯</span>
            <div class="flex-1">
              <div class="font-heading font-bold text-sm text-navy">Vill byta mål</div>
              <div class="text-xs text-text-soft">Till: ${escHtml(req.to_reward_name || '')} ${req.to_reward_icon || ''}</div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button onclick="event.stopPropagation(); approveGoalChange('${req.id}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">✅ Godkänn</button>
            <button onclick="event.stopPropagation(); denyGoalChange('${req.id}')" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">❌ Neka</button>
          </div>
        </div>`;
    }

    // Redemption requests
    for (const req of childRedemptions) {
      html += `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">${req.reward_icon || '🎁'}</span>
            <div class="flex-1">
              <div class="font-heading font-bold text-sm text-navy">Vill lösa in</div>
              <div class="text-xs text-text-soft">${escHtml(req.reward_name || '')} (⭐ ${req.star_cost || 0})</div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button onclick="event.stopPropagation(); approveRedemption('${req.id}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">✅ Godkänn</button>
            <button onclick="event.stopPropagation(); denyRedemption('${req.id}')" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold py-2.5 rounded-xl transition-colors min-h-[44px]">❌ Neka</button>
          </div>
        </div>`;
    }

    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = '<p class="text-center text-red-500 py-6">Kunde inte ladda förfrågningar.</p>';
  }
}

function closeRequestPanel() {
  document.getElementById('requestPanelModal').classList.add('hidden');
}

async function approveGoalChange(requestId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎯 Målbyte godkänt!');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function denyGoalChange(requestId) {
  try {
    const res = await window.apiFetch(`/api/rewards/goal-change-requests/${requestId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Målbyte nekat.');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function approveRedemption(redemptionId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/approve`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('🎉 Inlösen godkänd!');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

async function denyRedemption(redemptionId) {
  try {
    const res = await window.apiFetch(`/api/rewards/redemptions/${redemptionId}/deny`, { method: 'PUT' });
    if (!res.ok) { const e = await res.json(); showToast(e.error || 'Fel', true); return; }
    showToast('Inlösen nekad.');
    closeRequestPanel();
    await loadDashboardCards();
  } catch { showToast('Nätverksfel', true); }
}

  // Exposed on window for inline onclick + cross-file callers
  window.openGiveStarsModal = openGiveStarsModal;
  window.submitGiveStars = submitGiveStars;
  window.openRequestPanel = openRequestPanel;
  window.closeRequestPanel = closeRequestPanel;
  window.approveGoalChange = approveGoalChange;
  window.denyGoalChange = denyGoalChange;
  window.approveRedemption = approveRedemption;
  window.denyRedemption = denyRedemption;
})();
