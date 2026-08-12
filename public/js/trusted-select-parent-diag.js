/**
 * trusted-select-parent-diag.js — sanitized stage logging for select-parent unlock.
 * Posts to /api/client-log channel trusted_profile_unlock (no secrets).
 */
(function () {
  'use strict';

  function safeKeys(body) {
    if (!body || typeof body !== 'object') return [];
    try {
      return Object.keys(body).slice(0, 12);
    } catch (_) {
      return [];
    }
  }

  function logStage(stage, detail) {
    if (!stage) return;
    const payload = {
      channel: 'trusted_profile_unlock',
      step: stage,
      detail: detail || null,
      ts: Date.now(),
      native: !!(window.Platform && Platform.isNative && Platform.isNative()),
      ios: !!(window.Platform && Platform.isIOS && Platform.isIOS()),
    };
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () { /* ignore */ });
    } catch (_) { /* ignore */ }
  }

  window.TrustedSelectParentDiag = {
    logStage: logStage,
    safeKeys: safeKeys,
  };
})();
