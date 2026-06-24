/**
 * analytics-shim.js — defines the global `window.analytics` client.
 *
 * Several page scripts (rewards-hub.js, planning-hub.js, home-readiness.js,
 * child-profile.js) call `analytics.track(familyId, eventType, metadata)` behind
 * a `typeof window.analytics !== 'undefined'` guard. Without this shim that guard
 * is always false and the events (nav_hub_click, readiness_action_click,
 * child_profile_section) are silently dropped.
 *
 * familyId is ignored client-side — the server derives it from the JWT
 * (src/routes/analytics.js). Only whitelisted event types are persisted.
 */
(function (global) {
  'use strict';

  if (global.analytics && typeof global.analytics.track === 'function') return;

  global.analytics = global.analytics || {};
  global.analytics.track = function track(_familyId, eventType, metadata) {
    if (!eventType) return;
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
        credentials: 'include',
        keepalive: true,
      }).catch(function () {});
    } catch (_) { /* analytics must never break the page */ }
  };
})(window);
