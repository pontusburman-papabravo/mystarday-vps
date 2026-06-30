/**
 * journey-context-client.js — fetch Journey Context from API; no local product logic.
 */
(function () {
  'use strict';

  let cachedContext = null;
  let journeyEnabled = null;

  async function isJourneyApiEnabled() {
    if (journeyEnabled !== null) return journeyEnabled;
    try {
      const res = await window.apiFetch('/api/me/journey-context');
      journeyEnabled = res.status !== 503;
      if (journeyEnabled && res.ok) {
        cachedContext = await res.json();
      }
      return journeyEnabled;
    } catch (_) {
      journeyEnabled = false;
      return false;
    }
  }

  async function fetchContext(force) {
    if (!force && cachedContext) return cachedContext;
    try {
      const res = await window.apiFetch('/api/me/journey-context');
      if (res.status === 503) {
        journeyEnabled = false;
        return null;
      }
      if (!res.ok) return null;
      cachedContext = await res.json();
      journeyEnabled = true;
      return cachedContext;
    } catch (_) {
      return null;
    }
  }

  async function postEvent(intent, childId, dailyLogItemId, metadata) {
    try {
      const body = { intent };
      if (childId) body.child_id = childId;
      if (dailyLogItemId) body.daily_log_item_id = dailyLogItemId;
      if (metadata && typeof metadata === 'object') body.metadata = metadata;
      const res = await window.apiFetch('/api/me/journey-context/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.context) cachedContext = data.context;
      return data;
    } catch (_) {
      return null;
    }
  }

  async function fetchRegistry() {
    try {
      const res = await window.apiFetch('/api/me/journey-context/registry');
      if (!res.ok) return null;
      return res.json();
    } catch (_) {
      return null;
    }
  }

  function getCachedContext() {
    return cachedContext;
  }

  window.JourneyContextClient = {
    isJourneyApiEnabled,
    fetchContext,
    postEvent,
    fetchRegistry,
    getCachedContext,
  };
})();
