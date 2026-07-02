/**
 * Dashboard activity modals (Fas 8 F2e).
 * Add/edit/recurrence/once-task modals extracted from dashboard.js.
 * Reads/writes dashboard.js globals; handlers on window for inline onclick.
 */
(function () {
  const { DAYS, SECTIONS } = window.ScheduleCore;

async function loadTemplates() {
  try {
    const res = await window.apiFetch('/api/activities');
    if (res.ok) allTemplates = await res.json();
  } catch (e) {
    console.error('[DASHBOARD] loadTemplates failed:', e);
  }
}
async function openDashboardAddForChild(childId) {
  await selectChild(childId);
  addSectionOverride = 'dag';
  openAddModal('dag');
}

// Open addActivityModal in once-mode (replaces onceTaskModal)
async function openOnceTaskModal() {
  if (!children || children.length === 0) { await loadChildren(); }
  _onceMode = true;
  document.getElementById('addActivityOnceWrap').classList.remove('hidden');
  const td = new Date();
  const todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
  document.getElementById('addActivityOnceDate').value = todayStr;
  document.getElementById('addActivityOnceDate').min = todayStr;
  const list = document.getElementById('addActivityOnceChildList');
  // Pre-seed _onceCreateContext so single-child families work even when _onceMode
  // is set before openCreateActivityModal saves the snapshot (fixes "Välj minst ett barn"
  // when user skips step 1 and selects children in the create-modal instead).
  _onceCreateContext = {
    childIds: (children || []).length === 1 ? [children[0].id] : [],
    date: new Date().toISOString().slice(0, 10),
    startTime: null,
    endTime: null,
    section: 'dag',
  };
  _pendingTargetChildIds = _onceCreateContext.childIds;
  if ((children || []).length === 1) {
    // Single-child family: show static label, no checkbox needed — the only child is pre-selected.
    const c = children[0];
    list.innerHTML = `<div class="flex items-center gap-2 p-2 rounded-xl bg-sky">
      <span class="text-xl">${c.emoji || '⭐'}</span>
      <span class="font-semibold text-sm text-navy">${escHtml(c.name)}</span>
      <span class="ml-auto text-xs text-text-soft">Auto-vald</span>
    </div>`;
  } else {
    // Multi-child family: render interactive checkboxes.
    list.innerHTML = (children || []).map(c =>
      `<label class="flex items-center gap-3 p-2 rounded-xl hover:bg-sky cursor-pointer">
        <input type="checkbox" class="once-child-check w-4 h-4 accent-gold" value="${c.id}">
        <span class="text-xl">${c.emoji || '⭐'}</span>
        <span class="font-semibold text-sm text-navy">${escHtml(c.name)}</span>
      </label>`
    ).join('');
  }
  // Reset addActivityModal state and open
  selectedTemplateId = null;
  document.getElementById('addActivityError').classList.add('hidden');
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  // Show tip when both time fields are empty, hide when either is filled
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
  addSectionOverride = 'dag';
  pickSection('dag');
  renderTemplateList('');
  document.getElementById('addActivityModal').classList.remove('hidden');
  document.getElementById('addActivityModal').scrollTop = 0;
  document.querySelector('#addActivityModal h3').textContent = '➕ Engångsaktivitet';
  setTimeout(() => document.getElementById('templateSearch').focus(), 100);
}

// Opens the add-activity modal for a given schedule section (morgon/dag/kväll).
// Was accidentally removed in the toggleCardExpand dedup fix (May 18 2026).
function openAddModal(sectionKey) {
  selectedTemplateId = null;
  document.getElementById('addActivityError').classList.add('hidden');
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  const tipMsg = document.getElementById('timeTipMsg');
  if (tipMsg) {
    tipMsg.classList.remove('hidden');
    const hideTip = () => {
      const s = document.getElementById('addStartTime');
      const e = document.getElementById('addEndTime');
      if (s?.value || e?.value) tipMsg.classList.add('hidden');
    };
    document.getElementById('addStartTime').removeEventListener('input', hideTip);
    document.getElementById('addEndTime').removeEventListener('input', hideTip);
    document.getElementById('addStartTime').addEventListener('input', hideTip);
    document.getElementById('addEndTime').addEventListener('input', hideTip);
  }
  document.getElementById('selectedTemplateInfo').classList.add('hidden');
  document.getElementById('templateSearch').value = '';
  addSectionOverride = sectionKey || 'dag';
  pickSection(sectionKey || 'dag');
  renderTemplateList('');
  const addModal = document.getElementById('addActivityModal');
  addModal.classList.remove('hidden');
  addModal.scrollTop = 0;
  setTimeout(() => {
    addModal.scrollTop = 0;
    document.getElementById('templateSearch').focus();
  }, 100);
}

// NOTE: toggleCardExpand is defined once at the top of the file (accordion logic).
// This duplicate was removed — it incorrectly opened the add-activity modal.
function closeAddModal() {
  document.getElementById('addActivityModal').classList.add('hidden');
  if (_onceMode) {
    _onceMode = false;
    document.getElementById('addActivityOnceWrap').classList.add('hidden');
    document.querySelector('#addActivityModal h3').textContent = 'Lägg till aktivitet';
  }
  _onceCreateContext = null;
  _pendingTargetChildIds = [];
}
function filterTemplates() { renderTemplateList(document.getElementById('templateSearch').value); }
function renderTemplateList(q) {
  const list = document.getElementById('templateList');
  let items = allTemplates;
  if (q) items = items.filter(t=>t.name&&t.name.toLowerCase().includes(q.toLowerCase()));
  const used = new Set(scheduleItems.filter(i=>i.section===addSectionOverride).map(i=>i.activity_template_id));
  items = items.filter(t=>!used.has(t.id)).sort((a,b)=>(b.is_favorite?1:0)-(a.is_favorite?1:0));
  if (!items.length) {
    const qEsc = q ? escHtml(q) : '';
    list.innerHTML=`<div class="text-center py-4">
      <p class="text-text-soft text-sm mb-3">Inga aktiviteter hittades${q?' för "'+qEsc+'"':''}.</p>
      <button type="button" onclick="openCreateActivityModal('${(q||'').replace(/'/g,"\\'")}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm">✨ Skapa ny aktivitet</button>
    </div>`;
    return;
  }
  const grouped={}; const unc=[];
  for (const t of items) { const cn=t.category_name||null; if(cn){if(!grouped[cn])grouped[cn]={sort:t.category_sort_order||999,items:[]};grouped[cn].items.push(t);}else unc.push(t); }
  const sc=Object.entries(grouped).sort((a,b)=>a[1].sort-b[1].sort);
  let html='';
  for (const [cn,g] of sc) { html+=`<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">${escHtml(cn)}</div>`+g.items.map(t=>renderTemplateItem(t)).join(''); }
  if (unc.length>0) { if(sc.length>0) html+=`<div class="text-xs font-semibold text-text-soft uppercase tracking-wide px-2 pt-3 pb-1">Övriga</div>`; html+=unc.map(t=>renderTemplateItem(t)).join(''); }
  // Always show "Skapa ny" at the bottom
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
  addSectionOverride=sec; document.getElementById('addSection').value=sec;
  document.querySelectorAll('.section-pick-btn').forEach(btn=>{ const s=btn.dataset.sec===sec; btn.classList.toggle('bg-navy',s);btn.classList.toggle('text-white',s);btn.classList.toggle('border-navy',s); });
  if(!document.getElementById('addActivityModal').classList.contains('hidden')) renderTemplateList(document.getElementById('templateSearch').value);
}
// Pending recurrence state
let _pendingTemplateId = null;
let _pendingTemplateName = '';
let _pendingSection = 'dag';
let _pendingStartTime = null;
let _pendingEndTime = null;
let _recurrenceSelectedDays = [];

// ── Child picker helpers (multi-child feature) ─────────────
function getActivityPickChildList() {
  return children; // already loaded as global `children`
}

function renderActivityChildPick(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const family = getActivityPickChildList();
  if (family.length < 2) { container.classList.add('hidden'); return; }
  const selected = _pendingTargetChildIds.length ? _pendingTargetChildIds : [currentChildId];
  container.innerHTML = family.map(c =>
    `<label class="flex items-center gap-2 cursor-pointer py-1">
      <input type="checkbox" value="${c.id}" class="child-pick-checkbox accent-gold w-4 h-4">
      <span class="text-sm text-navy font-medium">${c.icon || '👤'} ${c.name}</span>
    </label>`
  ).join('');
  // Set .checked property directly — do not rely on HTML attribute alone
  container.querySelectorAll('.child-pick-checkbox').forEach(cb => {
    if (selected.includes(cb.value)) cb.checked = true;
  });
  container.classList.remove('hidden');
}

function getSelectedActivityChildIds() {
  return Array.from(document.querySelectorAll('.child-pick-checkbox:checked')).map(el => el.value);
}

async function submitAddActivity() {
  // Once-mode: add directly to daily log for a specific date
  if (_onceMode) {
    if (!selectedTemplateId) {
      document.getElementById('addActivityError').textContent = 'Välj en aktivitet';
      document.getElementById('addActivityError').classList.remove('hidden');
      return;
    }
    const date = document.getElementById('addActivityOnceDate').value;
    if (!date) {
      document.getElementById('addActivityError').textContent = 'Välj ett datum';
      document.getElementById('addActivityError').classList.remove('hidden');
      return;
    }
    let selectedIds = [...document.querySelectorAll('#addActivityOnceChildList .once-child-check:checked')].map(el => el.value);
    // Fallback for single-child families where the child picker is hidden (static label, no checkboxes).
    if (selectedIds.length === 0 && (children || []).length === 1) {
      selectedIds = [children[0].id];
    }
    if (selectedIds.length === 0) {
      document.getElementById('addActivityError').textContent = 'Välj minst ett barn';
      document.getElementById('addActivityError').classList.remove('hidden');
      return;
    }
    const tpl = allTemplates.find(t => t.id === selectedTemplateId);
    const addBtn = document.getElementById('addActivityBtn');
    addBtn.disabled = true; addBtn.textContent = 'Skapar…';
    try {
      const primaryChildId = selectedIds[0];
      const res = await window.apiFetch(`/api/children/${primaryChildId}/schedules/once-tasks`, {
        method: 'POST',
        body: JSON.stringify({
          name: tpl?.name || '',
          icon: tpl?.icon || '📌',
          section: addSectionOverride || 'dag',
          date,
          start_time: document.getElementById('addStartTime').value || null,
          end_time: document.getElementById('addEndTime').value || null,
          star_value: tpl?.star_value || 1,
          child_ids: selectedIds,
          activity_template_id: selectedTemplateId,
        })
      });
      if (res.ok) {
        const d = new Date(date + 'T12:00:00');
        const dateFmt = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
        closeAddModal();
        showToast(`${tpl?.icon || ''} "${tpl?.name}" tillagd för ${dateFmt}!`);
        await refreshAfterOnceTaskChange();
      } else {
        const err = await res.json();
        document.getElementById('addActivityError').textContent = err.error || 'Fel uppstod';
        document.getElementById('addActivityError').classList.remove('hidden');
      }
    } finally {
      addBtn.disabled = false; addBtn.textContent = 'Lägg till';
    }
    return;
  }

  // Normal mode: store pending data and show recurrence choice
  if (!selectedTemplateId) { document.getElementById('addActivityError').textContent='Välj en aktivitet'; document.getElementById('addActivityError').classList.remove('hidden'); return; }
  const tpl = allTemplates.find(t=>t.id===selectedTemplateId);

  // If _onceCreateContext exists, submit the once-task directly and skip recurrence modal
  if (_onceCreateContext) {
    await submitOnceTaskDirect(selectedTemplateId, tpl);
    return;
  }

  _pendingTemplateId = selectedTemplateId;
  _pendingTemplateName = tpl ? tpl.name : 'Aktiviteten';
  _pendingSection = addSectionOverride;
  _pendingStartTime = document.getElementById('addStartTime').value || null;
  _pendingEndTime = document.getElementById('addEndTime').value || null;
  _pendingTargetChildIds = [currentChildId];
  closeAddModal();
  openRecurrenceModal();
}

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
    showWeekdayPicker();
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
    allDaysBtn.classList.remove('hidden');
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
  resetRecurrenceModalTexts(); // must be first — resets handlers + texts before showing
  document.getElementById('recurrenceActivityName').textContent = `"${_pendingTemplateName}"`;
  document.getElementById('recurrenceError').classList.add('hidden');
  document.getElementById('weekdayPickerSection').classList.add('hidden');
  _recurrenceSelectedDays = [];
  renderActivityChildPick('recurrenceChildrenWrap');
  updateRecurrenceChildHint();
  bindRecurrenceAddHandlers();
  document.getElementById('recurrenceModal').classList.remove('hidden');
}

function updateRecurrenceChildHint() {
  const hint = document.getElementById('recurrenceChildHint');
  if (!hint) return;
  const ids = getSelectedActivityChildIds();
  if (!ids.length) return;
  const names = ids.map(id => children.find(c => c.id === id)?.name).filter(Boolean);
  if (names.length) {
    hint.textContent = `Gäller: ${names.join(', ')}`;
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

function closeRecurrenceModal() {
  resetRecurrenceModalTexts(); // always reset texts + handlers, even when closing after delete flow
  document.getElementById('recurrenceModal').classList.add('hidden');
}

function showWeekdayPicker() {
  const picker = document.getElementById('weekdayPicker');
  _recurrenceSelectedDays = [];
  picker.innerHTML = [1,2,3,4,5,6,0].map(d =>
    `<button type="button" onclick="toggleRecurrenceDay(${d},this)" class="px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-gold text-navy">${DAYS_SHORT[d]}</button>`
  ).join('');
  document.getElementById('weekdayPickerSection').classList.remove('hidden');
}

function toggleRecurrenceDay(d, btn) {
  const idx = _recurrenceSelectedDays.indexOf(d);
  if (idx === -1) { _recurrenceSelectedDays.push(d); btn.classList.add('bg-navy','text-white','border-navy'); }
  else { _recurrenceSelectedDays.splice(idx,1); btn.classList.remove('bg-navy','text-white','border-navy'); }
}

async function confirmRecurrence(choice) {
  document.getElementById('recurrenceError').classList.add('hidden');
  updateRecurrenceChildHint(); // capture latest checkbox state before processing
  let targetChildIds = getSelectedActivityChildIds();
  if (targetChildIds.length === 0) {
    // Fallback for single-child families where the picker is hidden and no checkboxes exist.
    // _pendingTargetChildIds is set to [currentChildId] in submitAddActivity() before this runs.
    targetChildIds = (_pendingTargetChildIds || []).filter(Boolean);
  }
  // Last-resort fallback: if targetChildIds is still empty but family has exactly one child,
  // use that child directly — mirrors submitOnceTaskDirect logic.
  if (targetChildIds.length === 0 && (children || []).length === 1) {
    targetChildIds = [children[0].id];
  }
  if (targetChildIds.length === 0) {
    document.getElementById('recurrenceError').textContent = 'Välj minst ett barn';
    document.getElementById('recurrenceError').classList.remove('hidden');
    return;
  }
  if (choice === 'once') {
    // Add to current day only (once-task — no weekly_schedule_item)
    document.getElementById('recurrenceOnceBtn').disabled = true;
    let successCount = 0;
    for (const childId of targetChildIds) {
      const ok = await addOnceTaskToDay(currentDay, childId);
      if (ok) successCount++;
    }
    if (successCount > 0) {
      closeRecurrenceModal();
      showToast(`Aktiviteten har lagts till`);
      await refreshAfterOnceTaskChange();
    } else {
      document.getElementById('recurrenceError').textContent = 'Kunde inte lägga till aktiviteten. Försök igen.';
      document.getElementById('recurrenceError').classList.remove('hidden');
      document.getElementById('recurrenceOnceBtn').disabled = false;
    }
  } else if (choice === 'weekly') {
    if (_recurrenceSelectedDays.length === 0) {
      document.getElementById('recurrenceError').textContent = 'Välj minst en dag';
      document.getElementById('recurrenceError').classList.remove('hidden');
      return;
    }
    // Add to all selected days for all selected children
    let successCount = 0;
    for (const childId of targetChildIds) {
      for (const day of _recurrenceSelectedDays) {
        const ok = await addActivityToDay(day, childId);
        if (ok) successCount++;
      }
    }
    if (successCount > 0) {
      closeRecurrenceModal();
      showToast(`Aktiviteten har lagts till i ${successCount} dag(ar)`);
      await loadDashboardCards();
    } else {
      document.getElementById('recurrenceError').textContent = 'Kunde inte lägga till aktiviteten. Försök igen.';
      document.getElementById('recurrenceError').classList.remove('hidden');
    }
  }
}

async function addOnceTaskToDay(dayOfWeek, childId) {
  const targetChildId = childId || currentChildId;
  const tpl = allTemplates.find(t => t.id === _pendingTemplateId);
  if (!tpl) return false;
  const dateStr = formatLocalDateStr(getDateForDayOfWeek(dayOfWeek));
  if (!dateStr) return false;
  const res = await window.apiFetch(`/api/children/${targetChildId}/schedules/once-tasks`, {
    method: 'POST',
    body: JSON.stringify({
      name: tpl.name,
      icon: tpl.icon || '📌',
      section: _pendingSection || 'dag',
      date: dateStr,
      start_time: _pendingStartTime || null,
      end_time: _pendingEndTime || null,
      star_value: tpl.star_value || 1,
      activity_template_id: _pendingTemplateId,
    }),
  });
  if (!res.ok) {
    try { const err = await res.json(); console.warn('[DASHBOARD] addOnceTaskToDay failed:', err); } catch (_) {}
  }
  return res.ok;
}

async function addActivityToDay(dayOfWeek, childId) {
  const targetChildId = childId || currentChildId;
  // Ensure schedule exists for this day
  let schedId = (dayOfWeek === currentDay && targetChildId === currentChildId) ? currentScheduleId : null;
  if (!schedId) {
    const res = await window.apiFetch(`/api/children/${targetChildId}/schedules`, {method:'POST', body:JSON.stringify({day_of_week:dayOfWeek})});
    const data = await res.json();
    if (res.ok) schedId = data.id;
    else if (res.status===409 && data.id) schedId = data.id;
    else return false;
    if (dayOfWeek === currentDay && targetChildId === currentChildId) currentScheduleId = schedId;
  }
  // Strip null time values — backend expects undefined (missing), not null
  const itemBody = { activity_template_id: _pendingTemplateId, section: _pendingSection };
  if (_pendingStartTime) itemBody.start_time = _pendingStartTime;
  if (_pendingEndTime) itemBody.end_time = _pendingEndTime;
  const res = await window.apiFetch(`/api/schedules/${schedId}/items`, {method:'POST', body:JSON.stringify(itemBody)});
  if (!res.ok) {
    try { const err = await res.json(); console.warn('[DASHBOARD] addActivityToDay failed:', err); } catch (_) {}
  }
  return res.ok;
}

// ── Create Activity Modal ─────────────────────────────────
const EMOJI_QUICK_PICKS = ['🪥','🧹','📚','🎨','🏃','🍎','👕','🎵','✏️','🧩','🚿','🛏️','🎒','🚶','🍽️','💤'];
let _newActSubsteps = []; // { name, icon }
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

function renderNewActSubsteps() {
  const list = document.getElementById('newActSubstepList');
  if (!list) return;
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
  const name = input?.value.trim();
  if (!name) return;
  _newActSubsteps.push({ name, icon: null });
  input.value = '';
  renderNewActSubsteps();
}
function removeNewActSubstep(idx) {
  _newActSubsteps.splice(idx, 1);
  renderNewActSubsteps();
}

function openCreateActivityModal(prefill) {
  _newActSubsteps = [];
  resetNewActIconKey();
  document.getElementById('newActName').value = prefill || '';
  document.getElementById('newActEmojiInput').value = '';
  document.getElementById('newActEmojiPreview').textContent = '📌';
  document.getElementById('newActStarValue').value = '1';
  const subInput = document.getElementById('newActSubstepInput');
  if (subInput) subInput.value = '';
  renderNewActSubsteps();
  document.getElementById('createActivityError').classList.add('hidden');
  // Reset star buttons
  document.querySelectorAll('.star-val-btn').forEach(b => {
    const active = b.dataset.val === '1';
    b.classList.toggle('bg-gold', active); b.classList.toggle('text-white', active); b.classList.toggle('border-gold', active);
  });
  // Fill emoji grid
  document.getElementById('newActEmojiGrid').innerHTML = EMOJI_QUICK_PICKS.map(e =>
    `<button type="button" onclick="document.getElementById('newActEmojiInput').value='${e}';previewNewActEmoji()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sky transition-colors text-lg">${e}</button>`
  ).join('');
  // Snapshot once-flow context so submitCreateActivity() knows which child/date/times to use
  if (_onceMode) {
    _onceCreateContext = {
      date: document.getElementById('addActivityOnceDate').value,
      childIds: [...document.querySelectorAll('#addActivityOnceChildList .once-child-check:checked')].map(el => el.value),
      startTime: document.getElementById('addStartTime').value || null,
      endTime: document.getElementById('addEndTime').value || null,
      section: addSectionOverride || 'dag',
    };
    _pendingTargetChildIds = _onceCreateContext.childIds;
  } else {
    _pendingTargetChildIds = [currentChildId];
  }
  renderActivityChildPick('createActivityChildrenWrap');
  document.getElementById('createActivityModal').classList.remove('hidden');
  setTimeout(()=>document.getElementById('newActName').focus(),100);
}

function closeCreateActivityModal() {
  document.getElementById('createActivityModal').classList.add('hidden');
}

function previewNewActEmoji() {
  const val = document.getElementById('newActEmojiInput').value.trim();
  if (val) resetNewActIconKey();
  document.getElementById('newActEmojiPreview').textContent = val || '📌';
}

function pickStarVal(v) {
  document.getElementById('newActStarValue').value = v;
  document.querySelectorAll('.star-val-btn').forEach(b => {
    const active = b.dataset.val === String(v);
    b.classList.toggle('bg-gold', active); b.classList.toggle('text-white', active); b.classList.toggle('border-gold', active);
  });
}

function resolveActivityTargetChildIds() {
  // Only trust the snapshot if it has actual selections — an empty array means
  // the user skipped step 1, so defer to the child checkboxes in the create-modal.
  if (_onceCreateContext?.childIds?.length) return _onceCreateContext.childIds;
  // Fallback: read checked .child-pick-checkbox checkboxes in the create-modal.
  const fromModal = Array.from(document.querySelectorAll('.child-pick-checkbox:checked')).map(el => el.value);
  if (fromModal.length) return fromModal;
  if (_pendingTargetChildIds?.length) return _pendingTargetChildIds;
  if (currentChildId) return [currentChildId];
  if (children?.length) return [children[0].id];
  return [];
}

// Submit a once-task directly (used by submitCreateActivity when _onceCreateContext exists)
async function submitOnceTaskDirect(tplId, tpl) {
  const ctx = _onceCreateContext;
  let childIds = resolveActivityTargetChildIds();
  // Fallback for single-child families where the child picker is hidden (static label, no checkboxes).
  if (childIds.length === 0 && (children || []).length === 1) {
    childIds = [children[0].id];
  }
  if (!childIds.length) {
    document.getElementById('createActivityError').textContent = 'Välj minst ett barn';
    document.getElementById('createActivityError').classList.remove('hidden');
    return;
  }
  const addBtn = document.getElementById('addActivityBtn');
  addBtn.disabled = true; addBtn.textContent = 'Skapar…';
  try {
    const primaryChildId = childIds[0];
    const res = await window.apiFetch(`/api/children/${primaryChildId}/schedules/once-tasks`, {
      method: 'POST',
      body: JSON.stringify({
        name: tpl?.name || '',
        icon: tpl?.icon || '📌',
        section: ctx.section || 'dag',
        date: ctx.date,
        start_time: ctx.startTime || null,
        end_time: ctx.endTime || null,
        star_value: tpl?.star_value || 1,
        child_ids: childIds,
        activity_template_id: tplId || null,
        sub_steps: _newActSubsteps.length ? _newActSubsteps : undefined,
      })
    });
    if (res.ok) {
      const d = new Date(ctx.date + 'T12:00:00');
      const dateFmt = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
      _newActSubsteps = [];
      closeCreateActivityModal();
      closeAddModal();
      showToast(`${tpl?.icon || ''} "${tpl?.name || 'Aktiviteten'}" tillagd för ${dateFmt}!`);
      await refreshAfterOnceTaskChange();
    } else {
      const err = await res.json();
      document.getElementById('createActivityError').textContent = err.error || 'Fel uppstod';
      document.getElementById('createActivityError').classList.remove('hidden');
    }
  } finally {
    addBtn.disabled = false; addBtn.textContent = 'Lägg till';
  }
}

async function submitCreateActivity() {
  const name = document.getElementById('newActName').value.trim();
  if (!name) { document.getElementById('createActivityError').textContent='Namn krävs'; document.getElementById('createActivityError').classList.remove('hidden'); return; }
  const icon = document.getElementById('newActEmojiInput').value.trim() || '📌';
  const starValue = parseInt(document.getElementById('newActStarValue').value) || 1;
  const iconKeyEl = document.getElementById('newActIconKeyInput');
  const iconKey = iconKeyEl && iconKeyEl.value ? iconKeyEl.value.trim() : null;
  const body = { name, icon, star_value: starValue };
  if (iconKey) body.icon_key = iconKey;
  try {
    const res = await window.apiFetch('/api/activities', {method:'POST', body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) {
      if (_onceCreateContext) {
        const tpl = { name, icon, star_value: starValue };
        // Create sub-steps on library template when not in once-direct flow
        if (_newActSubsteps.length > 0) {
          let failedSteps = 0;
          for (const step of _newActSubsteps) {
            const stepRes = await window.apiFetch(`/api/activities/${data.id}/sub-steps`, {
              method: 'POST',
              body: JSON.stringify({ name: step.name, icon: step.icon }),
            });
            if (!stepRes.ok) failedSteps++;
          }
          if (failedSteps > 0) {
            showToast(`Aktiviteten skapades men ${failedSteps} delsteg misslyckades`, true);
          }
        }
        await submitOnceTaskDirect(data.id, tpl);
      } else {
        // Normal mode: close modals, load templates, open recurrence modal
        closeCreateActivityModal();
        closeAddModal();
        await loadTemplates();
        _pendingTemplateId = data.id;
        _pendingTemplateName = name;
        _pendingSection = addSectionOverride;
        _pendingTargetChildIds = [currentChildId];
        openRecurrenceModal();
      }
    } else {
      document.getElementById('createActivityError').textContent = data.error || 'Kunde inte skapa aktiviteten';
      document.getElementById('createActivityError').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('createActivityError').textContent = 'Nätverksfel. Försök igen.';
    document.getElementById('createActivityError').classList.remove('hidden');
  }
}

// ── Edit/remove item ──────────────────────────────────────
function openEditItem(itemId) {
  const item=scheduleItems.find(i=>i.id==itemId); if(!item)return;
  document.getElementById('editItemId').value=itemId;
  document.getElementById('editStartTime').value=item.start_time?item.start_time.substring(0,5):'';
  document.getElementById('editEndTime').value=item.end_time?item.end_time.substring(0,5):'';
  setEditSection(item.section||'dag');
  document.getElementById('editItemModal').classList.remove('hidden');
}
function closeEditItemModal(){document.getElementById('editItemModal').classList.add('hidden');}
function setEditSection(sec){
  editSectionVal=sec; document.getElementById('editSection').value=sec;
  document.querySelectorAll('.edit-sec-btn').forEach(btn=>{const s=btn.dataset.sec===sec;btn.classList.toggle('bg-navy',s);btn.classList.toggle('text-white',s);btn.classList.toggle('border-navy',s);});
}
async function submitEditItem(){
  const itemId=document.getElementById('editItemId').value;
  const res=await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${itemId}`,{method:'PUT',body:JSON.stringify({start_time:document.getElementById('editStartTime').value||null,end_time:document.getElementById('editEndTime').value||null,section:editSectionVal})});
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
  _pendingDeleteItemId = itemId;
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
  document.getElementById('weekdayPickerSection').classList.add('hidden');
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
  const dateStr = getCurrentDateStr();
  try {
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
  document.getElementById('recurrenceOnceLbl').textContent = '📌 Bara idag';
  document.getElementById('recurrenceOnceDesc').textContent = 'Läggs till för dagens schema';
  document.getElementById('recurrenceWeeklyLbl').textContent = '🔁 Flera gånger';
  document.getElementById('recurrenceWeeklyDesc').textContent = 'Välj vilka veckodagar';
  const allDaysBtn = document.getElementById('recurrenceAllDaysBtn');
  if (allDaysBtn) allDaysBtn.classList.add('hidden');
  // Restore original onclick handlers
  bindRecurrenceAddHandlers();
}

  // Exposed for inline onclick (dashboard.html + generated HTML) + dashboard.js callers
  window.loadTemplates = loadTemplates;
  window.openDashboardAddForChild = openDashboardAddForChild;
  window.openOnceTaskModal = openOnceTaskModal;
  window.openAddModal = openAddModal;
  window.closeAddModal = closeAddModal;
  window.filterTemplates = filterTemplates;
  window.renderTemplateList = renderTemplateList;
  window.renderTemplateItem = renderTemplateItem;
  window.selectTemplate = selectTemplate;
  window.clearSelectedTemplate = clearSelectedTemplate;
  window.pickSection = pickSection;
  window.getActivityPickChildList = getActivityPickChildList;
  window.renderActivityChildPick = renderActivityChildPick;
  window.getSelectedActivityChildIds = getSelectedActivityChildIds;
  window.submitAddActivity = submitAddActivity;
  window.bindRecurrenceAddHandlers = bindRecurrenceAddHandlers;
  window.bindRecurrenceDeleteHandlers = bindRecurrenceDeleteHandlers;
  window.openRecurrenceModal = openRecurrenceModal;
  window.updateRecurrenceChildHint = updateRecurrenceChildHint;
  window.closeRecurrenceModal = closeRecurrenceModal;
  window.showWeekdayPicker = showWeekdayPicker;
  window.toggleRecurrenceDay = toggleRecurrenceDay;
  window.confirmRecurrence = confirmRecurrence;
  window.addOnceTaskToDay = addOnceTaskToDay;
  window.addActivityToDay = addActivityToDay;
  window.renderNewActSubsteps = renderNewActSubsteps;
  window.addNewActSubstep = addNewActSubstep;
  window.removeNewActSubstep = removeNewActSubstep;
  window.openCreateActivityModal = openCreateActivityModal;
  window.closeCreateActivityModal = closeCreateActivityModal;
  window.previewNewActEmoji = previewNewActEmoji;
  window.toggleNewActPictogramPanel = toggleNewActPictogramPanel;
  window.selectNewActPictogram = selectNewActPictogram;
  window.clearNewActPictogram = clearNewActPictogram;
  window.filterNewActPictograms = filterNewActPictograms;
  window.pickStarVal = pickStarVal;
  window.resolveActivityTargetChildIds = resolveActivityTargetChildIds;
  window.submitOnceTaskDirect = submitOnceTaskDirect;
  window.submitCreateActivity = submitCreateActivity;
  window.openEditItem = openEditItem;
  window.closeEditItemModal = closeEditItemModal;
  window.setEditSection = setEditSection;
  window.submitEditItem = submitEditItem;
  window.removeItem = removeItem;
  window.deleteOnce = deleteOnce;
  window.deleteAll = deleteAll;
  window.deleteAllDays = deleteAllDays;
  window.resetRecurrenceModalTexts = resetRecurrenceModalTexts;
})();
