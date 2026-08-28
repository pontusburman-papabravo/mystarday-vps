/**
 * Specialperiod (Lovperiod) management — /schedule Specialdagar view, Phase 2.
 *
 * Real first-class period CRUD by period id against the canonical
 * GET/POST/PATCH/DELETE /api/children/:childId/schedule-periods[/:periodId]
 * (src/lib/schedule-period.js). The parent never re-enters dates to find/edit/delete an
 * existing period — every period card in the list carries its id, and edit/delete always
 * operate on that id.
 *
 * The legacy POST /api/children/:childId/schedules/apply-date-range route is retained,
 * unmodified, for backend compatibility (other callers, e.g. assign-schedule.html and
 * library-schema.js's period toggle) — this UI never calls it.
 */
(function () {

function spt(key, params) {
  return window.ScheduleI18n ? ScheduleI18n.t(key, params) : (window.pt ? window.pt(key, params) : key);
}

const MODES = ['merge', 'replace_sections', 'replace_day'];
let periodSchemasLoaded = false;
let standardSchedules = [];
let familyTemplates = [];
let editingPeriodId = null; // null = create mode
let currentMode = 'merge';

function escHtml(s) {
  if (typeof window.escHtml === 'function') return window.escHtml(s);
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function formatDateInputValue(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultPeriodDates() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: formatDateInputValue(start), end: formatDateInputValue(end) };
}

async function loadPeriodSchemas() {
  if (periodSchemasLoaded) return;
  try {
    const [schedulesRes, templatesRes] = await Promise.all([
      window.apiFetch('/api/standard-library/schedules'),
      window.apiFetch('/api/schedule-templates'),
    ]);
    if (schedulesRes.ok) {
      const data = await schedulesRes.json();
      if (Array.isArray(data)) standardSchedules = data;
    }
    if (templatesRes.ok) {
      const data = await templatesRes.json();
      if (Array.isArray(data)) familyTemplates = data;
    }
    periodSchemasLoaded = true;
  } catch (err) {
    console.error('[SCHEDULE-PERIOD] load failed:', err);
  }
}

function renderPeriodSchemaOptions(selectedValue) {
  const sel = document.getElementById('schedulePeriodSchema');
  if (!sel) return;

  let html = '<option value="">' + spt('schedule.period.pickSchedule') + '</option>';
  if (standardSchedules.length) {
    html += '<optgroup label="' + escHtml(spt('schedule.period.readyMade')) + '">';
    for (const s of standardSchedules) {
      html += `<option value="std:${s.id}">${escHtml(s.icon || '📋')} ${escHtml(s.name)}</option>`;
    }
    html += '</optgroup>';
  }
  if (familyTemplates.length) {
    html += '<optgroup label="' + escHtml(spt('schedule.period.mySchedules')) + '">';
    for (const t of familyTemplates) {
      html += `<option value="fam:${t.id}">${escHtml(t.icon || '📋')} ${escHtml(t.name)}</option>`;
    }
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  if (selectedValue) sel.value = selectedValue;
}

function setSchedulePeriodMode(mode) {
  currentMode = MODES.includes(mode) ? mode : 'merge';
  document.querySelectorAll('[data-period-mode]').forEach((btn) => {
    const selected = btn.getAttribute('data-period-mode') === currentMode;
    btn.classList.toggle('border-gold', selected);
    btn.classList.toggle('bg-gold-light', selected);
    btn.classList.toggle('border-lavender', !selected);
    const check = btn.querySelector('.mode-check');
    if (check) check.textContent = selected ? '✓' : '○';
    btn.setAttribute('aria-checked', selected ? 'true' : 'false');
  });
}

/**
 * §18 — open the SAME modal in either mode. `periodId` omitted = create; provided = edit,
 * loaded fresh by id via GET .../schedule-periods/:periodId (never by re-entered dates).
 */
async function openSchedulePeriodModal(periodId) {
  if (!currentChildId) {
    showToast(spt('schedule.insert.pickChild'), true);
    return;
  }

  editingPeriodId = periodId || null;
  await loadPeriodSchemas();

  const errEl = document.getElementById('schedulePeriodError');
  if (errEl) errEl.classList.add('hidden');
  const titleEl = document.getElementById('schedulePeriodModalTitle');
  const removeBtn = document.getElementById('schedulePeriodRemoveBtn');
  const nameEl = document.getElementById('schedulePeriodName');
  const startEl = document.getElementById('schedulePeriodStart');
  const endEl = document.getElementById('schedulePeriodEnd');

  if (editingPeriodId) {
    if (titleEl) titleEl.textContent = spt('schedule.period.editTitle');
    if (removeBtn) removeBtn.classList.remove('hidden');
    try {
      const res = await window.apiFetch(`/api/children/${currentChildId}/schedule-periods/${editingPeriodId}`);
      if (!res.ok) throw new Error(spt('schedule.period.couldNotRead'));
      const period = await res.json();
      renderPeriodSchemaOptions(period.source_type === 'standard_schedule' ? `std:${period.source_id}` : `fam:${period.source_id}`);
      if (nameEl) nameEl.value = period.name;
      if (startEl) startEl.value = period.start_date;
      if (endEl) endEl.value = period.end_date;
      setSchedulePeriodMode(period.apply_mode);
    } catch (err) {
      showToast(err.message || spt('schedule.validation.generic'), true);
      editingPeriodId = null;
      return;
    }
  } else {
    if (titleEl) titleEl.textContent = spt('schedule.period.modalTitle');
    if (removeBtn) removeBtn.classList.add('hidden');
    renderPeriodSchemaOptions();
    const defaults = defaultPeriodDates();
    if (nameEl) nameEl.value = '';
    if (startEl) startEl.value = defaults.start;
    if (endEl) endEl.value = defaults.end;
    setSchedulePeriodMode('merge');
  }

  document.getElementById('schedulePeriodModal')?.classList.remove('hidden');
}

function closeSchedulePeriodModal() {
  document.getElementById('schedulePeriodModal')?.classList.add('hidden');
  editingPeriodId = null;
}

function parseSchemaSelection(value) {
  if (!value || !value.includes(':')) return null;
  const [type, id] = value.split(':');
  if (type === 'std') return { type: 'standard_schedule', id };
  if (type === 'fam') return { type: 'family_template', id };
  return null;
}

/** §17/§18 — one submit handler for both create (POST) and edit (PATCH by id). */
async function submitSchedulePeriod() {
  if (!currentChildId) return;

  const name = document.getElementById('schedulePeriodName')?.value?.trim();
  const start = document.getElementById('schedulePeriodStart')?.value;
  const end = document.getElementById('schedulePeriodEnd')?.value;
  const schemaValue = document.getElementById('schedulePeriodSchema')?.value;
  const errEl = document.getElementById('schedulePeriodError');
  const btn = document.getElementById('schedulePeriodApplyBtn');

  if (errEl) errEl.classList.add('hidden');

  if (!name) {
    if (errEl) { errEl.textContent = spt('schedule.period.nameRequired'); errEl.classList.remove('hidden'); }
    return;
  }
  if (!start || !end) {
    if (errEl) { errEl.textContent = spt('schedule.period.pickDates'); errEl.classList.remove('hidden'); }
    return;
  }
  if (end < start) {
    if (errEl) { errEl.textContent = spt('schedule.period.endBeforeStart'); errEl.classList.remove('hidden'); }
    return;
  }
  const source = parseSchemaSelection(schemaValue);
  if (!source) {
    if (errEl) { errEl.textContent = spt('schedule.period.pickSchema'); errEl.classList.remove('hidden'); }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = spt('schedule.period.saving'); }

  try {
    const body = {
      name, start_date: start, end_date: end, source, apply_mode: currentMode,
      operation_id: window.ScheduleApplyClient ? ScheduleApplyClient.newOperationId() : null,
    };

    const url = editingPeriodId
      ? `/api/children/${currentChildId}/schedule-periods/${editingPeriodId}`
      : `/api/children/${currentChildId}/schedule-periods`;
    const method = editingPeriodId ? 'PATCH' : 'POST';

    const res = await window.apiFetch(url, { method, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || spt('schedule.period.saveFailed'));

    showToast(editingPeriodId ? spt('schedule.period.updatedToast') : spt('schedule.period.savedToast', { start, end }));
    closeSchedulePeriodModal();

    if (typeof window.renderSpecialDaysCalendar === 'function') await window.renderSpecialDaysCalendar();
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || spt('schedule.validation.generic');
      errEl.classList.remove('hidden');
    } else {
      showToast(err.message || spt('schedule.validation.generic'), true);
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = spt('schedule.period.saveBtn'); }
  }
}

/** §19 — delete by period id, with the existing shared confirm modal (Ta bort / Avbryt —
 * never a generic browser confirm()). */
function confirmDeleteSchedulePeriod() {
  if (!editingPeriodId || !currentChildId) return;
  const periodId = editingPeriodId;
  if (typeof window.openConfirmModal !== 'function') return;
  window.openConfirmModal(spt('schedule.period.deleteConfirmBody'), async () => {
    try {
      const res = await window.apiFetch(`/api/children/${currentChildId}/schedule-periods/${periodId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || spt('schedule.period.couldNotRead'));
      showToast(spt('schedule.period.deleted'));
      closeSchedulePeriodModal();
      if (typeof window.renderSpecialDaysCalendar === 'function') await window.renderSpecialDaysCalendar();
    } catch (err) {
      showToast(err.message || spt('schedule.validation.generic'), true);
    }
  });
}

// ── Period list (§16) — renders into #schedulePeriodsListMount, populated by
// schedule-special-days.js's renderSpecialDaysCalendar() right after that mount exists in the
// DOM. Every card carries its period id — Redigera/Ta bort always operate on that id, never on
// re-entered dates.
async function renderSchedulePeriodsList() {
  const mount = document.getElementById('schedulePeriodsListMount');
  if (!mount || !currentChildId) return;

  let periods = [];
  try {
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedule-periods`);
    if (res.ok) ({ periods } = await res.json());
  } catch { /* leave empty on failure — non-fatal for the calendar view */ }

  if (periods.length === 0) {
    mount.innerHTML = `<p class="text-xs text-text-soft mb-4">${spt('schedule.period.listEmpty')}</p>`;
    return;
  }

  const modeLabel = (mode) => {
    if (mode === 'replace_sections') return spt('schedule.period.modeReplaceSections');
    if (mode === 'replace_day') return spt('schedule.period.modeReplaceDay');
    return spt('schedule.period.modeMerge');
  };

  mount.innerHTML = `
    <div class="mb-4 space-y-2">
      <p class="text-xs font-semibold text-navy uppercase tracking-wide">${spt('schedule.period.listTitle')}</p>
      ${periods.map((p) => `
        <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border-2 border-lavender bg-white">
          <div class="min-w-0">
            <p class="font-semibold text-navy text-sm truncate">${escHtml(p.name)}</p>
            <p class="text-xs text-text-soft">${escHtml(p.start_date)} – ${escHtml(p.end_date)} · ${escHtml(modeLabel(p.apply_mode))}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button type="button" onclick="openSchedulePeriodModal('${p.id}')" class="min-h-[44px] px-3 py-2 rounded-xl border-2 border-lavender hover:border-gold text-navy text-xs font-semibold transition-colors">${spt('schedule.period.editBtn')}</button>
          </div>
        </div>`).join('')}
    </div>`;
}

window.openSchedulePeriodModal = openSchedulePeriodModal;
window.closeSchedulePeriodModal = closeSchedulePeriodModal;
window.setSchedulePeriodMode = setSchedulePeriodMode;
window.submitSchedulePeriod = submitSchedulePeriod;
window.confirmDeleteSchedulePeriod = confirmDeleteSchedulePeriod;
window.renderSchedulePeriodsList = renderSchedulePeriodsList;
})();
