/**
 * Schedule period overlay (lov / semester) for /schedule special-days view.
 * Applies a library or family template as special-day overrides for a date range
 * via POST /api/children/:childId/schedules/apply-date-range.
 */
(function () {

function spt(key, params) {
  return window.ScheduleI18n ? ScheduleI18n.t(key, params) : (window.pt ? window.pt(key, params) : key);
}
  let periodSchemasLoaded = false;
  let standardSchedules = [];
  let familyTemplates = [];

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

  function renderPeriodSchemaOptions() {
    const sel = document.getElementById('schedulePeriodSchema');
    if (!sel) return;

    const vacationNames = ['lov', 'sommarlov', 'jullov', 'sportlov', 'höstlov', 'hostlov', 'påsklov', 'pasklov'];
    const isVacation = (name) => vacationNames.some((v) => (name || '').toLowerCase().includes(v));

    const stdVacation = standardSchedules.filter((s) => isVacation(s.name));
    const stdOther = standardSchedules.filter((s) => !isVacation(s.name));

    let html = '<option value="">' + spt('schedule.period.pickSchedule') + '</option>';

    if (stdVacation.length) {
      html += '<optgroup label="' + escHtml(spt('schedule.period.vacationGroup')) + '">';
      for (const s of stdVacation) {
        html += `<option value="std:${s.id}">${escHtml(s.icon || '🏠')} ${escHtml(s.name)}</option>`;
      }
      html += '</optgroup>';
    }
    if (stdOther.length) {
      html += '<optgroup label="' + spt('schedule.period.readyMade') + '">';
      for (const s of stdOther) {
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

    const lovOption = Array.from(sel.options).find((o) => o.textContent.toLowerCase().includes('lov'));
    if (lovOption) sel.value = lovOption.value;
  }

  async function openSchedulePeriodModal() {
    if (!currentChildId) {
      showToast(spt('schedule.insert.pickChild'), true);
      return;
    }

    await loadPeriodSchemas();
    renderPeriodSchemaOptions();

    const defaults = defaultPeriodDates();
    const startEl = document.getElementById('schedulePeriodStart');
    const endEl = document.getElementById('schedulePeriodEnd');
    if (startEl) startEl.value = defaults.start;
    if (endEl) endEl.value = defaults.end;

    const errEl = document.getElementById('schedulePeriodError');
    if (errEl) errEl.classList.add('hidden');

    document.getElementById('schedulePeriodModal')?.classList.remove('hidden');
  }

  function closeSchedulePeriodModal() {
    document.getElementById('schedulePeriodModal')?.classList.add('hidden');
  }

  function parseSchemaSelection(value) {
    if (!value || !value.includes(':')) return null;
    const [type, id] = value.split(':');
    if (type === 'std') return { standard_schedule_id: id };
    if (type === 'fam') return { schedule_template_id: id };
    return null;
  }

  function getSelectedSchemaLabel() {
    const sel = document.getElementById('schedulePeriodSchema');
    if (!sel || !sel.selectedOptions.length) return '';
    return sel.selectedOptions[0].textContent.trim();
  }

  async function applySchedulePeriod() {
    if (!currentChildId) return;

    const start = document.getElementById('schedulePeriodStart')?.value;
    const end = document.getElementById('schedulePeriodEnd')?.value;
    const schemaValue = document.getElementById('schedulePeriodSchema')?.value;
    const errEl = document.getElementById('schedulePeriodError');
    const btn = document.getElementById('schedulePeriodApplyBtn');

    if (errEl) errEl.classList.add('hidden');

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

    let hasExisting = false;
    try {
      const checkRes = await window.apiFetch(
        `/api/children/${currentChildId}/special-days?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`
      );
      if (checkRes.ok) {
        const rows = await checkRes.json();
        hasExisting = rows.some((r) => (r.item_count || 0) > 0);
      }
    } catch (_) { /* proceed */ }

    if (hasExisting) {
      const label = getSelectedSchemaLabel();
      const ok = confirm(
        spt('schedule.period.overwriteConfirm', { start, end, label })
      );
      if (!ok) return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Sparar…'; }

    try {
      const body = {
        start_date: start,
        end_date: end,
        overwrite: true,
        note: getSelectedSchemaLabel() || null,
        ...source,
      };

      const res = await window.apiFetch(
        `/api/children/${currentChildId}/schedules/apply-date-range`,
        { method: 'POST', body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || spt('schedule.period.saveFailed'));

      showToast(data.message || spt('schedule.period.savedToast', { start, end }));
      closeSchedulePeriodModal();

      if (typeof window.loadSpecialDays === 'function') await window.loadSpecialDays(currentChildId);
      if (typeof window.renderSpecialDaysCalendar === 'function') await window.renderSpecialDaysCalendar();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || spt('schedule.validation.generic');
        errEl.classList.remove('hidden');
      } else {
        showToast(err.message || spt('schedule.validation.generic'), true);
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Spara lovperiod'; }
    }
  }

  async function removeSchedulePeriod() {
    if (!currentChildId) return;

    const start = document.getElementById('schedulePeriodStart')?.value;
    const end = document.getElementById('schedulePeriodEnd')?.value;
    const errEl = document.getElementById('schedulePeriodError');

    if (errEl) errEl.classList.add('hidden');

    if (!start || !end) {
      if (errEl) { errEl.textContent = spt('schedule.period.pickDates'); errEl.classList.remove('hidden'); }
      return;
    }
    if (end < start) {
      if (errEl) { errEl.textContent = spt('schedule.period.endBeforeStart'); errEl.classList.remove('hidden'); }
      return;
    }

    const ok = confirm(
      spt('schedule.period.deleteConfirm', { start, end })
    );
    if (!ok) return;

    const btn = document.getElementById('schedulePeriodRemoveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Tar bort…'; }

    try {
      const listRes = await window.apiFetch(
        `/api/children/${currentChildId}/special-days?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`
      );
      if (!listRes.ok) throw new Error(spt('schedule.period.couldNotRead'));
      const days = await listRes.json();

      for (const day of days) {
        const dateStr = (day.date || '').slice(0, 10);
        if (!dateStr) continue;
        await window.apiFetch(`/api/children/${currentChildId}/special-days/${dateStr}`, { method: 'DELETE' });
      }

      showToast(days.length ? spt('schedule.period.deleted') : spt('schedule.period.deletedNone'));
      closeSchedulePeriodModal();

      if (typeof window.loadSpecialDays === 'function') await window.loadSpecialDays(currentChildId);
      if (typeof window.renderSpecialDaysCalendar === 'function') await window.renderSpecialDaysCalendar();
    } catch (err) {
      showToast(err.message || spt('schedule.validation.generic'), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = spt('schedule.period.resetBtn'); }
    }
  }

  window.openSchedulePeriodModal = openSchedulePeriodModal;
  window.closeSchedulePeriodModal = closeSchedulePeriodModal;
  window.applySchedulePeriod = applySchedulePeriod;
  window.removeSchedulePeriod = removeSchedulePeriod;
})();
