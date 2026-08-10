/**
 * app-entry-orchestrator.js — Fas 2B client executor (server is decision authority).
 * Fetches GET /api/auth/app-entry, applies serverAction, navigates once.
 */
(function () {
  'use strict';

  const DECISION_KEY = 'stjarndag_entry_decision_v1';
  const ACTIVE_FLAG_KEY = 'stjarndag_family_device_entry_v1';
  const APPLIED_KEY = 'stjarndag_entry_decision_applied';
  const NAV_GUARD_KEY = 'stjarndag_entry_nav_guard';

  let _coldStartPromise = null;

  (function markDeferSessionGatePaths() {
    try {
      const p = (window.location.pathname || '').replace(/\/$/, '') || '/';
      if (p === '/login' || p === '/child-login' || p.indexOf('/child-login') === 0) {
        window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
      }
    } catch (_) { /* ignore */ }
  })();

  function readJson(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (_) { /* ignore */ }
  }

  function isActive() {
    try {
      return sessionStorage.getItem(ACTIVE_FLAG_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setActiveFlag(on) {
    try {
      sessionStorage.setItem(ACTIVE_FLAG_KEY, on ? '1' : '0');
    } catch (_) { /* ignore */ }
  }

  function validateDecision(d) {
    if (!d || typeof d !== 'object') return false;
    const dest = d.destination;
    const allowed = ['parent-home', 'child-home', 'profile-picker', 'parent-login', 'device-setup'];
    if (allowed.indexOf(dest) === -1) return false;
    if (d.credentialContext === 'child' && !d.childId) return false;
    return true;
  }

  function applyDeviceModeCache(decision) {
    if (!window.DeviceMode || !decision) return;
    if (decision.viewContext === 'child' && decision.childId) {
      DeviceMode.enterChild();
    } else if (decision.viewContext === 'parent') {
      DeviceMode.enterParent();
    }
  }

  function markDecisionApplied(decision) {
    writeJson(DECISION_KEY, decision);
    try {
      sessionStorage.setItem(APPLIED_KEY, '1');
    } catch (_) { /* ignore */ }
    applyDeviceModeCache(decision);
    window.__DEFER_SESSION_GATE_FOR_ENTRY__ = false;
    if (window.SessionGate && typeof SessionGate.run === 'function') {
      SessionGate.run();
    }
  }

  function isDecisionApplied() {
    try {
      return sessionStorage.getItem(APPLIED_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function getAppliedDecision() {
    return readJson(DECISION_KEY);
  }

  function getAppliedViewContext() {
    const d = getAppliedDecision();
    return d ? d.viewContext : null;
  }

  function shouldDeferSessionGate() {
    if (!isActive()) return false;
    if (window.__DEFER_SESSION_GATE_FOR_ENTRY__ && !isDecisionApplied()) return true;
    return false;
  }

  function shouldUseOrchestrator() {
    return isActive();
  }

  async function fetchEntryDecision(intentChildId) {
    let url = '/api/auth/app-entry';
    if (intentChildId) {
      url += '?intent_child_id=' + encodeURIComponent(intentChildId);
    }
    const res = await fetch(url, { credentials: 'include' });
    const body = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      return { ok: false, status: res.status, body: body };
    }
    setActiveFlag(body.orchestratorActive === true);
    if (body.orchestratorActive !== true) {
      return { ok: true, orchestratorActive: false, body: body };
    }
    if (!validateDecision(body.decision)) {
      return { ok: false, code: 'INVALID_DECISION' };
    }
    return { ok: true, orchestratorActive: true, decision: body.decision, body: body };
  }

  async function executeServerAction(decision) {
    const action = decision.serverAction;
    if (!action || action === 'none') return { ok: true };

    if (action === 'restore-child') {
      const res = await fetch('/api/auth/trusted-device/restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(function () { return {}; });
      if (body.ok && body.user && window.Auth && Auth.setAuth) {
        Auth.setAuth(null, body.user);
      }
      if (body.code === 'SHARED_PICKER_REQUIRED') {
        return { ok: true, picker: true, allowed: body.allowed_children };
      }
      return { ok: res.ok && body.ok !== false, body: body };
    }

    if (action === 'select-child' && decision.childId) {
      const res = await fetch('/api/auth/trusted-device/select-child', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: decision.childId }),
      });
      const body = await res.json().catch(function () { return {}; });
      if (body.ok && body.user && window.Auth && Auth.setAuth) {
        Auth.setAuth(null, body.user);
      }
      return { ok: res.ok && body.ok === true, body: body };
    }

    if (action === 'restore-parent') {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return { ok: res.ok };
    }

    return { ok: true };
  }

  function navigateOnce(path) {
    if (!path) return;
    try {
      if (sessionStorage.getItem(NAV_GUARD_KEY) === path) return;
      sessionStorage.setItem(NAV_GUARD_KEY, path);
    } catch (_) { /* ignore */ }
    const target = path.split('?')[0];
    const current = (window.location.pathname || '').replace(/\/$/, '') || '/';
    if (current === target && !path.includes('?')) return;
    window.location.replace(path);
  }

  async function runColdStart(options) {
    const opts = options || {};
    if (_coldStartPromise) return _coldStartPromise;

    _coldStartPromise = (async function () {
      const fetched = await fetchEntryDecision(opts.intentChildId || null);
      if (!fetched.ok) {
        return { ok: false, code: fetched.code || 'FETCH_FAILED' };
      }
      if (!fetched.orchestratorActive) {
        return { ok: false, code: 'ORCHESTRATOR_OFF' };
      }

      const decision = fetched.decision;
      const actionResult = await executeServerAction(decision);
      if (!actionResult.ok) {
        return { ok: false, code: 'SERVER_ACTION_FAILED', decision: decision };
      }

      markDecisionApplied(decision);

      if (opts.skipRedirect) {
        return { ok: true, decision: decision };
      }

      if (decision.destination === 'profile-picker' && actionResult.picker) {
        if (typeof window.showSharedDevicePicker === 'function') {
          window.showSharedDevicePicker(actionResult.allowed || [], { source: 'app_entry' });
          return { ok: true, decision: decision, code: 'PICKER_SHOWN' };
        }
      }

      navigateOnce(decision.path);
      return { ok: true, decision: decision };
    })();

    try {
      return await _coldStartPromise;
    } finally {
      _coldStartPromise = null;
    }
  }

  async function bootstrapOnEntryPage() {
    const result = await runColdStart({ source: 'entry_page' });
    if (result.ok) return result;
    if (result.code === 'ORCHESTRATOR_OFF') {
      window.__DEFER_SESSION_GATE_FOR_ENTRY__ = false;
      if (window.SessionGate && SessionGate.run) SessionGate.run();
    }
    return result;
  }

  window.AppEntryOrchestrator = {
    fetchEntryDecision: fetchEntryDecision,
    runColdStart: runColdStart,
    bootstrapOnEntryPage: bootstrapOnEntryPage,
    isActive: isActive,
    shouldUseOrchestrator: shouldUseOrchestrator,
    shouldDeferSessionGate: shouldDeferSessionGate,
    isDecisionApplied: isDecisionApplied,
    getAppliedDecision: getAppliedDecision,
    getAppliedViewContext: getAppliedViewContext,
    markDecisionApplied: markDecisionApplied,
    validateDecision: validateDecision,
  };
})();
