/**
 * Schedule page main logic — weekly schedule builder, activity templates, drag-and-drop reordering, section management.
 * Does not own: authentication (auth.js), API routing, database.
 */

function spt(key, params) {
  return window.ScheduleI18n ? ScheduleI18n.t(key, params) : (window.pt ? window.pt(key, params) : key);
}

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
  dayName,
  dayShort,
  fmtTime,
  getDayDateLabel,
  buildSectionCardsHtml,
} = window.ScheduleCore;
/* exported DAYS, DAYS_SHORT, SECTIONS, activities, sectionTimes, selectedTemplateId, addSectionOverride,
   addSectionsMulti, editSectionVal, _pendingRecurrenceTemplateId, _pendingRecurrenceTemplateName,
   _pendingRecurrenceSection, _pendingRecurrenceSections, _pendingRecurrenceStart, _pendingRecurrenceEnd,
   sbsChildId, sbsItems, sbsScheduleId, sbsAllData, allTemplates, templateMode, currentTemplateId,
   templateItems, templateName, dayOffset, scheduleMode, fwWeekOffset, fwChildData */
/* eslint-disable no-var -- global lexical contract for schedule-*.js split modules */
var DAYS = window.ScheduleCore.DAYS;
var DAYS_SHORT = window.ScheduleCore.DAYS_SHORT;
var SECTIONS = window.ScheduleCore.SECTIONS;
/* eslint-enable no-var */

// ── State ────────────────────────────────────────────────
let children = [];
let activities = [];
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
let scheduleMode = 'single'; // 'single' | 'family' — schedule-family-grid.js
let fwWeekOffset = 0;
let fwChildData = {}; // childId → { [dow]: { scheduleId, items[] } }

if (window.ScheduleCalNav) {
  ScheduleCalNav.registerHost({
    onSetCalView(view) {
      const fwBtn = document.getElementById('fillWeekBtn');
      if (!fwBtn) return;
      if (view === 'month' || view === 'day') fwBtn.classList.add('hidden');
      else if (currentChildId) fwBtn.classList.remove('hidden');
    },
    onWeekNav() {
      if (window.ScheduleCustody && currentChildId) ScheduleCustody.refresh(currentChildId, weekOffset);
    },
    onCalNavToday() {
      const todayDow = new Date().getDay();
      currentDay = todayDow === 0 ? 1 : todayDow;
      if (calView === 'day') currentDay = new Date().getDay();
    },
  });
}

// ── Calendar helpers — /js/schedule-cal-nav.js (Fas 8 PR-S2) ─

// ── Init ─────────────────────────────────────────────────
let _schedulePageBound = false;

async function bootSchedulePage() {
  try {
    const user = await window.authGuard();
    if (!user) return;
    if (typeof window.initParentAppI18n === 'function') {
      await initParentAppI18n(user.preferred_locale);
    }

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
        if (!selectedChildEmoji) { msg.textContent = spt('schedule.errors.pickEmoji'); msg.className = 'text-sm text-red-500'; return; }
        btn.disabled = true; btn.textContent = 'Skapar...'; msg.textContent = '';
        try {
          const res = await window.apiFetch('/api/children', {
            method: 'POST',
            body: JSON.stringify({ name: document.getElementById('childName').value.trim(), emoji: selectedChildEmoji, birthday: document.getElementById('childBirthday').value, pin: document.getElementById('childPin').value.trim() || undefined }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (data.error && data.error.includes('föräldrabehörighet')) {
              msg.textContent = spt('schedule.errors.sessionExpired');
              msg.className = 'text-sm text-red-500';
              setTimeout(() => { Auth.clearAuth(); window.location.href = '/login'; }, 2000);
              return;
            }
            msg.textContent = data.error || spt('schedule.errors.network'); msg.className = 'text-sm text-red-500';
          } else {
            if (data.wizard && data.id) {
              window.location.href = `/child-wizard?id=${data.id}&pin=${encodeURIComponent(data.pin)}&name=${encodeURIComponent(data.name)}&schedule=${encodeURIComponent(data.default_schedule_name || '')}`;
            } else {
              showToast(spt('schedule.addChild.success', { name: data.name, pin: data.pin }));
              document.getElementById('addChildModal').classList.add('hidden');
              document.getElementById('addChildForm').reset();
              selectedChildEmoji = '';
              document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('border-gold','bg-gold-light'));
              await loadChildren();
            }
          }
        } catch (err) { msg.textContent = err.message || spt('schedule.errors.network'); msg.className = 'text-sm text-red-500'; }
        btn.disabled = false; btn.textContent = spt('schedule.actions.add');
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
    if (container) container.innerHTML = '<div class="text-center py-8 text-red-500 font-semibold">' + spt('schedule.errors.loadPage') + '</div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSchedulePage);
}
if (window.ParentMagicPageBoot) {
  ParentMagicPageBoot.register('schedule', bootSchedulePage);
}

document.addEventListener('parent-i18n-ready', () => {
  if (window.I18n) I18n.apply(document);
  if (typeof loadChildren === 'function' && children && children.length) {
    if (typeof renderChildrenOverview === 'function') renderChildrenOverview();
    if (scheduleMode === 'family' && typeof fwRenderGrid === 'function') fwRenderGrid();
    if (currentChildId) {
      // I18n.apply resets the h2 to the generic title — restore the child-specific one
      updateSchedulePageTitle(children.find(c => c.id === currentChildId));
      if (typeof renderChildTabs === 'function') renderChildTabs();
      if (typeof loadScheduleForDay === 'function') loadScheduleForDay();
    }
  }
  if (window.ScheduleCalNav && typeof ScheduleCalNav.updateCalNavLabel === 'function') ScheduleCalNav.updateCalNavLabel();
});

// showToast is now in /js/toast.js
// escHtml shim — delegates to escapeHtml() from /js/dom-utils.js
function escHtml(s) { return escapeHtml(s); }
// ── Children overview ────────────────────────────────────
function capScheduleChildName(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildScheduleChildSubtitle(ad, totalActivities) {
  if (ad === 0) return spt('schedule.summary.none');
  if (ad >= 7) {
    if (totalActivities > 0) return spt('schedule.summary.activitiesFullWeek', { count: totalActivities });
    return spt('schedule.summary.fullWeek');
  }
  if (totalActivities > 0) return spt('schedule.summary.activitiesThisWeek', { count: totalActivities });
  return spt('schedule.summary.daysPlanned', { count: ad });
}

function updateSchedulePageTitle(child) {
  const el = document.getElementById('schedulePageTitle');
  if (!el) return;
  el.textContent = child
    ? `📅 ${spt('schedule.pageTitle.childSchedule', { name: capScheduleChildName(child.name) })}`
    : `📅 ${spt('schedule.pageTitle.weeklyPlanning')}`;
}

async function loadChildren() {
  const res = await window.apiFetch('/api/children');
  if (res.ok) {
    children = await res.json();
    // renderChildrenOverview is async (fetches schedules) — catch errors so loading state clears
    renderChildrenOverview().catch(err => {
      console.error('[SCHEDULE] renderChildrenOverview error:', err);
      const c = document.getElementById('childCardsContainer');
      if (c) c.innerHTML = '<div class="text-center py-8 text-red-500 font-semibold">' + spt('schedule.loadError') + '</div>';
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
    container.innerHTML = `<div class="text-center py-16"><p class="text-5xl mb-4">👨‍👩‍👧</p><p class="font-semibold text-navy mb-1">${spt('schedule.empty.noChildrenTitle')}</p><a href="/dashboard" class="px-6 py-3 bg-gold text-white rounded-xl font-semibold inline-block mt-3">${spt('schedule.empty.goToDashboard')}</a></div>`;
    return;
  }
  // Fetch schedules for each child
  const results = await Promise.all(children.map(async c => {
    const r = await window.apiFetch(`/api/children/${c.id}/schedules`);
    return { childId: c.id, schedules: r.ok ? await r.json() : [] };
  }));
  const sm = {}; for (const r of results) sm[r.childId] = r.schedules;

  // Also fetch items for each schedule to show activity names
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
      const moreHtml = items.length > 6 ? `<div class="text-[10px] text-lavender hover:text-gold ml-5 cursor-pointer transition-colors" title="${spt('schedule.editor.showAllTitle', { count: items.length - 6 })}">${spt('schedule.editor.showAll', { count: items.length - 6 })}</div>` : '';
      const actLabel = (window.ScheduleI18n ? ScheduleI18n.activityCount(items.length) : spt('schedule.activityCount.other', { count: items.length }));
      return `<div class="border border-gray-100 rounded-xl p-2.5 bg-gray-50/50">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
          <span class="text-xs font-bold text-navy">${dayName(d)}</span>
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
        <button onclick="event.stopPropagation(); window.location.href='/family?child=${child.id}&tab=rewards'" class="px-3 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-lg font-semibold text-sm transition-colors">🏆 ${spt('schedule.actions.rewards')}</button>
        <button onclick="selectChild('${child.id}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-lg font-semibold text-sm">✏️ ${spt('schedule.editor.editSchedule')} →</button>
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
      editorRewardsBtn.textContent = `🏆 ${spt('schedule.actions.rewards')}${child ? ' — ' + child.name : ''}`;
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
      '<div class="text-center py-8 text-red-500 font-semibold">' + spt('schedule.errors.loadSchedule') + '</div>';
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
  if (singleBtn) singleBtn.textContent = spt('schedule.chrome.modeSingle');
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
        <span>${dayShort(d)}</span>
        <span class="font-normal text-[10px] opacity-75">${dateLabel}</span>
        ${todayDot}
      </button>
      <button onclick="openInsertDayModal(${d})" title="${spt('schedule.actions.addSchedule')}"
        class="w-6 h-6 rounded-full bg-white border border-lavender hover:border-gold hover:bg-gold-light text-text-soft hover:text-gold flex items-center justify-center transition-colors insert-day-btn text-sm font-bold leading-none"
        aria-label="${spt('schedule.actions.addScheduleFor', { day: dayShort(d) })}">+</button>
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
  document.getElementById('scheduleContent').innerHTML = '<div class="text-center py-10 text-text-soft">' + spt('schedule.loading') + '</div>';
  if (window.ScheduleCustody && ScheduleCustody.isDayHidden(currentDay)) {
    const dl = getDayDateLabel();
    const variant = ScheduleCustody.getEditVariantLabel();
    document.getElementById('scheduleContent').innerHTML = `
      <div class="text-center py-16">
        <p class="text-5xl mb-4">🏠</p>
        <p class="font-semibold text-navy mb-2">${spt('schedule.custody.otherParent', { date: dl ? '(' + dl + ')' : '' })}</p>
        <p class="text-sm text-text-soft">${spt('schedule.custody.myDaysFilter', { variant })}</p>
      </div>`;
    return;
  }
  const q = window.ScheduleCustody ? ScheduleCustody.scheduleQuery() : '';
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules${q}`);
  if (!res.ok) { document.getElementById('scheduleContent').innerHTML = '<p class="text-red-500">' + spt('schedule.loadError') + '</p>'; return; }
  const schedules = await res.json();
  // Check if schedules array is empty and child might be paused
  if (schedules.length === 0) {
    const child = children.find(c => c.id === currentChildId);
    const childName = child ? escHtml(child.name) : 'Barnet';
    currentScheduleId = null; scheduleItems = [];
    document.getElementById('scheduleContent').innerHTML = `
      <div class="text-center py-16">
        <p class="text-5xl mb-4">📅</p>
        <p class="font-semibold text-navy mb-2">${spt('schedule.empty.noScheduleTitle', { name: childName })}</p>
        <p class="text-sm text-text-soft mb-6">${spt('schedule.empty.noScheduleBody')}</p>
        <button onclick="openTemplateModal()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">+ ${spt('schedule.editor.createSchedule')}</button>
      </div>`;
    return;
  }
  const ds = schedules.find(s => s.day_of_week === currentDay);
  if (!ds) { currentScheduleId = null; scheduleItems = []; renderEmptyDay(); return; }
  currentScheduleId = ds.id;
  const dateStr = getCurrentDayDateStr();
  const ir = await window.apiFetch(`/api/schedules/${currentScheduleId}/items${dateStr ? '?date=' + encodeURIComponent(dateStr) : ''}`);
  if (!ir.ok) { document.getElementById('scheduleContent').innerHTML = '<p class="text-red-500">' + spt('schedule.loadActivitiesError') + '</p>'; return; }
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
      banner.innerHTML = `<span class="text-2xl">⏸️</span><div><p class="font-semibold text-amber-800 text-sm">${spt('schedule.paused.title', { name: child ? escHtml(child.name) : spt('schedule.childFallback') })}</p><p class="text-xs text-amber-600">${spt('schedule.paused.hint')}</p></div>`;
      const content = document.getElementById('scheduleContent');
      if (content) content.prepend(banner);
    }
  } catch (_e) { /* non-critical — ignore */ }
}

function renderEmptyDay() {
  const child = children.find(c => c.id === currentChildId);
  const dl = getDayDateLabel();
  document.getElementById('scheduleContent').innerHTML = `
    <div class="text-center py-16"><p class="text-5xl mb-4">📅</p>
      <p class="font-semibold text-navy mb-1">${spt('schedule.empty.noScheduleDayTitle', { day: dayName(currentDay), date: dl ? ` (${dl})` : '' })}</p>
      <p class="text-text-soft text-sm mb-6">${spt('schedule.empty.noScheduleDayBody', { name: child ? escHtml(child.name) : '' })}</p>
      <button onclick="openTemplateModal()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">+ ${spt('schedule.empty.createForDay', { day: dayName(currentDay) })}</button>
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
        <h3 class="text-lg font-heading font-bold text-navy">${dayName(currentDay)}${dateLabel ? ` <span class="text-text-soft font-normal text-base">${dateLabel}</span>` : ''} — ${child?escHtml(child.name):''}</h3>
        <p class="text-sm text-text-soft">${window.ScheduleI18n ? ScheduleI18n.activityCount(scheduleItems.length) : spt('schedule.activityCount.other', { count: scheduleItems.length })}
          <span class="text-xs text-purple-400 ml-1">💡 ${spt('schedule.actions.dragCopyHint')}</span>
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="openCopyDayModal()" class="px-4 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-xl text-sm font-semibold">📋 ${spt('schedule.editor.copyDay')}</button>
        <button onclick="openCopyWeeksModal()" class="px-4 py-2 bg-sky hover:bg-blue-100 text-navy rounded-xl text-sm font-semibold">📆 ${spt('schedule.editor.copyToWeeks')}</button>
        <button onclick="openCopyChildModal()" class="px-4 py-2 bg-mint hover:bg-green-100 text-navy rounded-xl text-sm font-semibold">👶 ${spt('schedule.editor.copyToChild')}</button>
        <button onclick="confirmDeleteSchedule()" class="px-4 py-2 bg-coral hover:bg-red-200 text-navy rounded-xl text-sm font-semibold">🗑️ ${spt('schedule.editor.deleteDay')}</button>
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
  const canReorderOnceToday = isOnce && typeof getCurrentDayDateStr === 'function' && !!getCurrentDayDateStr();
  const dragHandle = (!isOnce || canReorderOnceToday)
    ? '<button type="button" class="drag-handle" aria-label="' + spt('schedule.actions.dragReorder') + '">⠿</button>'
    : '';
  const oncePin = isOnce ? '<span title="' + spt('schedule.actions.oneOff') + '" class="text-[10px] flex-shrink-0">📌</span>' : '';
  const editBtn = isOnce ? '' : `<button onclick="openEditItem('${item.id}')" class="action-btn p-2 rounded-lg hover:bg-lavender transition-colors text-text-soft" title="${spt('schedule.editor.editTime')}">🕐</button>`;
  const tplIcon = canEditTpl
    ? `<button onclick="openEditTemplateModal('${onceTplId || item.activity_template_id}')" class="text-xl flex-shrink-0 hover:scale-110 transition-transform" title="${spt('schedule.editor.editActivity')}">${item.activity_icon || '📌'}</button>`
    : `<span class="text-xl flex-shrink-0">${item.activity_icon || '📌'}</span>`;
  const nameBtn = canEditTpl
    ? `<button onclick="openEditTemplateModal('${onceTplId || item.activity_template_id}')" class="font-semibold text-sm text-navy truncate hover:text-gold transition-colors block w-full text-left" title="${spt('schedule.actions.editActivity')}">${escHtml(item.activity_name_display || item.activity_name)}</button>`
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
        ${spt('schedule.actions.substepsCount', { count: subCount })}
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
        ${hasSubSteps && (onceTplId || item.activity_template_id) ? `<button onclick="toggleScheduleSubSteps('${onceTplId || item.activity_template_id}', this)" class="text-[10px] bg-lavender text-navy px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5 hover:bg-purple-200 transition-colors" title="${spt('schedule.actions.toggleSubsteps')}"><span>${spt('schedule.actions.substepsCount', { count: subCount })}</span><span class="chevron-icon ml-0.5">▸</span></button>` : ''}
        <div class="icon-btns-desktop flex gap-1 flex-shrink-0">
          ${editBtn}
          <button type="button" data-id="${item.id}" onclick="event.stopPropagation(); removeItem('${item.id}')"
            class="action-btn action-btn-remove p-2 rounded-lg transition-colors text-text-soft" title="${spt('schedule.actions.removeFromSchedule')}">✕</button>
        </div>
        <!-- Mobile: ⋯ overflow menu — outside .icon-btns-desktop so it doesn't wrap to new line on narrow screens -->
        <div class="overflow-menu-wrap flex-shrink-0" style="margin-left:4px">
          <button class="overflow-menu-btn" onclick="toggleOverflowMenu(event,'omenu-s-${item.id}')" aria-label="Fler alternativ">⋯</button>
          <div id="omenu-s-${item.id}" class="overflow-menu-popup">
            ${canEditTpl ? `<button onclick="closeOverflowMenus();openEditTemplateModal('${onceTplId || item.activity_template_id}')">✏️ ${spt('schedule.editor.edit')}</button>` : ''}
            ${!isOnce ? `<button onclick="closeOverflowMenus();openEditItem('${item.id}')">🕐 ${spt('schedule.editor.editTime')}</button>` : ''}
            <button class="danger" onclick="closeOverflowMenus();removeItem('${item.id}')">✕ ${spt('schedule.editor.remove')}</button>
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
    container.innerHTML = '<div class="text-xs text-text-soft italic">' + spt('schedule.views.noSubsteps') + '</div>';
    return;
  }
  container.innerHTML = steps.map(s => `
    <div class="flex items-center gap-2 text-xs text-navy py-1">
      <span class="text-base flex-shrink-0">${s.icon || '▪️'}</span>
      <span class="truncate">${escHtml(s.name)}</span>
    </div>`).join('');
}

// ── Drag & Drop, reorder, day-DnD — /js/schedule-dnd.js (Fas 8 PR-S4) ──

// ── Extra views: list, timeline, SBS, copy-weeks ──────────
// Moved to schedule-views.js (loaded after this file in schedule.html)

// ── Activity modals — /js/schedule-activity-modals.js (Fas 8 PR-S3) ──


// ── Delete schedule ───────────────────────────────────────
function confirmDeleteSchedule(){
  openConfirmModal(spt('schedule.actions.deleteDayConfirm', { day: dayName(currentDay) }),async()=>{
    const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/${currentScheduleId}`,{method:'DELETE'});
    if(res.ok){showToast(spt('schedule.copy.deleted'));currentScheduleId=null;scheduleItems=[];renderEmptyDay();}
    else{const d=await res.json();showToast(d.error||spt('schedule.errors.generic'),true);}
  });
}

// ── Copy day/child ────────────────────────────────────────
function openCopyDayModal(){
  if(!currentScheduleId){showToast(spt('schedule.copy.nothingToCopy'),true);return;}
  copyDaySelections=[];
  document.getElementById('copyFromLabel').innerHTML=spt('schedule.copy.fromLabel', { day: dayName(currentDay) });
  document.getElementById('copyDayPicker').innerHTML=[1,2,3,4,5,6,0].filter(d=>d!==currentDay).map(d=>`<button type="button" onclick="toggleCopyDay(${d},this)" class="px-4 py-3 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-navy text-navy" data-day="${d}">${dayName(d)}</button>`).join('');
  document.getElementById('copyDayModal').classList.remove('hidden');
}
function toggleCopyDay(d,btn){const idx=copyDaySelections.indexOf(d);if(idx===-1){copyDaySelections.push(d);btn.classList.add('bg-navy','text-white','border-navy');}else{copyDaySelections.splice(idx,1);btn.classList.remove('bg-navy','text-white','border-navy');}}
function closeCopyDayModal(){document.getElementById('copyDayModal').classList.add('hidden');}
async function submitCopyDay(){
  if(!copyDaySelections.length){showToast(spt('schedule.copy.selectDay'),true);return;}
  const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`,{method:'POST',body:JSON.stringify({from_day:currentDay,to_days:copyDaySelections})});
  const data=await res.json();
  if(res.ok){closeCopyDayModal();showToast(spt('schedule.copy.copiedDays', { count: data.copied_to_days.length }));}
  else showToast(data.error||spt('schedule.errors.generic'),true);
}
function openCopyChildModal(){
  if(!currentChildId)return;
  copyTargetChildId=null;
  const others=children.filter(c=>c.id!==currentChildId);
  if(!others.length){showToast(spt('schedule.copy.noOtherChildren'),true);return;}
  document.getElementById('copyChildPicker').innerHTML=others.map(c=>`<button type="button" onclick="selectCopyChild('${c.id}',this)" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold transition-colors text-left" data-cid="${c.id}"><span class="text-2xl">${c.emoji||'👤'}</span><span class="font-semibold text-navy">${escHtml(c.name)}</span></button>`).join('');
  document.getElementById('copyChildModal').classList.remove('hidden');
}
function selectCopyChild(id,_btn){copyTargetChildId=id;document.querySelectorAll('#copyChildPicker button').forEach(b=>{b.classList.toggle('border-gold',b.dataset.cid===id);b.classList.toggle('bg-sky',b.dataset.cid===id);});}
function closeCopyChildModal(){document.getElementById('copyChildModal').classList.add('hidden');}
async function submitCopyChild(){
  if(!copyTargetChildId){showToast(spt('schedule.copy.selectChild'),true);return;}
  const res=await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-to-child`,{method:'POST',body:JSON.stringify({target_child_id:copyTargetChildId})});
  const data=await res.json();
  if(res.ok){closeCopyChildModal();showToast(spt('schedule.copy.copiedWeek'));}
  else showToast(data.error||spt('schedule.errors.generic'),true);
}

// ── Confirm modal ─────────────────────────────────────────
function openConfirmModal(msg,cb){document.getElementById('confirmMsg').textContent=msg;document.getElementById('confirmOkBtn').onclick=async()=>{closeConfirmModal();await cb();};document.getElementById('confirmModal').classList.remove('hidden');}
function closeConfirmModal(){document.getElementById('confirmModal').classList.add('hidden');}

// ── Touch DnD Bridge — /js/dnd-touch-bridge.js (Fas 8 PR-0) ─

// ── Modal backdrop close ──────────────────────────────────
['addActivityModal','editItemModal','copyDayModal','copyChildModal','copyWeeksModal','confirmModal','dayDndModal','specialDayModal','createActivityModal','editTemplateModal'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('click',e=>{if(e.target===e.currentTarget)el.classList.add('hidden');});
});

// schedule.html + generated onclick handlers
window.toggleOverflowMenu = toggleOverflowMenu;
window.backToChildrenList = backToChildrenList;
window.openRewardsForCurrentChild = openRewardsForCurrentChild;
window.selectChild = selectChild;
window.selectDay = selectDay;
window.setViewMode = setViewMode;
window.toggleScheduleSubSteps = toggleScheduleSubSteps;
window.confirmDeleteSchedule = confirmDeleteSchedule;
window.openCopyDayModal = openCopyDayModal;
window.toggleCopyDay = toggleCopyDay;
window.closeCopyDayModal = closeCopyDayModal;
window.submitCopyDay = submitCopyDay;
window.openCopyChildModal = openCopyChildModal;
window.selectCopyChild = selectCopyChild;
window.closeCopyChildModal = closeCopyChildModal;
window.submitCopyChild = submitCopyChild;
window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;
