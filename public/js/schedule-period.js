/**
 * Schedule period overlay (lov / semester) for /schedule special-days view.
 *
 * Phase 2: applies a library or family template as special-day overrides for a date range via
 * the canonical POST /api/children/:childId/schedule-periods (src/lib/schedule-period.js),
 * which gives the period real identity (schedule_period row) instead of the legacy
 * apply-date-range route's N-unrelated-date-rows behaviour — while still materializing into the
 * exact same special_day_schedule table every other read path (Calendar, resolveEffectiveSchedule)
 * already reads, so nothing new needs to understand "periods" to see the result.
 *
 * The legacy POST /api/children/:childId/schedules/apply-date-range route is retained,
 * unmodified, for backend compatibility (other callers, e.g. assign-schedule.html and
 * library-schema.js's period toggle) — this UI simply no longer calls it.
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
      const label = getSelectedSchemaLabel() || spt('schedule.period.vacationGroup');
      const sourceType = source.standard_schedule_id ? 'standard_schedule' : 'family_template';
      const sourceId = source.standard_schedule_id || source.schedule_template_id;
      const body = {
        name: label,
        start_date: start,
        end_date: end,
        source: { type: sourceType, id: sourceId },
        apply_mode: 'replace_day',
        operation_id: window.ScheduleApplyClient ? ScheduleApplyClient.newOperationId() : null,
      };

      const res = await window.apiFetch(
        `/api/children/${currentChildId}/schedule-periods`,
        { method: 'POST', body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || spt('schedule.period.saveFailed'));

      showToast(spt('schedule.period.savedToast', { start, end }));
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
      // Prefer deleting the canonical schedule_period (one call removes every date it
      // generated). Falls back to the legacy per-date deletion for date ranges that predate
      // Phase 2 or were created through a different entry point (e.g. assign-schedule.html),
      // which never got a schedule_period row.
      const periodsRes = await window.apiFetch(`/api/children/${currentChildId}/schedule-periods`);
      let matchedPeriod = null;
      if (periodsRes.ok) {
        const { periods } = await periodsRes.json();
        matchedPeriod = (periods || []).find((p) => p.start_date === start && p.end_date === end) || null;
      }

      let removedCount;
      if (matchedPeriod) {
        const delRes = await window.apiFetch(
          `/api/children/${currentChildId}/schedule-periods/${matchedPeriod.id}`,
          { method: 'DELETE' }
        );
        const delData = await delRes.json();
        if (!delRes.ok) throw new Error(delData.error || spt('schedule.period.couldNotRead'));
        removedCount = (delData.removed_dates || []).length;
      } else {
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
        removedCount = days.length;
      }

      showToast(removedCount ? spt('schedule.period.deleted') : spt('schedule.period.deletedNone'));
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
