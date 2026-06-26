/**
 * child-event-bus.js — Cross-layer event bus (separation contract).
 * Systems communicate only via events; no direct cross-store mutation.
 */
(function () {
  'use strict';

  const _listeners = {};

  function on(eventType, handler) {
    if (!_listeners[eventType]) _listeners[eventType] = [];
    _listeners[eventType].push(handler);
    return function unsubscribe() {
      _listeners[eventType] = (_listeners[eventType] || []).filter(function (h) { return h !== handler; });
    };
  }

  function emit(eventType, payload) {
    const handlers = (_listeners[eventType] || []).slice();
    handlers.forEach(function (handler) {
      try {
        handler(payload);
      } catch (err) {
        console.error('[ChildEventBus]', eventType, err);
      }
    });
    // DOM bridge for debugging / future listeners
    try {
      window.dispatchEvent(new CustomEvent('child:' + eventType, { detail: payload }));
    } catch (_) { /* IE unsupported */ }
  }

  function emitActivityCompleted(payload) {
    emit('ActivityCompleted', Object.assign({ type: 'ActivityCompleted' }, payload || {}));
  }

  // Universe layer: invalidate cache when tasks complete (no direct Today → Universe UI)
  on('ActivityCompleted', function () {
    if (window.ChildUniverse && typeof ChildUniverse.invalidate === 'function') {
      ChildUniverse.invalidate();
    }
    if (window.ChildFamily && typeof ChildFamily.invalidate === 'function') {
      ChildFamily.invalidate();
    }
  });

  window.ChildEventBus = {
    on: on,
    emit: emit,
    emitActivityCompleted: emitActivityCompleted,
  };
})();
