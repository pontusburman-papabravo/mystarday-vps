/**
 * Schedule insert-day / fill-week / schedule-template management (Fas 8 F3c).
 * "+"-per-day insert flow, fill-whole-week flow, and create/delete family schedule templates,
 * extracted from schedule.js. Group-exclusive state (insertDayTarget, familyScheduleTemplates,
 * fillWeek*, allCategories) moves here. Reads globals (currentChildId, currentDay, DAYS via
 * ScheduleCore; openConfirmModal, loadScheduleForDay, showToast, escHtml, apiFetch).
 * Handlers exposed on window for inline onclick + schedule.js callers.
 */
(function () {

function spt(key, params) {
  return window.ScheduleI18n ? ScheduleI18n.t(key, params) : (window.pt ? window.pt(key, params) : key);
}
// ── Insert Day (+ button per day tab) ────────────────────
let insertDayTarget = null; // dow 0-6
let familyScheduleTemplates = []; // cached family-level templates
let standardLibrarySchedules = []; // admin-created standard schedules

async function loadFamilyScheduleTemplates() {
  // Fetch both family templates AND standard library schedules in parallel
  try {
    const [famRes, stdRes] = await Promise.all([
      window.apiFetch('/api/schedule-templates'),
      window.apiFetch('/api/standard-library/schedules'),
    ]);
    familyScheduleTemplates = famRes.ok ? await famRes.json() : [];
    standardLibrarySchedules = stdRes.ok ? await stdRes.json() : [];
  } catch {
    familyScheduleTemplates = [];
    standardLibrarySchedules = [];
  }
}

function renderInsertDaySchemaList() {
  const list = document.getElementById('insertDaySchemaList');
  const hasFamilyTemplates = familyScheduleTemplates.length > 0;
  const hasStandardSchedules = standardLibrarySchedules.length > 0;

  if (!hasFamilyTemplates && !hasStandardSchedules) {
    list.innerHTML = '<p class="text-sm text-text-soft text-center py-4">' + spt('schedule.insert.noSavedSchedules') + '</p>';
    return;
  }

  let html = '';

  // Standard library schedules first (admin-created defaults)
  if (hasStandardSchedules) {
    html += '<p class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-2">Standardscheman</p>';
    html += standardLibrarySchedules.map(s => `
      <button onclick="doInsertDayFromStandardSchedule('${s.id}', '${escHtml(s.name).replace(/'/g, "\\'")}')"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold hover:bg-gold-light transition-colors text-left min-w-0 mb-1">
        <span class="text-xl flex-shrink-0">${s.icon || '📋'}</span>
        <div class="min-w-0">
          <div class="font-semibold text-navy text-sm truncate">${escHtml(s.name)}</div>
          <div class="text-xs text-text-soft">${(s.items || []).length} aktiviteter</div>
        </div>
      </button>`).join('');
  }

  // Family-level custom templates
  if (hasFamilyTemplates) {
    if (hasStandardSchedules) html += '<div class="border-t border-lavender my-3"></div>';
    html += '<p class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-2">Mina scheman</p>';
    html += familyScheduleTemplates.map(t => `
      <div class="flex items-center gap-2">
        <button onclick="doInsertDayFromTemplate('${t.id}')"
          class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold hover:bg-gold-light transition-colors text-left min-w-0">
          <span class="text-xl flex-shrink-0">📋</span>
          <div class="min-w-0">
            <div class="font-semibold text-navy text-sm truncate">${escHtml(t.name)}</div>
            <div class="text-xs text-text-soft">${t.item_count || 0} aktiviteter</div>
          </div>
        </button>
        <button onclick="confirmDeleteScheduleTemplate('${t.id}', '${escHtml(t.name).replace(/'/g, '\\\'')}')"
          title="Ta bort schema"
          class="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border-2 border-lavender hover:border-red-400 hover:bg-red-50 text-text-soft hover:text-red-500 transition-colors text-sm font-bold">
          ✕
        </button>
      </div>`).join('');
  }

  list.innerHTML = html;
}

async function openInsertDayModal(dow) {
  if (!currentChildId) { showToast(spt('schedule.insert.pickChild'), true); return; }
  insertDayTarget = dow;
  document.getElementById('insertDaySubtitle').textContent = spt('schedule.insert.subtitle', { day: DAYS[dow] });
  // Always reload fresh list
  await loadFamilyScheduleTemplates();
  renderInsertDaySchemaList();
  document.getElementById('insertDayModal').classList.remove('hidden');
}

function closeInsertDayModal() {
  document.getElementById('insertDayModal').classList.add('hidden');
}

// Apply a family schedule template to insertDayTarget
async function doInsertDayFromTemplate(templateId, forceOverwrite = false) {
  if (insertDayTarget === null || !currentChildId) return;
  closeInsertDayModal();

  // Check for existing schedule on this day
  const existingSchedules = await fetchChildSchedules(currentChildId);
  const existing = existingSchedules.find(s => s.day_of_week === insertDayTarget);

  if (existing && !forceOverwrite) {
    document.getElementById('insertDayConfirmMsg').textContent =
      spt('schedule.insert.overwriteWarning', { day: DAYS[insertDayTarget], count: existing.item_count || 0 });
    document.getElementById('insertDayConfirmOk').onclick = () => {
      document.getElementById('insertDayConfirmModal').classList.add('hidden');
      doInsertDayFromTemplate(templateId, true);
    };
    document.getElementById('insertDayConfirmModal').classList.remove('hidden');
    return;
  }

  try {
    // Delete existing day schedule if present
    if (existing) {
      const delRes = await window.apiFetch(
        `/api/children/${currentChildId}/schedules/${existing.id}`, { method: 'DELETE' }
      );
      if (!delRes.ok) { showToast('Kunde inte ta bort befintligt schema', true); return; }
    }

    // Apply template to this day
    const res = await window.apiFetch(`/api/schedule-templates/${templateId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ child_id: currentChildId, days: [insertDayTarget], overwrite: true })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Fel uppstod', true); return; }

    showToast(spt('schedule.insert.inserted', { day: DAYS[insertDayTarget] }) + ' ✓');

    // Reload if this is the current day
    if (insertDayTarget === currentDay) await loadScheduleForDay();
  } catch (e) {
    showToast(spt('schedule.validation.generic'), true);
  }
}

// Apply a standard library schedule (admin-created default) to insertDayTarget
async function doInsertDayFromStandardSchedule(scheduleId, scheduleName, forceOverwrite = false) {
  if (insertDayTarget === null || !currentChildId) return;
  closeInsertDayModal();

  // Check for existing schedule on this day
  const existingSchedules = await fetchChildSchedules(currentChildId);
  const existing = existingSchedules.find(s => s.day_of_week === insertDayTarget);

  if (existing && !forceOverwrite) {
    document.getElementById('insertDayConfirmMsg').textContent =
      spt('schedule.insert.overwriteWarning', { day: DAYS[insertDayTarget], count: existing.item_count || 0 });
    document.getElementById('insertDayConfirmOk').onclick = () => {
      document.getElementById('insertDayConfirmModal').classList.add('hidden');
      doInsertDayFromStandardSchedule(scheduleId, scheduleName, true);
    };
    document.getElementById('insertDayConfirmModal').classList.remove('hidden');
    return;
  }

  try {
    // Use the standard library copy endpoint (creates activity templates + schedule items)
    const res = await window.apiFetch(`/api/standard-library/schedules/${scheduleId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ child_id: currentChildId, days: [insertDayTarget], overwrite: true })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Fel uppstod', true); return; }

    showToast(data.message || spt('schedule.insert.insertedNamed', { name: scheduleName, day: DAYS[insertDayTarget] }) + ' ✓');

    // Reload schedule view
    await loadScheduleForDay();
  } catch (e) {
    showToast(spt('schedule.validation.generic'), true);
  }
}

// Insert empty schedule (no template)
async function doInsertDay(categoryId, forceOverwrite = false) {
  if (insertDayTarget === null || !currentChildId) return;
  closeInsertDayModal();

  // Check for existing schedule on this day
  const existingSchedules = await fetchChildSchedules(currentChildId);
  const existing = existingSchedules.find(s => s.day_of_week === insertDayTarget);

  if (existing && !forceOverwrite) {
    document.getElementById('insertDayConfirmMsg').textContent =
      spt('schedule.insert.overwriteWarning', { day: DAYS[insertDayTarget], count: existing.item_count || 0 });
    document.getElementById('insertDayConfirmOk').onclick = () => {
      document.getElementById('insertDayConfirmModal').classList.add('hidden');
      doInsertDayExecute(categoryId, existing.id);
    };
    document.getElementById('insertDayConfirmModal').classList.remove('hidden');
    return;
  }

  await doInsertDayExecute(categoryId, existing ? existing.id : null);
}

async function doInsertDayExecute(categoryId, existingScheduleId) {
  try {
    // Delete existing if present
    if (existingScheduleId) {
      const delRes = await window.apiFetch(
        `/api/children/${currentChildId}/schedules/${existingScheduleId}`, { method: 'DELETE' }
      );
      if (!delRes.ok) { showToast('Kunde inte ta bort befintligt schema', true); return; }
    }

    // Create new empty schedule
    const body = { day_of_week: insertDayTarget };
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`, {
      method: 'POST', body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok && res.status !== 409) { showToast(data.error || 'Fel uppstod', true); return; }

    showToast(spt('schedule.insert.emptyInserted', { day: DAYS[insertDayTarget] }) + ' ✓');

    // Reload if this is the current day
    if (insertDayTarget === currentDay) {
      currentScheduleId = data.id || (res.status === 409 ? data.id : null);
      if (currentScheduleId) await loadScheduleForDay();
    }
  } catch (e) {
    showToast(spt('schedule.validation.generic'), true);
  }
}

// ── New Schedule Template ─────────────────────────────────
function openNewScheduleTemplateModal() {
  document.getElementById('newScheduleTemplateName').value = '';
  document.getElementById('newScheduleTemplateError').classList.add('hidden');
  document.getElementById('newScheduleTemplateBtn').disabled = false;
  document.getElementById('newScheduleTemplateBtn').textContent = 'Skapa schema';
  document.getElementById('newScheduleTemplateModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('newScheduleTemplateName').focus(), 100);
}

function closeNewScheduleTemplateModal() {
  document.getElementById('newScheduleTemplateModal').classList.add('hidden');
}

async function submitNewScheduleTemplate() {
  const name = document.getElementById('newScheduleTemplateName').value.trim();
  const errEl = document.getElementById('newScheduleTemplateError');
  const btn = document.getElementById('newScheduleTemplateBtn');
  errEl.classList.add('hidden');
  if (!name) { errEl.textContent = spt('schedule.insert.nameRequired'); errEl.classList.remove('hidden'); return; }
  btn.disabled = true; btn.textContent = 'Skapar…';

  try {
    const res = await window.apiFetch('/api/schedule-templates', {
      method: 'POST', body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) {
      closeNewScheduleTemplateModal();
      // Reload templates and re-render list
      await loadFamilyScheduleTemplates();
      renderInsertDaySchemaList();
      // Re-open the insert modal so user can select the new template
      document.getElementById('insertDayModal').classList.remove('hidden');
      showToast(`Schemat "${name}" har skapats ✓`);
    } else {
      errEl.textContent = data.error || spt('schedule.errors.generic'); errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Skapa schema';
    }
  } catch {
    errEl.textContent = spt('schedule.validation.generic'); errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Skapa schema';
  }
}

// ── Delete Schedule Template ──────────────────────────────
let _deleteScheduleTemplateId = null;

function confirmDeleteScheduleTemplate(id, name) {
  _deleteScheduleTemplateId = id;
  document.getElementById('deleteScheduleTemplateMsg').textContent =
    spt('schedule.insert.deleteConfirm', { name });
  document.getElementById('deleteScheduleTemplateOk').onclick = executeDeleteScheduleTemplate;
  document.getElementById('deleteScheduleTemplateModal').classList.remove('hidden');
}

async function executeDeleteScheduleTemplate() {
  if (!_deleteScheduleTemplateId) return;
  document.getElementById('deleteScheduleTemplateModal').classList.add('hidden');
  const id = _deleteScheduleTemplateId;
  _deleteScheduleTemplateId = null;

  try {
    const res = await window.apiFetch(`/api/schedule-templates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Schemat har tagits bort');
      await loadFamilyScheduleTemplates();
      renderInsertDaySchemaList();
      document.getElementById('insertDayModal').classList.remove('hidden');
    } else {
      showToast(data.error || 'Kunde inte ta bort schemat', true);
    }
  } catch {
    showToast(spt('schedule.validation.generic'), true);
  }
}

async function fetchChildSchedules(childId) {
  try {
    const res = await window.apiFetch(`/api/children/${childId}/schedules`);
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

// ── Fill Week ─────────────────────────────────────────────
let fillWeekSelectedCatId = null;
let fillWeekSelectedCatName = null;
let fillWeekDaySelections = [];

let allCategories = []; // { id, name, template_count }

async function loadAllCategories() {
  try {
    const [catRes, tplRes] = await Promise.all([
      window.apiFetch('/api/categories'),
      window.apiFetch('/api/activities'),
    ]);
    const cats = catRes.ok ? await catRes.json() : [];
    const tpls = tplRes.ok ? await tplRes.json() : [];
    const countMap = {};
    for (const t of tpls) {
      if (t.category_id) countMap[t.category_id] = (countMap[t.category_id] || 0) + 1;
    }
    allCategories = cats.map(c => ({ ...c, template_count: countMap[c.id] || 0 }));
  } catch (_) {}
}

async function openFillWeekModal() {
  if (!currentChildId) { showToast(spt('schedule.insert.pickChild'), true); return; }
  fillWeekSelectedCatId = null;
  fillWeekSelectedCatName = null;
  fillWeekDaySelections = [];

  if (allCategories.length === 0) await loadAllCategories();

  // Render schema list in step 1
  const list = document.getElementById('fillWeekSchemaList');
  if (allCategories.length === 0) {
    list.innerHTML = '<p class="text-sm text-text-soft text-center py-4">' + spt('schedule.insert.noLibrarySchedules') + '</p>';
  } else {
    list.innerHTML = allCategories.map(cat => `
      <button onclick="fillWeekSelectSchema('${cat.id}','${escHtml(cat.name).replace(/'/g,"\\'")}')"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold hover:bg-gold-light transition-colors text-left fw-schema-btn" data-cat-id="${cat.id}">
        <span class="text-xl">📋</span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-navy text-sm">${escHtml(cat.name)}</div>
          <div class="text-xs text-text-soft">${cat.template_count || ''} aktiviteter</div>
        </div>
      </button>`).join('');
  }

  // Show step 1, hide step 2
  document.getElementById('fillWeekStep1').classList.remove('hidden');
  document.getElementById('fillWeekStep2').classList.add('hidden');
  document.getElementById('fillWeekModal').classList.remove('hidden');
}

function closeFillWeekModal() {
  document.getElementById('fillWeekModal').classList.add('hidden');
}

function fillWeekSelectSchema(catId, catName) {
  fillWeekSelectedCatId = catId;
  fillWeekSelectedCatName = catName;

  // Highlight selected
  document.querySelectorAll('.fw-schema-btn').forEach(b => {
    b.classList.toggle('border-gold', b.dataset.catId === catId);
    b.classList.toggle('bg-gold-light', b.dataset.catId === catId);
  });
  const blankBtn = document.getElementById('fillWeekBlankBtn');
  if (blankBtn) {
    blankBtn.classList.toggle('border-gold', catId === null);
  }

  // Go to step 2
  document.getElementById('fillWeekStep1').classList.add('hidden');
  document.getElementById('fillWeekStep2').classList.remove('hidden');
  document.getElementById('fillWeekSelectedLabel').textContent = catName || spt('schedule.insert.blankScheduleLabel');

  // Detect school schema for weekend warning
  const isSchool = catName && ['skola','förskola'].some(k => catName.toLowerCase().includes(k));

  // Render day checkboxes
  const picker = document.getElementById('fillWeekDayPicker');
  const warning = document.getElementById('fillWeekWeekendWarning');
  warning.classList.toggle('hidden', !isSchool);

  fillWeekDaySelections = [];
  picker.innerHTML = [1,2,3,4,5,6,0].map(d => {
    const isWeekend = d === 0 || d === 6;
    const blocked = isSchool && isWeekend;
    return `<button type="button" data-day="${d}"
      onclick="toggleFillWeekDay(${d},this)"
      class="px-2 py-2 rounded-xl border-2 border-lavender text-xs font-semibold transition-colors text-center ${blocked ? 'opacity-40 cursor-not-allowed' : 'hover:border-gold'}"
      ${blocked ? 'disabled' : ''}>${DAYS_SHORT[d]}</button>`;
  }).join('');
}

function fillWeekBackToStep1() {
  document.getElementById('fillWeekStep1').classList.remove('hidden');
  document.getElementById('fillWeekStep2').classList.add('hidden');
}

function toggleFillWeekDay(d, btn) {
  const idx = fillWeekDaySelections.indexOf(d);
  if (idx === -1) {
    fillWeekDaySelections.push(d);
    btn.classList.add('bg-navy','text-white','border-navy');
    btn.classList.remove('border-lavender');
  } else {
    fillWeekDaySelections.splice(idx, 1);
    btn.classList.remove('bg-navy','text-white','border-navy');
    btn.classList.add('border-lavender');
  }
}

async function submitFillWeek(overwrite = false) {
  if (!fillWeekDaySelections.length) { showToast(spt('schedule.validation.pickDay'), true); return; }
  if (!currentChildId) return;

  const body = {
    template_category_id: fillWeekSelectedCatId || '__blank__',
    days: fillWeekDaySelections,
    overwrite,
  };

  // For blank schema we use the regular create endpoint per day
  if (!fillWeekSelectedCatId) {
    closeFillWeekModal();
    await fillWeekBlank(fillWeekDaySelections, overwrite);
    return;
  }

  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/fill-week`, {
    method: 'POST', body: JSON.stringify(body)
  });
  const data = await res.json();

  if (res.status === 409 && data.days_with_existing) {
    const dayNames = data.days_with_existing.map(d => DAYS[d]).join(', ');
    document.getElementById('fillWeekConfirmMsg').textContent =
      spt('schedule.insert.replaceDaysConfirm', { days: dayNames });
    document.getElementById('fillWeekConfirmOk').onclick = async () => {
      document.getElementById('fillWeekConfirmModal').classList.add('hidden');
      await submitFillWeek(true);
    };
    document.getElementById('fillWeekConfirmModal').classList.remove('hidden');
    return;
  }

  if (res.ok) {
    closeFillWeekModal();
    showToast(spt('schedule.insert.filledDays', { count: data.filled_days.length }) + ' ✓');
    if (data.filled_days.includes(currentDay)) await loadScheduleForDay();
  } else {
    showToast(data.error || 'Fel uppstod', true);
  }
}

async function fillWeekBlank(days, overwrite) {
  // For blank schema, use existing create endpoint per day
  const existingSchedules = await fetchChildSchedules(currentChildId);
  const existingByDay = {};
  for (const s of existingSchedules) existingByDay[s.day_of_week] = s;

  let count = 0;
  for (const dow of days) {
    const existing = existingByDay[dow];
    if (existing && !overwrite) continue; // skip — no overwrite
    if (existing) {
      const delRes = await window.apiFetch(
        `/api/children/${currentChildId}/schedules/${existing.id}`, { method: 'DELETE' }
      );
      if (!delRes.ok) continue;
    }
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`, {
      method: 'POST', body: JSON.stringify({ day_of_week: dow })
    });
    if (res.ok || res.status === 409) count++;
  }
  showToast(spt('schedule.insert.emptyCreated', { count }) + ' ✓');
  if (days.includes(currentDay)) await loadScheduleForDay();
}

  // Exposed on window for inline onclick + cross-file callers
  window.loadFamilyScheduleTemplates = loadFamilyScheduleTemplates;
  window.renderInsertDaySchemaList = renderInsertDaySchemaList;
  window.openInsertDayModal = openInsertDayModal;
  window.closeInsertDayModal = closeInsertDayModal;
  window.doInsertDayFromTemplate = doInsertDayFromTemplate;
  window.doInsertDayFromStandardSchedule = doInsertDayFromStandardSchedule;
  window.doInsertDay = doInsertDay;
  window.doInsertDayExecute = doInsertDayExecute;
  window.openNewScheduleTemplateModal = openNewScheduleTemplateModal;
  window.closeNewScheduleTemplateModal = closeNewScheduleTemplateModal;
  window.submitNewScheduleTemplate = submitNewScheduleTemplate;
  window.confirmDeleteScheduleTemplate = confirmDeleteScheduleTemplate;
  window.executeDeleteScheduleTemplate = executeDeleteScheduleTemplate;
  window.fetchChildSchedules = fetchChildSchedules;
  window.loadAllCategories = loadAllCategories;
  window.openFillWeekModal = openFillWeekModal;
  window.closeFillWeekModal = closeFillWeekModal;
  window.fillWeekSelectSchema = fillWeekSelectSchema;
  window.fillWeekBackToStep1 = fillWeekBackToStep1;
  window.toggleFillWeekDay = toggleFillWeekDay;
  window.submitFillWeek = submitFillWeek;
  window.fillWeekBlank = fillWeekBlank;
})();
