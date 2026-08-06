/**
 * child-session-context.js — R4.3 stale-response guard + child switch invalidation.
 */
(function () {
  'use strict';

  let _generation = 0;
  let _activeChildId = null;

  function bump() {
    _generation += 1;
    try {
      window.dispatchEvent(new CustomEvent('child-session-context:changed', {
        detail: { generation: _generation, childId: _activeChildId },
      }));
    } catch (_) { /* ignore */ }
    return _generation;
  }

  function capture() {
    return _generation;
  }

  function isCurrent(gen) {
    return gen === _generation;
  }

  function setActiveChildId(childId) {
    _activeChildId = childId || null;
    bump();
  }

  function invalidate(reason) {
    _activeChildId = null;
    bump();
    if (reason === 'switch' && window.OfflineQueue && typeof OfflineQueue.clear === 'function') {
      OfflineQueue.clear().catch(function () {});
    }
    if (window.EntryAnalytics && typeof EntryAnalytics.track === 'function') {
      EntryAnalytics.track('child_context_switched', { source: reason || 'unknown' });
    }
  }

  function getActiveChildId() {
    return _activeChildId;
  }

  window.ChildSessionContext = {
    capture: capture,
    isCurrent: isCurrent,
    bump: bump,
    invalidate: invalidate,
    setActiveChildId: setActiveChildId,
    getActiveChildId: getActiveChildId,
    discardIfStale: function (gen, meta) {
      if (isCurrent(gen)) return false;
      if (window.EntryAnalytics && typeof EntryAnalytics.track === 'function') {
        EntryAnalytics.track('stale_child_response_discarded', meta || {});
      }
      return true;
    },
  };
})();
