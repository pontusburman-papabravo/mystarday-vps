/**
 * Dashboard schedule drag & drop + reorder (Fas 8 F2g).
 * Sortable.js wiring, reorder-confirm dialog, move/copy item, day-to-day DnD modal,
 * extracted from dashboard.js. Shared DnD state (dndType, dndSrcDay) stays in dashboard.js;
 * group-exclusive state (scheduleSortables, _pendingReorder*, dayDndSrc/Dst) moves here.
 * Calls globals (renderSchedule, loadScheduleForDay, openConfirmModal, showToast, apiFetch,
 * DAYS via ScheduleCore). Handlers exposed on window for inline onclick + dashboard.js callers.
 */
(function () {
let scheduleSortables = {}; // section -> Sortable instance
let scheduleDragSrc = null; // { id, section } from sortablejs evt.item
let _pendingReorderSection = null; // section key from last drag
let _pendingReorderOrder = null;   // [{id, sort_order, section}] snapshot

function initDragDrop() {
  if (typeof Sortable === 'undefined') return;

  // Destroy previous instances before re-rendering
  Object.values(scheduleSortables).forEach(s => s.destroy());
  scheduleSortables = {};

  // Prevent drag handle taps from toggling activity or propagating
  document.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('click', e => e.stopPropagation());
  });

  SECTIONS.forEach(sec => {
    const listEl = document.getElementById('items-' + sec.key);
    if (!listEl) return;
    const sortable = Sortable.create(listEl, {
      // No shared group — drag ONLY within each section, never between
      animation: 200,
      handle: '.drag-handle',
      draggable: '.activity-item',
      filter: '.once-task-item',
      preventOnFilter: false,
      forceFallback: true,
      fallbackTolerance: 3,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onStart: function(evt) {
        scheduleDragSrc = { id: evt.item.dataset.id, section: evt.item.dataset.section };
      },
      onEnd: function(evt) {
        if (evt.oldIndex === evt.newIndex) return;
        const sectionEl = evt.from.closest('[data-section]');
        const section = sectionEl ? sectionEl.dataset.section : null;
        if (!section) return;
        captureAndAskReorder(section);
      },
    });
    scheduleSortables[sec.key] = sortable;
  });
}

// Capture DOM order after drag and show confirmation dialog
function captureAndAskReorder(section) {
  if (!currentScheduleId) return;
  const order = [];
  SECTIONS.forEach(sec => {
    const listEl = document.getElementById('items-' + sec.key);
    if (!listEl) return;
    listEl.querySelectorAll('.activity-item').forEach((el, idx) => {
      order.push({ id: el.dataset.id, sort_order: idx, section: sec.key });
    });
  });
  _pendingReorderSection = section;
  _pendingReorderOrder = order;
  showReorderDialog();
}

// "Bara idag / Alla [veckodagar]" confirmation dialog
function showReorderDialog() {
  const dayName = DAYS[currentDay] ? DAYS[currentDay].toLowerCase() : '';
  const dayPlural = dayName ? `alla ${dayName}ar` : 'alla dagar';
  const existing = document.getElementById('reorder-dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'reorder-dialog-overlay';
  overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
      <p class="text-2xl mb-2">↕️</p>
      <h3 class="font-heading font-bold text-navy text-lg mb-1">Ändra ordning</h3>
      <p class="text-sm text-text-soft mb-5">Ska ändringen gälla bara idag eller ${dayPlural}?</p>
      <div class="flex flex-col gap-2">
        <button id="reorder-today-btn" class="w-full py-3 px-4 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          📅 Ändra bara idag
        </button>
        <button id="reorder-all-btn" class="w-full py-3 px-4 bg-navy hover:bg-purple-900 text-white rounded-xl font-semibold text-sm transition-colors">
          🔁 Ändra ${dayPlural}
        </button>
        <button id="reorder-cancel-btn" class="w-full py-2 px-4 text-text-soft hover:text-navy text-sm transition-colors">
          Avbryt
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) cancelReorderDialog(); });
  document.getElementById('reorder-today-btn').addEventListener('click', () => confirmReorderTodayOnly());
  document.getElementById('reorder-all-btn').addEventListener('click', () => confirmReorderAllDays());
  document.getElementById('reorder-cancel-btn').addEventListener('click', () => cancelReorderDialog());
}

function cancelReorderDialog() {
  const overlay = document.getElementById('reorder-dialog-overlay');
  if (overlay) overlay.remove();
  renderSchedule();
  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

// "Ändra alla [veckodagar]" — save to weekly_schedule_item template
async function confirmReorderAllDays() {
  const overlay = document.getElementById('reorder-dialog-overlay');
  if (overlay) overlay.remove();
  if (!_pendingReorderOrder || !currentScheduleId) return;

  const order = _pendingReorderOrder;
  const prevScheduleItems = scheduleItems.slice();
  scheduleItems = order.map(({ id, sort_order, section }) => {
    const existing = scheduleItems.find(i => i.id == id) || {};
    return { ...existing, id, sort_order, section };
  });

  const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });

  if (!res.ok) {
    scheduleItems = prevScheduleItems;
    renderSchedule();
    showToast('Fel vid sparning av ordning', true);
  } else {
    order.forEach(({ id, sort_order, section }) => {
      const item = scheduleItems.find(i => i.id == id);
      if (item) { item.sort_order = sort_order; item.section = section; }
    });
    showToast(`Ordning sparad för alla ${DAYS[currentDay] ? DAYS[currentDay].toLowerCase() + 'ar' : 'dagar'} ✅`);
  }
  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

// "Bara idag" — reorder daily_log_items for today's date only
async function confirmReorderTodayOnly() {
  const overlay = document.getElementById('reorder-dialog-overlay');
  if (overlay) overlay.remove();
  if (!_pendingReorderOrder || !currentChildId) return;

  const dateStr = getCurrentDateStr();
  if (!dateStr) { showToast('Kunde inte bestämma datum', true); renderSchedule(); return; }

  const newOrder = _pendingReorderOrder;

  try {
    const logRes = await window.apiFetch(`/api/children/${currentChildId}/daily-log?date=${dateStr}`);
    if (!logRes.ok) throw new Error('Kunde inte hämta dagens schema');
    const logData = await logRes.json();
    const logItems = logData.items || [];

    // Map new order: template IDs → matching daily_log_item IDs
    const orderedDailyIds = [];
    SECTIONS.forEach(sec => {
      const sectionOrder = newOrder.filter(o => o.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      for (const entry of sectionOrder) {
        const schedItem = scheduleItems.find(i => i.id == entry.id);
        if (!schedItem) continue;
        const templateId = schedItem.activity_template_id;
        if (!templateId) continue;
        const match = logItems.find(li =>
          li.activity_template_id === templateId && li.section === sec.key &&
          !orderedDailyIds.includes(li.id)
        );
        if (match) orderedDailyIds.push(match.id);
      }
      logItems.filter(li => li.section === sec.key && !orderedDailyIds.includes(li.id))
        .forEach(li => orderedDailyIds.push(li.id));
    });

    if (orderedDailyIds.length === 0) throw new Error('Inga aktiviteter att sortera');

    const res = await window.apiFetch('/api/daily-log-items/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordered_item_ids: orderedDailyIds }),
    });
    if (!res.ok) throw new Error('Sparning misslyckades');

    showToast('Ordning sparad bara för idag ✅');
  } catch (err) {
    showToast(err.message || 'Fel vid sparning', true);
  }

  renderSchedule();
  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

async function moveItem(itemId, section, direction) {
  const si = scheduleItems.filter(i=>i.section===section).sort((a,b)=>a.sort_order-b.sort_order);
  const idx = si.findIndex(i=>i.id==itemId);
  if (idx < 0) return;
  const ni = idx + direction;
  if (ni < 0 || ni >= si.length) return;
  [si[idx], si[ni]] = [si[ni], si[idx]];
  // Build pending order and show dialog (same flow as drag)
  const order = si.map((item, i) => ({ id: item.id, sort_order: i, section }));
  const otherItems = scheduleItems.filter(i => i.section !== section);
  _pendingReorderOrder = [...order, ...otherItems.map(i => ({ id: i.id, sort_order: i.sort_order, section: i.section }))];
  _pendingReorderSection = section;
  renderSchedule();
  showReorderDialog();
}

// ── Copy activity to another day (drop on day tab) ────────
async function copyActivityToDay(itemId, toDay) {
  if (!currentScheduleId || !currentChildId) return;
  const item = scheduleItems.find(i => i.id == itemId);
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-item-to-day`, {
    method: 'POST', body: JSON.stringify({ item_id: itemId, from_schedule_id: currentScheduleId, to_day: toDay }),
  });
  const data = await res.json();
  if (res.ok) showToast(data.skipped ? `Al finns redan på ${DAYS[toDay]}` : `📋 Kopierat till ${DAYS[toDay]}`);
  else showToast(data.error || 'Fel uppstod', true);
}

// ── Day DnD Modal ─────────────────────────────────────────
let dayDndSrc = null, dayDndDst = null;
function openDayDndModal(s, d) {
  dayDndSrc = s; dayDndDst = d;
  document.getElementById('dayDndTitle').textContent = `${DAYS[s]} → ${DAYS[d]}`;
  document.getElementById('dayDndDesc').textContent = `Vad vill du göra med ${DAYS[s]}s schema?`;
  document.getElementById('dayDndCopyBtn').onclick = () => { closeDayDndModal(); doDayDndCopy(s,d); };
  document.getElementById('dayDndSwapBtn').onclick = () => { closeDayDndModal(); doDayDndSwap(s,d); };
  document.getElementById('dayDndModal').classList.remove('hidden');
}
function closeDayDndModal() { document.getElementById('dayDndModal').classList.add('hidden'); dayDndSrc=null; dayDndDst=null; }
async function doDayDndCopy(src, dst) {
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`, { method: 'POST', body: JSON.stringify({ from_day: src, to_days: [dst] }) });
  const data = await res.json();
  if (res.ok) { showToast(`📋 ${DAYS[src]} kopierat till ${DAYS[dst]}`); if(currentDay===dst) await loadScheduleForDay(); }
  else showToast(data.error||'Fel uppstod', true);
}
async function doDayDndSwap(a, b) {
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/swap-day`, { method: 'POST', body: JSON.stringify({ day_a: a, day_b: b }) });
  const data = await res.json();
  if (res.ok) { showToast(`🔄 ${DAYS[a]} och ${DAYS[b]} bytte plats`); if(currentDay===a||currentDay===b) await loadScheduleForDay(); }
  else showToast(data.error||'Fel uppstod', true);
}

  // Exposed on window for inline onclick + cross-file callers
  window.initDragDrop = initDragDrop;
  window.captureAndAskReorder = captureAndAskReorder;
  window.showReorderDialog = showReorderDialog;
  window.cancelReorderDialog = cancelReorderDialog;
  window.confirmReorderAllDays = confirmReorderAllDays;
  window.confirmReorderTodayOnly = confirmReorderTodayOnly;
  window.moveItem = moveItem;
  window.copyActivityToDay = copyActivityToDay;
  window.openDayDndModal = openDayDndModal;
  window.closeDayDndModal = closeDayDndModal;
  window.doDayDndCopy = doDayDndCopy;
  window.doDayDndSwap = doDayDndSwap;
})();
