/**
 * planning-back-nav.js — "← Till planering" when deep-linking from /planning hub.
 */
(function () {
  'use strict';

  var KEY = 'planFromPlanning';

  function markFromPlanning() {
    try { sessionStorage.setItem(KEY, '1'); } catch (_) {}
  }

  function isFromPlanning() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }

  function clearFromPlanning() {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
  }

  function goBack() {
    clearFromPlanning();
    window.location.href = '/planning';
  }

  window.PlanningBackNav = {
    markFromPlanning: markFromPlanning,
    isFromPlanning: isFromPlanning,
    clearFromPlanning: clearFromPlanning,
    goBack: goBack,
  };
})();
