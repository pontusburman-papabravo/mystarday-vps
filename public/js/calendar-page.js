/**
 * calendar-page.js — Parent calendar week view (/calendar).
 */
(function () {
'use strict';

function pt(key, params) {
  return (typeof window.pt === 'function') ? window.pt(key, params) : key;
}

// ─── State ────────────────────────────────────────────────
let children = [];
let selectedChildId = null;
let weekOffset = 0;
let currentData = null;
let _calendarBooted = false;

// ─── Init ─────────────────────────────────────────────────
async function init() {
  let user = null;
  if (typeof window.authGuard === 'function') {
    try {
      user = await Promise.race([
        window.authGuard(),
        new Promise(function (resolve) {
          window.setTimeout(function () { resolve(Auth.getUser()); }, 12000);
        }),
      ]);
    } catch (err) {
      console.warn('[CALENDAR] authGuard failed:', err);
    }
  }
  if (!user && Auth && typeof Auth.isLoggedIn === 'function' && Auth.isLoggedIn()) {
    user = Auth.getUser();
  }
  if (!user) {
    if (!Auth.requireAuth()) return;
  }
  if (user && typeof window.initParentAppI18n === 'function') {
    await initParentAppI18n(user.preferred_locale);
  }
  await loadChildren();
}

function revealCalendarUi() {
  const ui = document.getElementById('calendarUI');
  if (!ui) return;
  ui.classList.remove('hidden');
  ui.style.opacity = '1';
}

async function loadChildren() {
  try {
    const res = await window.apiFetch('/api/children');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Kunde inte hämta barn');
    }
    const data = await res.json();
    children = Array.isArray(data) ? data : (data.children || []);

    // Sort children by sort_order / name
    children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (children.length === 0) {
      showError(pt('schedule.calendar.noChildren'));
      return;
    }

    // Restore last selected child or pick first
    const saved = localStorage.getItem('calendar_selectedChild');
    if (saved && children.find(c => c.id === saved)) {
      selectedChildId = saved;
    } else {
      selectedChildId = children[0].id;
    }

    renderChildTabs();
    await loadCalendar();
  } catch (err) {
    console.error('[CALENDAR] loadChildren error:', err);
    showError(pt('schedule.calendar.loadChildrenError'));
  }
}

function renderChildTabs() {
  const container = document.getElementById('childTabs');
  container.innerHTML = '';
  for (const child of children) {
    const btn = document.createElement('button');
    btn.className = 'child-tab' + (child.id === selectedChildId ? ' active' : '');
    btn.innerHTML = (child.avatar_url ? renderChildAvatar(child, 20) + ' ' : (child.emoji ? escapeHtml(child.emoji) + ' ' : '')) + escapeHtml(child.name);
    btn.onclick = () => selectChild(child.id);
    container.appendChild(btn);
  }
  updateManageSpecialDaysLink();
}

/** Phase 4 — keep the "Hantera specialdagar & lov" bridge link deep-linked to the currently
 * selected child, so it opens Weekly Schedule's Specialdagar tab for the right child directly. */
function updateManageSpecialDaysLink() {
  const link = document.getElementById('calendarManageSpecialDaysLink');
  if (!link) return;
  link.href = selectedChildId
    ? `/schedule?child=${encodeURIComponent(selectedChildId)}&view=special-days`
    : '/schedule?view=special-days';
}

async function selectChild(childId) {
  selectedChildId = childId;
  localStorage.setItem('calendar_selectedChild', childId);
  renderChildTabs();
  await loadCalendar();
}

async function loadCalendar() {
  if (!selectedChildId) return;

  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('calendarUI').classList.add('hidden');

  try {
    const res = await window.apiFetch(`/api/children/${selectedChildId}/calendar-week?weekOffset=${weekOffset}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Kunde inte ladda kalender');
    }
    const data = await res.json();
    currentData = normalizeCalendarWeekPayload(data);
    if (!currentData || !Array.isArray(currentData.days)) {
      showError(pt('schedule.calendar.loadError'));
      return;
    }
    renderCalendar(currentData);

    document.getElementById('loadingState').classList.add('hidden');
    revealCalendarUi();
  } catch (err) {
    console.error('[CALENDAR] load error:', err);
    document.getElementById('loadingState').classList.add('hidden');
    showError(pt('schedule.calendar.loadError'));
  }
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('errorState').classList.remove('hidden');
  document.getElementById('loadingState').classList.add('hidden');
  const ui = document.getElementById('calendarUI');
  if (ui) ui.classList.add('hidden');
}

function changeWeek(delta) {
  weekOffset += delta;
  loadCalendar();
}

function goToToday() {
  weekOffset = 0;
  loadCalendar();
}

// ─── Render ───────────────────────────────────────────────

function normalizeCalendarWeekPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const daysRaw = Array.isArray(raw.days)
    ? raw.days
    : (Array.isArray(raw.calendar) ? raw.calendar : null);
  if (!Array.isArray(daysRaw)) return null;
  const days = daysRaw.map(function (day) {
    const row = day && typeof day === 'object' ? day : {};
    return Object.assign({}, row, {
      activities: Array.isArray(row.activities) ? row.activities : [],
    });
  });
  return Object.assign({}, raw, {
    days,
    weekStart: raw.weekStart || raw.week_start,
    weekEnd: raw.weekEnd || raw.week_end,
  });
}

function renderCalendar(data) {
  const normalized = normalizeCalendarWeekPayload(data);
  if (!normalized || !Array.isArray(normalized.days)) {
    showError(pt('schedule.calendar.loadError'));
    return;
  }
  renderWeekHeader(normalized);
  renderGrid(normalized);
}

function renderWeekHeader(data) {
  const weekLabel = document.getElementById('weekLabel');
  const weekSubLabel = document.getElementById('weekSubLabel');
  if (!data.weekStart || !data.weekEnd) {
    if (weekLabel) weekLabel.textContent = '';
    if (weekSubLabel) weekSubLabel.textContent = '';
    return;
  }

  const startDate = parseDate(data.weekStart);
  const endDate = parseDate(data.weekEnd);

  const startStr = formatDateShort(startDate);
  const endStr = formatDateShort(endDate);

  weekLabel.textContent = `${startStr} – ${endStr}`;

  if (weekOffset === 0) {
    weekSubLabel.textContent = pt('schedule.calendar.thisWeek');
  } else if (weekOffset === -1) {
    weekSubLabel.textContent = pt('schedule.calendar.lastWeek');
  } else if (weekOffset === 1) {
    weekSubLabel.textContent = pt('schedule.calendar.nextWeek');
  } else if (weekOffset < 0) {
    weekSubLabel.textContent = pt('schedule.calendar.weeksAgo', { count: Math.abs(weekOffset) });
  } else {
    weekSubLabel.textContent = pt('schedule.calendar.weeksFromNow', { count: weekOffset });
  }
}

function renderGrid(data) {
  const grid = document.getElementById('calGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const days = Array.isArray(data.days) ? data.days : [];
  for (const day of days) {
    const col = document.createElement('div');
    col.className = 'day-col' +
      (day.isToday ? ' today' : '') +
      (day.isPast && !day.isToday ? ' past-day' : '') +
      (day.isSpecialDay ? ' special-day-col' : '');

    const date = parseDate(day.date);
    const dayNumStr = date.getUTCDate();
    const monthStr = formatMonthShort(date);

    // Special day badge
    const specialBadge = day.isSpecialDay
      ? `<span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5 ml-1" title="${day.specialDayNote ? escapeHtml(day.specialDayNote) : escapeHtml(pt('schedule.calendar.specialDay'))}">🌟${day.specialDayNote ? ' ' + escapeHtml(day.specialDayNote.slice(0, 12)) : ''}</span>`
      : '';

    const dayLabel = formatDayShort(parseDate(day.date));

    // Header
    const header = document.createElement('div');
    header.className = 'day-header' + (day.isSpecialDay ? ' bg-amber-50 dark:bg-amber-900/20' : '');
    header.innerHTML = `
      <div class="flex items-center justify-between gap-1 mb-1">
        <div class="min-w-0">
          <div class="font-heading font-bold text-sm leading-tight day-name${day.isToday ? ' is-today' : ''} flex items-center flex-wrap gap-1">
            ${dayLabel}
            ${day.isToday ? '<span class="inline-block w-2 h-2 bg-gold rounded-full align-middle"></span>' : ''}
            ${specialBadge}
          </div>
          <div class="text-xs day-date">${dayNumStr} ${monthStr}</div>
        </div>
        <div class="text-right flex-shrink-0">
          ${day.isPaused ? `<span class="paused-badge">${escapeHtml(pt('schedule.calendar.paused'))}</span>` : ''}
          ${day.hasLog && !day.isPaused && day.totalCount > 0
            ? `<div class="text-xs font-semibold day-star-progress${day.completedCount === day.totalCount ? ' is-complete' : ' is-soft'}">${day.completedCount}/${day.totalCount} ⭐</div>`
            : ''}
        </div>
      </div>
      ${day.hasLog && !day.isPaused && day.totalCount > 0 ? `
      <div class="prog-bar mt-1">
        <div class="prog-fill" style="width: ${day.totalCount > 0 ? Math.round(day.completedCount / day.totalCount * 100) : 0}%"></div>
      </div>` : ''}
    `;
    col.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'p-2';
    const activities = Array.isArray(day.activities) ? day.activities : [];

    if (day.isPaused) {
      body.innerHTML = `<div class="empty-day">${escapeHtml(pt('schedule.calendar.pausedDay'))}</div>`;
    } else if (activities.length === 0) {
      body.innerHTML = `<div class="empty-day">${escapeHtml(pt('schedule.calendar.emptyDay'))}</div>`;
    } else {
      // Group by section
      const sections = {};
      for (const act of activities) {
        const sec = act.section || 'dag';
        if (!sections[sec]) sections[sec] = [];
        sections[sec].push(act);
      }

      const sectionOrder = ['morgon', 'dag', 'kvall', 'natt'];

      for (const secKey of sectionOrder) {
        if (!sections[secKey]) continue;
        const acts = sections[secKey];

        const secLabel = document.createElement('div');
        secLabel.className = 'section-label';
        secLabel.textContent = sectionLabelWithEmoji(secKey);
        body.appendChild(secLabel);

        for (const act of acts) {
          const item = document.createElement('div');
          const isDone = act.completed === true;
          const isNotDone = act.completed === false; // past log, not done

          item.className = 'act-item' + (isDone ? ' completed-item' : '');

          // Status indicator
          let dotHtml = '';
          if (isDone) {
            dotHtml = `<div class="status-dot done flex-shrink-0">
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>`;
          } else if (isNotDone) {
            dotHtml = `<div class="status-dot not-done flex-shrink-0"></div>`;
          } else {
            // Template / planned
            dotHtml = `<div class="status-dot planned flex-shrink-0"></div>`;
          }

          // Exception marker prep (Task 2 — visual slot reserved)
          const exceptHtml = act.is_exception
            ? `<span class="ml-auto text-xs">✨</span>`
            : '';

          item.innerHTML = `
            ${dotHtml}
            <span class="act-name flex-1 leading-tight">${escapeHtml(act.icon ? act.icon + ' ' : '') + escapeHtml(act.display_name || act.name)}</span>
            ${exceptHtml}
          `;
          body.appendChild(item);
        }
      }
    }

    col.appendChild(body);
    grid.appendChild(col);
  }
}

// ─── Helpers ──────────────────────────────────────────────

function parseDate(str) {
  // YYYY-MM-DD → UTC date
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const MONTHS_SHORT_SV = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
const DAYS_SHORT_SV = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];

function sectionLabelWithEmoji(key) {
  if (window.LocaleDateTime && typeof LocaleDateTime.sectionLabelWithEmoji === 'function') {
    return LocaleDateTime.sectionLabelWithEmoji(key);
  }
  const fallback = { morgon: '🌅 Morgon', dag: '☀️ Dag', kvall: '🌆 Kväll', natt: '🌙 Natt' };
  return fallback[key] || key;
}

function formatDayShort(date) {
  if (window.LocaleDateTime) {
    return LocaleDateTime.weekdayShort(date);
  }
  return DAYS_SHORT_SV[date.getUTCDay()];
}

function formatDateShort(date) {
  if (window.LocaleDateTime) {
    return formatDayShort(date) + ' ' + LocaleDateTime.formatWithIntl(date, { day: 'numeric', month: 'short' });
  }
  return `${DAYS_SHORT_SV[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS_SHORT_SV[date.getUTCMonth()]}`;
}

function formatMonthShort(date) {
  if (window.LocaleDateTime) {
    return LocaleDateTime.formatWithIntl(date, { month: 'short' });
  }
  return MONTHS_SHORT_SV[date.getUTCMonth()];
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function logout() {
  if (typeof Auth !== 'undefined' && Auth.logout) Auth.logout();
  else window.location.href = '/login';
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);

// ─── Dark mode label sync ─────────────────────────────────
function updateDarkModeLabel() {
  const isDark = document.documentElement.classList.contains('dark');
  const icon = document.getElementById('darkModeIcon');
  const label = document.getElementById('darkModeLabel');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? 'Ljust läge' : 'Mörkt läge';
}
updateDarkModeLabel();
document.addEventListener('darkModeChanged', updateDarkModeLabel);

function applyNavButtonTitles() {
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = pt(key);
  });
}

document.addEventListener('parent-i18n-ready', function () {
  applyNavButtonTitles();
  if (currentData) renderCalendar(currentData);
});
document.addEventListener('locale-changed', function () {
  applyNavButtonTitles();
  if (currentData) renderCalendar(currentData);
});
function bootCalendar() {
  if (_calendarBooted) return;
  _calendarBooted = true;
  init().catch(function (err) {
    console.error('[CALENDAR] init error:', err);
    showError(pt('schedule.calendar.loadChildrenError'));
  });
}

function registerCalendarBootHandler() {
  if (!window.ParentMagicPageBoot || typeof ParentMagicPageBoot.register !== 'function') return false;
  ParentMagicPageBoot.register('calendar', bootCalendar);
  return true;
}

function resetCalendarBootState() {
  _calendarBooted = false;
  children = [];
  selectedChildId = null;
  weekOffset = 0;
  currentData = null;
}

window.__bootCalendarPage = function (opts) {
  if (opts && opts.force) resetCalendarBootState();
  bootCalendar();
};

window.changeWeek = changeWeek;
window.goToToday = goToToday;

function setupCalendarPageBoot() {
  if (!registerCalendarBootHandler()) {
    document.addEventListener('DOMContentLoaded', function () {
      registerCalendarBootHandler();
    }, { once: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCalendar, { once: true });
  } else {
    bootCalendar();
  }
  document.addEventListener('parent-i18n-ready', bootCalendar, { once: true });
  document.addEventListener('stjarndag-magic-navigated', function (e) {
    if (!e.detail || e.detail.pageId !== 'calendar') return;
    resetCalendarBootState();
    bootCalendar();
  });
}

setupCalendarPageBoot();
})();
