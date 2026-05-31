/**
 * Schedule extra views — list, timeline, side-by-side (SBS), and copy-weeks logic.
 * Does not own: core schedule state, activity modals, day-tab rendering, or DnD for the normal week view.
 * Depends on: schedule.js globals (scheduleItems, children, currentChildId, currentDay, currentScheduleId, DAYS, SECTIONS, dndType, sbsAllData, sbsChildId, sbsItems, sbsScheduleId)
 */

// ── Delegated delete handler (Sortable.js forceFallback blocks inline onclick on mobile) ──
document.addEventListener('click', e => {
  const btn = e.target.closest('.action-btn-remove');
  if (!btn) return;
  e.stopPropagation();
  const itemId = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
  if (itemId && typeof removeItem === 'function') removeItem(itemId);
});

// ── List View ─────────────────────────────────────────────
function renderListView() {
  if (!currentScheduleId) { renderEmptyDay(); return; }
  const child = children.find(c => c.id === currentChildId);
  const dateLabel = getDayDateLabel();

  // Sort items by section order first, then sort_order within section (same order as they appear in schema view)
  const sectionOrder = ['morgon','dag','kvall','natt'];
  const sorted = [...scheduleItems].sort((a, b) => {
    const sA = sectionOrder.indexOf(a.section);
    const sB = sectionOrder.indexOf(b.section);
    if (sA !== sB) return sA - sB;
    return a.sort_order - b.sort_order;
  });

  const itemsHtml = sorted.length === 0
    ? '<p class="text-sm text-text-soft text-center py-8">Inga aktiviteter</p>'
    : sorted.map((item, idx) => {
        const secEmoji = { morgon:'🌅', dag:'☀️', kvall:'🌆', natt:'🌙' };
        const isOnce = !!item.is_once_task;
        return `<div class="activity-item flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm${isOnce ? ' border-dashed border-gold/40' : ''}"
          data-id="${item.id}" data-section="${item.section}">
          <span class="text-gray-300 text-xs font-bold flex-shrink-0 w-5 text-right">${idx + 1}</span>
          ${isOnce ? '<span title="Engångsaktivitet" class="text-[10px] flex-shrink-0">📌</span>' : ''}
          <span class="text-lg flex-shrink-0">${item.activity_icon || '📌'}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-navy truncate">${escHtml(item.activity_name_display || item.activity_name)}</div>
            <div class="text-xs text-text-soft">${secEmoji[item.section] || ''} ${item.section === 'morgon' ? 'Morgon' : item.section === 'dag' ? 'Dag' : item.section === 'kvall' ? 'Kväll' : 'Natt'}${item.start_time ? ' · ' + fmtTime(item.start_time) : ''}</div>
          </div>
          ${item.star_value > 0 ? `<span class="text-xs text-gold font-bold flex-shrink-0">${'⭐'.repeat(Math.min(item.star_value, 5))}</span>` : ''}
          <div class="icon-btns-desktop flex gap-1 flex-shrink-0">
            ${!isOnce ? `<button onclick="openEditItem('${item.id}')" class="action-btn p-2 rounded-lg hover:bg-lavender transition-colors text-text-soft" title="Redigera">✏️</button>` : ''}
            <button type="button" data-id="${item.id}" onclick="event.stopPropagation(); removeItem('${item.id}')" class="action-btn action-btn-remove p-2 rounded-lg transition-colors text-text-soft" title="Ta bort">✕</button>
          </div>
          <!-- Mobile: ⋯ overflow menu — BUG-17/BUG-19/BUG-24: openEditTemplateModal koppling -->
          <div class="overflow-menu-wrap flex-shrink-0" style="margin-left:4px">
            <button class="overflow-menu-btn" onclick="toggleOverflowMenu(event,'omenu-l-${item.id}')" aria-label="Fler alternativ">⋯</button>
            <div id="omenu-l-${item.id}" class="overflow-menu-popup">
              ${!isOnce ? `<button onclick="closeOverflowMenus();openEditTemplateModal('${item.activity_template_id}')">✏️ Redigera</button>` : ''}
              ${!isOnce ? `<button onclick="closeOverflowMenus();openEditItem('${item.id}')">🕐 Redigera tid</button>` : ''}
              <button class="danger" onclick="closeOverflowMenus();removeItem('${item.id}')">✕ Ta bort</button>
            </div>
          </div>
        </div>`;
      }).join('');

  document.getElementById('scheduleContent').innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]}${dateLabel ? ` <span class="text-text-soft font-normal text-base">${dateLabel}</span>` : ''} — ${child ? escHtml(child.name) : ''} <span class="text-text-soft font-normal text-base">📝 Listläge</span></h3>
        <p class="text-sm text-text-soft">${sorted.length} aktivitet${sorted.length !== 1 ? 'er' : ''} i schemaordning</p>
      </div>
      <button onclick="openAddModal('dag')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl text-sm font-semibold">+ Aktivitet</button>
    </div>
    <div class="space-y-2">${itemsHtml}</div>`;
}

// ── Copy to upcoming weeks ────────────────────────────────
let copyWeeksSelections = [];

function openCopyWeeksModal() {
  if (!currentScheduleId) { showToast('Inget schema att kopiera', true); return; }
  copyWeeksSelections = [];
  const picker = document.getElementById('copyWeeksPicker');
  picker.innerHTML = [1,2,3,4].map(w => {
    const ws = getWeekStart(w);
    const wn = getWeekNumber(ws);
    return `<button type="button" onclick="toggleCopyWeek(${w},this)"
      class="px-4 py-3 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-navy text-navy text-center" data-week="${w}">
      <div>+${w} vecka${w > 1 ? 'r' : ''}</div>
      <div class="text-xs font-normal text-text-soft">Vecka ${wn}</div>
    </button>`;
  }).join('');
  document.getElementById('copyWeeksError').classList.add('hidden');
  document.getElementById('copyWeeksModal').classList.remove('hidden');
}

function toggleCopyWeek(w, btn) {
  const idx = copyWeeksSelections.indexOf(w);
  if (idx === -1) {
    copyWeeksSelections.push(w);
    btn.classList.add('bg-navy', 'text-white', 'border-navy');
  } else {
    copyWeeksSelections.splice(idx, 1);
    btn.classList.remove('bg-navy', 'text-white', 'border-navy');
  }
}

function closeCopyWeeksModal() {
  document.getElementById('copyWeeksModal').classList.add('hidden');
  copyWeeksSelections = [];
}

async function submitCopyWeeks() {
  if (!copyWeeksSelections.length) {
    document.getElementById('copyWeeksError').textContent = 'Välj minst en vecka';
    document.getElementById('copyWeeksError').classList.remove('hidden');
    return;
  }
  document.getElementById('copyWeeksError').classList.add('hidden');
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-to-weeks`, {
    method: 'POST',
    body: JSON.stringify({ from_day: currentDay, week_offsets: copyWeeksSelections }),
  });
  const data = await res.json();
  if (res.ok) {
    closeCopyWeeksModal();
    showToast(`📆 ${DAYS[currentDay]} kopierat till ${data.copied_count} vecka${data.copied_count !== 1 ? 'r' : ''}!`);
  } else {
    showToast(data.error || 'Fel uppstod', true);
  }
}

// ── Timeline View ─────────────────────────────────────────
function renderTimeline() {
  if (!currentScheduleId) { renderEmptyDay(); return; }
  const child = children.find(c => c.id === currentChildId);
  const START_H = 6, END_H = 22;
  const slots = [];
  for (let h = START_H; h < END_H; h++) {
    slots.push({ h, m: 0, label: `${String(h).padStart(2,'0')}:00`, timeStr: `${String(h).padStart(2,'0')}:00`, half: false });
    slots.push({ h, m: 30, label: '', timeStr: `${String(h).padStart(2,'0')}:30`, half: true });
  }
  function timeToSlot(t) {
    if (!t) return -1;
    const [h,m] = t.split(':').map(Number);
    const s = (h - START_H)*2 + (m>=30?1:0);
    return (s>=0 && s<slots.length) ? s : -1;
  }
  const slotMap = {}; const unscheduled = [];
  scheduleItems.forEach(item => {
    const s = timeToSlot(item.start_time);
    if (s>=0) { if(!slotMap[s]) slotMap[s]=[]; slotMap[s].push(item); }
    else unscheduled.push(item);
  });

  const slotsHtml = slots.map((slot,idx) => {
    const items = slotMap[idx]||[];
    return `<div class="time-slot ${slot.half?'slot-half':''}" data-slot="${idx}" data-time="${slot.timeStr}">
      <span class="time-slot-label">${slot.half?'':slot.label}</span>
      ${items.map(item=>`<div class="timeline-activity" data-id="${item.id}" draggable="true">
        <span class="text-sm flex-shrink-0">${item.activity_icon||'📌'}</span>
        <span class="font-semibold text-navy truncate flex-1 text-xs">${escHtml(item.activity_name_display||item.activity_name)}</span>
        <button type="button" data-id="${item.id}" onclick="event.stopPropagation(); removeItem('${item.id}')" draggable="false" class="action-btn action-btn-remove p-2 rounded-lg text-gray-400 hover:text-red-500 flex-shrink-0" title="Ta bort">✕</button>
      </div>`).join('')}
    </div>`;
  }).join('');

  const unschHtml = unscheduled.length>0 ? `
    <div class="tl-unscheduled-label">Utan tid</div>
    ${unscheduled.map(item=>`<div class="time-slot" data-slot="-1" data-time="">
      <span class="time-slot-label text-gray-300 text-xs">–</span>
      <div class="timeline-activity" data-id="${item.id}" draggable="true">
        <span class="text-sm flex-shrink-0">${item.activity_icon||'📌'}</span>
        <span class="font-semibold text-navy truncate flex-1 text-xs">${escHtml(item.activity_name_display||item.activity_name)}</span>
        <button type="button" data-id="${item.id}" onclick="event.stopPropagation(); removeItem('${item.id}')" draggable="false" class="action-btn action-btn-remove p-2 rounded-lg text-gray-400 hover:text-red-500 flex-shrink-0">✕</button>
      </div>
    </div>`).join('')}` : '';

  const tlDateLabel = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]}${tlDateLabel ? ` <span class="text-text-soft font-normal text-base">${tlDateLabel}</span>` : ''} — ${child?escHtml(child.name):''} ⏱ Tidsvy</h3>
        <p class="text-xs text-text-soft">Dra aktiviteter upp/ner för att ändra starttid. 06:00–22:00.</p>
      </div>
      <button onclick="openAddModal('dag')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl text-sm font-semibold">+ Aktivitet</button>
    </div>
    <div class="border-2 border-lavender rounded-2xl overflow-hidden bg-white" id="timelineWrap" style="max-height:65vh;overflow-y:auto">
      ${slotsHtml}${unschHtml}
    </div>`;
  initTimelineDnd();
}

function initTimelineDnd() {
  const wrap = document.getElementById('timelineWrap');
  if (!wrap) return;
  let tlSrcId = null;
  wrap.querySelectorAll('.timeline-activity').forEach(el => {
    el.addEventListener('dragstart', e => {
      tlSrcId = el.dataset.id; el.classList.add('tl-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `tl:${tlSrcId}`);
      dndType = 'timeline';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('tl-dragging'); tlSrcId = null; dndType = null;
      wrap.querySelectorAll('.slot-drop-target').forEach(s=>s.classList.remove('slot-drop-target'));
    });
  });
  wrap.querySelectorAll('.time-slot').forEach(slot => {
    slot.addEventListener('dragover', e => {
      if (dndType !== 'timeline') return;
      e.preventDefault();
      wrap.querySelectorAll('.slot-drop-target').forEach(s=>s.classList.remove('slot-drop-target'));
      slot.classList.add('slot-drop-target');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('slot-drop-target'));
    slot.addEventListener('drop', async e => {
      e.preventDefault(); e.stopPropagation();
      slot.classList.remove('slot-drop-target');
      if (!tlSrcId || !currentScheduleId) return;
      const newTime = slot.dataset.time || null;
      const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${tlSrcId}`, {
        method: 'PUT', body: JSON.stringify({ start_time: newTime }),
      });
      if (res.ok) {
        const item = scheduleItems.find(i=>i.id==tlSrcId);
        if (item) item.start_time = newTime;
        showToast(`⏱ Tid: ${newTime||'utan tid'}`);
        renderTimeline();
      } else showToast('Fel vid tidsändring', true);
    });
  });
}

// ── Side-by-Side View (All Children) ──────────────────────
async function loadAllChildrenSchedules() {
  sbsAllData = {};
  const promises = children.map(async (child) => {
    const res = await window.apiFetch(`/api/children/${child.id}/schedules`);
    if (!res.ok) { sbsAllData[child.id] = { items: [], scheduleId: null }; return; }
    const schedules = await res.json();
    const ds = schedules.find(s => s.day_of_week === currentDay);
    if (!ds) { sbsAllData[child.id] = { items: [], scheduleId: null }; return; }
    const dateStr = getCurrentDayDateStr();
    const ir = await window.apiFetch(`/api/schedules/${ds.id}/items${dateStr ? '?date=' + encodeURIComponent(dateStr) : ''}`);
    if (ir.ok) {
      const d = await ir.json();
      sbsAllData[child.id] = { items: d.items || [], scheduleId: ds.id };
    } else {
      sbsAllData[child.id] = { items: [], scheduleId: ds.id };
    }
  });
  await Promise.all(promises);
  // Keep current child's schedule in sync
  if (sbsAllData[currentChildId]) {
    scheduleItems = sbsAllData[currentChildId].items;
    currentScheduleId = sbsAllData[currentChildId].scheduleId;
  }
}

function renderSbsView() {
  const panelItems = (items, schedId, childId) => {
    if (!items || items.length === 0) return `<p class="text-sm text-text-soft text-center py-6">Inget schema för ${DAYS[currentDay]}</p>`;
    return SECTIONS.map(sec => {
      const si = items.filter(i => i.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      if (!si.length) return '';
      return `<div class="mb-2"><div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 px-1">${sec.emoji} ${sec.label}</div>
        ${si.map(item => `<div class="activity-item flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm mb-1${item.is_once_task ? ' once-task-item' : ''} ${item.is_once_task ? '' : 'cursor-grab'}"
          data-id="${item.id}" data-section="${item.section}"
          data-schedule-id="${schedId || ''}" data-child-id="${childId}"
          draggable="${item.is_once_task ? 'false' : 'true'}">
          <span class="text-sm flex-shrink-0">${item.activity_icon || '📌'}</span>
          ${item.is_once_task ? '<span title="Engångsaktivitet" class="text-[10px]">📌</span>' : ''}
          <div class="flex-1 min-w-0"><div class="font-semibold text-xs text-navy truncate">${escHtml(item.activity_name_display || item.activity_name)}</div>${item.start_time ? `<div class="text-xs text-text-soft">${fmtTime(item.start_time)}</div>` : ''}</div>
        </div>`).join('')}
      </div>`;
    }).join('');
  };

  const panels = children.map(child => {
    const data = sbsAllData[child.id] || { items: [], scheduleId: null };
    return `<div class="sbs-panel">
      <div class="sbs-panel-header">
        <span class="text-2xl">${renderChildAvatar(child, 32)}</span>
        <span class="font-bold text-navy">${escHtml(child.name)}</span>
        <span class="text-xs text-text-soft ml-auto">${data.items.length} st</span>
      </div>
      <div class="sbs-inner p-2" id="sbsInner_${child.id}">${panelItems(data.items, data.scheduleId, child.id)}</div>
    </div>`;
  }).join('');

  document.getElementById('scheduleContent').innerHTML = `
    <div class="mb-3"><h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]} — Jämför barn</h3>
      <p class="text-xs text-text-soft">📋 Dra en aktivitet från ett barn till det andra för att kopiera den</p>
    </div>
    <div class="sbs-container">${panels}</div>`;

  initSbsDnd();
}

function initSbsDnd() {
  const allPanels = children.map(c => document.getElementById(`sbsInner_${c.id}`)).filter(Boolean);
  if (allPanels.length < 2) return;
  let sbsSrcItemId = null, sbsSrcScheduleId = null, sbsSrcChildId = null;

  document.querySelectorAll('.sbs-inner [data-schedule-id]').forEach(el => {
    el.addEventListener('dragstart', e => {
      sbsSrcItemId = el.dataset.id; sbsSrcScheduleId = el.dataset.scheduleId; sbsSrcChildId = el.dataset.childId;
      el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', `sbs:${sbsSrcItemId}`);
      dndType = 'sbs';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging'); sbsSrcItemId = null; sbsSrcScheduleId = null; sbsSrcChildId = null;
      dndType = null;
      allPanels.forEach(p => p.classList.remove('sbs-drop-active'));
    });
  });

  allPanels.forEach(panel => {
    const panelChildId = panel.id.replace('sbsInner_', '');
    panel.addEventListener('dragover', e => { if (dndType !== 'sbs') return; e.preventDefault(); panel.classList.add('sbs-drop-active'); });
    panel.addEventListener('dragleave', () => panel.classList.remove('sbs-drop-active'));
    panel.addEventListener('drop', async e => {
      e.preventDefault(); e.stopPropagation();
      panel.classList.remove('sbs-drop-active');
      if (dndType !== 'sbs' || !sbsSrcItemId) return;
      if (!panelChildId || sbsSrcChildId === panelChildId) { showToast('Aktiviteten är redan hos detta barn'); return; }
      if (!sbsSrcScheduleId) { showToast('Källschema saknas', true); return; }
      const res = await window.apiFetch(`/api/children/${sbsSrcChildId}/schedules/copy-item-to-child`, {
        method: 'POST',
        body: JSON.stringify({ item_id: sbsSrcItemId, from_schedule_id: sbsSrcScheduleId, to_child_id: panelChildId, to_day: currentDay }),
      });
      const data = await res.json();
      if (res.ok) {
        const dstChild = children.find(c => c.id === panelChildId);
        showToast(data.skipped ? `Finns redan hos ${dstChild ? dstChild.name : 'barnet'}` : `📋 Kopierat till ${dstChild ? dstChild.name : 'barnet'}`);
        await loadAllChildrenSchedules(); renderSbsView();
      } else showToast(data.error || 'Fel uppstod', true);
    });
  });
}

// Legacy compatibility stubs (kept for any inline callers)
function renderSbsChildSelector() {}
async function loadSbsSchedule() { await loadAllChildrenSchedules(); }
async function selectSbsChild(id) { sbsChildId = id; }
