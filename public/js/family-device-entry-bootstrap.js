/**
 * family-device-entry-bootstrap.js — run authoritative app-entry on parent home surfaces.
 */
(function () {
  'use strict';

  var PARENT_ENTRY_PATHS = ['/dashboard', '/home', '/'];

  function normalizePath() {
    return (window.location.pathname || '').replace(/\/$/, '') || '/';
  }

  function isParentEntrySurface() {
    return PARENT_ENTRY_PATHS.indexOf(normalizePath()) !== -1;
  }

  async function bootstrapFamilyDeviceEntry() {
    if (!isParentEntrySurface()) return;
    if (!window.AppEntryOrchestrator || typeof AppEntryOrchestrator.runColdStart !== 'function') {
      return;
    }
    try {
      window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
    } catch (_) { /* ignore */ }
    await AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapFamilyDeviceEntry);
  } else {
    bootstrapFamilyDeviceEntry();
  }
})();
