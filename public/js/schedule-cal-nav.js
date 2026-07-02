/**
 * Shared calendar navigation for schedule.js + dashboard.js (Fas 8 PR-S2).
 * Reads calView, weekOffset, dayOffset, currentChildId, currentDay, currentViewMode,
 * children from host global scope. Host-specific hooks via ScheduleCalNav.registerHost().
 */
(function () {
  let hostHooks = {};

  function registerHost(hooks) {
    hostHooks = hooks || {};
  }

  function getWeekStart(offset) {
    const now = new Date();
    const dow = now.getDay();
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
      const wn = getWeekNumber(ws);
      label.textContent = `Vecka ${wn}, ${ws.getFullYear()}`;
    } else if (calView === 'day') {
      const d = getDayFromOffset(dayOffset);
      const today = new Date(); today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
      const isToday = d.getTime() === today.getTime();
      const dayName = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' });
      label.textContent = isToday ? `Idag — ${d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}` : dayName;
    } else if (calView === 'month') {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
      const monthName = d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
      label.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }
  }

  function setCalView(view) {
    calView = view;
    ['day', 'week', 'month'].forEach(v => {
      const btn = document.getElementById('btnView' + v.charAt(0).toUpperCase() + v.slice(1));
      if (!btn) return;
      const isActive = v === view;
      btn.classList.toggle('bg-navy', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('bg-white', !isActive);
      btn.classList.toggle('text-navy', !isActive);
    });
    const viewModeBar = document.getElementById('viewModeBar');
    const daySelectorWrap = document.getElementById('daySelectorWrap');
    if (view === 'month') {
      if (viewModeBar) viewModeBar.classList.add('hidden');
      if (daySelectorWrap) daySelectorWrap.classList.add('hidden');
    } else if (view === 'day') {
      if (viewModeBar && currentChildId) viewModeBar.classList.remove('hidden');
      if (daySelectorWrap) daySelectorWrap.classList.add('hidden');
    } else {
      if (viewModeBar && currentChildId) viewModeBar.classList.remove('hidden');
      if (daySelectorWrap && currentChildId && currentViewMode !== 'special-days') daySelectorWrap.classList.remove('hidden');
    }
    if (hostHooks.onSetCalView) hostHooks.onSetCalView(view);
    updateCalNavLabel();
    refreshCalView();
  }

  function calNavPrev() {
    if (calView === 'week') {
      weekOffset--;
      updateCalNavLabel();
      renderDayTabs();
      if (hostHooks.onWeekNav) hostHooks.onWeekNav();
      loadScheduleForDay();
    } else if (calView === 'day') {
      dayOffset--;
      const d = getDayFromOffset(dayOffset);
      currentDay = d.getDay();
      updateCalNavLabel();
      if (currentChildId) loadScheduleForDay();
    } else if (calView === 'month') {
      weekOffset--;
      updateCalNavLabel();
      renderMonthView();
    }
  }

  function calNavNext() {
    if (calView === 'week') {
      weekOffset++;
      updateCalNavLabel();
      renderDayTabs();
      if (hostHooks.onWeekNav) hostHooks.onWeekNav();
      loadScheduleForDay();
    } else if (calView === 'day') {
      dayOffset++;
      const d = getDayFromOffset(dayOffset);
      currentDay = d.getDay();
      updateCalNavLabel();
      if (currentChildId) loadScheduleForDay();
    } else if (calView === 'month') {
      weekOffset++;
      updateCalNavLabel();
      renderMonthView();
    }
  }

  function calNavToday() {
    weekOffset = 0;
    dayOffset = 0;
    if (hostHooks.onCalNavToday) hostHooks.onCalNavToday();
    else currentDay = new Date().getDay();
    updateCalNavLabel();
    if (calView === 'month') renderMonthView();
    else {
      renderDayTabs();
      if (hostHooks.onWeekNav) hostHooks.onWeekNav();
      if (currentChildId) loadScheduleForDay();
    }
  }

  function refreshCalView() {
    if (!currentChildId) return;
    if (calView === 'month') renderMonthView();
    else loadScheduleForDay();
  }

  function formatMonthChildName(child) {
    if (!child) return '';
    if (hostHooks.formatMonthChildName) return hostHooks.formatMonthChildName(child);
    return `${child.emoji || '👤'} ${escHtml(child.name)}`;
  }

  async function renderMonthView() {
    if (!currentChildId) return;
    const now = new Date();
    const displayDate = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const DAYS_SHORT = window.ScheduleCore.DAYS_SHORT;

    document.getElementById('scheduleContent').innerHTML = '<div class="text-center py-10 text-text-soft">Laddar…</div>';

    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`);
    const schedules = res.ok ? await res.json() : [];
    const activeDays = new Set(schedules.map(s => s.day_of_week));

    const child = children.find(c => c.id === currentChildId);
    const childName = formatMonthChildName(child);

    const firstDay = new Date(year, month, 1);
    const todayStr = new Date().toISOString().slice(0, 10);
    const headerDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

    const startDow = firstDay.getDay();
    const offset = (startDow + 6) % 7;
    const cells = [];
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - offset);
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate); d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const inMonth = d.getMonth() === month;
      const isToday = dateStr === todayStr;
      const dow = d.getDay();
      const hasActivities = activeDays.has(dow);
      cells.push({ d, dateStr, inMonth, isToday, hasActivities, dow });
    }
    let totalRows = 6;
    while (totalRows > 4 && !cells.slice((totalRows - 1) * 7, totalRows * 7).some(c => c.inMonth)) totalRows--;

    const gridHtml = cells.slice(0, totalRows * 7).map(cell => {
      const { d, inMonth, isToday, hasActivities } = cell;
      let bg = inMonth ? 'bg-white hover:bg-sky cursor-pointer' : 'bg-gray-50 cursor-default';
      let ring = 'border border-gray-100';
      if (isToday) { bg = 'bg-blue-50 hover:bg-blue-100 cursor-pointer'; ring = 'border-2 border-blue-300'; }
      const dot = hasActivities && inMonth ? '<span class="block w-2 h-2 rounded-full bg-green-400 mx-auto mt-0.5"></span>' : '<span class="block w-2 h-2 mt-0.5"></span>';
      const dayNum = d.getDate();
      return `<div class="relative min-h-[52px] p-1.5 ${bg} ${ring} transition-colors flex flex-col items-center" onclick="${inMonth ? `calMonthDayClick(${d.getDay()})` : ''}">
      <span class="text-sm font-bold ${inMonth ? (isToday ? 'text-blue-700' : 'text-navy') : 'text-gray-300'}">${dayNum}</span>
      ${dot}
    </div>`;
    }).join('');

    const dayLabels = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(dow => {
      if (activeDays.has(dow)) {
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

  window.ScheduleCalNav = {
    registerHost,
    getWeekStart,
    getWeekNumber,
    getDayFromOffset,
    updateCalNavLabel,
    setCalView,
    calNavPrev,
    calNavNext,
    calNavToday,
    refreshCalView,
    renderMonthView,
    calMonthDayClick,
  };

  window.getWeekStart = getWeekStart;
  window.getWeekNumber = getWeekNumber;
  window.getDayFromOffset = getDayFromOffset;
  window.updateCalNavLabel = updateCalNavLabel;
  window.setCalView = setCalView;
  window.calNavPrev = calNavPrev;
  window.calNavNext = calNavNext;
  window.calNavToday = calNavToday;
  window.refreshCalView = refreshCalView;
  window.renderMonthView = renderMonthView;
  window.calMonthDayClick = calMonthDayClick;
})();
