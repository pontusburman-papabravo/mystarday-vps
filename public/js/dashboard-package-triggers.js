/**
 * Dashboard contextual package interest triggers (E10 §9.5).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'pkg_trigger_shown';

  function alreadyShown(key) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return !!map[key];
    } catch (_) {
      return false;
    }
  }

  function markShown(key) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[key] = Date.now();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (_) { /* ignore */ }
  }

  async function maybeTriggerReporting() {
    if (!window.PreviewShell || !window.PackageInterestTriggers) return;
    if (alreadyShown('reporting_14d')) return;

    const access = await PreviewShell.loadAccess();
    if (!access.preview?.reporting || access.components?.reporting?.has) return;

    try {
      const res = await fetch('/api/children', { credentials: 'include' });
      if (!res.ok) return;
      const children = await res.json();
      if (!children?.length) return;

      const childId = children[0].id;
      const to = new Date().toLocaleDateString('sv-SE');
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 14);
      const from = fromDate.toLocaleDateString('sv-SE');

      const logRes = await fetch(
        `/api/children/${childId}/daily-logs?from=${from}&to=${to}`,
        { credentials: 'include' }
      );
      if (!logRes.ok) return;
      const logs = await logRes.json();
      const daysWithActivity = (logs.logs || []).filter((l) => (l.completed_count || 0) > 0).length;
      if (daysWithActivity < 14) return;

      markShown('reporting_14d');
      await PackageInterestTriggers.showModal({
        component: 'reporting',
        source: 'contextual_trigger',
      });
    } catch (_) { /* silent */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth || !Auth.isLoggedIn()) return;
    setTimeout(maybeTriggerReporting, 1500);
  });
})();
