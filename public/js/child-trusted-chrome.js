/**
 * child-trusted-chrome.js — Fas 4A header chrome on trusted daily UX (no child logout).
 */
(function () {
  'use strict';

  function isDailyUxActive() {
    if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.isDailyUxActive === 'function') {
      return AppEntryOrchestrator.isDailyUxActive();
    }
    try {
      return sessionStorage.getItem('stjarndag_family_device_daily_ux_v1') === '1';
    } catch (_) {
      return false;
    }
  }

  function getAllowedChildCount() {
    if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.getAllowedChildCount === 'function') {
      const n = AppEntryOrchestrator.getAllowedChildCount();
      if (n != null) return n;
    }
    try {
      const parsed = parseInt(sessionStorage.getItem('stjarndag_entry_allowed_count'), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_) {
      return 0;
    }
  }

  function applyHeaderChrome() {
    if (!isDailyUxActive()) return;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    const switchBtn = document.getElementById('switchChildBtn');
    const allowed = getAllowedChildCount();
    if (switchBtn) {
      if (allowed > 1) {
        switchBtn.style.display = '';
        switchBtn.setAttribute('aria-hidden', 'false');
      } else {
        switchBtn.style.display = 'none';
        switchBtn.setAttribute('aria-hidden', 'true');
      }
    }
  }

  async function refreshAllowedCountFromServer() {
    if (!isDailyUxActive()) return;
    try {
      const res = await fetch('/api/auth/app-entry', { credentials: 'include' });
      const body = await res.json().catch(function () { return {}; });
      if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.fetchEntryDecision === 'function') {
        /* meta stored by fetchEntryDecision on next cold start; mirror here */
      }
      if (Array.isArray(body.allowedChildren)) {
        sessionStorage.setItem('stjarndag_entry_allowed_count', String(body.allowedChildren.length));
      }
      applyHeaderChrome();
    } catch (_) { /* ignore */ }
  }

  function apply() {
    if (!isDailyUxActive()) return;
    applyHeaderChrome();
    refreshAllowedCountFromServer();
  }

  window.ChildTrustedChrome = {
    isDailyUxActive: isDailyUxActive,
    getAllowedChildCount: getAllowedChildCount,
    apply: apply,
  };
})();
