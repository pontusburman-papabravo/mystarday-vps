/**
 * child-activity-engine.js — Daily log + activities facade (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function refreshToday() {
    if (typeof window.loadDay === 'function' && typeof window.todayStr === 'string') {
      return window.loadDay(window.todayStr || window.currentDate);
    }
    return Promise.resolve();
  }

  window.ChildActivityEngine = {
    refreshToday: refreshToday,
  };
})();
