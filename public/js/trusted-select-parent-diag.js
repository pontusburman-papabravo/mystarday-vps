/**
 * trusted-select-parent-diag.js — sanitized, correlated stage logging for the
 * child->adult profile-switch flow. Posts to /api/client-log channel
 * trusted_profile_unlock. NEVER includes the adult unlock code, session
 * credentials or other sensitive payload — only IDs and booleans already used
 * elsewhere (parent id, lease timestamp, decision destination, user type).
 *
 * Diagnostics-only: a flow_id is generated when the parent card is tapped and
 * persisted in sessionStorage so it survives the full-page navigation to the
 * destination page, producing ONE correlated timeline:
 *   picker -> select-parent -> /me -> lease -> commit -> navigation -> destination
 */
(function () {
  'use strict';

  const FLOW_ID_KEY = 'stjarndag_trusted_flow_id';

  function safeKeys(body) {
    if (!body || typeof body !== 'object') return [];
    try {
      return Object.keys(body).slice(0, 12);
    } catch (_) {
      return [];
    }
  }

  function newFlowId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /** Start a new correlated flow (e.g. on parent-card tap) and persist it. */
  function beginFlow() {
    const id = newFlowId();
    try {
      sessionStorage.setItem(FLOW_ID_KEY, id);
    } catch (_) { /* ignore */ }
    return id;
  }

  function getFlowId() {
    try {
      return sessionStorage.getItem(FLOW_ID_KEY) || null;
    } catch (_) {
      return null;
    }
  }

  function clearFlow() {
    try {
      sessionStorage.removeItem(FLOW_ID_KEY);
    } catch (_) { /* ignore */ }
  }

  function logStage(stage, detail) {
    if (!stage) return;
    const payload = {
      channel: 'trusted_profile_unlock',
      step: stage,
      detail: detail || null,
      flow_id: getFlowId(),
      ts: Date.now(),
      path: (typeof window !== 'undefined' && window.location) ? window.location.pathname : null,
      native: !!(window.Platform && window.Platform.isNative && window.Platform.isNative()),
      ios: !!(window.Platform && window.Platform.isIOS && window.Platform.isIOS()),
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
    beginFlow: beginFlow,
    getFlowId: getFlowId,
    clearFlow: clearFlow,
  };
})();
