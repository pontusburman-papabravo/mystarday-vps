/**
 * Shows the existing week calendar as a view of /schedule (?view=calendar).
 * The day list stays the start. This file does not redraw the calendar grid.
 */
(function () {
  'use strict';

  function t(key) {
    if (typeof window.pt === 'function') {
      const value = window.pt(key);
      if (value && value !== key) return value;
    }
    if (key === 'schedule.calendar.showDays') return 'Dagar';
    if (key === 'schedule.calendar.showCalendar') return 'Kalender';
    return key;
  }

  function isCalendarView() {
    try {
      return new URLSearchParams(window.location.search).get('view') === 'calendar';
    } catch (_) {
      return false;
    }
  }

  function activeChildId() {
    try {
      if (typeof currentChildId === 'string' && currentChildId) return currentChildId;
    } catch (_) {}
    try {
      return new URLSearchParams(window.location.search).get('child') || '';
    } catch (_) {
      return '';
    }
  }

  function hrefFor(calendar) {
    const child = activeChildId();
    const params = new URLSearchParams();
    if (calendar) params.set('view', 'calendar');
    if (child) params.set('child', child);
    const qs = params.toString();
    return qs ? '/schedule?' + qs : '/schedule';
  }

  function syncToggle() {
    const toggle = document.getElementById('scheduleWeekViewToggle');
    if (!toggle) return;
    const calendar = isCalendarView();
    toggle.href = hrefFor(!calendar);
    toggle.textContent = calendar ? t('schedule.calendar.showDays') : t('schedule.calendar.showCalendar');
    toggle.setAttribute('aria-pressed', calendar ? 'true' : 'false');
  }

  function show() {
    const cal = document.getElementById('scheduleCalendarView');
    const list = document.getElementById('childrenListView');
    const editor = document.getElementById('scheduleEditorView');
    const family = document.getElementById('familyGridView');
    if (list) list.classList.add('hidden');
    if (editor) editor.classList.add('hidden');
    if (family) family.classList.add('hidden');
    if (cal) cal.classList.remove('hidden');
    syncToggle();
  }

  function hide() {
    const cal = document.getElementById('scheduleCalendarView');
    if (cal) cal.classList.add('hidden');
    syncToggle();
  }

  window.ScheduleCalendarView = {
    isCalendarView: isCalendarView,
    show: show,
    hide: hide,
    syncToggle: syncToggle,
  };

  function boot() {
    if (isCalendarView()) show();
    else syncToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('parent-i18n-ready', syncToggle);
  document.addEventListener('locale-changed', syncToggle);
})();
