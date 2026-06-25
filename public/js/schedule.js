/**
 * Schedule page main logic — weekly schedule builder, activity templates, drag-and-drop reordering, section management.
 * Does not own: authentication (auth.js), API routing, database.
 */

// ── Overflow menu (mobile ⋯ per-row action menu) ──────────
function closeOverflowMenus() {
  document.querySelectorAll('.overflow-menu-popup.open').forEach(m => m.classList.remove('open'));
}
function toggleOverflowMenu(e, menuId) {
  e.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const wasOpen = menu.classList.contains('open');
  closeOverflowMenus();
  if (!wasOpen) menu.classList.add('open');
}
// Close overflow menus when clicking outside (but not on menu buttons or inside menus)
document.addEventListener('click', e => {
  if (e.target.closest('.overflow-menu-btn')) return;
  if (e.target.closest('.overflow-menu-popup')) return;
  closeOverflowMenus();
});

// ── Delegated delete handler (Sortable.js forceFallback blocks inline onclick on mobile) ──
function _handleRemoveBtn(btn) {
  const itemId = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
  if (itemId && typeof removeItem === 'function') removeItem(itemId);
}
document.addEventListener('click', e => {
  const btn = e.target.closest('.action-btn-remove');
  if (!btn) return;
  e.stopPropagation();
  _handleRemoveBtn(btn);
});
document.addEventListener('touchstart', e => {
  const btn = e.target.closest('.action-btn-remove');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  _handleRemoveBtn(btn);
}, { passive: false });

// ── Delegated ⋯ overflow-menu tap handler (fallback for SortableJS forceFallback touch) ──
function _handleOverflowBtn(btn) {
  const menuEl = btn.nextElementSibling;
  if (!menuEl || !menuEl.classList.contains('overflow-menu-popup')) {
    const menuId = btn.getAttribute('onclick')?.match(/'omenu-s-(.+?)'/)?.[1];
    if (menuId) {
      const menu = document.getElementById('omenu-s-' + menuId);
      if (menu) { closeOverflowMenus(); menu.classList.add('open'); }
    }
    return;
  }
  const wasOpen = menuEl.classList.contains('open');
  closeOverflowMenus();
  if (!wasOpen) menuEl.classList.add('open');
}
// click handler (desktop + fallback)
document.addEventListener('click', e => {
  const btn = e.target.closest('.overflow-menu-btn');
  if (btn) { e.stopPropagation(); _handleOverflowBtn(btn); }
});
// touchstart handler (iOS instant response — prevent ghost click)
document.addEventListener('touchstart', e => {
  const btn = e.target.closest('.overflow-menu-btn');
  if (!btn) return;
  e.preventDefault();
  _handleOverflowBtn(btn);
}, { passive: false });

// ── Constants ────────────────────────────────────────────
const {
  DAYS,
  DAYS_SHORT,
  SECTIONS,
  fmtTime,
  sectionTimeLabel,
  getDayDateLabel,
  buildSectionCardsHtml,
} = window.ScheduleCore;
function setBirthdayPicker(prefix, dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return;
  document.getElementById(prefix + 'Year').value = parts[0];
  document.getElementById(prefix + 'Month').value = parts[1];
  updateBirthdayDays(prefix);
  document.getElementById(prefix + 'Day').value = parts[2];
  updateBirthdayHidden(prefix);
}

// ── State ────────────────────────────────────────────────
let children = [];
let activities = [];
let childSchedules = {};
let currentChildId = null;
let currentDay = 1;
let currentScheduleId = null;
let scheduleItems = [];
let sectionTimes = {};
let selectedTemplateId = null;
let addSectionOverride = 'dag';
let addSectionsMulti = new Set(['dag']); // multi-section selection state
let editSectionVal = 'dag';
let copyDaySelections = [];
let copyTargetChildId = null;
let allExpanded = true;

// Recurrence dialog state — set when submitAddActivity succeeds, before showing the prompt
let _pendingRecurrenceTemplateId = null;
let _pendingRecurrenceTemplateName = null;
let _pendingRecurrenceSection = 'dag';
let _pendingRecurrenceSections = ['dag']; // multi-slot
let _pendingRecurrenceStart = null;
let _pendingRecurrenceEnd = null;

// DnD state
let dndType = null; // 'within-day' | 'activity-to-day' | 'day-tab' | 'timeline' | 'sbs'
let dndSrcDay = null;
let currentViewMode = 'normal';
let sbsChildId = null;
let sbsItems = [];
let sbsScheduleId = null;
let sbsAllData = {}; // { [childId]: { items: [], scheduleId: null } }
let allTemplates = [];

// ── Template editing mode ──────────────────────────────
// Templates are family-level schedules (child_id IS NULL) editable via the library page.
// When ?view=template&template=<id> is in the URL, schedule.js enters template mode.
let templateMode = false;
let currentTemplateId = null;
let templateItems = [];  // items for the currently loaded template
let templateName = '';

// ── Calendar navigation state ─────────────────────────────
let calView = 'week'; // 'day' | 'week' | 'month'
let weekOffset = 0;   // 0 = current week, -1 = last week, +1 = next week
let dayOffset = 0;    // offset in days from today (for day view)

// ── Calendar helpers ──────────────────────────────────────
function getWeekStart(offset) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const mondayDiff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayDiff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getDayFromOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function updateCalNavLabel() {
  const label = document.getElementById('calNavLabel');
  if (!label) return;
  if (calView === 'week') {
    const ws = getWeekStart(weekOffset);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const wn = getWeekNumber(ws);
    label.textContent = `Vecka ${wn}, ${ws.getFullYear()}`;
  } else if (calView === 'day') {
    const d = getDayFromOffset(dayOffset);
    const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
    const isToday = d.getTime() === today.getTime();
    const dayName = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' });
    label.textContent = isToday ? `Idag — ${d.toLocaleDateString('sv-SE', { day:'numeric', month:'short' })}` : dayName;
  } else if (calView === 'month') {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
    const monthName = d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }
}

function setCalView(view) {
  calView = view;
  // Update toggle button styles
  ['day','week','month'].forEach(v => {
    const btn = document.getElementById('btnView' + v.charAt(0).toUpperCase() + v.slice(1));
    if (!btn) return;
    const isActive = v === view;
    btn.classList.toggle('bg-navy', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('bg-white', !isActive);
    btn.classList.toggle('text-navy', !isActive);
  });
  // Show/hide viewModeBar and daySelectorWrap
  const viewModeBar = document.getElementById('viewModeBar');
  const daySelectorWrap = document.getElementById('daySelectorWrap');
  const fwBtn = document.getElementById('fillWeekBtn');
  if (view === 'month') {
    if (viewModeBar) viewModeBar.classList.add('hidden');
    if (daySelectorWrap) daySelectorWrap.classList.add('hidden');
    if (fwBtn) fwBtn.classList.add('hidden');
  } else if (view === 'day') {
    // Day view: show viewModeBar but hide day tabs (navigation is via arrows)
    if (viewModeBar && currentChildId) viewModeBar.classList.remove('hidden');
    if (daySelectorWrap) daySelectorWrap.classList.add('hidden');
    if (fwBtn) fwBtn.classList.add('hidden');
  } else {
    // Week view: show both
    if (viewModeBar && currentChildId) viewModeBar.classList.remove('hidden');
    if (daySelectorWrap && currentChildId && currentViewMode !== 'special-days') daySelectorWrap.classList.remove('hidden');
    if (fwBtn && currentChildId) fwBtn.classList.remove('hidden');
  }
  updateCalNavLabel();
  refreshCalView();
}

function calNavPrev() {
  if (calView === 'week') { weekOffset--; updateCalNavLabel(); renderDayTabs(); if (window.ScheduleCustody && currentChildId) ScheduleCustody.refresh(currentChildId, weekOffset); loadScheduleForDay(); }
  else if (calView === 'day') {
    dayOffset--;
    const d = getDayFromOffset(dayOffset);
    currentDay = d.getDay();
    updateCalNavLabel();
    if (currentChildId) loadScheduleForDay();
  } else if (calView === 'month') { weekOffset--; updateCalNavLabel(); renderMonthView(); }
}

function calNavNext() {
  if (calView === 'week') { weekOffset++; updateCalNavLabel(); renderDayTabs(); if (window.ScheduleCustody && currentChildId) ScheduleCustody.refresh(currentChildId, weekOffset); loadScheduleForDay(); }
  else if (calView === 'day') {
    dayOffset++;
    const d = getDayFromOffset(dayOffset);
    currentDay = d.getDay();
    updateCalNavLabel();
    if (currentChildId) loadScheduleForDay();
  } else if (calView === 'month') { weekOffset++; updateCalNavLabel(); renderMonthView(); }
}

function calNavToday() {
  weekOffset = 0; dayOffset = 0;
  const todayDow = new Date().getDay();
  currentDay = todayDow === 0 ? 1 : todayDow; // avoid Sunday as default
  if (calView === 'day') currentDay = new Date().getDay();
  updateCalNavLabel();
  if (calView === 'month') renderMonthView();
  else { renderDayTabs(); if (window.ScheduleCustody && currentChildId) ScheduleCustody.refresh(currentChildId, weekOffset); if (currentChildId) loadScheduleForDay(); }
}

function refreshCalView() {
  if (!currentChildId) return;
  if (calView === 'month') renderMonthView();
  else loadScheduleForDay();
}

// ── Month overview ─────────────────────────────────────────
async function renderMonthView() {
  if (!currentChildId) return;
  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  document.getElementById('scheduleContent').innerHTML = '<div class="text-center py-10 text-text-soft">Laddar…</div>';

  // Fetch all weekly schedules to know which days have activities
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`);
  const schedules = res.ok ? await res.json() : [];
  const activeDays = new Set(schedules.map(s => s.day_of_week)); // 0-6

  const child = children.find(c => c.id === currentChildId);
  const childName = child ? `${child.emoji || '👤'} ${escHtml(child.name)}` : '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayStr = new Date().toISOString().slice(0,10);
  const headerDays = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];

  // Build calendar grid (Mon-first)
  let startDow = firstDay.getDay();
  let offset = (startDow + 6) % 7;
  const cells = [];
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - offset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate); d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().slice(0,10);
    const inMonth = d.getMonth() === month;
    const isToday = dateStr === todayStr;
    // 0=Sun, but we want Mon=1..Sun=0 — JS getDay() returns 0=Sun,1=Mon,...
    const dow = d.getDay(); // 0=Sun
    const hasActivities = activeDays.has(dow);
    cells.push({ d, dateStr, inMonth, isToday, hasActivities, dow });
  }
  // Trim trailing empty rows
  let totalRows = 6;
  while (totalRows > 4 && !cells.slice((totalRows-1)*7, totalRows*7).some(c => c.inMonth)) totalRows--;

  const gridHtml = cells.slice(0, totalRows*7).map(cell => {
    const { d, dateStr, inMonth, isToday, hasActivities } = cell;
    let bg = inMonth ? 'bg-white hover:bg-sky cursor-pointer' : 'bg-gray-50 cursor-default';
    let ring = 'border border-gray-100';
    if (isToday) { bg = 'bg-blue-50 hover:bg-blue-100 cursor-pointer'; ring = 'border-2 border-blue-300'; }
    const dot = hasActivities && inMonth ? `<span class="block w-2 h-2 rounded-full bg-green-400 mx-auto mt-0.5"></span>` : `<span class="block w-2 h-2 mt-0.5"></span>`;
    const dayNum = d.getDate();
    return `<div class="relative min-h-[52px] p-1.5 ${bg} ${ring} transition-colors flex flex-col items-center" onclick="${inMonth ? `calMonthDayClick(${d.getDay()})` : ''}">
      <span class="text-sm font-bold ${inMonth ? (isToday ? 'text-blue-700' : 'text-navy') : 'text-gray-300'}">${dayNum}</span>
      ${dot}
    </div>`;
  }).join('');

  // Activity summary for each weekday with schedule
  const dayLabels = [];
  [1,2,3,4,5,6,0].forEach(dow => {
    if (activeDays.has(dow)) {
      const s = schedules.find(x => x.day_of_week === dow);
      dayLabels.push(`<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 font-semibold">${DAYS_SHORT[dow]}</span>`);
    }
  });

  document.getElementById('scheduleContent').innerHTML = `
    <div class="mb-4">
      <h3 class="text-lg font-heading font-bold text-navy mb-1">${childName} — Månadsöversikt</h3>
      <p class="text-xs text-text-soft mb-3">Gröna prickar = dagar med schemalagda aktiviteter. Klicka på en dag för att se schemat.</p>
      ${dayLabels.length > 0 ? `<div class="flex flex-wrap gap-1 mb-3">${dayLabels.join('')}</div>` : '<p class="text-xs text-text-soft mb-3">Inga aktiviteter inlagda i veckoschemat ännu.</p>'}
      <div class="cal-scroll-wrap">
        <div class="border-2 border-lavender rounded-2xl overflow-hidden">
          <div class="grid grid-cols-7 bg-navy">
            ${headerDays.map(h => `<div class="text-center text-white text-xs font-bold py-2">${h}</div>`).join('')}
          </div>
          <div class="grid grid-cols-7">${gridHtml}</div>
        </div>
      </div>
    </div>`;
}

function calMonthDayClick(dow) {
  currentDay = dow;
  setCalView('week');
  renderDayTabs();
  loadScheduleForDay();
}

// ── Init ─────────────────────────────────────────────────
let _schedulePageBound = false;

async function bootSchedulePage() {
  try {
    const user = await window.authGuard();
    if (!user) return;

    if (!_schedulePageBound) {
      _schedulePageBound = true;
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) logoutBtn.addEventListener('click', () => window.logout());

      function autoAdjustEndTime(startInput, endInput) {
        startInput.addEventListener('change', () => {
          const sv = startInput.value;
          const ev = endInput.value;
          if (sv && ev && ev <= sv) {
            const [h, m] = sv.split(':').map(Number);
            const totalMin = h * 60 + m + 30;
            const nh = Math.min(Math.floor(totalMin / 60), 23);
            const nm = totalMin % 60;
            endInput.value = String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
          }
        });
      }
      const addStartTime = document.getElementById('addStartTime');
      const addEndTime = document.getElementById('addEndTime');
      const editStartTime = document.getElementById('editStartTime');
      const editEndTime = document.getElementById('editEndTime');
      if (addStartTime && addEndTime) autoAdjustEndTime(addStartTime, addEndTime);
      if (editStartTime && editEndTime) autoAdjustEndTime(editStartTime, editEndTime);

      let selectedChildEmoji = '';
      document.querySelectorAll('.emoji-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('border-gold','bg-gold-light'));
          btn.classList.add('border-gold','bg-gold-light');
          selectedChildEmoji = btn.dataset.emoji;
          const childEmoji = document.getElementById('childEmoji');
          if (childEmoji) childEmoji.value = selectedChildEmoji;
        });
      });

      const addChildForm = document.getElementById('addChildForm');
      if (addChildForm) addChildForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('addChildMsg');
        const btn = document.getElementById('addChildSubmit');
        if (!selectedChildEmoji) { msg.textContent = 'Välj en emoji'; msg.className = 'text-sm text-red-500'; return; }
        btn.disabled = true; btn.textContent = 'Skapar...'; msg.textContent = '';
        try {
          const res = await window.apiFetch('/api/children', {
            method: 'POST',
            body: JSON.stringify({ name: document.getElementById('childName').value.trim(), emoji: selectedChildEmoji, birthday: document.getElementById('childBirthday').value, pin: document.getElementById('childPin').value.trim() || undefined }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (data.error && data.error.includes('föräldrabehörighet')) {
              msg.textContent = 'Din session har löpt ut. Du loggas in igen…';
              msg.className = 'text-sm text-red-500';
              setTimeout(() => { Auth.clearAuth(); window.location.href = '/login'; }, 2000);
              return;
            }
            msg.textContent = data.error || 'Nätverksfel'; msg.className = 'text-sm text-red-500';
          } else {
            if (data.wizard && data.id) {
              window.location.href = `/child-wizard?id=${data.id}&pin=${encodeURIComponent(data.pin)}&name=${encodeURIComponent(data.name)}&schedule=${encodeURIComponent(data.default_schedule_name || '')}`;
            } else {
              showToast(`${data.name} har lagts till! PIN: ${data.pin}`);
              document.getElementById('addChildModal').classList.add('hidden');
              document.getElementById('addChildForm').reset();
              selectedChildEmoji = '';
              document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('border-gold','bg-gold-light'));
              await loadChildren();
            }
          }
        } catch (err) { msg.textContent = err.message || 'Nätverksfel'; msg.className = 'text-sm text-red-500'; }
        btn.disabled = false; btn.textContent = 'Lägg till';
      });

      initTouchDndBridge();
      bindRecurrenceAddHandlers();
      if (window.AppViewMode) {
        AppViewMode.onChange(function () {
          refreshScheduleOnViewModeChange();
        });
      }
    }

    await Promise.all([loadChildren(), loadTemplates()]);
    pickSection('dag');
    initBirthdayPicker('childBirthday');

    const urlParams = new URLSearchParams(window.location.search);
    const preSelectView = urlParams.get('view');
    const preSelectChild = urlParams.get('child');
    const preSelectDay = urlParams.get('day');
    const preSelectTemplate = urlParams.get('template');

    if (preSelectView === 'template' && preSelectTemplate) {
      await loadTemplate(preSelectTemplate);
    } else if (preSelectView === 'family') {
      setScheduleMode('family');
    } else if (preSelectChild && children.some(c => c.id === preSelectChild)) {
      await selectChild(preSelectChild);
      if (preSelectDay !== null) {
        const dow = parseInt(preSelectDay, 10);
        if (!isNaN(dow) && dow >= 0 && dow <= 6) {
          currentDay = dow;
          renderDayTabs();
          await loadScheduleForDay();
        }
      }
    } else if (children.length === 1 && preSelectView !== 'family') {
      await selectChild(children[0].id);
    }
  } catch (err) {
    console.error('[SCHEDULE] Init error:', err);
    const container = document.getElementById('childCardsContainer');
    if (container) container.innerHTML = '<div class="text-center py-8 text-red-500 font-semibold">Något gick fel vid laddning. Ladda om sidan.</div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSchedulePage);
}
if (window.ParentMagicPageBoot) {
  ParentMagicPageBoot.register('schedule', bootSchedulePage);
}

// showToast is now in /js/toast.js
// escHtml shim — delegates to escapeHtml() from /js/dom-utils.js
function escHtml(s) { return escapeHtml(s); }
// ── Children overview ────────────────────────────────────
function capScheduleChildName(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildScheduleChildSubtitle(ad, totalActivities) {
  if (ad === 0) return 'Inget schema ännu — börja planera veckan';
  if (ad >= 7) {
    if (totalActivities > 0) return `${totalActivities} planerade aktiviteter · alla dagar klara ✅`;
    return 'Schema för hela veckan ✅';
  }
  if (totalActivities > 0) return `${totalActivities} planerade aktiviteter denna vecka`;
  return `${ad} av 7 dagar planerade`;
}

function updateSchedulePageTitle(child) {
  const el = document.getElementById('schedulePageTitle');
  if (!el) return;
  el.textContent = child
    ? `📅 ${capScheduleChildName(child.name)}s schema`
    : '📅 Veckoplanering';
}

async function loadChildren() {
  const res = await window.apiFetch('/api/children');
  if (res.ok) {
    children = await res.json();
    // renderChildrenOverview is async (fetches schedules) — catch errors so loading state clears
    renderChildrenOverview().catch(err => {
      console.error('[SCHEDULE] renderChildrenOverview error:', err);
      const c = document.getElementById('childCardsContainer');
      if (c) c.innerHTML = '<div class="text-center py-8 text-red-500 font-semibold">Kunde inte ladda schema. Ladda om sidan.</div>';
    });
    if (window.ParentMagicPageHub && ParentMagicPageHub.refreshScheduleHero) {
      ParentMagicPageHub.refreshScheduleHero();
    }
  }
}

async function renderChildrenOverview() {
  const container = document.getElementById('childCardsContainer');
  if (!container) return;
  if (children.length === 0) {
    container.innerHTML = `<div class="text-center py-16"><p class="text-5xl mb-4">👨‍👩‍👧</p><p class="font-semibold text-navy mb-1">Inga barn tillagda ännu</p><a href="/dashboard" class="px-6 py-3 bg-gold text-white rounded-xl font-semibold inline-block mt-3">Gå till Min panel</a></div>`;
    return;
  }
  // Fetch schedules for each child
  const results = await Promise.all(children.map(async c => {
    const r = await window.apiFetch(`/api/children/${c.id}/schedules`);
    return { childId: c.id, schedules: r.ok ? await r.json() : [] };
  }));
  const sm = {}; for (const r of results) sm[r.childId] = r.schedules;

  // Also fetch items for each schedule to show activity names
  const itemResults = {};
  const allSchedules = [];
  for (const r of results) {
    for (const s of r.schedules) {
      allSchedules.push({ childId: r.childId, scheduleId: s.id, dayOfWeek: s.day_of_week });
    }
  }
  const itemFetches = await Promise.all(allSchedules.map(async s => {
    const ir = await window.apiFetch(`/api/schedules/${s.scheduleId}/items`);
    const data = ir.ok ? await ir.json() : { items: [] };
    return { childId: s.childId, dayOfWeek: s.dayOfWeek, items: data.items || [] };
  }));
  // Group items by child and day
  const childDayItems = {};
  for (const f of itemFetches) {
    if (!childDayItems[f.childId]) childDayItems[f.childId] = {};
    childDayItems[f.childId][f.dayOfWeek] = f.items;
  }

  container.innerHTML = children.map(child => {
    const schedules = sm[child.id] || [];
    const dayItems = childDayItems[child.id] || {};
    const ad = schedules.filter(s=>s.day_of_week!==undefined).length;
    let totalActivities = 0;
    for (const d of [1, 2, 3, 4, 5, 6, 0]) totalActivities += (dayItems[d] || []).length;
    const subtitle = buildScheduleChildSubtitle(ad, totalActivities);

    // Build day-by-day schedule summary with activity names
    const daySummaryHtml = [1,2,3,4,5,6,0].map(d => {
      const items = dayItems[d] || [];
      if (items.length === 0) return '';
      const actList = items.slice(0, 6).map(i =>
        `<div class="flex items-center gap-1.5 py-0.5">
          <span class="text-sm flex-shrink-0">${i.activity_icon || '📌'}</span>
          <span class="text-xs text-navy truncate">${escHtml(i.activity_name_display || i.activity_name)}</span>
        </div>`
      ).join('');
      const moreHtml = items.length > 6 ? `<div class="text-[10px] text-lavender hover:text-gold ml-5 cursor-pointer transition-colors" title="Visa alla ${items.length - 6} aktiviteter">Visa alla (${items.length - 6})</div>` : '';
      const actLabel = items.length === 1 ? '1 aktivitet' : `${items.length} aktiviteter`;
      return `<div class="border border-gray-100 rounded-xl p-2.5 bg-gray-50/50">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
          <span class="text-xs font-bold text-navy">${DAYS[d]}</span>
          <span class="text-[10px] text-text-soft ml-auto">${actLabel}</span>
        </div>
        ${actList}${moreHtml}
      </div>`;
    }).join('');

    const hasDays = ad > 0;

    return `<div class="child-card border-2 border-lavender rounded-2xl p-5 bg-white hover:border-gold">
      <div class="flex items-start justify-between mb-3 cursor-pointer" onclick="selectChild('${child.id}')">
        <div class="flex items-center gap-3"><span class="text-4xl">${renderChildAvatar(child, 40)}</span>
          <div><h4 class="font-heading font-bold text-navy text-lg">🌟 ${escHtml(capScheduleChildName(child.name))}</h4><p class="text-sm text-text-soft">${subtitle}</p></div>
        </div><span class="text-gold text-sm font-semibold">→</span>
      </div>
      ${hasDays ? `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">${daySummaryHtml}</div>` : ''}
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <button onclick="event.stopPropagation(); window.location.href='/family?child=${child.id}&tab=rewards'" class="px-3 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-lg font-semibold text-sm transition-colors">🏆 Belöningar</button>
        <button onclick="selectChild('${child.id}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-lg font-semibold text-sm">✏️ Redigera schema →</button>
      </div>
    </div>`;
  }).join('');
}

// ── Print link (BC-11) ────────────────────────────────────
function updateSchedulePrintLink() {
  const link = document.getElementById('schedulePrintLink');
  if (!link) return;
  if (!currentChildId) {
    link.classList.add('hidden');
    return;
  }
  link.href = '/print-schema?childId=' + encodeURIComponent(currentChildId);
  link.classList.remove('hidden');
}

// ── Child tabs ────────────────────────────────────────────
function renderChildTabs() {
  document.getElementById('childTabs').innerHTML = children.map(c => `
    <button onclick="selectChild('${c.id}')" class="child-tab px-5 py-2 rounded-full border-2 font-semibold text-sm transition-colors day-btn ${currentChildId===c.id?'bg-navy text-white border-navy':'border-lavender text-navy hover:border-navy'}" data-id="${c.id}">
      ${c.emoji||'👤'} ${escHtml(c.name)}
    </button>`).join('');
}

async function selectChild(id) {
  try {
    document.getElementById('childrenListView').classList.add('hidden');
    document.getElementById('scheduleEditorView').classList.remove('hidden');
    document.getElementById('backToChildrenBtn').classList.remove('hidden');
    document.getElementById('viewModeBar').classList.remove('hidden');
    document.getElementById('calNavBar').classList.remove('hidden');
    // Show rewards button in editor header with child name
    const child = children.find(c => c.id === id);
    updateSchedulePageTitle(child);
    const editorRewardsBtn = document.getElementById('editorRewardsBtn');
    if (editorRewardsBtn) {
      editorRewardsBtn.classList.remove('hidden');
      editorRewardsBtn.textContent = `🏆 Belöningar${child ? ' — ' + child.name : ''}`;
    }
    // Update mode toggle button to show selected child's name
    const singleBtn = document.getElementById('btnModeSingle');
    if (singleBtn && child) {
      singleBtn.textContent = `${child.emoji || '👤'} ${child.name}`;
    }
    currentChildId = id; currentDay = new Date().getDay() || 1; // start on today's day
    if (currentDay === 0) currentDay = 1; // if sunday, default to monday
    document.getElementById('daySelectorWrap').classList.remove('hidden');
    calView = 'week'; weekOffset = 0; dayOffset = 0;
    setCalView('week');
    renderChildTabs(); renderDayTabs();
    if (window.ScheduleCustody) await ScheduleCustody.refresh(id, weekOffset);
    updateSchedulePrintLink();
    await loadScheduleForDay();
    renderSbsChildSelector();
  } catch (err) {
    console.error('[SCHEDULE] selectChild error:', err);
    document.getElementById('scheduleContent').innerHTML =
      '<div class="text-center py-8 text-red-500 font-semibold">Något gick fel vid laddning av schemat. Ladda om sidan.</div>';
  }
}

function backToChildrenList() {
  currentChildId = null; currentScheduleId = null;
  document.getElementById('childrenListView').classList.remove('hidden');
  document.getElementById('scheduleEditorView').classList.add('hidden');
  document.getElementById('backToChildrenBtn').classList.add('hidden');
  document.getElementById('daySelectorWrap').classList.add('hidden');
  document.getElementById('viewModeBar').classList.add('hidden');
  document.getElementById('calNavBar').classList.add('hidden');
  document.getElementById('sbsChildSelector').classList.add('hidden');
  const fwBtn = document.getElementById('fillWeekBtn');
  if (fwBtn) fwBtn.classList.add('hidden');
  updateSchedulePrintLink();
  const editorRewardsBtn = document.getElementById('editorRewardsBtn');
  if (editorRewardsBtn) editorRewardsBtn.classList.add('hidden');
  // Reset mode toggle button to generic label
  const singleBtn = document.getElementById('btnModeSingle');
  if (singleBtn) singleBtn.textContent = '👤 Mitt barn';
  updateSchedulePageTitle(null);
}

function openRewardsForCurrentChild() {
  if (currentChildId) {
    window.location.href = `/family?child=${currentChildId}&tab=rewards`;
  } else {
    window.location.href = '/library';
  }
}

// ── Day tabs with DnD ────────────────────────────────────
function renderDayTabs() {
  const container = document.getElementById('dayTabs');
  // Get dates for the current week offset (Mon=1..Sun=0)
  const weekStart = getWeekStart(weekOffset); // Monday
  const dayToDate = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    // i=0 → Monday (dow=1), i=5 → Saturday (dow=6), i=6 → Sunday (dow=0)
    const dow = i < 6 ? i + 1 : 0;
    dayToDate[dow] = d;
  }
  const todayDow = new Date().getDay();

  updateCalNavLabel();

  // Show/hide Fyll vecka button only in week/normal mode
  const fwBtn = document.getElementById('fillWeekBtn');
  if (fwBtn) fwBtn.classList.toggle('hidden', calView !== 'week');

  container.innerHTML = [1,2,3,4,5,6,0].map(d => {
    const dateObj = dayToDate[d];
    const dateLabel = dateObj ? dateObj.getDate() + '/' + (dateObj.getMonth()+1) : '';
    const isToday = d === todayDow && weekOffset === 0;
    const todayDot = isToday ? `<span class="block w-1.5 h-1.5 rounded-full bg-blue-400 mx-auto mt-0.5"></span>` : '';
    return `<div class="flex-shrink-0 flex flex-col items-center gap-0.5">
      <button draggable="true" onclick="selectDay(${d})"
        class="day-tab px-2 md:px-4 py-1.5 rounded-xl border-2 font-semibold text-xs md:text-sm day-btn flex flex-col items-center leading-tight
        ${currentDay===d?'bg-gold text-white border-gold':'border-lavender text-navy hover:border-navy'}"
        data-day="${d}">
        <span>${DAYS_SHORT[d]}</span>
        <span class="font-normal text-[10px] opacity-75">${dateLabel}</span>
        ${todayDot}
      </button>
      <button onclick="openInsertDayModal(${d})" title="Lägg till schema"
        class="w-6 h-6 rounded-full bg-white border border-lavender hover:border-gold hover:bg-gold-light text-text-soft hover:text-gold flex items-center justify-center transition-colors insert-day-btn text-sm font-bold leading-none"
        aria-label="Lägg till schema för ${DAYS_SHORT[d]}">+</button>
    </div>`;
  }).join('');

  container.querySelectorAll('.day-tab').forEach(btn => {
    const day = parseInt(btn.dataset.day);
    btn.addEventListener('dragstart', e => {
      dndType = 'day-tab'; dndSrcDay = day;
      btn.classList.add('day-drag-src');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `day:${day}`);
    });
    btn.addEventListener('dragend', () => {
      dndType = null; dndSrcDay = null;
      clearDayTabHighlights();
    });
    btn.addEventListener('dragover', e => {
      e.preventDefault();
      if (dndType === 'day-tab' && dndSrcDay !== day) btn.classList.add('day-drop-hover');
      else if (dndType === 'activity-to-day') btn.classList.add('activity-drop-hover');
    });
    btn.addEventListener('dragleave', () => btn.classList.remove('day-drop-hover','activity-drop-hover'));
    btn.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      btn.classList.remove('day-drop-hover','activity-drop-hover');
      if (dndType === 'day-tab' && dndSrcDay !== null && dndSrcDay !== day) openDayDndModal(dndSrcDay, day);
      else if (dndType === 'activity-to-day' && dragSrcItem) copyActivityToDay(dragSrcItem, day);
    });
  });
  if (window.ScheduleCustody) ScheduleCustody.styleDayTabs();
}

function clearDayTabHighlights() {
  document.querySelectorAll('.day-tab').forEach(b => b.classList.remove('day-drop-hover','activity-drop-hover','day-drag-src'));
}

async function selectDay(d) {
  currentDay = d; renderDayTabs();
  // Update dayOffset to match selected day within current week
  if (calView === 'week') {
    const weekStart = getWeekStart(weekOffset);
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 7; i++) {
      const dow = i < 6 ? i + 1 : 0;
      if (dow === d) {
        const dt = new Date(weekStart); dt.setDate(weekStart.getDate() + i);
        dt.setHours(0,0,0,0);
        dayOffset = Math.round((dt - today) / 86400000);
        break;
      }
    }
  }
  if (currentViewMode === 'sbs') { await loadScheduleForDay(); await loadAllChildrenSchedules(); renderSbsView(); }
  else await loadScheduleForDay();
}

// ── View mode ─────────────────────────────────────────────
function refreshScheduleOnViewModeChange() {
  document.body.classList.remove('parent-magic-dashboard');
  const magicPage = document.getElementById('parentMagicPageMount');
  if (magicPage && window.AppViewMode && AppViewMode.isClassic()) {
    magicPage.classList.add('hidden');
    magicPage.innerHTML = '';
  }
  const familyGrid = document.getElementById('familyGridView');
  if (familyGrid && !familyGrid.classList.contains('hidden')) {
    if (typeof fwRenderGrid === 'function') fwRenderGrid();
    return;
  }
  const editor = document.getElementById('scheduleEditorView');
  if (editor && !editor.classList.contains('hidden')) {
    renderChildTabs();
    renderDayTabs();
    if (currentViewMode === 'normal') renderSchedule();
    else if (currentViewMode === 'list') renderListView();
    else if (currentViewMode === 'timeline') renderTimeline();
    else if (currentViewMode === 'sbs') renderSbsView();
    return;
  }
  const childrenList = document.getElementById('childrenListView');
  if (childrenList && !childrenList.classList.contains('hidden')) {
    renderChildrenOverview();
  }
}

async function setViewMode(mode) {
  currentViewMode = mode;
  document.getElementById('btnNormalView').classList.toggle('active', mode==='normal');
  document.getElementById('btnListView').classList.toggle('active', mode==='list');
  document.getElementById('btnTimelineView').classList.toggle('active', mode==='timeline');
  document.getElementById('btnSbsView').classList.toggle('active', mode==='sbs');
  document.getElementById('btnSpecialDaysView').classList.toggle('active', mode==='special-days');
  document.getElementById('sbsChildSelector').classList.add('hidden');
  // Show/hide day selector (not needed in special-days mode or month calView)
  const hideDaySelector = mode === 'special-days' || calView === 'month';
  document.getElementById('daySelectorWrap').classList.toggle('hidden', hideDaySelector);
  if (mode === 'normal') renderSchedule();
  else if (mode === 'list') renderListView();
  else if (mode === 'timeline') renderTimeline();
  else if (mode === 'sbs') { await loadAllChildrenSchedules(); renderSbsView(); }
  else if (mode === 'special-days') { await renderSpecialDaysCalendar(); }
}

// ── Special Days ──────────────────────────────────────────
// Extracted to /js/schedule-special-days.js (Fas 8 F3b).

// ── Load schedule ─────────────────────────────────────────
async function loadScheduleForDay() {
  if (!currentChildId) return;
  document.getElementById('scheduleContent').innerHTML = '<div class="text-center py-10 text-text-soft">Laddar…</div>';
  if (window.ScheduleCustody && ScheduleCustody.isDayHidden(currentDay)) {
    const dl = getDayDateLabel();
    const variant = ScheduleCustody.getEditVariantLabel();
    document.getElementById('scheduleContent').innerHTML = `
      <div class="text-center py-16">
        <p class="text-5xl mb-4">🏠</p>
        <p class="font-semibold text-navy mb-2">Barnet är hos den andra föräldern ${dl ? '(' + dl + ')' : ''}</p>
        <p class="text-sm text-text-soft">"Mina dagar" är på — avmarkera filtret ovan för att se ${variant}-schemat.</p>
      </div>`;
    return;
  }
  const q = window.ScheduleCustody ? ScheduleCustody.scheduleQuery() : '';
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules${q}`);
  if (!res.ok) { document.getElementById('scheduleContent').innerHTML = '<p class="text-red-500">Fel vid laddning</p>'; return; }
  const schedules = await res.json();
  // Check if schedules array is empty and child might be paused
  if (schedules.length === 0) {
    const child = children.find(c => c.id === currentChildId);
    const childName = child ? escHtml(child.name) : 'Barnet';
    currentScheduleId = null; scheduleItems = [];
    document.getElementById('scheduleContent').innerHTML = `
      <div class="text-center py-16">
        <p class="text-5xl mb-4">📅</p>
        <p class="font-semibold text-navy mb-2">${childName} har inget veckoschema ännu</p>
        <p class="text-sm text-text-soft mb-6">Skapa ett schema för att börja planera dagen</p>
        <button onclick="openTemplateModal()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">+ Skapa schema</button>
      </div>`;
    return;
  }
  const ds = schedules.find(s => s.day_of_week === currentDay);
  if (!ds) { currentScheduleId = null; scheduleItems = []; renderEmptyDay(); return; }
  currentScheduleId = ds.id;
  const dateStr = getCurrentDayDateStr();
  const ir = await window.apiFetch(`/api/schedules/${currentScheduleId}/items${dateStr ? '?date=' + encodeURIComponent(dateStr) : ''}`);
  if (!ir.ok) { document.getElementById('scheduleContent').innerHTML = '<p class="text-red-500">Fel vid laddning av aktiviteter</p>'; return; }
  const data = await ir.json();
  scheduleItems = data.items || []; sectionTimes = data.section_times || {};
  if (currentViewMode === 'timeline') renderTimeline();
  else if (currentViewMode === 'sbs') renderSbsView();
  else if (currentViewMode === 'list') renderListView();
  else renderSchedule();
  // Check if today is paused for this child (non-blocking UX hint)
  checkIfDayPaused();
}

async function checkIfDayPaused() {
  if (!currentChildId || weekOffset !== 0) return; // only check current week
  try {
    const weekStart = getWeekStart(0);
    const dayIdx = currentDay === 0 ? 6 : currentDay - 1;
    const dateObj = new Date(weekStart);
    dateObj.setDate(weekStart.getDate() + dayIdx);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr !== today) return; // only show pause banner for today
    const r = await window.apiFetch(`/api/children/${currentChildId}/daily-log?date=${dateStr}`);
    if (!r.ok) return;
    const log = await r.json();
    if (log && log.is_paused) {
      const child = children.find(c => c.id === currentChildId);
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3';
      banner.innerHTML = `<span class="text-2xl">⏸️</span><div><p class="font-semibold text-amber-800 text-sm">${child ? escHtml(child.name) : 'Barnet'} är pausad idag</p><p class="text-xs text-amber-600">Dagens aktiviteter är pausade. <a href="/family" class="underline hover:text-amber-800">Ändra i inställningar →</a></p></div>`;
      const content = document.getElementById('scheduleContent');
      if (content) content.prepend(banner);
    }
  } catch (e) { /* non-critical — ignore */ }
}

function renderEmptyDay() {
  const child = children.find(c => c.id === currentChildId);
  const dl = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="text-center py-16"><p class="text-5xl mb-4">📅</p>
      <p class="font-semibold text-navy mb-1">Inget schema för ${DAYS[currentDay]}${dl ? ` (${dl})` : ''}</p>
      <p class="text-text-soft text-sm mb-6">Skapa ett schema för att börja planera ${child?escHtml(child.name)+'s':''} dag</p>
      <button onclick="openTemplateModal()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">+ Skapa schema för ${DAYS[currentDay]}</button>
    </div>`;
}

// ── Template Editing Mode ──────────────────────────────────
// When ?view=template&template=<id> is in the URL, the user is editing a family schedule template.
// Templates are family-level (child_id IS NULL) and have no day-of-week — they're reusable by any child.
// Items are stored in weekly_schedule_item with a weekly_schedule_id pointing to the template.
// Note: submitAddActivity() is patched at its original definition (line ~2196)
// to handle templateMode — see that function for the full implementation.
// ── Render normal schedule ────────────────────────────────
function renderSchedule() {
  const child = children.find(c => c.id === currentChildId);
  const sHtml = buildSectionCardsHtml(scheduleItems, renderItem);

  const dateLabel = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-heading font-bold text-navy">${DAYS[currentDay]}${dateLabel ? ` <span class="text-text-soft font-normal text-base">${dateLabel}</span>` : ''} — ${child?escHtml(child.name):''}</h3>
        <p class="text-sm text-text-soft">${scheduleItems.length} aktivitet${scheduleItems.length!==1?'er':''}
          <span class="text-xs text-purple-400 ml-1">💡 Dra aktivitet till en dag-flik för att kopiera</span>
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="openCopyDayModal()" class="px-4 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-xl text-sm font-semibold">📋 Kopiera dag</button>
        <button onclick="openCopyWeeksModal()" class="px-4 py-2 bg-sky hover:bg-blue-100 text-navy rounded-xl text-sm font-semibold">📆 Kopiera till veckor</button>
        <button onclick="openCopyChildModal()" class="px-4 py-2 bg-mint hover:bg-green-100 text-navy rounded-xl text-sm font-semibold">👶 Kopiera till barn</button>
        <button onclick="confirmDeleteSchedule()" class="px-4 py-2 bg-coral hover:bg-red-200 text-navy rounded-xl text-sm font-semibold">🗑️ Ta bort dag</button>
      </div>
    </div>${sHtml}`;
  initDragDrop();
  // Sub-steps are collapsed by default; loaded lazily on first expand via toggleScheduleSubSteps
}

// Sub-steps are now returned inline in the schedule items API response.
// Legacy N+1 fetch pattern (loadScheduleSubSteps) removed — was hitting rate limiter.

function renderItem(item) {
  const isOnce = !!item.is_once_task;
  const onceTplId = item.activity_template_id;
  const canEditTpl = !isOnce || !!onceTplId;
  const onceClass = isOnce ? ' once-task-item' : '';
  const onceBorder = isOnce ? ' border-dashed border-gold/40' : '';
  const dragHandle = isOnce ? '' : '<button type="button" class="drag-handle" aria-label="Dra för att ändra ordning">⠿</button>';
  const oncePin = isOnce ? '<span title="Engångsaktivitet" class="text-[10px] flex-shrink-0">📌</span>' : '';
  const moveBtns = isOnce ? '' : `<button onclick="moveItem('${item.id}','${item.section}',-1)" class="move-btn" title="Flytta upp" aria-label="Flytta upp">▲</button><button onclick="moveItem('${item.id}','${item.section}',1)" class="move-btn" title="Flytta ner" aria-label="Flytta ner">▼</button>`;
  const editBtn = isOnce ? '' : `<button onclick="openEditItem('${item.id}')" class="action-btn p-2 rounded-lg hover:bg-lavender transition-colors text-text-soft" title="Redigera tid">🕐</button>`;
  const tplIcon = canEditTpl
    ? `<button onclick="openEditTemplateModal('${onceTplId || item.activity_template_id}')" class="text-xl flex-shrink-0 hover:scale-110 transition-transform" title="Redigera aktivitet">${item.activity_icon || '📌'}</button>`
    : `<span class="text-xl flex-shrink-0">${item.activity_icon || '📌'}</span>`;
  const nameBtn = canEditTpl
    ? `<button onclick="openEditTemplateModal('${onceTplId || item.activity_template_id}')" class="font-semibold text-sm text-navy truncate hover:text-gold transition-colors block w-full text-left" title="Klicka för att redigera">${escHtml(item.activity_name_display || item.activity_name)}</button>`
    : `<span class="font-semibold text-sm text-navy truncate">${escHtml(item.activity_name_display || item.activity_name)}</span>`;
  const timeStr = item.start_time ? fmtTime(item.start_time) + (item.end_time ? '–' + fmtTime(item.end_time) : '') : '';
  const steps = Array.isArray(item.sub_steps) ? item.sub_steps : [];
  const subCount = steps.length;
  const hasSubSteps = subCount > 0;
  const stepsListHtml = steps.map((s, idx) => `
    <div class="flex items-center gap-2 py-0.5">
      <span class="text-[10px] text-text-soft font-bold w-4 text-right">${idx + 1}.</span>
      <span class="text-xs text-navy">${escHtml(s.title || s.name || '')}</span>
    </div>`).join('');
  const subStepsHtml = hasSubSteps ? `
    <div class="substep-list-schedule hidden mt-2 pl-2 border-l-2 border-lavender" id="sched-substeps-${onceTplId || item.activity_template_id}">
      <div class="text-[10px] text-text-soft font-semibold mb-1 flex items-center gap-1">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-lavender"></span>
        ${subCount} delsteg
      </div>
      <div class="space-y-1">${stepsListHtml}</div>
    </div>` : '';

  return `
    <div class="activity-item bg-white rounded-xl px-3 py-2 border border-gray-100${onceClass}${onceBorder} shadow-sm"
      data-id="${item.id}" data-section="${item.section}" data-template-id="${item.activity_template_id || ''}">
      <div class="flex items-center gap-2 flex-wrap">
        ${dragHandle}
        ${tplIcon}
        ${oncePin}
        <div class="flex-1 min-w-0">
          ${nameBtn}
          ${timeStr ? `<div class="text-xs text-text-soft">${timeStr}</div>` : ''}
        </div>
        ${hasSubSteps && (onceTplId || item.activity_template_id) ? `<button onclick="toggleScheduleSubSteps('${onceTplId || item.activity_template_id}', this)" class="text-[10px] bg-lavender text-navy px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5 hover:bg-purple-200 transition-colors" title="Visa/dölj delsteg"><span>${subCount} delsteg</span><span class="chevron-icon ml-0.5">▸</span></button>` : ''}
        <div class="icon-btns-desktop flex gap-1 flex-shrink-0">
          ${editBtn}
          <button type="button" data-id="${item.id}" onclick="event.stopPropagation(); removeItem('${item.id}')"
            class="action-btn action-btn-remove p-2 rounded-lg transition-colors text-text-soft" title="Ta bort från schema">✕</button>
        </div>
        <!-- Mobile: ⋯ overflow menu — outside .icon-btns-desktop so it doesn't wrap to new line on narrow screens -->
        <div class="overflow-menu-wrap flex-shrink-0" style="margin-left:4px">
          <button class="overflow-menu-btn" onclick="toggleOverflowMenu(event,'omenu-s-${item.id}')" aria-label="Fler alternativ">⋯</button>
          <div id="omenu-s-${item.id}" class="overflow-menu-popup">
            ${canEditTpl ? `<button onclick="closeOverflowMenus();openEditTemplateModal('${onceTplId || item.activity_template_id}')">✏️ Redigera</button>` : ''}
            ${!isOnce ? `<button onclick="closeOverflowMenus();openEditItem('${item.id}')">🕐 Redigera tid</button>` : ''}
            <button class="danger" onclick="closeOverflowMenus();removeItem('${item.id}')">✕ Ta bort</button>
          </div>
        </div>
      </div>
      ${subStepsHtml}
    </div>`;
}

function toggleScheduleSubSteps(templateId, btn) {
  const container = document.getElementById(`sched-substeps-${templateId}`);
  if (!container) return;
  const isHidden = container.classList.toggle('hidden');
  const chevron = btn.querySelector('.chevron-icon');
  if (chevron) chevron.textContent = isHidden ? '▸' : '▾';
  // Load sub-steps on first expand
  if (!isHidden) loadScheduleSubSteps(templateId);
}

async function loadScheduleSubSteps(templateId) {
  if (scheduleSubStepCache[templateId]) {
    renderScheduleSubSteps(templateId, scheduleSubStepCache[templateId]);
    return;
  }
  try {
    const res = await window.apiFetch(`/api/activities/${templateId}/sub-steps`);
    if (!res.ok) return;
    const data = await res.json();
    // API returns raw array, not {sub_steps: [...]}
    const steps = Array.isArray(data) ? data : (data.sub_steps || []);
    scheduleSubStepCache[templateId] = steps;
    renderScheduleSubSteps(templateId, steps);
  } catch (_) {}
}

function renderScheduleSubSteps(templateId, steps) {
  const container = document.getElementById(`sched-substep-items-${templateId}`);
  if (!container) return;
  if (steps.length === 0) {
    container.innerHTML = '<div class="text-xs text-text-soft italic">Inga delsteg</div>';
    return;
  }
  container.innerHTML = steps.map(s => `
    <div class="flex items-center gap-2 text-xs text-navy py-1">
      <span class="text-base flex-shrink-0">${s.icon || '▪️'}</span>
      <span class="truncate">${escHtml(s.name)}</span>
    </div>`).join('');
}

// ── Drag & Drop (sortablejs) ───────────────────────────────
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
  const dayName = DAYS[currentDay] ? DAYS[currentDay].toLowerCase() : '';
  const dayPlural = dayName ? `alla ${dayName}ar` : 'alla dagar';
  // Fix Swedish plural: "lördagar" not "lördagar" (already correct), "söndagar" etc
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

  const dateStr = getCurrentDayDateStr();
  if (!dateStr) { showToast('Kunde inte bestämma datum', true); renderSchedule(); return; }

  // Build the new template_id order from the pending reorder
  const newOrder = _pendingReorderOrder;

  try {
    // Fetch the daily log for this date to get daily_log_item IDs
    const logRes = await window.apiFetch(`/api/children/${currentChildId}/daily-log?date=${dateStr}`);
    if (!logRes.ok) throw new Error('Kunde inte hämta dagens schema');
    const logData = await logRes.json();
    const logItems = logData.items || [];

    // Map new order: for each section, ordered template IDs → matching daily_log_item IDs
    const orderedDailyIds = [];
    SECTIONS.forEach(sec => {
      const sectionOrder = newOrder.filter(o => o.section === sec.key).sort((a, b) => a.sort_order - b.sort_order);
      for (const entry of sectionOrder) {
        // Find schedule item to get activity_template_id
        const schedItem = scheduleItems.find(i => i.id == entry.id);
        if (!schedItem) continue;
        const templateId = schedItem.activity_template_id;
        if (!templateId) continue; // skip once-tasks

        // Find matching daily_log_item by activity_template_id + section
        const match = logItems.find(li =>
          li.activity_template_id == templateId && li.section === sec.key &&
          !orderedDailyIds.includes(li.id)
        );
        if (match) orderedDailyIds.push(match.id);
      }
      // Append any remaining daily_log_items in this section not matched (once-tasks, etc)
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
    await loadScheduleForDay();
  } catch (err) {
    showToast(err.message || 'Fel vid sparning', true);
    renderSchedule();
  }

  _pendingReorderOrder = null;
  _pendingReorderSection = null;
}

async function saveReorder(order) {
  if (!currentScheduleId) return;
  const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/reorder`, { method: 'PUT', body: JSON.stringify({ order }) });
  if (!res.ok) showToast('Fel vid sparning av ordning', true);
  else order.forEach(({ id, sort_order, section }) => { const item = scheduleItems.find(i=>i.id==id); if(item){item.sort_order=sort_order;item.section=section;} });
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

// ── Extra views: list, timeline, SBS, copy-weeks ──────────
// Moved to schedule-views.js (loaded after this file in schedule.html)

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
        renderTemplate();
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
    return getDayFromOffset(dayOffset);
  }
  // Week view: getWeekStart(weekOffset) returns Monday.
  // currentDay: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const ws = getWeekStart(weekOffset); // Monday
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
  if (!onceBtn || !weeklyBtn) return;
  onceBtn.removeAttribute('onclick');
  weeklyBtn.removeAttribute('onclick');
  onceBtn.disabled = false;
  weeklyBtn.disabled = false;
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
  document.getElementById('newActEmojiPreview').textContent = v || '📌';
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
    document.getElementById('createActivityError').classList.add('hidden');

    // Create the activity template
    const res = await window.apiFetch('/api/activities', {
      method: 'POST',
      body: JSON.stringify({ name, icon, star_value: starValue, is_favorite: false, feedback_for: 'both', time_group: addSectionOverride === 'morgon' ? 'morgon' : addSectionOverride === 'kvall' ? 'kvall' : 'morgon' })
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
  document.getElementById('recurrenceWeeklyLbl').textContent = `🗑️ Alla kommande ${DAYS[currentDay]}ar`;
  document.getElementById('recurrenceWeeklyDesc').textContent = 'Tar bort aktiviteten från schemat permanent';
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
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
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
  if (onceBtn) onceBtn.disabled = true;
  if (weeklyBtn) weeklyBtn.disabled = true;
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
  // Restore original onclick handlers
  bindRecurrenceAddHandlers();
}

// ── Delete schedule ───────────────────────────────────────
function confirmDeleteSchedule(){
  openConfirmModal(`Ta bort hela schemat för ${DAYS[currentDay]}?`,async()=>{
    const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/${currentScheduleId}`,{method:'DELETE'});
    if(res.ok){showToast('Schemat har tagits bort');currentScheduleId=null;scheduleItems=[];renderEmptyDay();}
    else{const d=await res.json();showToast(d.error||'Fel uppstod',true);}
  });
}

// ── Copy day/child ────────────────────────────────────────
function openCopyDayModal(){
  if(!currentScheduleId){showToast('Inget schema att kopiera',true);return;}
  copyDaySelections=[];
  document.getElementById('copyFromLabel').innerHTML=`Kopiera schemat från <strong>${DAYS[currentDay]}</strong> till:`;
  document.getElementById('copyDayPicker').innerHTML=[1,2,3,4,5,6,0].filter(d=>d!==currentDay).map(d=>`<button type="button" onclick="toggleCopyDay(${d},this)" class="px-4 py-3 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-navy text-navy" data-day="${d}">${DAYS[d]}</button>`).join('');
  document.getElementById('copyDayModal').classList.remove('hidden');
}
function toggleCopyDay(d,btn){const idx=copyDaySelections.indexOf(d);if(idx===-1){copyDaySelections.push(d);btn.classList.add('bg-navy','text-white','border-navy');}else{copyDaySelections.splice(idx,1);btn.classList.remove('bg-navy','text-white','border-navy');}}
function closeCopyDayModal(){document.getElementById('copyDayModal').classList.add('hidden');}
async function submitCopyDay(){
  if(!copyDaySelections.length){showToast('Välj minst en dag',true);return;}
  const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`,{method:'POST',body:JSON.stringify({from_day:currentDay,to_days:copyDaySelections})});
  const data=await res.json();
  if(res.ok){closeCopyDayModal();showToast(`Schema kopierat till ${data.copied_to_days.length} dag(ar)`);}
  else showToast(data.error||'Fel uppstod',true);
}
function openCopyChildModal(){
  if(!currentChildId)return;
  copyTargetChildId=null;
  const others=children.filter(c=>c.id!==currentChildId);
  if(!others.length){showToast('Inga andra barn',true);return;}
  document.getElementById('copyChildPicker').innerHTML=others.map(c=>`<button type="button" onclick="selectCopyChild('${c.id}',this)" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold transition-colors text-left" data-cid="${c.id}"><span class="text-2xl">${c.emoji||'👤'}</span><span class="font-semibold text-navy">${escHtml(c.name)}</span></button>`).join('');
  document.getElementById('copyChildModal').classList.remove('hidden');
}
function selectCopyChild(id,btn){copyTargetChildId=id;document.querySelectorAll('#copyChildPicker button').forEach(b=>{b.classList.toggle('border-gold',b.dataset.cid===id);b.classList.toggle('bg-sky',b.dataset.cid===id);});}
function closeCopyChildModal(){document.getElementById('copyChildModal').classList.add('hidden');}
async function submitCopyChild(){
  if(!copyTargetChildId){showToast('Välj ett barn',true);return;}
  const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-to-child`,{method:'POST',body:JSON.stringify({target_child_id:copyTargetChildId})});
  const data=await res.json();
  if(res.ok){closeCopyChildModal();showToast('Veckoschemat har kopierats');}
  else showToast(data.error||'Fel uppstod',true);
}

// ── Insert Day (+ button per day tab) ────────────────────
let insertDayTarget = null; // dow 0-6
let familyScheduleTemplates = []; // cached family-level templates
let standardLibrarySchedules = []; // admin-created standard schedules

// Apply a family schedule template to insertDayTarget
// Apply a standard library schedule (admin-created default) to insertDayTarget
// Insert empty schedule (no template)
// ── New Schedule Template ─────────────────────────────────
// ── Delete Schedule Template ──────────────────────────────
let _deleteScheduleTemplateId = null;

// ── Fill Week ─────────────────────────────────────────────
let fillWeekSelectedCatId = null;
let fillWeekSelectedCatName = null;
let fillWeekDaySelections = [];

let allCategories = []; // { id, name, template_count }

// ── Confirm modal ─────────────────────────────────────────
function openConfirmModal(msg,cb){document.getElementById('confirmMsg').textContent=msg;document.getElementById('confirmOkBtn').onclick=async()=>{closeConfirmModal();await cb();};document.getElementById('confirmModal').classList.remove('hidden');}
function closeConfirmModal(){document.getElementById('confirmModal').classList.add('hidden');}

// ── Touch DnD Bridge (converts touch to HTML5 drag events) ─
function initTouchDndBridge() {
  let touchEl=null, ghost=null, longPressTimer=null, startX=0, startY=0;
  document.addEventListener('touchstart', e => {
    const d=e.target.closest('[draggable="true"]'); if(!d)return;
    startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    longPressTimer=setTimeout(()=>{
      touchEl=d;
      ghost=document.createElement('div');
      ghost.className='dnd-ghost'+(d.classList.contains('activity-item')?' copy-ghost':d.classList.contains('day-tab')?' day-ghost':'');
      const icon=d.querySelector('.text-xl,.text-base,.text-2xl,.text-lg');
      const label=d.querySelector('.font-semibold,.font-bold');
      ghost.innerHTML=`${icon?icon.textContent.trim():''} ${label?escHtml(label.textContent.trim().substring(0,25)):''}`;
      document.body.appendChild(ghost);
      const t=e.touches[0]; ghost.style.left=(t.clientX-60)+'px'; ghost.style.top=(t.clientY-30)+'px';
      d.classList.add('dragging');
      try{d.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true}));}catch(x){}
    },380);
  },{passive:true});
  document.addEventListener('touchmove', e=>{
    if(longPressTimer&&!touchEl){const dx=Math.abs(e.touches[0].clientX-startX),dy=Math.abs(e.touches[0].clientY-startY);if(dx>8||dy>8){clearTimeout(longPressTimer);longPressTimer=null;}}
    if(!touchEl||!ghost)return;
    const t=e.touches[0]; ghost.style.left=(t.clientX-60)+'px'; ghost.style.top=(t.clientY-30)+'px';
    ghost.style.display='none';
    const el=document.elementFromPoint(t.clientX,t.clientY);
    ghost.style.display='';
    if(el)try{el.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true}));}catch(x){}
  },{passive:true});
  document.addEventListener('touchend', e=>{
    clearTimeout(longPressTimer); longPressTimer=null;
    if(!touchEl||!ghost){touchEl=null;return;}
    const t=e.changedTouches[0];
    ghost.style.display='none';
    const el=document.elementFromPoint(t.clientX,t.clientY);
    ghost.remove(); ghost=null;
    if(el)try{el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true}));}catch(x){}
    try{touchEl.dispatchEvent(new DragEvent('dragend',{bubbles:true}));}catch(x){}
    touchEl.classList.remove('dragging'); touchEl=null;
  },{passive:true});
}

// ══════════════════════════════════════════════════════════════
// ── Family Grid Mode (Alla barn) ──────────────────────────────
// ══════════════════════════════════════════════════════════════
let scheduleMode = 'single'; // 'single' | 'family'
let fwWeekOffset = 0;
let fwChildData = {}; // childId → { [dow]: { scheduleId, items[] } }

const FW_DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun
const FW_DAYS_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
const FW_DAYS_FULL = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

function setScheduleMode(mode) {
  scheduleMode = mode;
  document.getElementById('btnModeSingle').classList.toggle('active', mode === 'single');
  document.getElementById('btnModeFamily').classList.toggle('active', mode === 'family');

  const familyView = document.getElementById('familyGridView');
  const childrenList = document.getElementById('childrenListView');
  const editorView = document.getElementById('scheduleEditorView');
  const calNav = document.getElementById('calNavBar');
  const backBtn = document.getElementById('backToChildrenBtn');
  const rewardsBtn = document.getElementById('editorRewardsBtn');

  if (mode === 'family') {
    familyView.classList.remove('hidden');
    childrenList.classList.add('hidden');
    editorView.classList.add('hidden');
    calNav.classList.add('hidden');
    if (backBtn) backBtn.classList.add('hidden');
    if (rewardsBtn) rewardsBtn.classList.add('hidden');
    fwLoadAll();
  } else {
    familyView.classList.add('hidden');
    // Return to children list if no child is selected; otherwise show editor
    if (currentChildId) {
      childrenList.classList.add('hidden');
      editorView.classList.remove('hidden');
      calNav.classList.remove('hidden');
      if (backBtn) backBtn.classList.remove('hidden');
    } else {
      childrenList.classList.remove('hidden');
      editorView.classList.add('hidden');
    }
  }
  // Update URL without reload
  const url = new URL(window.location);
  if (mode === 'family') url.searchParams.set('view', 'family');
  else url.searchParams.delete('view');
  history.replaceState(null, '', url);
}

function fwGetWeekStart(offset) {
  const now = new Date();
  const dow = now.getDay();
  const mondayDiff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayDiff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function fwGetWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function fwUpdateWeekLabel() {
  const ws = fwGetWeekStart(fwWeekOffset);
  const wn = fwGetWeekNumber(ws);
  document.getElementById('fwWeekLabel').textContent = `Vecka ${wn}, ${ws.getFullYear()}`;
}

function fwGetDatesForWeek(offset) {
  const ws = fwGetWeekStart(offset);
  const dates = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const dow = i < 6 ? i + 1 : 0;
    dates[dow] = d;
  }
  return dates;
}

async function fwLoadAll() {
  if (!children || children.length === 0) {
    document.getElementById('fwGridContainer').innerHTML =
      '<div class="text-center py-20"><p class="text-5xl mb-4">👨‍👩‍👧</p><p class="font-heading font-bold text-navy text-xl mb-2">Inga barn tillagda</p><p class="text-sm text-text-soft">Lägg till barn genom att byta till &quot;Mitt barn&quot;-läget.</p></div>';
    return;
  }
  document.getElementById('fwGridContainer').innerHTML =
    '<div class="text-center py-12 text-text-soft"><span class="animate-spin text-xl">⏳</span> <span class="font-semibold">Laddar schema…</span></div>';
  await fwLoadScheduleData();
  fwRenderGrid();
}

async function fwLoadScheduleData() {
  const scheduleResults = await Promise.all(
    children.map(async c => {
      const r = await window.apiFetch(`/api/children/${c.id}/schedules`);
      return { childId: c.id, schedules: r.ok ? await r.json() : [] };
    })
  );

  const scheduleList = [];
  for (const { childId, schedules } of scheduleResults) {
    for (const s of schedules) {
      scheduleList.push({ childId, scheduleId: s.id, dow: s.day_of_week });
    }
  }

  const itemResults = await Promise.all(
    scheduleList.map(async ({ childId, scheduleId, dow }) => {
      const r = await window.apiFetch(`/api/schedules/${scheduleId}/items`);
      const data = r.ok ? await r.json() : { items: [] };
      return { childId, scheduleId, dow, items: data.items || [] };
    })
  );

  fwChildData = {};
  for (const child of children) fwChildData[child.id] = {};
  for (const { childId, scheduleId, dow, items } of itemResults) {
    fwChildData[childId][dow] = { scheduleId, items };
  }
}

function fwRenderGrid() {
  fwUpdateWeekLabel();
  const todayDow = new Date().getDay();
  const weekDates = fwGetDatesForWeek(fwWeekOffset);

  const headerCells = FW_DOW_ORDER.map(dow => {
    const date = weekDates[dow];
    const dateLabel = date ? `${date.getDate()}/${date.getMonth() + 1}` : '';
    const isToday = dow === todayDow && fwWeekOffset === 0;
    return `<th class="fw-day-header${isToday ? ' fw-today-hdr' : ''}">
      <div>${FW_DAYS_SHORT[dow]}</div>
      <div style="font-size:10px; font-weight:500; opacity:0.65; margin-top:1px;">${dateLabel}</div>
      ${isToday ? '<div style="width:6px;height:6px;border-radius:50%;background:#3B82F6;margin:3px auto 0;"></div>' : ''}
    </th>`;
  }).join('');

  const rows = children.map(child => {
    const cells = FW_DOW_ORDER.map(dow => {
      const dayData = fwChildData[child.id]?.[dow];
      const items = dayData?.items || [];
      const isToday = dow === todayDow && fwWeekOffset === 0;
      const hasAct = items.length > 0;

      let cellContent = '';
      if (hasAct) {
        const MAX_PILLS = 4;
        const shown = items.slice(0, MAX_PILLS);
        const rest = items.length - MAX_PILLS;
        cellContent = shown.map(item => {
          const sectionClass = item.section || 'dag';
          return `<div class="fw-pill">
            <span class="fw-section-dot ${sectionClass}"></span>
            <span class="fw-icon">${escHtml(item.activity_icon || '📌')}</span>
            <span class="fw-name">${escHtml(item.activity_name_display || item.activity_name || '')}</span>
          </div>`;
        }).join('');
        if (rest > 0) cellContent += `<div class="fw-more" title="Visa alla ${rest} aktiviteter">Visa alla (${rest})</div>`;
      } else {
        cellContent = `<div class="fw-empty-ind">—</div>`;
      }

      const cellClass = `fw-day-cell${hasAct ? ' fw-has-act' : ' fw-empty'}${isToday ? ' fw-today' : ''}`;
      return `<td class="${cellClass}" onclick="fwGoToEdit('${child.id}', ${dow})" title="${FW_DAYS_FULL[dow]} — ${escHtml(child.name)}">
        ${cellContent}
      </td>`;
    }).join('');

    return `<tr>
      <td class="fw-child-cell fw-child-col">
        <div class="flex flex-col items-center gap-0.5">
          <span style="display:inline-block;">${renderChildAvatar(child, 30)}</span>
          <span style="font-size:11px; font-weight:700; color:#1B2340; text-align:center; word-break:break-word; max-width:80px; line-height:1.2; margin-top:2px;">${escHtml(child.name)}</span>
        </div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  document.getElementById('fwGridContainer').innerHTML = `
    <div class="fw-scroll">
      <table class="fw-grid">
        <thead>
          <tr>
            <th class="fw-corner fw-child-col">Barn</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  document.getElementById('fwLegend').classList.remove('hidden');
}

function fwChangeWeek(delta) {
  fwWeekOffset += delta;
  fwLoadAll();
}

function fwGoToCurrentWeek() {
  fwWeekOffset = 0;
  fwLoadAll();
}

function fwGoToEdit(childId, dow) {
  // Switch to single-child mode and select that child/day
  setScheduleMode('single');
  selectChild(childId).then(() => {
    currentDay = dow;
    renderDayTabs();
    loadScheduleForDay();
  });
}

// ── Modal backdrop close ──────────────────────────────────
['addActivityModal','editItemModal','copyDayModal','copyChildModal','copyWeeksModal','confirmModal','dayDndModal','specialDayModal','createActivityModal','editTemplateModal'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('click',e=>{if(e.target===e.currentTarget)el.classList.add('hidden');});
});
