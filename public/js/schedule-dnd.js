/**
 * Schedule page drag & drop + reorder (Fas 8 PR-S4).
 * Sortable.js wiring, reorder-confirm dialog, move/copy item, day-to-day DnD modal,
 * extracted from schedule.js. Shared DnD state (dndType, dndSrcDay) stays in schedule.js —
 * used by renderDayTabs() (day-tab drag/drop) and schedule-views.js (timeline/sbs);
 * group-exclusive state (scheduleSortables, _pendingReorder*, dayDndSrc/Dst) moves here.
 * Calls globals from schedule.js (currentScheduleId, currentChildId, currentDay,
 * scheduleItems, renderSchedule, loadScheduleForDay) and schedule-activity-modals.js
 * (getCurrentDayDateStr), plus shared utils (showToast, apiFetch) and DAYS/SECTIONS via
 * ScheduleCore. Handlers exposed on window for inline onclick + cross-file callers.
 */
(function () {
  const { DAYS, SECTIONS, buildOrderedDailyIdsFromReorder, pendingReorderIncludesOnceTask } = window.ScheduleCore;

  function onceTaskDragFiltered(evt) {
    const el = evt.target.closest ? evt.target.closest('.activity-item') : null;
    if (!el || !el.classList.contains('once-task-item')) return false;
    const dateStr = typeof getCurrentDayDateStr === 'function' ? getCurrentDayDateStr() : null;
    return !dateStr;
  }

  function spt(key, params) {
    return window.ScheduleI18n ? ScheduleI18n.t(key, params) : (window.pt ? window.pt(key, params) : key);
  }

  function dayPluralLabel() {
    const key = `schedule.daysPlural.${currentDay}`;
    const val = spt(key);
    return val === key ? spt('schedule.daysPlural.all') : val;
  }

  let scheduleSortables = {}; // section -> Sortable instance
  let scheduleDragSrc = null; // { id, section } from sortablejs evt.item
  let _pendingReorderSection = null; // section key from last drag
  let _pendingReorderOrder = null;   // [{id, sort_order, section}] snapshot

  function initDragDrop() {
    if (typeof Sortable === 'undefined') return;

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
        filter: onceTaskDragFiltered,
        preventOnFilter: false,
        forceFallback: true,
        fallbackTolerance: 3,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onStart: function(evt) {
          scheduleDragSrc = { id: evt.item.dataset.id, section: evt.item.dataset.section };
        },
        onEnd: function(evt) {
          scheduleDragSrc = null;
          if (evt.oldIndex === evt.newIndex) return; // no movement
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
    const dayPlural = dayPluralLabel();
    const hideAllDays = _pendingReorderOrder && pendingReorderIncludesOnceTask(_pendingReorderOrder, scheduleItems);
    const existing = document.getElementById('reorder-dialog-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'reorder-dialog-overlay';
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
      <p class="text-2xl mb-2">↕️</p>
      <h3 class="font-heading font-bold text-navy text-lg mb-1">${spt('schedule.dnd.reorderTitle')}</h3>
      <p class="text-sm text-text-soft mb-5">${hideAllDays ? spt('schedule.dnd.reorderOnceBody') : spt('schedule.dnd.reorderBody', { plural: dayPlural })}</p>
      <div class="flex flex-col gap-2">
        <button id="reorder-today-btn" class="w-full py-3 px-4 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          ${spt('schedule.dnd.reorderTodayBtn')}
        </button>
        ${hideAllDays ? '' : `<button id="reorder-all-btn" class="w-full py-3 px-4 bg-navy hover:bg-purple-900 text-white rounded-xl font-semibold text-sm transition-colors">
          ${spt('schedule.dnd.reorderAllBtn', { plural: dayPlural })}
        </button>`}
        <button id="reorder-cancel-btn" class="w-full py-2 px-4 text-text-soft hover:text-navy text-sm transition-colors">
          ${spt('schedule.modals.common.cancel')}
        </button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) cancelReorderDialog(); });
    document.getElementById('reorder-today-btn').addEventListener('click', () => confirmReorderTodayOnly());
    const allBtn = document.getElementById('reorder-all-btn');
    if (allBtn) allBtn.addEventListener('click', () => confirmReorderAllDays());
    document.getElementById('reorder-cancel-btn').addEventListener('click', () => cancelReorderDialog());
  }

  function cancelReorderDialog() {
    const overlay = document.getElementById('reorder-dialog-overlay');
    if (overlay) overlay.remove();
    // Revert DOM to original schedule order
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
      showToast(spt('schedule.dnd.saveOrderFailed'), true);
    } else {
      order.forEach(({ id, sort_order, section }) => {
        const item = scheduleItems.find(i => i.id == id);
        if (item) { item.sort_order = sort_order; item.section = section; }
      });
      showToast(spt('schedule.dnd.savedAll', { plural: dayPluralLabel() }));
    }
    _pendingReorderOrder = null;
    _pendingReorderSection = null;
  }

  // "Bara idag" — reorder daily_log_items for today's date only
  async function confirmReorderTodayOnly() {
    const overlay = document.getElementById('reorder-dialog-overlay');
    if (overlay) overlay.remove();
    if (!_pendingReorderOrder || !currentChildId) return;

    const dateStr = getCurrentDayDateStr();
    if (!dateStr) { showToast(spt('schedule.dnd.noDate'), true); renderSchedule(); return; }

    // Build the new template_id order from the pending reorder
    const newOrder = _pendingReorderOrder;

    try {
      // Fetch the daily log for this date to get daily_log_item IDs
      const logRes = await window.apiFetch(`/api/children/${currentChildId}/daily-log?date=${dateStr}`);
      if (!logRes.ok) throw new Error(spt('schedule.dnd.fetchTodayFailed'));
      const logData = await logRes.json();
      const logItems = logData.items || [];

      const orderedDailyIds = buildOrderedDailyIdsFromReorder(newOrder, scheduleItems, logItems);

      if (orderedDailyIds.length === 0) throw new Error(spt('schedule.dnd.nothingToSort'));

      const res = await window.apiFetch('/api/daily-log-items/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ordered_item_ids: orderedDailyIds }),
      });
      if (!res.ok) throw new Error(spt('schedule.dnd.saveFailed'));

      showToast(spt('schedule.dnd.savedToday'));
      await loadScheduleForDay();
    } catch (err) {
      showToast(err.message || spt('schedule.dnd.saveError'), true);
      renderSchedule();
    }

    _pendingReorderOrder = null;
    _pendingReorderSection = null;
  }

  // NOTE: saveReorder() was dead code in schedule.js (no callers anywhere in public/js) —
  // intentionally omitted rather than carried over unchanged.

  async function moveItem(itemId, section, direction) {
    const si = scheduleItems.filter(i=>i.section===section).sort((a,b)=>a.sort_order-b.sort_order);
    const idx = si.findIndex(i=>i.id==itemId);
    if (idx < 0) return;
    const ni = idx + direction;
    if (ni < 0 || ni >= si.length) return;
    [si[idx], si[ni]] = [si[ni], si[idx]];
    // Build pending order and show dialog (same flow as drag)
    const order = si.map((item, i) => ({ id: item.id, sort_order: i, section }));
    // Also include items from other sections unchanged
    const otherItems = scheduleItems.filter(i => i.section !== section);
    _pendingReorderOrder = [...order, ...otherItems.map(i => ({ id: i.id, sort_order: i.sort_order, section: i.section }))];
    _pendingReorderSection = section;
    renderSchedule(); // show new visual order
    showReorderDialog();
  }

  // ── Copy activity to another day (drop on day tab) ────────
  async function copyActivityToDay(itemId, toDay) {
    if (!currentScheduleId || !currentChildId) return;
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-item-to-day`, {
      method: 'POST', body: JSON.stringify({ item_id: itemId, from_schedule_id: currentScheduleId, to_day: toDay }),
    });
    const data = await res.json();
    if (res.ok) showToast(data.skipped ? spt('schedule.dnd.alreadyOnDay', { day: DAYS[toDay] }) : spt('schedule.dnd.copiedToDay', { day: DAYS[toDay] }));
    else showToast(data.error || spt('schedule.errors.generic'), true);
  }

  // ── Day DnD Modal ─────────────────────────────────────────
  let dayDndSrc = null, dayDndDst = null;
  function openDayDndModal(s, d) {
    dayDndSrc = s; dayDndDst = d;
    document.getElementById('dayDndTitle').textContent = `${DAYS[s]} → ${DAYS[d]}`;
    document.getElementById('dayDndDesc').textContent = spt('schedule.dnd.dayDndDesc', { day: DAYS[s] });
    document.getElementById('dayDndCopyBtn').onclick = () => { closeDayDndModal(); doDayDndCopy(s,d); };
    document.getElementById('dayDndSwapBtn').onclick = () => { closeDayDndModal(); doDayDndSwap(s,d); };
    document.getElementById('dayDndModal').classList.remove('hidden');
  }
  function closeDayDndModal() {
    document.getElementById('dayDndModal').classList.add('hidden');
    if (dayDndSrc !== null || dayDndDst !== null) {
      dayDndSrc = null;
      dayDndDst = null;
    }
  }
  async function doDayDndCopy(src, dst) {
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`, { method: 'POST', body: JSON.stringify({ from_day: src, to_days: [dst] }) });
    const data = await res.json();
    if (res.ok) { showToast(spt('schedule.dnd.dayCopiedTo', { src: DAYS[src], dst: DAYS[dst] })); if(currentDay===dst) await loadScheduleForDay(); }
    else showToast(data.error||spt('schedule.errors.generic'), true);
  }
  async function doDayDndSwap(a, b) {
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/swap-day`, { method: 'POST', body: JSON.stringify({ day_a: a, day_b: b }) });
    const data = await res.json();
    if (res.ok) { showToast(spt('schedule.dnd.daysSwapped', { a: DAYS[a], b: DAYS[b] })); if(currentDay===a||currentDay===b) await loadScheduleForDay(); }
    else showToast(data.error||spt('schedule.errors.generic'), true);
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
