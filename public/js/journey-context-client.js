/**
 * journey-context-client.js — fetch Journey Context from API; no local product logic.
 */
(function () {
  'use strict';

  const CACHE_TTL_MS = 5 * 60 * 1000;

  let cachedContext = null;
  let cachedAt = 0;
  let journeyEnabled = null;

  function stampContext(ctx) {
    if (!ctx || typeof ctx !== 'object') return ctx;
    return Object.assign({}, ctx, { _fetchedAt: Date.now() });
  }

  function isCacheFresh() {
    return cachedContext && (Date.now() - cachedAt) < CACHE_TTL_MS;
  }

  function clearCache() {
    cachedContext = null;
    cachedAt = 0;
  }

  async function isJourneyApiEnabled() {
    if (journeyEnabled !== null) return journeyEnabled;
    try {
      const res = await window.apiFetch('/api/me/journey-context');
      journeyEnabled = res.status !== 503;
      if (journeyEnabled && res.ok) {
        cachedContext = stampContext(await res.json());
        cachedAt = Date.now();
      }
      return journeyEnabled;
    } catch (_) {
      journeyEnabled = false;
      return false;
    }
  }

  async function fetchContext(force) {
    if (!force && isCacheFresh()) return cachedContext;
    try {
      const res = await window.apiFetch('/api/me/journey-context');
      if (res.status === 503) {
        journeyEnabled = false;
        clearCache();
        return null;
      }
      if (!res.ok) return isCacheFresh() ? cachedContext : null;
      cachedContext = stampContext(await res.json());
      cachedAt = Date.now();
      journeyEnabled = true;
      return cachedContext;
    } catch (_) {
      return isCacheFresh() ? cachedContext : null;
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
      if (data?.context) {
        cachedContext = stampContext(data.context);
        cachedAt = Date.now();
      }
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
    clearCache,
    CACHE_TTL_MS,
  };
})();
