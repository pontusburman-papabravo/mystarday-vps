/**
 * Child dashboard week/day navigation (Fas 8 F3b).
 * Day tabs, week arrows, Idag button. Reads weekOffset/currentDate/todayStr from host.
 */
(function () {
  'use strict';

  const DAY_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

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
    const dateStr = d.toLocaleDateString('sv-SE');
    const isToday = dateStr === todayStr;
    const dow = d.getDay();
    days.push({ dateStr, dow, isToday, dayNum: d.getDate(), month: d.getMonth() });
  }

  // Update week label
  const weekLabel = document.getElementById('weekLabel');
  if (weekLabel) {
    const first = days[0];
    const last = days[6];
    if (weekOffset === 0) {
      weekLabel.textContent = 'Denna vecka';
    } else {
      // Get ISO week number of Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
      const startOfYear = new Date(monday.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((monday - startOfYear) / 86400000);
      const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
      weekLabel.textContent = `Vecka ${weekNum} · ${first.dayNum} ${MONTH_NAMES[first.month]} – ${last.dayNum} ${MONTH_NAMES[last.month]}`;
    }
  }

  // Show/hide Idag button
  updateTodayBtn();

  container.innerHTML = days.map(d => `
    <button
      class="day-tab flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-center min-w-[44px] ${d.dateStr === currentDate ? 'active' : 'bg-sky text-navy hover:bg-lavender'}"
      onclick="loadDay('${d.dateStr}')"
    >
      <div>${DAY_SHORT[d.dow]}</div>
      <div class="text-base font-bold">${d.dayNum}</div>
      ${d.isToday ? '<div class="text-[9px] opacity-75">idag</div>' : ''}
    </button>
  `).join('');
}

function navigateWeek(direction) {
  weekOffset += direction;
  // Select Monday of the new week
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
  const newDate = monday.toLocaleDateString('sv-SE');
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
