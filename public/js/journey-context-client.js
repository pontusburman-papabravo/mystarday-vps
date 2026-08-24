/**
 * journey-context-client.js — fetch Journey Context from API; no local product logic.
 */
(function () {
  'use strict';

  const CACHE_TTL_MS = 5 * 60 * 1000;

  let cachedContext = null;
  let cachedAt = 0;
  let journeyEnabled = null;
  let inflightFetch = null;

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
    journeyEnabled = null;
    inflightFetch = null;
  }

  async function fetchContextFromApi() {
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
  }

  async function isJourneyApiEnabled() {
    if (journeyEnabled !== null) return journeyEnabled;
    if (isCacheFresh()) {
      journeyEnabled = true;
      return true;
    }
    if (inflightFetch) {
      await inflightFetch;
      return journeyEnabled !== null ? journeyEnabled : false;
    }
    inflightFetch = fetchContextFromApi()
      .then(function (ctx) {
        if (journeyEnabled === null) {
          journeyEnabled = ctx !== null;
        }
        return journeyEnabled;
      })
      .catch(function () {
        journeyEnabled = false;
        return false;
      })
      .finally(function () {
        inflightFetch = null;
      });
    return inflightFetch;
  }

  async function fetchContext(force) {
    if (!force && isCacheFresh()) return cachedContext;
    if (!force && inflightFetch) {
      await inflightFetch;
      return cachedContext;
    }
    inflightFetch = fetchContextFromApi()
      .catch(function () {
        return isCacheFresh() ? cachedContext : null;
      })
      .finally(function () {
        inflightFetch = null;
      });
    return inflightFetch;
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
    isJourneyApiEnabled: isJourneyApiEnabled,
    fetchContext: fetchContext,
    postEvent: postEvent,
    fetchRegistry: fetchRegistry,
    getCachedContext: getCachedContext,
    clearCache: clearCache,
    CACHE_TTL_MS: CACHE_TTL_MS,
  };
})();
