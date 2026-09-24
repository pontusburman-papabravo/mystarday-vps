/**
 * Shared handoff into child Today. Source survives parent logout (sessionStorage).
 * child_access_completed is not fired here.
 */
(function () {
  'use strict';

  const SOURCE_KEY = 'sd_child_access_source';

  function rememberSource(source) {
    try {
      sessionStorage.setItem(SOURCE_KEY, source);
    } catch (_) { /* private mode */ }
  }

  function readSource() {
    try {
      return sessionStorage.getItem(SOURCE_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function clearSource() {
    try {
      sessionStorage.removeItem(SOURCE_KEY);
    } catch (_) { /* ignore */ }
  }

  function trackIntent(source) {
    const meta = { source: source };
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'child_handoff_started', meta);
      return;
    }
    if (window.apiFetch) {
      window.apiFetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({ event_type: 'child_handoff_started', metadata: meta }),
      }).catch(function () {});
    }
  }

  /**
   * Parent is still signed in. Completes the switch via existing Auth.logout childFlow.
   * @param {string} source first_schedule_handoff | home_handoff
   */
  function begin(source) {
    const safe = source === 'first_schedule_handoff' ? source : 'home_handoff';
    rememberSource(safe);
    trackIntent(safe);
    if (window.JourneyContextClient) {
      JourneyContextClient.postEvent('handoff_started').catch(function () {});
    }
    if (window.Auth && typeof Auth.logout === 'function') {
      Auth.logout({ childFlow: true });
      return;
    }
    window.location.href = '/child-login';
  }

  window.ChildAccessHandoff = {
    SOURCE_KEY: SOURCE_KEY,
    rememberSource: rememberSource,
    readSource: readSource,
    clearSource: clearSource,
    begin: begin,
  };
})();
