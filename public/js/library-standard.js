// library-standard.js — Standard library tab for Mitt bibliotek
// Owns: standard library tab load/render (activities + rewards + schedules),
//       copy standard activities/rewards to family library,
//       reward multi-select and batch copy.
// Does NOT own: activity/reward search UI in own-library tabs (library.js),
//               schema children/copy dialogs (library-schema.js).

// ─── Standard Library ─────────────────────────────────────
let _standardLoaded = false;
let standardActivities = [];
let standardDefaultRewards = [];
let selectedRewardIds = new Set();

async function loadStandardLibrary() {
  const container = document.getElementById('standardLibraryContainer');
  try {
    const [templatesRes, rewardsRes, schedulesRes] = await Promise.all([
      window.apiFetch('/api/standard-library'),
      window.apiFetch('/api/standard-library/rewards'),
      window.apiFetch('/api/standard-library/schedules'),
    ]);
    if (!templatesRes.ok) { container.innerHTML = '<p class="text-red-500 col-span-full text-center py-8">Kunde inte ladda standardbiblioteket</p>'; return; }
    standardActivities = await templatesRes.json();
    if (rewardsRes.ok) {
      standardDefaultRewards = await rewardsRes.json();
    }
    if (schedulesRes.ok) {
      standardSchedules = await schedulesRes.json();
    }
    _standardLoaded = true;
    renderStandardLibrary();
    renderStandardRewards();
    renderStdSchedulesInStdTab();
    switchStdSubTab('schedules');  // Default sub-tab
    if (window.LibraryMagicSchedules) LibraryMagicSchedules.refresh();
  } catch {
    container.innerHTML = '<p class="text-red-500 col-span-full text-center py-8">Något gick fel</p>';
  }
}

function renderStdSchedulesInStdTab() {
  const container = document.getElementById('stdSchedulesContainer');
  if (!container) return;
  if (standardSchedules.length === 0) {
    container.innerHTML = '<p class="text-text-soft text-center py-6 col-span-full">Inga standardscheman tillgängliga.</p>';
    return;
  }

  const sectionLabels = { morgon: '🌅 Morgon', dag: '☀️ Dag', kvall: '🌙 Kväll' };

  container.innerHTML = standardSchedules.map(s => {
    const bySection = {};
    for (const item of (s.items || [])) {
      const sec = item.section || 'dag';
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(item);
    }

    const sectionsHtml = Object.entries(bySection).map(([sec, items]) => `
      <div class="mb-2">
        <div class="text-xs font-semibold text-text-soft mb-1">${sectionLabels[sec] || sec}</div>
        <div class="space-y-0.5">
          ${items.map(i => renderStdScheduleItem(i, 'std-' + s.id)).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div class="bg-white rounded-2xl border-2 border-lavender hover:border-gold transition-colors overflow-hidden fade-in">
        <div class="bg-sky/60 px-4 py-3 border-b border-lavender">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${s.icon || '📋'}</span>
            <div>
              <h4 class="font-heading font-bold text-navy">${escHtml(s.name)}</h4>
              <p class="text-xs text-text-soft">${escHtml(s.description || '')}</p>
            </div>
          </div>
          <div class="text-xs text-text-soft mt-1">${(s.items || []).length} aktiviteter</div>
        </div>
        <div class="px-4 py-3 max-h-72 overflow-y-auto">
          ${sectionsHtml}
        </div>
        <div class="px-4 py-3 border-t border-lavender bg-sky/30 space-y-2">
          <button onclick="openScheduleCopyDialog('${s.id}', '${escHtml(s.name)}')"
            class="w-full px-4 py-2.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
            📥 Kopiera till barn
          </button>
          ${_libIsAdmin ? `<a href="/admin#lib-schedules" target="_blank"
            class="block w-full px-4 py-2 bg-navy/10 hover:bg-navy/20 text-navy rounded-xl font-semibold text-xs transition-colors text-center">
            ✏️ Redigera i admin
          </a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderStandardLibrary() {
  const container = document.getElementById('standardLibraryContainer');
  if (!standardActivities || standardActivities.length === 0) {
    container.innerHTML = '<p class="text-text-soft col-span-full text-center py-8">Inga standardaktiviteter tillgängliga.</p>';
    return;
  }

  // Flat list — each activity has its own copy button
  const notCopied = standardActivities.filter(a => !a.already_copied);
  const copied = standardActivities.filter(a => a.already_copied);

  let html = '';

  // "Copy all" button at top if there are uncopied activities
  if (notCopied.length > 0) {
    html += `
      <div class="col-span-full mb-2">
        <button id="copy-all-std-btn" onclick="copyAllStandardActivities()"
          class="px-5 py-2.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm">
          📥 Kopiera alla (${notCopied.length} st)
        </button>
      </div>
    `;
  }

  // Render each activity as a row
  html += '<div class="col-span-full space-y-1">';
  html += standardActivities.map(a => {
    const subStepsBadge = (a.sub_steps && a.sub_steps.length > 0)
      ? `<span class="text-xs text-text-soft">(${a.sub_steps.length} delsteg)</span>`
      : '';

    if (a.already_copied) {
      return `
        <div class="flex items-center gap-2 bg-mint/30 rounded-xl px-3 py-2 border border-green-100">
          <span class="text-lg">${a.icon || '📌'}</span>
          <span class="flex-1 text-sm font-medium text-navy">${escHtml(a.name)} ${subStepsBadge}</span>
          <span class="text-xs text-text-soft">${'⭐'.repeat(a.star_value)}</span>
          <span class="text-xs text-green-600 font-semibold whitespace-nowrap">✓ Kopierad</span>
        </div>
      `;
    }

    return `
      <div class="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 hover:border-gold transition-colors">
        <span class="text-lg">${a.icon || '📌'}</span>
        <span class="flex-1 text-sm font-medium text-navy">${escHtml(a.name)} ${subStepsBadge}</span>
        <span class="text-xs text-text-soft">${'⭐'.repeat(a.star_value)}</span>
        <button onclick="copyStandardActivity('${a.id}', this)"
          class="px-3 py-1.5 bg-gold hover:bg-yellow-500 text-white rounded-lg font-semibold text-xs transition-colors whitespace-nowrap">
          📥 Kopiera
        </button>
      </div>
    `;
  }).join('');
  html += '</div>';

  container.innerHTML = html;
}

async function copyStandardActivity(activityId, btn) {
  if (!btn) return;
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const res = await window.apiFetch(`/api/standard-library/activities/${activityId}/copy`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Aktiviteten har kopierats!');
      await Promise.all([loadStandardLibrary(), loadActivities()]);
    } else {
      showToast(data.error || 'Kunde inte kopiera', true);
      btn.disabled = false;
      btn.textContent = origText;
    }
  } catch {
    showToast('Något gick fel vid kopiering', true);
    btn.disabled = false;
    btn.textContent = origText;
  }
}

async function copyAllStandardActivities() {
  const btn = document.getElementById('copy-all-std-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Kopierar…';
  const ids = standardActivities.filter(a => !a.already_copied).map(a => a.id);
  try {
    const res = await window.apiFetch('/api/standard-library/activities/copy-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Aktiviteterna har kopierats!');
      await Promise.all([loadStandardLibrary(), loadActivities()]);
    } else {
      showToast(data.error || 'Kunde inte kopiera', true);
      btn.disabled = false;
      btn.textContent = `📥 Kopiera alla (${ids.length} st)`;
    }
  } catch {
    showToast('Något gick fel vid kopiering', true);
    btn.disabled = false;
    btn.textContent = `📥 Kopiera alla (${ids.length} st)`;
  }
}

function renderStandardRewards() {
  const container = document.getElementById('standardRewardsContainer');
  if (!container) return;
  if (standardDefaultRewards.length === 0) {
    container.innerHTML = '<p class="text-text-soft text-center py-6">Inga standardbelöningar tillgängliga.</p>';
    return;
  }
  container.innerHTML = standardDefaultRewards.map(r => {
    const isCopied = r.already_copied;
    const isSelected = selectedRewardIds.has(r.id);
    if (isCopied) {
      // Already copied — show green checkmark, no checkbox
      return `
        <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 gap-3 fade-in opacity-70">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="text-2xl flex-shrink-0">${r.icon || '🏆'}</span>
            <div class="min-w-0 flex-1">
              <span class="font-semibold text-sm text-navy">${escHtml(r.name)}</span>
              <div class="text-xs text-text-soft mt-0.5">${r.star_cost} ⭐</div>
            </div>
          </div>
          <span class="flex items-center gap-1 text-xs text-green-600 font-semibold whitespace-nowrap flex-shrink-0"><span>✓</span> Kopierad</span>
        </div>
      `;
    }
    // Not yet copied — show checkbox for multi-select
    return `
      <label class="checkbox-touch flex items-center justify-between bg-white rounded-xl px-4 py-3 gap-3 fade-in cursor-pointer hover:bg-sky/40 transition-colors ${isSelected ? 'ring-2 ring-gold bg-gold-light' : 'border border-lavender'}">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <input type="checkbox" class="standard-reward-checkbox w-11 h-11 cursor-pointer accent-gold flex-shrink-0 rounded"
            data-reward-id="${r.id}"
            ${isSelected ? 'checked' : ''}
            onchange="toggleRewardSelection('${r.id}', this.checked)">
          <span class="text-2xl flex-shrink-0">${r.icon || '🏆'}</span>
          <div class="min-w-0 flex-1">
            <span class="font-semibold text-sm text-navy">${escHtml(r.name)}</span>
            <div class="text-xs text-text-soft mt-0.5">${r.star_cost} ⭐</div>
          </div>
        </div>
      </label>
    `;
  }).join('');
  updateCopySelectedBtn();
}

function toggleRewardSelection(id, checked) {
  if (checked) selectedRewardIds.add(id);
  else selectedRewardIds.delete(id);
  updateCopySelectedBtn();
  // Update visual ring on the parent label
  const checkbox = document.querySelector(`input[data-reward-id="${id}"]`);
  if (checkbox) {
    const label = checkbox.closest('label');
    if (label) {
      label.classList.toggle('ring-2', checked);
      label.classList.toggle('ring-gold', checked);
      label.classList.toggle('bg-gold-light', checked);
      label.classList.toggle('border-lavender', !checked);
      label.classList.toggle('border', !checked);
    }
  }
}

function updateCopySelectedBtn() {
  const btn = document.getElementById('copySelectedRewardsBtn');
  const countEl = document.getElementById('selectedRewardsCount');
  if (!btn || !countEl) return;
  const count = selectedRewardIds.size;
  countEl.textContent = count;
  if (count > 0) btn.classList.remove('hidden');
  else btn.classList.add('hidden');
}

async function copySelectedRewards() {
  const ids = Array.from(selectedRewardIds);
  if (ids.length === 0) return;
  const btn = document.getElementById('copySelectedRewardsBtn');
  btn.disabled = true;
  btn.textContent = 'Kopierar…';
  try {
    const res = await window.apiFetch('/api/standard-library/rewards/copy-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || `${ids.length} belöningar kopierade!`);
      selectedRewardIds.clear();
      // Reload standard rewards (to update copy state) and personal rewards
      const rewardsRes = await window.apiFetch('/api/standard-library/rewards');
      if (rewardsRes.ok) standardDefaultRewards = await rewardsRes.json();
      renderStandardRewards();
      await loadRewards();
    } else {
      showToast(data.error || 'Kunde inte kopiera belöningarna', true);
    }
  } catch {
    showToast('Något gick fel vid kopiering', true);
  } finally {
    btn.disabled = false;
    updateCopySelectedBtn();
  }
}

async function copyDefaultReward(rewardId) {
  const btn = document.getElementById(`copy-reward-btn-${rewardId}`);
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Kopierar…';
  try {
    const res = await window.apiFetch(`/api/standard-library/rewards/${rewardId}/copy`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Belöningen har kopierats!');
      // Reload both standard rewards (to update copy state) and personal rewards
      const rewardsRes = await window.apiFetch('/api/standard-library/rewards');
      if (rewardsRes.ok) standardDefaultRewards = await rewardsRes.json();
      renderStandardRewards();
      await loadRewards();
    } else {
      showToast(data.error || 'Kunde inte kopiera belöningen', true);
      btn.disabled = false;
      btn.textContent = '📥 Kopiera';
    }
  } catch {
    showToast('Något gick fel vid kopiering', true);
    btn.disabled = false;
    btn.textContent = '📥 Kopiera';
  }
}
