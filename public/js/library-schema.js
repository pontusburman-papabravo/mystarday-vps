// library-schema.js — Schema tab module for Mitt bibliotek
// Owns: schema tab load/render, schema children list, family templates (Mina scheman),
//       create/delete schedule template, copy schedule dialogs (standard + family),
//       copy-from-child modal, standard schedule cards, schedule item rendering.
// Does NOT own: categories/activities (library.js), standard library tab (library-standard.js).

// ─── Schema tab ──────────────────────────────────────────
let _schemaLoaded = false;
let schemaChildren = [];
let standardSchedules = [];
let familyTemplates = [];

async function safeJson(res) {
  try {
    return await res.json();
  } catch (err) {
    console.warn('[library-schema] JSON parse failed:', res.url, err.message);
    return null;
  }
}

function schemaLoadErrorHtml() {
  return '<p class="text-red-400 text-center py-6 text-sm">Kunde inte ladda scheman. <button type="button" class="underline font-semibold" onclick="reloadSchemaTab()">Försök igen</button></p>';
}

async function loadSchemaTab() {
  if (_schemaLoaded) return;
  if (typeof window.apiFetch !== 'function') {
    console.error('[library-schema] apiFetch saknas');
    const el = document.getElementById('schemaChildrenList');
    if (el) el.innerHTML = schemaLoadErrorHtml();
    return;
  }
  try {
    const [childrenRes, schedulesRes, templatesRes] = await Promise.all([
      window.apiFetch('/api/children'),
      window.apiFetch('/api/standard-library/schedules'),
      window.apiFetch('/api/schedule-templates'),
    ]);

    if (childrenRes.ok) {
      const data = await safeJson(childrenRes);
      if (Array.isArray(data)) schemaChildren = data;
    } else {
      console.warn('[library-schema] /api/children', childrenRes.status);
    }
    if (schedulesRes.ok) {
      const data = await safeJson(schedulesRes);
      if (Array.isArray(data)) standardSchedules = data;
    } else {
      console.warn('[library-schema] /api/standard-library/schedules', schedulesRes.status);
    }
    if (templatesRes.ok) {
      const data = await safeJson(templatesRes);
      if (Array.isArray(data)) familyTemplates = data;
    } else {
      console.warn('[library-schema] /api/schedule-templates', templatesRes.status);
    }
    _schemaLoaded = true;
    renderSchemaChildren();
    renderFamilyTemplates();
    renderStandardScheduleCards();
    renderStdSchedulesSubTab();
    if (window.LibraryMagicSchedules) LibraryMagicSchedules.refresh();
    if (window.LibraryMagicMine) LibraryMagicMine.refresh();
  } catch (err) {
    console.error('[library-schema] loadSchemaTab failed:', err);
    _schemaLoaded = false;
    const errHtml = schemaLoadErrorHtml();
    const childrenEl = document.getElementById('schemaChildrenList');
    const templatesEl = document.getElementById('familyTemplatesList');
    const stdEl = document.getElementById('standardScheduleCards');
    if (childrenEl) childrenEl.innerHTML = errHtml;
    if (templatesEl) templatesEl.innerHTML = errHtml;
    if (stdEl) stdEl.innerHTML = errHtml;
  }
}

function reloadSchemaTab() {
  _schemaLoaded = false;
  return loadSchemaTab();
}
window.loadSchemaTab = loadSchemaTab;
window.reloadSchemaTab = reloadSchemaTab;

function renderSchemaChildren() {
  const container = document.getElementById('schemaChildrenList');
  if (!container) return;
  if (schemaChildren.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">
        <p class="text-3xl mb-2">👶</p>
        <p class="font-heading font-bold text-navy mb-1">Inga barn tillagda</p>
        <p class="text-sm text-text-soft max-w-sm mx-auto">Lägg till barn under Familjen & inställningar.</p>
      </div>`;
    return;
  }

  container.innerHTML = schemaChildren.map(child => `
    <div class="bg-white rounded-2xl border-2 border-lavender hover:border-gold transition-colors p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <span class="text-3xl">${child.emoji || '🧒'}</span>
          <div class="min-w-0">
            <h4 class="font-heading font-bold text-navy" style="word-break:break-word">${escHtml(child.name)}</h4>
            <p class="text-xs text-text-soft">Personligt schema</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <a href="/schedule?child=${child.id}"
            class="flex-1 sm:flex-none px-3 py-2 bg-navy hover:bg-navy-soft text-white rounded-lg font-semibold text-xs transition-colors text-center">
            📅 Redigera schema
          </a>
          <button onclick="openCopyScheduleModal('${child.id}', '${escHtml(child.name)}')"
            class="flex-1 sm:flex-none px-3 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-lg font-semibold text-xs transition-colors">
            📋 Kopiera från…
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Family templates (Mina scheman) ─────────────────────
function renderFamilyTemplates() {
  const container = document.getElementById('familyTemplatesList');
  if (!container) return;

  if (familyTemplates.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender col-span-full">
        <p class="text-3xl mb-2">📝</p>
        <p class="font-heading font-bold text-navy mb-1">Inga egna scheman ännu</p>
        <p class="text-sm text-text-soft max-w-sm mx-auto">Skapa ett nytt schema ovan, eller kopiera ett standardschema och anpassa det.</p>
      </div>`;
    return;
  }

  container.innerHTML = familyTemplates.map(t => {
    const isFavorite = t.is_favorite === true;
    return `
    <div class="bg-white rounded-2xl border-2 border-lavender hover:border-gold transition-colors overflow-hidden fade-in">
      <div class="bg-sky/60 px-4 py-3 border-b border-lavender">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h4 class="font-heading font-bold text-navy">${escHtml(t.name)}</h4>
            <div class="text-xs text-text-soft mt-0.5">${parseInt(t.item_count || 0)} aktiviteter</div>
          </div>
          <button type="button" onclick="toggleTemplateFavorite('${t.id}', ${isFavorite})"
            class="text-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isFavorite ? 'text-gold' : 'text-gray-300'}"
            aria-label="${isFavorite ? 'Ta bort favorit' : 'Spara som favorit'}">${isFavorite ? '★' : '☆'}</button>
        </div>
      </div>
      <div class="px-4 py-3 flex flex-col gap-2">
        <button onclick="openCopyFamilyTemplateDialog('${t.id}', '${escHtml(t.name)}')"
          class="w-full px-4 py-2.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          📥 Kopiera till barn
        </button>
        <div class="flex gap-2">
          <a href="/schedule?view=template&amp;template=${t.id}"
            class="flex-1 px-3 py-2 bg-navy hover:bg-navy-soft text-white rounded-lg font-semibold text-xs transition-colors text-center">
            ✏️ Redigera
          </a>
          <button onclick="deleteTemplate('${t.id}', '${escHtml(t.name)}')"
            class="px-3 py-2 bg-coral/10 hover:bg-coral/20 text-coral rounded-lg font-semibold text-xs transition-colors">
            🗑️ Ta bort
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

async function toggleTemplateFavorite(templateId, currentlyFavorite) {
  const res = await window.apiFetch(`/api/schedule-templates/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_favorite: !currentlyFavorite }),
  });
  if (res.ok) {
    const t = familyTemplates.find(x => x.id === templateId);
    if (t) t.is_favorite = !currentlyFavorite;
    renderFamilyTemplates();
    fetch('/api/analytics/event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'for_dig_favorite_toggle',
        metadata: { entity_type: 'schedule', entity_id: templateId, is_favorite: !currentlyFavorite },
      }),
    }).catch(() => {});
  } else {
    showToast('Kunde inte uppdatera favorit', true);
  }
}

// ─── Create schedule template ────────────────────────────
async function openCreateTemplateModal() {
  // Ensure standard schedules are loaded before building the modal.
  // This handles the case where user opens the modal before loadSchemaTab() has completed.
  if (standardSchedules.length === 0) {
    try {
      const res = await window.apiFetch('/api/standard-library/schedules');
      if (res.ok) standardSchedules = await res.json();
    } catch { /* ignore — modal will show empty list */ }
  }

  // Build standard schedule options for the modal
  const stdOptions = standardSchedules.map(s => `
    <label class="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl hover:bg-sky/40 transition-colors border border-transparent hover:border-lavender">
      <input type="radio" name="createTemplateSource" value="${s.id}" class="w-5 h-5 accent-gold flex-shrink-0">
      <span class="text-2xl">${s.icon || '📋'}</span>
      <div class="min-w-0">
        <span class="text-sm font-semibold text-navy block">${escHtml(s.name)}</span>
        <span class="text-xs text-text-soft">${(s.items || []).length} aktiviteter</span>
      </div>
    </label>
  `).join('');

  const modalHtml = `
    <div id="createTemplateModal" class="fixed inset-0 bg-black/50 flex items-start overflow-y-auto justify-center z-50 p-4">
      <div class="bg-white dark:bg-navy-soft rounded-2xl p-6 w-full max-w-md shadow-xl my-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-heading font-bold text-navy">+ Skapa nytt schema</h3>
          <button onclick="closeCreateTemplateModal()" class="text-text-soft hover:text-navy text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-semibold text-navy block mb-1">Schemanamn</label>
            <input type="text" id="createTemplateName" placeholder="T.ex. Sportlov, Helgschema…"
              class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors text-sm">
          </div>
          <div>
            <p class="text-sm font-semibold text-navy mb-2">Utgå från:</p>
            <div class="space-y-1">
              <label class="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl hover:bg-sky/40 transition-colors border border-transparent hover:border-lavender">
                <input type="radio" name="createTemplateSource" value="blank" class="w-5 h-5 accent-gold flex-shrink-0" checked>
                <span class="text-2xl">📝</span>
                <div>
                  <span class="text-sm font-semibold text-navy block">Tomt schema</span>
                  <span class="text-xs text-text-soft">Börja från noll och lägg till aktiviteter själv</span>
                </div>
              </label>
              ${stdOptions.length > 0 ? `
                <div class="border-t border-lavender my-2 pt-2">
                  <p class="text-xs text-text-soft mb-1">Eller utgå från en standardmall:</p>
                  ${stdOptions}
                </div>
              ` : ''}
            </div>
          </div>
          <div id="createTemplateError" class="text-red-500 text-sm hidden"></div>
          <div class="flex gap-3 pt-2">
            <button onclick="closeCreateTemplateModal()" class="flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold">Avbryt</button>
            <button onclick="executeCreateTemplate()" id="createTemplateBtn" class="flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">Skapa</button>
          </div>
        </div>
      </div>
    </div>`;

  closeCreateTemplateModal();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  // Auto-focus name input
  setTimeout(() => document.getElementById('createTemplateName')?.focus(), 100);
}

function closeCreateTemplateModal() {
  const m = document.getElementById('createTemplateModal');
  if (m) m.remove();
}

async function executeCreateTemplate() {
  const nameInput = document.getElementById('createTemplateName');
  const name = (nameInput?.value || '').trim();
  if (!name) {
    const errEl = document.getElementById('createTemplateError');
    errEl.textContent = 'Ange ett namn för schemat';
    errEl.classList.remove('hidden');
    nameInput?.focus();
    return;
  }

  const sourceRadio = document.querySelector('input[name="createTemplateSource"]:checked');
  const sourceId = sourceRadio?.value || 'blank';

  const btn = document.getElementById('createTemplateBtn');
  btn.disabled = true;
  btn.textContent = 'Skapar…';

  try {
    let res;
    if (sourceId === 'blank') {
      // Create empty template
      res = await window.apiFetch('/api/schedule-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } else {
      // Create template pre-filled from standard schedule
      res = await window.apiFetch(`/api/schedule-templates/from-standard/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errEl = document.getElementById('createTemplateError');
      errEl.textContent = data.error || 'Kunde inte skapa schema';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Skapa';
      return;
    }

    const template = await res.json();
    familyTemplates.push(template);
    renderFamilyTemplates();
    closeCreateTemplateModal();
    showToast(`Schema "${name}" skapat!`);
  } catch {
    showToast('Något gick fel', true);
    btn.disabled = false;
    btn.textContent = 'Skapa';
  }
}

// ─── Delete schedule template ────────────────────────────
async function deleteTemplate(templateId, name) {
  if (!confirm(`Vill du ta bort schemat "${name}"? Detta kan inte ångras.`)) return;

  try {
    const res = await window.apiFetch(`/api/schedule-templates/${templateId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Kunde inte ta bort schemat', true);
      return;
    }
    familyTemplates = familyTemplates.filter(t => t.id !== templateId);
    renderFamilyTemplates();
    showToast('Schema borttaget');
  } catch {
    showToast('Något gick fel', true);
  }
}

// ─── Copy family template to child (reuse same dialog as standard) ──
function openCopyFamilyTemplateDialog(templateId, templateName) {
  // Reuse the same copy dialog used for standard schedules
  openScheduleCopyDialog(templateId, templateName, 'family');
}

function renderStandardScheduleCards() {
  const container = document.getElementById('standardScheduleCards');
  if (!container) return;
  if (standardSchedules.length === 0) {
    container.innerHTML = '<p class="text-text-soft text-center py-6 col-span-full">Inga standardscheman tillgängliga ännu.</p>';
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
          ${items.map(i => renderStdScheduleItem(i, s.id)).join('')}
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

// Render a single schedule item with expandable substeps
function renderStdScheduleItem(item, scheduleId) {
  const subSteps = item.sub_steps || [];
  const hasSubSteps = Array.isArray(subSteps) && subSteps.length > 0;
  const itemUid = `std-item-${scheduleId}-${item.id || item.name.replace(/\s/g, '')}`;

  let subStepsHtml = '';
  if (hasSubSteps) {
    subStepsHtml = `
      <div id="${itemUid}-subs" class="substeps-panel ml-7 mt-1 mb-1.5 pl-3 border-l-2 border-lavender">
        ${subSteps.map(ss => `
          <div class="flex items-center gap-1.5 text-xs py-0.5 text-text-soft">
            <span>${ss.icon || '▸'}</span>
            <span>${escHtml(ss.name)}</span>
          </div>
        `).join('')}
      </div>`;
  }

  return `
    <div>
      <div class="flex items-center gap-2 text-sm py-0.5${hasSubSteps ? ' cursor-pointer hover:bg-sky/40 rounded-lg px-1 -mx-1 transition-colors' : ''}"
        ${hasSubSteps ? `onclick="toggleStdSubSteps('${itemUid}-subs')"` : ''}>
        <span class="text-base">${item.icon || '📌'}</span>
        <span class="text-navy flex-1">${escHtml(item.name)}</span>
        ${hasSubSteps ? `<span class="text-xs text-gold font-semibold">${subSteps.length} delsteg ▾</span>` : ''}
        <span class="text-xs text-text-soft">${'⭐'.repeat(item.star_value || 1)}</span>
      </div>
      ${subStepsHtml}
    </div>`;
}

// Toggle visibility of static schedule sub-step panel (standard schedule cards)
// Separate from toggleSubSteps() in library-substeps.js which handles activity sub-steps
function toggleStdSubSteps(id) {
  const panel = document.getElementById(id);
  if (panel) panel.classList.toggle('open');
}

// Render standard schedules in the Standardbibliotek → Scheman sub-tab
// Only syncs from Schema tab cards if Standardbibliotek hasn't loaded its own yet
function renderStdSchedulesSubTab() {
  const container = document.getElementById('stdSchedulesContainer');
  if (!container) return;
  renderStandardScheduleCards();
  // Only copy if Standardbibliotek hasn't rendered its own version yet
  if (!_standardLoaded) {
    container.innerHTML = document.getElementById('standardScheduleCards').innerHTML;
  }
}

// ─── Copy schedule dialog ────────────────────────────────
// source: 'standard' (default) or 'family' — determines which API endpoint to use

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPeriodEndIso(startIso) {
  const d = new Date(startIso + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function toggleScheduleCopyPeriod() {
  const cb = document.getElementById('copySchedUsePeriod');
  const fields = document.getElementById('copySchedPeriodFields');
  const dayPicker = document.getElementById('copySchedDayPicker');
  const btn = document.getElementById('scheduleCopyBtn');
  if (!cb) return;
  const on = cb.checked;
  if (fields) fields.classList.toggle('hidden', !on);
  if (dayPicker) dayPicker.classList.toggle('hidden', on);
  if (btn) btn.textContent = on ? 'Kopiera för perioden' : 'Kopiera';
  if (on) {
    const startEl = document.getElementById('copySchedPeriodStart');
    const endEl = document.getElementById('copySchedPeriodEnd');
    if (startEl && !startEl.value) startEl.value = todayIsoDate();
    if (endEl && !endEl.value) endEl.value = defaultPeriodEndIso(startEl.value || todayIsoDate());
  }
}

function openScheduleCopyDialog(scheduleId, scheduleName, source) {
  const _copySource = source || 'standard';
  if (schemaChildren.length === 0) {
    showToast('Inga barn att kopiera till', true);
    return;
  }

  const dayNames = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  const childOptions = schemaChildren.map(c =>
    `<label class="flex items-center gap-3 cursor-pointer py-1">
       <input type="radio" name="copySchedChild" value="${c.id}" class="w-5 h-5 accent-gold">
       <span class="text-sm font-semibold text-navy">${c.emoji || '🧒'} ${escHtml(c.name)}</span>
     </label>`
  ).join('');

  const dayCheckboxes = [1,2,3,4,5,6,0].map(d =>
    `<label class="flex items-center gap-2 cursor-pointer">
       <input type="checkbox" class="copy-sched-day w-5 h-5 accent-gold" value="${d}">
       <span class="text-sm text-navy">${dayNames[d]}</span>
     </label>`
  ).join('');

  const modalHtml = `
    <div id="scheduleCopyModal" class="fixed inset-0 bg-black/50 flex items-start overflow-y-auto justify-center z-50 p-4">
      <div class="bg-white dark:bg-navy-soft rounded-2xl p-6 w-full max-w-md shadow-xl my-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-heading font-bold text-navy">📥 Kopiera "${scheduleName}"</h3>
          <button onclick="closeScheduleCopyModal()" class="text-text-soft hover:text-navy text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div>
            <p class="text-sm font-semibold text-navy mb-2">Välj barn:</p>
            <div class="space-y-1">${childOptions}</div>
          </div>
          <div class="rounded-xl border-2 border-lavender bg-sky/40 p-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" id="copySchedUsePeriod" class="w-5 h-5 mt-0.5 accent-gold flex-shrink-0" onchange="toggleScheduleCopyPeriod()">
              <span>
                <span class="block text-sm font-semibold text-navy">Begränsa till period</span>
                <span class="block text-xs text-text-soft mt-0.5">T.ex. lov eller läslov — schemat gäller varje dag mellan datumen.</span>
              </span>
            </label>
            <div id="copySchedPeriodFields" class="hidden mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="copySchedPeriodStart" class="block text-xs font-semibold text-navy mb-1">Startdatum</label>
                <input type="date" id="copySchedPeriodStart" class="w-full px-3 py-2 border-2 border-lavender rounded-xl text-sm text-navy">
              </div>
              <div>
                <label for="copySchedPeriodEnd" class="block text-xs font-semibold text-navy mb-1">Slutdatum</label>
                <input type="date" id="copySchedPeriodEnd" class="w-full px-3 py-2 border-2 border-lavender rounded-xl text-sm text-navy">
              </div>
            </div>
          </div>
          <div id="copySchedDayPicker">
            <p class="text-sm font-semibold text-navy mb-2">Vilka dagar?</p>
            <div class="flex flex-wrap gap-3">${dayCheckboxes}</div>
          </div>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="copySchedOverwrite" class="w-5 h-5 accent-gold">
            <span class="text-sm text-text-soft">Skriv över befintligt schema</span>
          </label>
          <div id="scheduleCopyError" class="text-red-500 text-sm hidden"></div>
          <div class="flex gap-3">
            <button onclick="closeScheduleCopyModal()" class="flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold hover:border-navy transition-colors">Avbryt</button>
            <button onclick="executeScheduleCopy('${scheduleId}', '${_copySource}')" id="scheduleCopyBtn" class="flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">Kopiera</button>
          </div>
        </div>
      </div>
    </div>`;

  // Remove any existing modal
  closeScheduleCopyModal();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('scheduleCopyModal');
  if (modal) {
    modal.dataset.scheduleId = scheduleId;
    modal.dataset.scheduleName = scheduleName;
    modal.dataset.copySource = _copySource;
  }
  // Set .checked property directly — do not rely on HTML attribute alone (Mon–Fre pre-selected)
  document.querySelectorAll('#scheduleCopyModal .copy-sched-day').forEach(cb => {
    if (cb.value >= 1 && cb.value <= 5) cb.checked = true;
  });
}

function closeScheduleCopyModal() {
  const modal = document.getElementById('scheduleCopyModal');
  if (modal) modal.remove();
}

async function executeScheduleCopy(scheduleId, source) {
  const modal = document.getElementById('scheduleCopyModal');
  const resolvedId = scheduleId || (modal && modal.dataset.scheduleId);
  const resolvedSource = source || (modal && modal.dataset.copySource) || 'standard';
  const scheduleName = (modal && modal.dataset.scheduleName) || '';

  const childRadio = document.querySelector('input[name="copySchedChild"]:checked');
  if (!childRadio) {
    document.getElementById('scheduleCopyError').textContent = 'Välj ett barn';
    document.getElementById('scheduleCopyError').classList.remove('hidden');
    return;
  }

  const usePeriod = document.getElementById('copySchedUsePeriod')?.checked;
  const errEl = document.getElementById('scheduleCopyError');
  errEl.classList.add('hidden');

  const btn = document.getElementById('scheduleCopyBtn');
  btn.disabled = true;
  btn.textContent = 'Kopierar…';

  if (usePeriod) {
    const start = document.getElementById('copySchedPeriodStart')?.value;
    const end = document.getElementById('copySchedPeriodEnd')?.value;
    if (!start || !end) {
      errEl.textContent = 'Ange start- och slutdatum';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      toggleScheduleCopyPeriod();
      return;
    }
    if (end < start) {
      errEl.textContent = 'Slutdatum måste vara på eller efter startdatum';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      toggleScheduleCopyPeriod();
      return;
    }

    const body = {
      start_date: start,
      end_date: end,
      overwrite: document.getElementById('copySchedOverwrite')?.checked ?? true,
      note: scheduleName || null,
    };
    if (resolvedSource === 'family') {
      body.schedule_template_id = resolvedId;
    } else {
      body.standard_schedule_id = resolvedId;
    }

    try {
      const res = await window.apiFetch(
        `/api/children/${childRadio.value}/schedules/apply-date-range`,
        { method: 'POST', body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Schemat har kopierats för perioden!');
        closeScheduleCopyModal();
      } else {
        errEl.textContent = data.error || 'Kunde inte kopiera';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        toggleScheduleCopyPeriod();
      }
    } catch {
      showToast('Något gick fel', true);
      btn.disabled = false;
      toggleScheduleCopyPeriod();
    }
    return;
  }

  const days = Array.from(document.querySelectorAll('.copy-sched-day:checked')).map(cb => parseInt(cb.value));
  if (days.length === 0) {
    errEl.textContent = 'Välj minst en dag';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Kopiera';
    return;
  }

  try {
    // Use correct endpoint based on source type
    const endpoint = resolvedSource === 'family'
      ? `/api/schedule-templates/${resolvedId}/apply`
      : `/api/standard-library/schedules/${resolvedId}/copy`;
    const res = await window.apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        child_id: childRadio.value,
        days,
        overwrite: document.getElementById('copySchedOverwrite').checked,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Schemat har kopierats!');
      closeScheduleCopyModal();
    } else {
      errEl.textContent = data.error || 'Kunde inte kopiera';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Kopiera';
    }
  } catch {
    showToast('Något gick fel', true);
    btn.disabled = false;
    btn.textContent = 'Kopiera';
  }
}

// Copy from another child dialog — with day selection
function openCopyScheduleModal(childId, childName) {
  const otherChildren = schemaChildren.filter(c => c.id !== childId);
  if (otherChildren.length === 0 && standardSchedules.length === 0) {
    showToast('Inga källor att kopiera från', true);
    return;
  }

  const dayNames = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];

  let sourcesHtml = '';
  if (otherChildren.length > 0) {
    sourcesHtml += '<p class="text-sm font-semibold text-navy mb-2">Från annat barn:</p>';
    sourcesHtml += otherChildren.map(c =>
      `<label class="flex items-center gap-3 cursor-pointer py-1">
         <input type="radio" name="copySource" value="child:${c.id}" class="w-5 h-5 accent-gold" onchange="onCopySourceChange(this.value)">
         <span class="text-sm font-semibold text-navy">${c.emoji || '🧒'} ${escHtml(c.name)}</span>
       </label>`
    ).join('');
  }
  if (standardSchedules.length > 0) {
    sourcesHtml += '<p class="text-sm font-semibold text-navy mb-2 mt-3">Från standardbiblioteket:</p>';
    sourcesHtml += standardSchedules.map(s =>
      `<label class="flex items-center gap-3 cursor-pointer py-1">
         <input type="radio" name="copySource" value="schedule:${s.id}" class="w-5 h-5 accent-gold" onchange="onCopySourceChange(this.value)">
         <span class="text-sm text-navy">${s.icon || '📋'} ${escHtml(s.name)}</span>
       </label>`
    ).join('');
  }

  const dayCheckboxes = [1,2,3,4,5,6,0].map(d =>
    `<label class="flex items-center gap-2 cursor-pointer">
       <input type="checkbox" class="copy-from-day w-5 h-5 accent-gold" value="${d}" ${d >= 1 && d <= 5 ? 'checked' : ''}>
       <span class="text-sm text-navy">${dayNames[d]}</span>
     </label>`
  ).join('');

  const modalHtml = `
    <div id="copyFromModal" class="fixed inset-0 bg-black/50 flex items-start overflow-y-auto justify-center z-50 p-4">
      <div class="bg-white dark:bg-navy-soft rounded-2xl p-6 w-full max-w-md shadow-xl my-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-heading font-bold text-navy">📋 Kopiera schema till ${escHtml(childName)}</h3>
          <button onclick="closeCopyFromModal()" class="text-text-soft hover:text-navy text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div>${sourcesHtml}</div>
          <div id="copyFromDayPicker" class="hidden">
            <p class="text-sm font-semibold text-navy mb-2">Vilka dagar?</p>
            <div class="flex flex-wrap gap-3">${dayCheckboxes}</div>
          </div>
          <label id="copyFromOverwriteRow" class="hidden flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="copyFromOverwrite" class="w-5 h-5 accent-gold">
            <span class="text-sm text-text-soft">Skriv över befintligt schema</span>
          </label>
          <div id="copyFromError" class="text-red-500 text-sm hidden"></div>
          <div class="flex gap-3 pt-2">
            <button onclick="closeCopyFromModal()" class="flex-1 px-4 py-3 border-2 border-lavender rounded-xl font-semibold">Avbryt</button>
            <button onclick="executeCopyFrom('${childId}')" id="copyFromBtn" class="flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">Kopiera</button>
          </div>
        </div>
      </div>
    </div>`;

  closeCopyFromModal();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function onCopySourceChange(_value) {
  const dayPicker = document.getElementById('copyFromDayPicker');
  const overwriteRow = document.getElementById('copyFromOverwriteRow');
  if (dayPicker) dayPicker.classList.remove('hidden');
  if (overwriteRow) overwriteRow.classList.remove('hidden');
}

function closeCopyFromModal() {
  const m = document.getElementById('copyFromModal');
  if (m) m.remove();
}

async function executeCopyFrom(targetChildId) {
  const source = document.querySelector('input[name="copySource"]:checked');
  if (!source) {
    document.getElementById('copyFromError').textContent = 'Välj en källa';
    document.getElementById('copyFromError').classList.remove('hidden');
    return;
  }

  const [type, id] = source.value.split(':');
  const btn = document.getElementById('copyFromBtn');
  btn.disabled = true;
  btn.textContent = 'Kopierar…';

  // Get selected days (only shown after source selected)
  const dayPicker = document.getElementById('copyFromDayPicker');
  const days = dayPicker && !dayPicker.classList.contains('hidden')
    ? Array.from(document.querySelectorAll('.copy-from-day:checked')).map(cb => parseInt(cb.value))
    : [1,2,3,4,5];
  const overwrite = document.getElementById('copyFromOverwrite')?.checked ?? true;

  if (days.length === 0) {
    document.getElementById('copyFromError').textContent = 'Välj minst en dag';
    document.getElementById('copyFromError').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Kopiera';
    return;
  }

  try {
    if (type === 'schedule') {
      // Copy from standard schedule with day selection
      const res = await window.apiFetch(`/api/standard-library/schedules/${id}/copy`, {
        method: 'POST',
        body: JSON.stringify({ child_id: targetChildId, days, overwrite }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Schemat har kopierats!');
        closeCopyFromModal();
      } else {
        throw new Error(data.error);
      }
    } else if (type === 'child') {
      // Copy from source child → target child with day selection
      const res = await window.apiFetch(`/api/children/${id}/schedules/copy-to-child`, {
        method: 'POST',
        body: JSON.stringify({ target_child_id: targetChildId, days, overwrite }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Schemat har kopierats!');
        closeCopyFromModal();
      } else {
        throw new Error(data.error);
      }
    }
  } catch (err) {
    document.getElementById('copyFromError').textContent = err.message || 'Något gick fel';
    document.getElementById('copyFromError').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Kopiera';
  }
}

window.loadSchemaTab = loadSchemaTab;
window.openCreateTemplateModal = openCreateTemplateModal;
window.openScheduleCopyDialog = openScheduleCopyDialog;
window.toggleScheduleCopyPeriod = toggleScheduleCopyPeriod;
window.renderStdScheduleItem = renderStdScheduleItem;
window.toggleStdSubSteps = toggleStdSubSteps;
window.toggleTemplateFavorite = toggleTemplateFavorite;
window.executeCreateTemplate = executeCreateTemplate;
window.deleteTemplate = deleteTemplate;
window.openCopyFamilyTemplateDialog = openCopyFamilyTemplateDialog;
window.executeScheduleCopy = executeScheduleCopy;
window.openCopyScheduleModal = openCopyScheduleModal;
window.onCopySourceChange = onCopySourceChange;
window.executeCopyFrom = executeCopyFrom;
