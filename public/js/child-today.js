/**
 * child-today.js — Idag world shell (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function onEnter() {
    if (typeof window.showTab === 'function') window.showTab('schedule');
    if (window.ChildTodayFocus) ChildTodayFocus.onTabChange('schedule');
    if (window.ChildActivityEngine) ChildActivityEngine.refreshToday();
  }

  window.ChildToday = { onEnter: onEnter };
})();
