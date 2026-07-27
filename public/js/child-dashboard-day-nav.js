/**
 * Child dashboard week/day navigation (Fas 8 F3b).
 * Day tabs, week arrows, Idag button. Reads weekOffset/currentDate/todayStr from host.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function dateLocale() {
    return typeof window.getChildDateLocale === 'function' ? getChildDateLocale() : 'sv-SE';
  }

  function formatIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function shortWeekday(dow) {
    const ref = new Date(2024, 0, 7 + dow);
    return ref.toLocaleDateString(dateLocale(), { weekday: 'short' }).replace(/\.$/, '');
  }

  function shortMonth(monthIndex) {
    const ref = new Date(2024, monthIndex, 15);
    return ref.toLocaleDateString(dateLocale(), { month: 'short' }).replace(/\.$/, '');
  }

function renderDayTabs() {
  const container = document.getElementById('dayTabs');
  if (!container) return;
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i + (weekOffset * 7));
    const dateStr = formatIsoDate(d);
    const isToday = dateStr === todayStr;
    const dow = d.getDay();
    days.push({ dateStr, dow, isToday, dayNum: d.getDate(), month: d.getMonth() });
  }

  const weekLabel = document.getElementById('weekLabel');
  if (weekLabel) {
    const first = days[0];
    const last = days[6];
    if (weekOffset === 0) {
      weekLabel.textContent = t('scheduleChrome.weekThis');
    } else {
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
      const startOfYear = new Date(monday.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((monday - startOfYear) / 86400000);
      const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
      weekLabel.textContent = t('scheduleChrome.weekNum', {
        num: weekNum,
        from: first.dayNum + ' ' + shortMonth(first.month),
        to: last.dayNum + ' ' + shortMonth(last.month),
      });
    }
  }

  updateTodayBtn();

  container.innerHTML = days.map(d => `
    <button
      class="day-tab flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-center min-w-[44px] ${d.dateStr === currentDate ? 'active' : 'bg-sky text-navy hover:bg-lavender'}"
      onclick="loadDay('${d.dateStr}')"
    >
      <div>${shortWeekday(d.dow)}</div>
      <div class="text-base font-bold">${d.dayNum}</div>
      ${d.isToday ? '<div class="text-[9px] opacity-75">' + t('scheduleChrome.todayTab') + '</div>' : ''}
    </button>
  `).join('');
}

function navigateWeek(direction) {
  weekOffset += direction;
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
  const newDate = formatIsoDate(monday);
  updateTodayBtn();
  loadDay(newDate);
}

function goToToday() {
  weekOffset = 0;
  updateTodayBtn();
  loadDay(todayStr);
}

function updateTodayBtn() {
  const btn = document.getElementById('todayBtn');
  if (!btn) return;
  if (weekOffset !== 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function updateDateLine() {
  const el = document.getElementById('childDateLine');
  if (el) {
    el.textContent = formatDateDisplay(currentDate || todayStr);
  }
}

  window.renderDayTabs = renderDayTabs;
  window.navigateWeek = navigateWeek;
  window.goToToday = goToToday;
  window.updateTodayBtn = updateTodayBtn;
  window.updateDateLine = updateDateLine;
})();
