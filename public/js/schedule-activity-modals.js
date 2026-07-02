/**
 * Schedule activity modals (Fas 8 PR-S3).
 * Add/edit/create/recurrence modals — extracted from schedule.js.
 * Reads shared globals from schedule.js; handlers on window for inline onclick.
 */
(function () {
  'use strict';

  const { DAYS } = window.ScheduleCore;

  function escHtml(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return String(s || '');
  }

// ── Activity template modal ───────────────────────────────
async function loadTemplates() {
  const res = await window.apiFetch('/api/activities');
  if (res.ok) allTemplates = await res.json();
}

// Standard library activities cache for search cross-matching
let _schedStdActivities = [];
let _schedStdLoaded = false;
async function ensureSchedStdLoaded() {
  if (_schedStdLoaded) return;
  try {
    const res = await window.apiFetch('/api/standard-library');
    if (res.ok) {
      const groups = await res.json();
      _schedStdActivities = [];
      for (const g of groups) {
        for (const a of (g.activities || [])) {
          _schedStdActivities.push({ ...a, _groupName: g.name });
        }
      }
      _schedStdLoaded = true;
    }
  } catch {}
}

// Copy a standard library activity to own templates, then add to schedule
async function copyAndAddStdActivity(stdAct) {
  const listEl = document.getElementById('templateList');
  listEl.innerHTML = '<div class="text-center text-text-soft text-sm py-4">Kopierar aktiviteten…</div>';
  const body = {
    name: stdAct.name,
    icon: stdAct.icon || null,
    time_group: stdAct.time_group || addSectionOverride || 'morgon',
    star_value: stdAct.star_value || 1,
    is_favorite: false,
    feedback_for: 'both',
  };
  const res = await window.apiFetch('/api/activities', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    showToast(`"${stdAct.name}" kopierad till ditt bibliotek`);
    // Reload templates and select the new one
    await loadTemplates();
    selectTemplate(data.id);
  } else {
    showToast(data.error || 'Kunde inte kopiera aktiviteten', true);
    renderTemplateList(document.getElementById('templateSearch').value);
  }
}
function openAddModal(sectionKey) {
  selectedTemplateId = null;
  document.getElementById('addActivityError').classList.add('hidden');
  document.getElementById('addStartTime').value = ''; document.getElementById('addEndTime').value = '';
  // Show tip message when both time fields are empty, hide when either is filled
  const tipMsg = document.getElementById('timeTipMsg');
  if (tipMsg) {
    tipMsg.classList.remove('hidden');
    const hideTip = () => { const s = document.getElementById('addStartTime'); const e = document.getElementById('addEndTime'); if (s?.value || e?.value) tipMsg.classList.add('hidden'); };
    document.getElementById('addStartTime').removeEventListener('input', hideTip);
    document.getElementById('addEndTime').removeEventListener('input', hideTip);
    document.getElementById('addStartTime').addEventListener('input', hideTip);
    document.getElementById('addEndTime').addEventListener('input', hideTip);
  }
  document.getElementById('selectedTemplateInfo').classList.add('hidden');
  document.getElementById('templateSearch').value = '';
  // Reset multi-section to just the requested section
  addSectionsMulti = new Set([sectionKey || 'dag']);
  pickSection(sectionKey || 'dag');
  renderTemplateList('');
  // Collapse time section on open
  document.getElementById('addTimeFields').classList.add('hidden');
  document.getElementById('addTimeChevron').textContent = '▸';
  document.getElementById('addTimeSummary').textContent = '';
  document.getElementById('addTimeSummary').classList.add('hidden');
  const addModal = document.getElementById('addActivityModal');
  addModal.classList.remove('hidden');
  addModal.scrollTop = 0;
  setTimeout(()=>{ addModal.scrollTop = 0; document.getElementById('templateSearch').focus(); },100);
}
function closeAddModal() { document.getElementById('addActivityModal').classList.add('hidden'); }
async function filterTemplates() {
  const q = document.getElementById('templateSearch').value;
  if (q) { ensureSchedStdLoaded(); } // fire-and-forget; re-render after load completes
  renderTemplateList(q);
  if (q && !_schedStdLoaded) {
    await ensureSchedStdLoaded();
    renderTemplateList(document.getElementById('templateSearch').value);
  }
}
function renderTemplateList(q) {
  const list = document.getElementById('templateList');
  let items = allTemplates;
  if (q) items = items.filter(t=>t.name&&t.name.toLowerCase().includes(q.toLowerCase()));
  const used = new Set(scheduleItems.filter(i=>i.section===addSectionOverride).map(i=>i.activity_template_id));
  items = items.filter(t=>!used.has(t.id)).sort((a,b)=>(b.is_favorite?1:0)-(a.is_favorite?1:0));

  // Standard library matches (only when searching and not already in own)
  let stdMatches = [];
  if (q && _schedStdLoaded) {
    const ownNames = new Set(allTemplates.map(t => t.name.toLowerCase()));
    stdMatches = _schedStdActivities.filter(a =>
      a.name && a.name.toLowerCase().includes(q.toLowerCase()) && !ownNames.has(a.name.toLowerCase())
    ).slice(0, 5);
  }

  if (!items.length && !stdMatches.length) {
    const qEsc = q ? escHtml(q) : '';
    // Use single-quote escaping to avoid JSON.stringify breaking the HTML onclick attribute
    const qSafe = (q||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    list.innerHTML=`<div class="text-center py-4">
      <p class="text-text-soft text-sm mb-3">Inga aktiviteter hittades${q?' för "'+qEsc+'"':''}.</p>
      <button type="button" onclick="openCreateActivityModal('${qSafe}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">✨ Skapa ny aktivitet</button>
    </div>`;
    return;
  }
  const grouped={}; const unc=[];
  for (const t of items) { const cn=t.category_name||null; if(cn){if(!grouped[cn])grouped[cn]={sort:t.category_sort_order||999,items:[]};grouped[cn].items.push(t);}else unc.push(t); }
  const sc=Object.entries(grouped).sort((a,b)=>a[1].sort-b[1].sort);
  let html='';
  for (const [cn,g] of sc) { html+=`<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">${escHtml(cn)}</div>`+g.items.map(t=>renderTemplateItem(t)).join(''); }
  if (unc.length>0) { if(sc.length>0) html+=`<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">Övriga</div>`; html+=unc.map(t=>renderTemplateItem(t)).join(''); }
  // Add standard library section if matches
  if (stdMatches.length > 0) {
    html += `<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">📚 Standardbibliotek</div>`;
    html += stdMatches.map(a => `
      <div class="flex items-center gap-3 px-3 py-2 rounded-xl bg-sky/40 border border-blue-100 hover:border-gold transition-colors mb-1">
        <span class="text-2xl">${a.icon||'📌'}</span>
        <div class="flex-1 min-w-0"><div class="font-semibold text-sm text-navy truncate">${escHtml(a.name)}</div><div class="text-xs text-text-soft">${'⭐'.repeat(a.star_value||0)} · ${escHtml(a._groupName)}</div></div>
        <button type="button" onclick='copyAndAddStdActivity(${JSON.stringify(a).replace(/'/g,"&#x27;")})' class="px-3 py-1.5 bg-gold hover:bg-yellow-500 text-white rounded-lg text-xs font-semibold flex-shrink-0 whitespace-nowrap">📥 Kopiera</button>
      </div>`).join('');
  }
  // Always show "Skapa ny" at the bottom (matches dashboard.js behavior)
  html += `<div class="border-t border-lavender mt-2 pt-2 text-center"><button type="button" onclick="openCreateActivityModal('')" class="text-sm text-gold font-semibold hover:underline">✨ Skapa ny aktivitet</button></div>`;
  list.innerHTML = html;
}
function renderTemplateItem(t) {
  return `<button type="button" onclick="selectTemplate('${t.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sky transition-colors text-left ${selectedTemplateId===t.id?'bg-sky border-2 border-gold':'border-2 border-transparent'}" data-tid="${t.id}">
    <span class="text-2xl">${t.icon||'📌'}</span>
    <div class="flex-1 min-w-0"><div class="font-semibold text-sm text-navy truncate">${escHtml(t.name)}</div><div class="text-xs text-text-soft">${'⭐'.repeat(t.star_value||0)}</div></div>
  </button>`;
}
function selectTemplate(id) {
  selectedTemplateId = id; const t=allTemplates.find(x=>x.id===id); if(!t)return;
  document.getElementById('selTemplateIcon').textContent=t.icon||'📌';
  document.getElementById('selTemplateName').textContent=t.name;
  document.getElementById('selTemplateStars').textContent='⭐'.repeat(t.star_value||0);
  document.getElementById('selectedTemplateInfo').classList.remove('hidden');
  document.querySelectorAll('#templateList button').forEach(b=>{b.classList.toggle('border-gold',b.dataset.tid===id);b.classList.toggle('bg-sky',b.dataset.tid===id);});
}
function clearSelectedTemplate() { selectedTemplateId=null; document.getElementById('selectedTemplateInfo').classList.add('hidden'); renderTemplateList(document.getElementById('templateSearch').value); }
function pickSection(sec) {
  // Single-select (legacy — kept for calls from non-multi contexts)
  addSectionOverride = sec;
  addSectionsMulti = new Set([sec]);
  document.getElementById('addSection').value = sec;
  document.querySelectorAll('.section-pick-btn').forEach(btn => {
    const s = btn.dataset.sec === sec;
    btn.classList.toggle('bg-navy', s);
    btn.classList.toggle('text-white', s);
    btn.classList.toggle('border-navy', s);
  });
  if (!document.getElementById('addActivityModal').classList.contains('hidden')) renderTemplateList(document.getElementById('templateSearch').value);
}

function toggleSection(sec) {
  // Multi-select: toggle sec in/out of addSectionsMulti
  if (addSectionsMulti.has(sec)) {
    if (addSectionsMulti.size > 1) addSectionsMulti.delete(sec); // keep at least one
  } else {
    addSectionsMulti.add(sec);
  }
  // Update primary addSectionOverride to last toggled-on sec
  addSectionOverride = [...addSectionsMulti][addSectionsMulti.size - 1];
  document.getElementById('addSection').value = addSectionOverride;
  // Highlight all selected
  document.querySelectorAll('.section-pick-btn').forEach(btn => {
    const active = addSectionsMulti.has(btn.dataset.sec);
    btn.classList.toggle('bg-navy', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('border-navy', active);
  });
  if (!document.getElementById('addActivityModal').classList.contains('hidden')) renderTemplateList(document.getElementById('templateSearch').value);
}
async function submitAddActivity() {
  // Template editing mode: add item directly to template schedule (no recurrence)
  if (templateMode && currentTemplateId) {
    if (!selectedTemplateId) { document.getElementById('addActivityError').textContent='Välj en aktivitet först'; document.getElementById('addActivityError').classList.remove('hidden'); return; }
    const addBtn = document.getElementById('addActivityBtn');
    addBtn.disabled = true; addBtn.textContent = 'Sparar…';
    try {
      const res = await window.apiFetch(`/api/schedules/${currentTemplateId}/items`, {
        method: 'POST',
        body: JSON.stringify({ activity_template_id: selectedTemplateId, section: addSectionOverride }),
      });
      if (res.ok) {
        // Reload template to get updated items
        const tplRes = await window.apiFetch(`/api/schedule-templates/${currentTemplateId}`);
        if (tplRes.ok) { const data = await tplRes.json(); templateItems = data.items || []; }
        showToast('Aktivitet tillagd i schemamallen');
        closeAddModal();
        window.renderTemplate();
      } else {
        const err = await res.json();
        document.getElementById('addActivityError').textContent = err.error || 'Kunde inte spara';
        document.getElementById('addActivityError').classList.remove('hidden');
      }
    } finally {
      addBtn.disabled = false; addBtn.textContent = 'Lägg till';
    }
    return;
  }

  // Normal child schedule mode
  if (!selectedTemplateId) { document.getElementById('addActivityError').textContent='Välj en aktivitet'; document.getElementById('addActivityError').classList.remove('hidden'); return; }
  // Time validation: end_time must not be before start_time
  const addStart = document.getElementById('addStartTime').value;
  const addEnd = document.getElementById('addEndTime').value;
  if (addStart && addEnd && addEnd < addStart) {
    document.getElementById('addActivityError').textContent='Sluttid kan inte vara före starttid';
    document.getElementById('addActivityError').classList.remove('hidden');
    return;
  }
  // Store pending data and show recurrence choice BEFORE creating anything
  const tpl = allTemplates.find(t=>t.id===selectedTemplateId);
  _pendingRecurrenceTemplateId = selectedTemplateId;
  _pendingRecurrenceTemplateName = tpl ? tpl.name : 'Aktiviteten';
  _pendingRecurrenceSection = addSectionOverride;
  _pendingRecurrenceSections = [...addSectionsMulti]; // multi-slot
  _pendingRecurrenceStart = addStart || null;
  _pendingRecurrenceEnd = addEnd || null;
  closeAddModal();
  openRecurrenceModal();
}

// ── Recurrence modal helpers ──────────────────────────────

function getCurrentDayDate() {
  // Returns the actual calendar Date for the currently viewed day
  if (calView === 'day') {
    return window.getDayFromOffset(dayOffset);
  }
  // Week view: getWeekStart(weekOffset) returns Monday.
  // currentDay: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const ws = window.getWeekStart(weekOffset); // Monday
  const dayDiff = currentDay === 0 ? 6 : currentDay - 1; // Mon=0..Sun=6 offset from Monday
  const d = new Date(ws);
  d.setDate(ws.getDate() + dayDiff);
  return d;
}

function formatDateSv(d) {
  return d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toDateStr(d) {
  return d.toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

const REC_DAYS_LABELS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
// Track selected days for multi-day recurrence (DOW values)
let _recurrenceDaySelections = [];

function bindRecurrenceAddHandlers() {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  if (!onceBtn || !weeklyBtn) return;
  onceBtn.removeAttribute('onclick');
  weeklyBtn.removeAttribute('onclick');
  onceBtn.disabled = false;
  weeklyBtn.disabled = false;
  onceBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    confirmRecurrence('once');
  };
  weeklyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showRecurrenceDayPicker();
  };
}

function bindRecurrenceDeleteHandlers(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (!onceBtn || !weeklyBtn) return;
  onceBtn.removeAttribute('onclick');
  weeklyBtn.removeAttribute('onclick');
  onceBtn.disabled = false;
  weeklyBtn.disabled = false;
  if (allDaysBtn) {
    allDaysBtn.removeAttribute('onclick');
    allDaysBtn.disabled = false;
    allDaysBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteAllDays(itemId);
    };
  }
  onceBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteOnce(itemId);
  };
  weeklyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAll(itemId);
  };
}

function openRecurrenceModal() {
  const d = getCurrentDayDate();
  const dayDateStr = formatDateSv(d);

  document.getElementById('recurrenceActivityName').textContent = `"${_pendingRecurrenceTemplateName}"`;
  document.getElementById('recurrenceOnceLbl').textContent = `Bara ${dayDateStr}`;
  document.getElementById('recurrenceError').classList.add('hidden');
  // Reset to step 1
  document.getElementById('recurrenceStep1').classList.remove('hidden');
  document.getElementById('recurrenceStep2').classList.add('hidden');
  _recurrenceDaySelections = [currentDay]; // pre-select current day
  bindRecurrenceAddHandlers();
  document.getElementById('recurrenceModal').classList.remove('hidden');
}

function showRecurrenceDayPicker() {
  // Build day-of-week checkboxes; pre-select currentDay
  const picker = document.getElementById('recurrenceDayPicker');
  const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  picker.innerHTML = DOW_ORDER.map(dow => {
    const isSelected = _recurrenceDaySelections.includes(dow);
    return `<button type="button" onclick="toggleRecurrenceDay(${dow}, this)"
      data-dow="${dow}"
      class="py-2 px-1 rounded-xl border-2 text-xs font-bold transition-colors ${isSelected ? 'bg-navy text-white border-navy' : 'border-lavender text-navy hover:border-navy'}"
    >${REC_DAYS_LABELS[dow]}</button>`;
  }).join('');
  document.getElementById('recurrenceStep1').classList.add('hidden');
  document.getElementById('recurrenceStep2').classList.remove('hidden');
}

function toggleRecurrenceDay(dow, btn) {
  const idx = _recurrenceDaySelections.indexOf(dow);
  if (idx === -1) {
    _recurrenceDaySelections.push(dow);
    btn.classList.add('bg-navy', 'text-white', 'border-navy');
    btn.classList.remove('border-lavender');
  } else {
    _recurrenceDaySelections.splice(idx, 1);
    btn.classList.remove('bg-navy', 'text-white', 'border-navy');
    btn.classList.add('border-lavender');
  }
}

function backToRecurrenceStep1() {
  document.getElementById('recurrenceStep2').classList.add('hidden');
  document.getElementById('recurrenceStep1').classList.remove('hidden');
}

function closeRecurrenceModal() {
  document.getElementById('recurrenceModal').classList.add('hidden');
}

async function confirmRecurrenceMultiDay() {
  if (_recurrenceDaySelections.length === 0) {
    showToast('Välj minst en dag', true);
    return;
  }
  const confirmBtn = document.getElementById('recurrenceMultiDayConfirmBtn');
  confirmBtn.disabled = true;
  document.getElementById('recurrenceError').classList.add('hidden');

  const sections = _pendingRecurrenceSections && _pendingRecurrenceSections.length > 0
    ? _pendingRecurrenceSections : [_pendingRecurrenceSection];

  let addedCount = 0;
  let errorOccurred = false;

  try {
    for (const dow of _recurrenceDaySelections) {
      // Ensure schedule exists for this dow
      let schedId = null;
      const existingSchedules = await (await window.apiFetch(`/api/children/${currentChildId}/schedules`)).json();
      const existing = Array.isArray(existingSchedules) ? existingSchedules.find(s => s.day_of_week === dow) : null;
      if (existing) {
        schedId = existing.id;
      } else {
        const sRes = await window.apiFetch(`/api/children/${currentChildId}/schedules`, {
          method: 'POST', body: JSON.stringify({ day_of_week: dow })
        });
        const sData = await sRes.json();
        if (sRes.ok) schedId = sData.id;
        else if (sRes.status === 409 && sData.id) schedId = sData.id;
        else { errorOccurred = true; break; }
      }

      for (const sec of sections) {
        // Strip null time values — backend expects undefined (missing), not null
        const itemBody = { activity_template_id: _pendingRecurrenceTemplateId, section: sec };
        if (_pendingRecurrenceStart) itemBody.start_time = _pendingRecurrenceStart;
        if (_pendingRecurrenceEnd) itemBody.end_time = _pendingRecurrenceEnd;
        const res = await window.apiFetch(`/api/schedules/${schedId}/items`, {
          method: 'POST',
          body: JSON.stringify(itemBody)
        });
        if (res.ok) addedCount++;
        else {
          const err = await res.json();
          if (!err.error || !err.error.includes('finns redan')) errorOccurred = true;
        }
      }
    }

    document.getElementById('recurrenceModal').classList.add('hidden');
    if (errorOccurred) showToast('Aktiviteten lades till på några dagar (fel på andra)', true);
    else {
      const dayNames = _recurrenceDaySelections.map(d => REC_DAYS_LABELS[d]).join(', ');
      showToast(`Aktiviteten tillagd varje vecka: ${dayNames} ✅`);
    }
    await loadScheduleForDay();
  } catch (e) {
    document.getElementById('recurrenceError').textContent = 'Nätverksfel. Försök igen.';
    document.getElementById('recurrenceError').classList.remove('hidden');
  } finally {
    confirmBtn.disabled = false;
  }
}

// ── Once-to-day (matches dashboard.js addActivityToDay) ──

// Get ISO date string (YYYY-MM-DD) for the currently viewed day.
// Used by deleteOnce ("bara denna dag") to tell the server which date to exclude.
function getCurrentDayDateStr() {
  const d = getCurrentDayDate();
  if (!d || !isFinite(d) || !d.getFullYear || !isFinite(d.getFullYear())) return null;
  const yyyy = d.getFullYear();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
}

async function addOnceToDay() {
  const tpl = allTemplates.find((t) => t.id === _pendingRecurrenceTemplateId);
  if (!tpl) return false;
  const dateStr = getCurrentDayDateStr();
  if (!dateStr) return false;
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/once-tasks`, {
    method: 'POST',
    body: JSON.stringify({
      name: tpl.name,
      icon: tpl.icon || '📌',
      section: _pendingRecurrenceSection || 'dag',
      date: dateStr,
      start_time: _pendingRecurrenceStart || null,
      end_time: _pendingRecurrenceEnd || null,
      star_value: tpl.star_value || 1,
      activity_template_id: _pendingRecurrenceTemplateId,
    }),
  });
  if (!res.ok) {
    try { const err = await res.json(); console.warn('[SCHEDULE] addOnceToDay failed:', err); } catch (_) {}
  }
  return res.ok;
}

async function confirmRecurrence(choice) {
  // choice is always 'once' now — 'weekly' is replaced by confirmRecurrenceMultiDay
  document.getElementById('recurrenceError').classList.add('hidden');
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');

  onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;

  try {
    const d = getCurrentDayDate();
    const ok = await addOnceToDay();
    if (ok) {
      document.getElementById('recurrenceModal').classList.add('hidden');
      showToast(`Aktiviteten har lagts till för ${formatDateSv(d)} ✅`);
      await loadScheduleForDay();
    } else {
      document.getElementById('recurrenceError').textContent = 'Kunde inte lägga till aktiviteten. Försök igen.';
      document.getElementById('recurrenceError').classList.remove('hidden');
      onceBtn.disabled = false;
      if (weeklyBtn) weeklyBtn.disabled = false;
    }
  } catch (e) {
    document.getElementById('recurrenceError').textContent = 'Nätverksfel. Försök igen.';
    document.getElementById('recurrenceError').classList.remove('hidden');
    onceBtn.disabled = false;
    if (weeklyBtn) weeklyBtn.disabled = false;
  }
}

// ── Emoji grid helper ────────────────────────────────────
const QUICK_EMOJIS = ['🪥','🧼','🚿','🍳','🥣','🥗','🥪','🍎','📚','✏️','📝','🎒','🎨','🎮','🧩','⚽','🏀','🎵','😴','🛏️','🌙','🧸','🚴','🏊','🌳','🏃','🧹','🧺','⭐','🏆','🎉','🌅','☀️','🌆','📌','❤️','💪','🌈','🐱','🐶','🎯','🎲'];
function renderEmojiGrid(gridId, inputId, previewId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = QUICK_EMOJIS.map(e =>
    `<button type="button" onclick="setEmoji('${gridId}','${inputId}','${previewId}','${e}')" class="text-xl p-1 rounded-lg hover:bg-sky transition-colors">${e}</button>`
  ).join('');
}
function setEmoji(gridId, inputId, previewId, emoji) {
  document.getElementById(inputId).value = emoji;
  document.getElementById(previewId).textContent = emoji;
}
function previewNewActEmoji() {
  const v = document.getElementById('newActEmojiInput').value.trim();
  if (v) resetNewActIconKey();
  document.getElementById('newActEmojiPreview').textContent = v || '📌';
}

let _newActIconKey = null;
let _pictogramList = null;

function resetNewActIconKey() {
  _newActIconKey = null;
  const hidden = document.getElementById('newActIconKeyInput');
  if (hidden) hidden.value = '';
  const panel = document.getElementById('newActPictogramPanel');
  if (panel) panel.classList.add('hidden');
  const toggle = document.getElementById('newActPictogramToggle');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

async function ensurePictogramList() {
  if (_pictogramList) return _pictogramList;
  if (window.PictogramRegistry && window.PictogramRegistry.load) {
    await window.PictogramRegistry.load();
  }
  try {
    const res = await window.apiFetch('/api/pictograms');
    if (res.ok) {
      const data = await res.json();
      _pictogramList = Array.isArray(data) ? data : (data.pictograms || []);
    } else {
      _pictogramList = [];
    }
  } catch (_) {
    _pictogramList = [];
  }
  return _pictogramList;
}

function renderNewActPictogramGrid(filter) {
  const grid = document.getElementById('newActPictogramGrid');
  if (!grid || !_pictogramList) return;
  const q = (filter || '').trim().toLowerCase();
  const rows = _pictogramList.filter(function (p) {
    if (!q) return true;
    return p.label.toLowerCase().includes(q) || p.key.includes(q);
  });
  grid.innerHTML = rows.slice(0, 72).map(function (p) {
    const selected = _newActIconKey === p.key ? ' ring-2 ring-gold bg-white' : '';
    return '<button type="button" onclick="selectNewActPictogram(\'' + p.key + '\')" class="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white transition-colors text-xl' + selected + '" title="' + escHtml(p.label) + '">' + p.emoji + '</button>';
  }).join('');
}

async function toggleNewActPictogramPanel() {
  const panel = document.getElementById('newActPictogramPanel');
  const toggle = document.getElementById('newActPictogramToggle');
  if (!panel) return;
  const willShow = panel.classList.contains('hidden');
  if (willShow) {
    await ensurePictogramList();
    const searchEl = document.getElementById('newActPictogramSearch');
    renderNewActPictogramGrid(searchEl ? searchEl.value : '');
    panel.classList.remove('hidden');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  } else {
    panel.classList.add('hidden');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
}

function selectNewActPictogram(key) {
  _newActIconKey = key;
  const hidden = document.getElementById('newActIconKeyInput');
  if (hidden) hidden.value = key;
  const pic = (_pictogramList || []).find(function (p) { return p.key === key; });
  const preview = document.getElementById('newActEmojiPreview');
  if (pic && preview) preview.textContent = pic.emoji;
  const searchEl = document.getElementById('newActPictogramSearch');
  renderNewActPictogramGrid(searchEl ? searchEl.value : '');
}

function clearNewActPictogram() {
  resetNewActIconKey();
  previewNewActEmoji();
}

function filterNewActPictograms(val) {
  renderNewActPictogramGrid(val);
}
function previewEditTplEmoji() {
  const v = document.getElementById('editTplEmojiInput').value.trim();
  document.getElementById('editTplEmojiPreview').textContent = v || '📌';
}
function pickStarVal(val) {
  document.getElementById('newActStarValue').value = val;
  document.querySelectorAll('.star-val-btn').forEach(b => {
    const active = parseInt(b.dataset.val) === val;
    b.classList.toggle('bg-navy', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('border-navy', active);
  });
}

// ── Create Activity Inline ────────────────────────────────
let _newActSubsteps = []; // { name, icon }

function openCreateActivityModal(prefillName) {
  _newActSubsteps = [];
  resetNewActIconKey();
  document.getElementById('newActName').value = prefillName || '';
  document.getElementById('newActEmojiInput').value = '';
  document.getElementById('newActEmojiPreview').textContent = '📌';
  document.getElementById('newActStarValue').value = '1';
  document.getElementById('newActSubstepInput').value = '';
  document.getElementById('createActivityError').classList.add('hidden');
  renderEmojiGrid('newActEmojiGrid', 'newActEmojiInput', 'newActEmojiPreview');
  pickStarVal(1);
  renderNewActSubsteps();
  document.getElementById('createActivityModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('newActName').focus(), 100);
}
function closeCreateActivityModal() {
  document.getElementById('createActivityModal').classList.add('hidden');
}
function renderNewActSubsteps() {
  const list = document.getElementById('newActSubstepList');
  if (_newActSubsteps.length === 0) { list.innerHTML = ''; return; }
  list.innerHTML = _newActSubsteps.map((s, i) =>
    `<div class="flex items-center gap-2 bg-sky/50 rounded-lg px-3 py-1.5">
      <span class="text-sm flex-1">${escHtml(s.name)}</span>
      <button type="button" onclick="removeNewActSubstep(${i})" class="text-text-soft hover:text-red-500 text-sm">✕</button>
    </div>`
  ).join('');
}
function addNewActSubstep() {
  const input = document.getElementById('newActSubstepInput');
  const name = input.value.trim();
  if (!name) return;
  _newActSubsteps.push({ name, icon: null });
  input.value = '';
  renderNewActSubsteps();
}
function removeNewActSubstep(idx) {
  _newActSubsteps.splice(idx, 1);
  renderNewActSubsteps();
}
async function submitCreateActivity() {
  const submitBtn = document.getElementById('createActivitySubmitBtn');
  try {
    if (submitBtn) submitBtn.disabled = true;
    const modalSpinner = document.getElementById('createActivitySpinner');
    if (modalSpinner) modalSpinner.classList.add('hidden');

    const name = document.getElementById('newActName').value.trim();
    if (!name) {
      document.getElementById('createActivityError').textContent = 'Namn krävs';
      document.getElementById('createActivityError').classList.remove('hidden');
      return;
    }
    const icon = document.getElementById('newActEmojiInput').value.trim() || null;
    const starValue = parseInt(document.getElementById('newActStarValue').value, 10) || 1;
    const iconKeyEl = document.getElementById('newActIconKeyInput');
    const iconKey = iconKeyEl && iconKeyEl.value ? iconKeyEl.value.trim() : null;
    document.getElementById('createActivityError').classList.add('hidden');

    const createBody = { name, icon, star_value: starValue, is_favorite: false, feedback_for: 'both', time_group: addSectionOverride === 'morgon' ? 'morgon' : addSectionOverride === 'kvall' ? 'kvall' : 'morgon' };
    if (iconKey) createBody.icon_key = iconKey;

    // Create the activity template
    const res = await window.apiFetch('/api/activities', {
      method: 'POST',
      body: JSON.stringify(createBody)
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('createActivityError').textContent = data.error || 'Kunde inte skapa aktiviteten';
      document.getElementById('createActivityError').classList.remove('hidden');
      return;
    }

    // Add substeps — mirror library.js pattern
    let failedSteps = 0;
    for (const step of _newActSubsteps) {
      const stepRes = await window.apiFetch(`/api/activities/${data.id}/sub-steps`, {
        method: 'POST',
        body: JSON.stringify({ name: step.name, icon: step.icon })
      });
      if (!stepRes.ok) failedSteps++;
    }

    closeCreateActivityModal();
    closeAddModal();

    if (failedSteps > 0) {
      showToast(`Aktiviteten skapades men ${failedSteps} delsteg misslyckades`, true);
    } else {
      showToast(`"${name}" skapad och tillagd i ditt bibliotek!`);
    }

    // Reload templates and select the new one (then open recurrence)
    await loadTemplates();
    selectedTemplateId = data.id;
    _pendingRecurrenceTemplateId = data.id;
    _pendingRecurrenceTemplateName = name;
    _pendingRecurrenceSections = [...addSectionsMulti];
    _pendingRecurrenceSection = addSectionOverride;
    _pendingRecurrenceStart = document.getElementById('addStartTime')?.value || null;
    _pendingRecurrenceEnd = document.getElementById('addEndTime')?.value || null;
    openRecurrenceModal();
  } catch (e) {
    const modalSpinner = document.getElementById('createActivitySpinner');
    if (modalSpinner) modalSpinner.classList.add('hidden');
    showToast('Nätverksfel. Försök igen.', true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ── Edit Template Modal (name, emoji, substeps) ───────────
let _editTplSubsteps = []; // { id, name, icon, _deleted }

// BUG-17/BUG-19/BUG-24: redigera-koppling — rör inte
async function openEditTemplateModal(templateId) {
  if (!templateId) return;
  // Find template in allTemplates
  const tpl = allTemplates.find(t => t.id === templateId);
  if (!tpl) { showToast('Aktiviteten hittades inte', true); return; }

  try {
    document.getElementById('editTplId').value = templateId;
    document.getElementById('editTplName').value = tpl.name || '';
    const icon = tpl.icon || '📌';
    document.getElementById('editTplEmojiInput').value = icon !== '📌' ? icon : '';
    document.getElementById('editTplEmojiPreview').textContent = icon;
    document.getElementById('editTemplateError').classList.add('hidden');

    if (typeof renderEmojiGrid === 'function') renderEmojiGrid('editTplEmojiGrid', 'editTplEmojiInput', 'editTplEmojiPreview');

    // Load substeps
    _editTplSubsteps = [];
    try {
      const res = await window.apiFetch(`/api/activities/${templateId}/sub-steps`);
      if (res.ok) {
        const raw = await res.json();
        const steps = Array.isArray(raw) ? raw : (raw.sub_steps || []);
        _editTplSubsteps = steps.map(s => ({ id: s.id, name: s.name, icon: s.icon, _deleted: false }));
      }
    } catch (_) {}

    document.getElementById('editTplSubstepInput').value = '';
    if (typeof renderEditTplSubsteps === 'function') renderEditTplSubsteps();

    const modal = document.getElementById('editTemplateModal');
    if (!modal) { showToast('Kunde inte öppna redigeraren — sidan behöver laddas om', true); return; }
    modal.classList.remove('hidden');
  } catch (e) {
    showToast('Kunde inte öppna redigeraren', true);
    console.error('openEditTemplateModal:', e);
  }
  setTimeout(() => document.getElementById('editTplName').focus(), 100);
}

function closeEditTemplateModal() {
  document.getElementById('editTemplateModal').classList.add('hidden');
}

function renderEditTplSubsteps() {
  const list = document.getElementById('editTplSubstepList');
  const visible = _editTplSubsteps.filter(s => !s._deleted);
  if (visible.length === 0) { list.innerHTML = ''; return; }
  list.innerHTML = visible.map((s, vi) => {
    const realIdx = _editTplSubsteps.indexOf(s);
    return `<div class="flex items-center gap-2 bg-sky/50 rounded-lg px-3 py-1.5">
      <span class="text-sm flex-1">${escHtml(s.name)}</span>
      <button type="button" onclick="removeEditTplSubstep(${realIdx})" class="text-text-soft hover:text-red-500 text-sm">✕</button>
    </div>`;
  }).join('');
}

function addEditTplSubstep() {
  const input = document.getElementById('editTplSubstepInput');
  const name = input.value.trim();
  if (!name) return;
  _editTplSubsteps.push({ id: null, name, icon: null, _deleted: false });
  input.value = '';
  renderEditTplSubsteps();
}

function removeEditTplSubstep(idx) {
  if (_editTplSubsteps[idx].id) {
    _editTplSubsteps[idx]._deleted = true; // will be deleted on save
  } else {
    _editTplSubsteps.splice(idx, 1);
  }
  renderEditTplSubsteps();
}

async function submitEditTemplate() {
  const templateId = document.getElementById('editTplId').value;
  const name = document.getElementById('editTplName').value.trim();
  if (!name) {
    document.getElementById('editTemplateError').textContent = 'Namn krävs';
    document.getElementById('editTemplateError').classList.remove('hidden');
    return;
  }
  const icon = document.getElementById('editTplEmojiInput').value.trim() || null;
  document.getElementById('editTemplateError').classList.add('hidden');

  // Update template
  const res = await window.apiFetch(`/api/activities/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify({ name, icon })
  });
  if (!res.ok) {
    const err = await res.json();
    document.getElementById('editTemplateError').textContent = err.error || 'Kunde inte spara';
    document.getElementById('editTemplateError').classList.remove('hidden');
    return;
  }

  // Handle substep changes
  for (const step of _editTplSubsteps) {
    if (step._deleted && step.id) {
      await window.apiFetch(`/api/activities/${templateId}/sub-steps/${step.id}`, { method: 'DELETE' });
    } else if (!step.id && !step._deleted) {
      await window.apiFetch(`/api/activities/${templateId}/sub-steps`, {
        method: 'POST',
        body: JSON.stringify({ name: step.name, icon: step.icon })
      });
    }
  }

  closeEditTemplateModal();
  showToast(`"${name}" uppdaterad — ändringen gäller alla barn och dagar ✅`);
  // Reload templates + schedule
  // Sub-steps are inline now — no cache to invalidate
  await loadTemplates();
  await loadScheduleForDay();
}

// ── Edit/remove item ──────────────────────────────────────
function openEditItem(itemId) {
  const item=scheduleItems.find(i=>i.id==itemId); if(!item)return;
  document.getElementById('editItemId').value=itemId;
  const startVal = item.start_time ? item.start_time.substring(0,5) : '';
  const endVal = item.end_time ? item.end_time.substring(0,5) : '';
  document.getElementById('editStartTime').value=startVal;
  document.getElementById('editEndTime').value=endVal;
  setEditSection(item.section||'dag');
  // Auto-expand time section if item already has a time; otherwise collapse
  const hasTime = !!startVal;
  const timeFields = document.getElementById('editTimeFields');
  const chevron = document.getElementById('editTimeChevron');
  const summary = document.getElementById('editTimeSummary');
  if (hasTime) {
    timeFields.classList.remove('hidden');
    chevron.textContent = '▾';
    const t = startVal + (endVal ? '–' + endVal : '');
    summary.textContent = t;
    summary.classList.remove('hidden');
  } else {
    timeFields.classList.add('hidden');
    chevron.textContent = '▸';
    summary.textContent = '';
    summary.classList.add('hidden');
  }
  document.getElementById('editItemModal').classList.remove('hidden');
}
function closeEditItemModal(){document.getElementById('editItemModal').classList.add('hidden');}

function toggleAddTimeSection() {
  const fields = document.getElementById('addTimeFields');
  const chevron = document.getElementById('addTimeChevron');
  const hidden = fields.classList.toggle('hidden');
  chevron.textContent = hidden ? '▸' : '▾';
}
function updateAddTimeSummary() {
  const s = document.getElementById('addStartTime').value;
  const e = document.getElementById('addEndTime').value;
  const summary = document.getElementById('addTimeSummary');
  if (s) { summary.textContent = s + (e ? '–' + e : ''); summary.classList.remove('hidden'); }
  else { summary.textContent = ''; summary.classList.add('hidden'); }
}
function toggleEditTimeSection() {
  const fields = document.getElementById('editTimeFields');
  const chevron = document.getElementById('editTimeChevron');
  const hidden = fields.classList.toggle('hidden');
  chevron.textContent = hidden ? '▸' : '▾';
  if (hidden) updateEditTimeSummary();
}
function updateEditTimeSummary() {
  const s = document.getElementById('editStartTime').value;
  const e = document.getElementById('editEndTime').value;
  const summary = document.getElementById('editTimeSummary');
  if (s) { summary.textContent = s + (e ? '–' + e : ''); summary.classList.remove('hidden'); }
  else { summary.textContent = ''; summary.classList.add('hidden'); }
}

function setEditSection(sec){
  editSectionVal=sec; document.getElementById('editSection').value=sec;
  document.querySelectorAll('.edit-sec-btn').forEach(btn=>{const s=btn.dataset.sec===sec;btn.classList.toggle('bg-navy',s);btn.classList.toggle('text-white',s);btn.classList.toggle('border-navy',s);});
}
async function submitEditItem(){
  const itemId=document.getElementById('editItemId').value;
  const editStart=document.getElementById('editStartTime').value;
  const editEnd=document.getElementById('editEndTime').value;
  // Time validation: end_time must not be before start_time
  if(editStart && editEnd && editEnd < editStart){
    showToast('Sluttid kan inte vara före starttid',true);
    return;
  }
  const res=await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${itemId}`,{method:'PUT',body:JSON.stringify({start_time:editStart||null,end_time:editEnd||null,section:editSectionVal})});
  if(res.ok){closeEditItemModal();showToast('Sparad');await loadScheduleForDay();}
  else{const d=await res.json();showToast(d.error||'Fel uppstod',true);}
}
function removeItem(itemId){
  // Use == (not ===) — itemId is a string from onclick, scheduleItems[].id is a number from API
  const item = scheduleItems.find(i=>i.id==itemId);
  // Once-task: show simple direct-confirm modal, call DELETE /api/daily-log-items/:id
  if (item?.is_once_task) {
    openConfirmModal(`Ta bort engångsaktiviteten "${item.activity_name}"?`, async () => {
      const res = await window.apiFetch(`/api/daily-log-items/${itemId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Engångsaktiviteten borttagen'); await loadScheduleForDay(); }
      else { const d = await res.json(); showToast(d.error || 'Fel uppstod', true); }
    });
    return;
  }
  // Repurpose the recurrence modal to offer "bara denna dag" vs "alla kommande"
  const modal = document.getElementById('recurrenceModal');
  const titleEl = modal.querySelector('h3');
  const iconEl = modal.querySelector('.text-3xl');
  if (titleEl) titleEl.textContent = 'Ta bort aktivitet';
  if (iconEl) iconEl.textContent = '🗑️';
  document.getElementById('recurrenceActivityName').textContent = item ? `"${item.activity_name || 'aktiviteten'}"` : '';
  document.getElementById('recurrenceOnceLbl').textContent = '📌 Bara denna dag';
  document.getElementById('recurrenceOnceDesc').textContent = 'Aktiviteten försvinner bara från dagens schema';
  document.getElementById('recurrenceWeeklyLbl').textContent = `🗑️ Bara alla ${DAYS[currentDay]}ar`;
  document.getElementById('recurrenceWeeklyDesc').textContent = `Tar bort aktiviteten från varje ${DAYS[currentDay].toLowerCase()} i veckoschemat`;
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (allDaysBtn) {
    allDaysBtn.classList.remove('hidden');
    document.getElementById('recurrenceAllDaysLbl').textContent = '🗓️ Alla dagar i veckan';
    document.getElementById('recurrenceAllDaysDesc').textContent = 'Tar bort aktiviteten från måndag till söndag';
  }
  document.getElementById('recurrenceStep1').classList.remove('hidden');
  document.getElementById('recurrenceStep2').classList.add('hidden');
  document.getElementById('recurrenceError').classList.add('hidden');
  // Override button handlers for delete mode
  bindRecurrenceDeleteHandlers(itemId);
  modal.classList.remove('hidden');
}

async function deleteOnce(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
  if (allDaysBtn) allDaysBtn.disabled = true;
  try {
    // Check if this is a once-task (engångsaktivitet) — stored as daily_log_item, not weekly_schedule_item
    const item = scheduleItems.find(i => i.id == itemId);
    if (item?.is_once_task) {
      // Once-task: delete directly from daily_log_item
      const res = await window.apiFetch(`/api/daily-log-items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        document.getElementById('recurrenceModal').classList.add('hidden');
        resetRecurrenceModalTexts();
        showToast('Engångsaktiviteten borttagen');
        await loadScheduleForDay();
      } else {
        const d = await res.json();
        showToast(d.error || 'Fel uppstod', true);
        bindRecurrenceDeleteHandlers(itemId);
      }
      return;
    }
    // Regular scheduled item: exclude from today's date only
    const dateStr = getCurrentDayDateStr();
    const res = await window.apiFetch(
      `/api/schedules/${currentScheduleId}/items/${itemId}/exclude-date`,
      { method: 'POST', body: JSON.stringify({ date: dateStr }) }
    );
    if (res.ok) {
      document.getElementById('recurrenceModal').classList.add('hidden');
      resetRecurrenceModalTexts();
      showToast('Aktiviteten borttagen för idag');
      await loadScheduleForDay();
    } else {
      const d = await res.json();
      showToast(d.error || 'Fel uppstod', true);
      bindRecurrenceDeleteHandlers(itemId);
    }
  } catch (_) {
    showToast('Nätverksfel. Försök igen.', true);
    bindRecurrenceDeleteHandlers(itemId);
  }
}

async function deleteAll(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
  if (allDaysBtn) allDaysBtn.disabled = true;
  try {
    const res = await window.apiFetch(
      `/api/schedules/${currentScheduleId}/items/${itemId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      document.getElementById('recurrenceModal').classList.add('hidden');
      resetRecurrenceModalTexts();
      showToast('Aktiviteten har tagits bort');
      await loadScheduleForDay();
    } else {
      const d = await res.json();
      showToast(d.error || 'Fel uppstod', true);
      bindRecurrenceDeleteHandlers(itemId);
    }
  } catch (_) {
    showToast('Nätverksfel. Försök igen.', true);
    bindRecurrenceDeleteHandlers(itemId);
  }
}

async function deleteAllDays(itemId) {
  const onceBtn = document.getElementById('recurrenceOnceBtn');
  const weeklyBtn = document.getElementById('recurrenceWeeklyBtn');
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
  if (allDaysBtn) allDaysBtn.disabled = true;
  try {
    const res = await window.apiFetch(
      `/api/schedules/${currentScheduleId}/items/${itemId}/all-days`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      document.getElementById('recurrenceModal').classList.add('hidden');
      resetRecurrenceModalTexts();
      showToast('Aktiviteten borttagen från alla dagar');
      await loadScheduleForDay();
    } else {
      const d = await res.json();
      showToast(d.error || 'Fel uppstod', true);
      bindRecurrenceDeleteHandlers(itemId);
    }
  } catch (_) {
    showToast('Nätverksfel. Försök igen.', true);
    bindRecurrenceDeleteHandlers(itemId);
  }
}

// Reset recurrence modal back to its default add-activity texts
function resetRecurrenceModalTexts() {
  const modal = document.getElementById('recurrenceModal');
  const titleEl = modal.querySelector('h3');
  const iconEl = modal.querySelector('.text-3xl');
  if (titleEl) titleEl.textContent = 'En gång eller flera gånger?';
  if (iconEl) iconEl.textContent = '🗓️';
  document.getElementById('recurrenceOnceLbl').textContent = '📌 Bara denna gång';
  document.getElementById('recurrenceOnceDesc').textContent = 'Visas bara en gång, den valda dagen';
  document.getElementById('recurrenceWeeklyLbl').textContent = '🔁 Flera gånger';
  document.getElementById('recurrenceWeeklyDesc').textContent = 'Läggs till varje vald veckodag';
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (allDaysBtn) allDaysBtn.classList.add('hidden');
  // Restore original onclick handlers
  bindRecurrenceAddHandlers();
}
  window.loadTemplates = loadTemplates;
  window.copyAndAddStdActivity = copyAndAddStdActivity;
  window.openAddModal = openAddModal;
  window.closeAddModal = closeAddModal;
  window.filterTemplates = filterTemplates;
  window.renderTemplateList = renderTemplateList;
  window.renderTemplateItem = renderTemplateItem;
  window.selectTemplate = selectTemplate;
  window.clearSelectedTemplate = clearSelectedTemplate;
  window.pickSection = pickSection;
  window.toggleSection = toggleSection;
  window.submitAddActivity = submitAddActivity;
  window.bindRecurrenceAddHandlers = bindRecurrenceAddHandlers;
  window.bindRecurrenceDeleteHandlers = bindRecurrenceDeleteHandlers;
  window.openRecurrenceModal = openRecurrenceModal;
  window.showRecurrenceDayPicker = showRecurrenceDayPicker;
  window.toggleRecurrenceDay = toggleRecurrenceDay;
  window.backToRecurrenceStep1 = backToRecurrenceStep1;
  window.closeRecurrenceModal = closeRecurrenceModal;
  window.confirmRecurrenceMultiDay = confirmRecurrenceMultiDay;
  window.confirmRecurrence = confirmRecurrence;
  window.renderEmojiGrid = renderEmojiGrid;
  window.setEmoji = setEmoji;
  window.previewNewActEmoji = previewNewActEmoji;
  window.toggleNewActPictogramPanel = toggleNewActPictogramPanel;
  window.selectNewActPictogram = selectNewActPictogram;
  window.clearNewActPictogram = clearNewActPictogram;
  window.filterNewActPictograms = filterNewActPictograms;
  window.previewEditTplEmoji = previewEditTplEmoji;
  window.pickStarVal = pickStarVal;
  window.openCreateActivityModal = openCreateActivityModal;
  window.closeCreateActivityModal = closeCreateActivityModal;
  window.renderNewActSubsteps = renderNewActSubsteps;
  window.addNewActSubstep = addNewActSubstep;
  window.removeNewActSubstep = removeNewActSubstep;
  window.submitCreateActivity = submitCreateActivity;
  window.openEditTemplateModal = openEditTemplateModal;
  window.closeEditTemplateModal = closeEditTemplateModal;
  window.renderEditTplSubsteps = renderEditTplSubsteps;
  window.addEditTplSubstep = addEditTplSubstep;
  window.removeEditTplSubstep = removeEditTplSubstep;
  window.submitEditTemplate = submitEditTemplate;
  window.openEditItem = openEditItem;
  window.closeEditItemModal = closeEditItemModal;
  window.toggleAddTimeSection = toggleAddTimeSection;
  window.updateAddTimeSummary = updateAddTimeSummary;
  window.toggleEditTimeSection = toggleEditTimeSection;
  window.updateEditTimeSummary = updateEditTimeSummary;
  window.setEditSection = setEditSection;
  window.submitEditItem = submitEditItem;
  window.removeItem = removeItem;
  window.deleteOnce = deleteOnce;
  window.deleteAll = deleteAll;
  window.deleteAllDays = deleteAllDays;
  window.resetRecurrenceModalTexts = resetRecurrenceModalTexts;
  window.getCurrentDayDateStr = getCurrentDayDateStr;
})();
