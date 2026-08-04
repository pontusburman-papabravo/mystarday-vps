// library-substeps.js — Activity sub-steps module for Mitt bibliotek
// Owns: sub-step toggle panel, load/render/reorder sub-steps per activity,
//       sub-step modal (add/edit/delete), sub-step icon picker, badge updates.
// Does NOT own: activity list rendering (library.js), standard library (library-standard.js).

function formatSubStepDurationLabel(seconds) {
  if (!seconds || seconds < 5) return '';
  if (seconds < 60) return seconds + ' s';
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  if (r === 0) return m + ' min';
  return m + ':' + String(r).padStart(2, '0');
}

const SUB_STEP_TIMER_PRESETS = [
  { label: '30 s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
];

let _subStepTimerPresetsBuilt = false;

function buildSubStepTimerPresets() {
  if (_subStepTimerPresetsBuilt) return;
  const container = document.getElementById('subStepTimerPresets');
  if (!container) return;
  container.innerHTML = SUB_STEP_TIMER_PRESETS.map(function (p) {
    return '<button type="button" class="substep-timer-preset-btn px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-lavender hover:border-gold transition-colors" data-seconds="' + p.seconds + '">' + escHtml(p.label) + '</button>';
  }).join('');
  _subStepTimerPresetsBuilt = true;
}

function highlightSubStepTimerPreset(seconds) {
  document.querySelectorAll('.substep-timer-preset-btn').forEach(function (btn) {
    const s = parseInt(btn.dataset.seconds, 10);
    const on = seconds != null && s === seconds;
    btn.classList.toggle('border-gold', on);
    btn.classList.toggle('bg-gold-light', on);
  });
}

function setSubStepDurationSeconds(seconds) {
  const hidden = document.getElementById('subStepDurationSeconds');
  if (hidden) hidden.value = seconds == null ? '' : String(seconds);
  highlightSubStepTimerPreset(seconds);
}

function initSubStepTimerUI(step) {
  buildSubStepTimerPresets();
  const dur = step && step.duration_seconds != null ? step.duration_seconds : null;
  setSubStepDurationSeconds(dur);
}

function getSubStepDurationSecondsFromUI() {
  const hidden = document.getElementById('subStepDurationSeconds');
  const raw = hidden ? hidden.value : '';
  if (raw === '') return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 5 || n > 3600) return undefined;
  return n;
}

function wireSubStepTimerControls() {
  buildSubStepTimerPresets();
  const presets = document.getElementById('subStepTimerPresets');
  if (presets && !presets.dataset.wired) {
    presets.dataset.wired = '1';
    presets.addEventListener('click', function (e) {
      const btn = e.target.closest('.substep-timer-preset-btn');
      if (!btn) return;
      setSubStepDurationSeconds(parseInt(btn.dataset.seconds, 10));
    });
  }
  const clearBtn = document.getElementById('subStepTimerClear');
  if (clearBtn && !clearBtn.dataset.wired) {
    clearBtn.dataset.wired = '1';
    clearBtn.addEventListener('click', function () {
      setSubStepDurationSeconds(null);
    });
  }
}

document.addEventListener('DOMContentLoaded', wireSubStepTimerControls);

// ─── Sub-steps ────────────────────────────────────────────
async function toggleSubSteps(templateId) {
  const panel = document.getElementById(`substeps-panel-${templateId}`);
  const btn = document.getElementById(`substep-btn-${templateId}`);
  if (!panel) return;
  if (openSubStepPanels.has(templateId)) {
    panel.classList.remove('open');
    openSubStepPanels.delete(templateId);
    if (btn) { btn.classList.remove('bg-green-200'); btn.classList.add('bg-mint'); }
  } else {
    panel.classList.add('open');
    openSubStepPanels.add(templateId);
    if (btn) { btn.classList.remove('bg-mint'); btn.classList.add('bg-green-200'); }
    await loadSubSteps(templateId);
  }
  // Note: Do NOT call openSubStepModal() here — that opens the add-form modal,
  // not the sub-step panel. Users click the "+ Lägg till"-button inside the panel.
}

async function loadSubSteps(templateId) {
  const listEl = document.getElementById(`substeps-list-${templateId}`);
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-xs text-text-soft py-1">Laddar…</p>';
  try {
    const res = await window.apiFetch(`/api/activities/${templateId}/sub-steps`);
    if (!res.ok) { listEl.innerHTML = '<p class="text-xs text-red-500">Kunde inte ladda delsteg</p>'; return; }
    const steps = await res.json();
    subStepsCache[templateId] = steps;
    renderSubStepsList(templateId, steps);
  } catch {
    listEl.innerHTML = '<p class="text-xs text-red-500">Fel vid laddning</p>';
  }
}

function renderSubStepsList(templateId, steps) {
  const listEl = document.getElementById(`substeps-list-${templateId}`);
  if (!listEl) return;
  if (steps.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-text-soft italic py-1">Inga delsteg ännu. Lägg till nedan.</p>';
    return;
  }
  listEl.innerHTML = `
    <div class="space-y-1 sortable-substep-list" data-template-id="${templateId}">
      ${steps.map((s, i) => `
        <div class="substep-item bg-white rounded-lg px-2 py-1.5 gap-2" data-substep-id="${s.id}">
          <span class="drag-handle text-text-soft text-xs select-none cursor-grab px-0.5">☰</span>
          <span class="text-sm flex-shrink-0">${s.icon || '▸'}</span>
          <span class="text-xs font-semibold text-navy flex-1" style="word-break:break-word">${i + 1}. ${escHtml(s.name)}${s.duration_seconds ? ' <span class="text-text-soft font-normal">⏱ ' + escHtml(formatSubStepDurationLabel(s.duration_seconds)) + '</span>' : ''}</span>
          <button onclick="openSubStepModal('${templateId}', ${JSON.stringify(s).replace(/'/g, "\\'")})"
            class="text-text-soft hover:text-navy text-xs px-1 py-0.5 rounded transition-colors flex-shrink-0">✏️</button>
          <button onclick="deleteSubStep('${templateId}', '${s.id}', '${escHtml(s.name)}')"
            class="text-text-soft hover:text-red-500 text-xs px-1 py-0.5 rounded transition-colors flex-shrink-0">✕</button>
        </div>
      `).join('')}
    </div>
  `;
  initSubStepDnD(templateId);
}

const _subStepSortables = {};
function initSubStepDnD(templateId) {
  if (_subStepSortables[templateId]) { _subStepSortables[templateId].destroy(); }
  if (typeof Sortable === 'undefined') return;
  const el = document.querySelector(`.sortable-substep-list[data-template-id="${templateId}"]`);
  if (!el) return;
  _subStepSortables[templateId] = new Sortable(el, {
    animation: 150, handle: '.drag-handle', draggable: '[data-substep-id]',
    ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', forceFallback: true,
    onEnd: async function() {
      const items = Array.from(el.querySelectorAll('[data-substep-id]'));
      const order = items.map((item, i) => ({ id: item.dataset.substepId, sort_order: i }));
      try {
        const res = await window.apiFetch(`/api/activities/${templateId}/sub-steps/reorder`, {
          method: 'PUT', body: JSON.stringify({ order }),
        });
        if (!res.ok) showToast('Kunde inte spara ordning', true);
        else {
          subStepsCache[templateId] = subStepsCache[templateId]
            ? order.map(o => subStepsCache[templateId].find(s => s.id === o.id)).filter(Boolean)
            : [];
        }
      } catch { showToast('Kunde inte spara ordning', true); }
    },
  });
}

function buildSubStepIconPicker() {
  const container = document.getElementById('subStepIconPicker');
  if (!container) return;
  container.innerHTML = ICONS.map(icon => `
    <button type="button" class="substep-icon-opt text-xl rounded-lg hover:bg-white border-2 border-transparent hover:border-gold transition-all w-9 h-9 flex items-center justify-center" onclick="selectSubStepIcon('${icon}')">${icon}</button>
  `).join('');
}

function selectSubStepIcon(icon) {
  document.getElementById('subStepIcon').value = icon;
  document.getElementById('subStepIconDisplay').textContent = icon;
  document.querySelectorAll('.substep-icon-opt').forEach(btn => {
    btn.classList.toggle('border-gold', btn.textContent.trim() === icon);
    btn.classList.toggle('bg-white', btn.textContent.trim() === icon);
  });
}

function clearSubStepIcon() {
  document.getElementById('subStepIcon').value = '';
  document.getElementById('subStepIconDisplay').textContent = '❓';
  document.querySelectorAll('.substep-icon-opt').forEach(btn => {
    btn.classList.remove('border-gold', 'bg-white');
  });
}

function openSubStepModal(templateId, step) {
  document.getElementById('subStepTemplateId').value = templateId;
  document.getElementById('subStepId').value = step ? step.id : '';
  document.getElementById('subStepName').value = step ? step.name : '';
  const icon = step && step.icon ? step.icon : '';
  document.getElementById('subStepIcon').value = icon;
  document.getElementById('subStepIconDisplay').textContent = icon || '❓';
  document.getElementById('subStepModalTitle').textContent = step ? 'Redigera delsteg' : 'Lägg till delsteg';
  document.getElementById('subStepError').classList.add('hidden');
  initSubStepTimerUI(step);
  buildSubStepIconPicker();
  if (icon) {
    setTimeout(() => {
      document.querySelectorAll('.substep-icon-opt').forEach(btn => {
        btn.classList.toggle('border-gold', btn.textContent.trim() === icon);
        btn.classList.toggle('bg-white', btn.textContent.trim() === icon);
      });
    }, 50);
  }
  document.getElementById('subStepModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('subStepName').focus(), 100);
}

function closeSubStepModal() {
  document.getElementById('subStepModal').classList.add('hidden');
}

async function submitSubStep(e) {
  e.preventDefault();
  const templateId = document.getElementById('subStepTemplateId').value;
  const stepId = document.getElementById('subStepId').value;
  const name = document.getElementById('subStepName').value.trim();
  const icon = document.getElementById('subStepIcon').value || null;
  const duration_seconds = getSubStepDurationSecondsFromUI();
  const btn = document.getElementById('subStepSubmitBtn');
  const errEl = document.getElementById('subStepError');
  errEl.classList.add('hidden');
  if (duration_seconds === undefined) {
    errEl.textContent = 'Timern måste vara mellan 5 sekunder och 60 minuter, eller ingen timer.';
    errEl.classList.remove('hidden');
    return;
  }
  btn.disabled = true; btn.textContent = 'Sparar…';
  const url = stepId
    ? `/api/activities/${templateId}/sub-steps/${stepId}`
    : `/api/activities/${templateId}/sub-steps`;
  const method = stepId ? 'PUT' : 'POST';
  const body = { name, icon };
  if (duration_seconds !== undefined) body.duration_seconds = duration_seconds;
  const res = await window.apiFetch(url, { method, body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    closeSubStepModal();
    showToast('Delsteget har sparats');
    await loadSubSteps(templateId);
    const steps = subStepsCache[templateId] || [];
    updateSubStepBadge(templateId, steps.length);
  } else {
    errEl.textContent = data.error || 'Fel uppstod'; errEl.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Spara';
}

function updateSubStepBadge(templateId, count) {
  const itemEl = document.querySelector(`[data-id="${templateId}"]`);
  if (!itemEl) return;
  let badge = itemEl.querySelector('.substep-count-badge');
  if (!badge) {
    const nameRow = itemEl.querySelector('.flex.items-center.gap-1\\.5');
    if (nameRow) {
      badge = document.createElement('span');
      badge.className = 'substep-count-badge text-xs bg-mint text-green-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0';
      nameRow.appendChild(badge);
    }
  }
  if (badge) badge.textContent = `${count} steg`;
}

async function deleteSubStep(templateId, stepId, name) {
  openConfirmModal(`Ta bort delsteget "${name}"?`, async () => {
    const res = await window.apiFetch(
      `/api/activities/${templateId}/sub-steps/${stepId}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (res.ok) {
      showToast('Delsteget har tagits bort');
      await loadSubSteps(templateId);
      const steps = subStepsCache[templateId] || [];
      updateSubStepBadge(templateId, steps.length);
    } else {
      showToast(data.error || 'Kunde inte ta bort delsteget', true);
    }
  });
}

window.toggleSubSteps = toggleSubSteps;
window.selectSubStepIcon = selectSubStepIcon;
window.clearSubStepIcon = clearSubStepIcon;
window.openSubStepModal = openSubStepModal;
window.submitSubStep = submitSubStep;
window.deleteSubStep = deleteSubStep;
