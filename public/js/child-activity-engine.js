/**
 * child-activity-engine.js — Daily log + activities (barnmeny v2.1 Sprint 4).
 */
(function () {
  'use strict';

  var _lastDayData = null;

  function refreshToday() {
    if (typeof window.coalescedLoadDay === 'function') {
      return window.coalescedLoadDay();
    }
    if (typeof window.loadDay === 'function' && typeof window.resolveChildScheduleDate === 'function') {
      return window.loadDay(window.resolveChildScheduleDate());
    }
    return Promise.resolve();
  }

  function loadDay(dateStr, showLoader) {
    if (typeof window.loadDay === 'function') {
      return window.loadDay(dateStr, showLoader);
    }
    return Promise.resolve();
  }

  function setLastDayData(data) {
    _lastDayData = data || null;
  }

  function isPausedDay() {
    if (_lastDayData && _lastDayData.is_paused) return true;
    if (_lastDayData && _lastDayData.log && _lastDayData.log.is_paused) return true;
    return false;
  }

  function pausedBannerHtml() {
    return '<div id="childPausedBanner" class="mx-4 mb-4 p-4 bg-sky border border-lavender rounded-2xl text-center" role="status">' +
      '<p class="text-2xl mb-1">🌴</p>' +
      '<p class="font-heading font-bold text-navy">Ledig idag</p>' +
      '<p class="text-sm text-text-soft">En vuxen har pausat dagens schema.</p></div>';
  }

  function mountPausedBannerIfNeeded() {
    var schedule = document.getElementById('scheduleView');
    if (!schedule || !isPausedDay()) {
      var existing = document.getElementById('childPausedBanner');
      if (existing) existing.remove();
      return;
    }
    if (document.getElementById('childPausedBanner')) return;
    var mount = document.createElement('div');
    mount.innerHTML = pausedBannerHtml();
    schedule.insertBefore(mount.firstChild, schedule.firstChild);
  }

  window.ChildActivityEngine = {
    refreshToday: refreshToday,
    loadDay: loadDay,
    setLastDayData: setLastDayData,
    isPausedDay: isPausedDay,
    mountPausedBannerIfNeeded: mountPausedBannerIfNeeded,
  };
})();
