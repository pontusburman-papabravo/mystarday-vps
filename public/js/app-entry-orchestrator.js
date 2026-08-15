/**
 * app-entry-orchestrator.js — Fas 2B client executor (server is decision authority).
 * Fetches GET /api/auth/app-entry, applies serverAction, navigates once.
 */
(function () {
  'use strict';

  const DECISION_KEY = 'stjarndag_entry_decision_v1';
  const ACTIVE_FLAG_KEY = 'stjarndag_family_device_entry_v1';
  const DAILY_UX_KEY = 'stjarndag_family_device_daily_ux_v1';
  const ALLOWED_COUNT_KEY = 'stjarndag_entry_allowed_count';
  const APPLIED_KEY = 'stjarndag_entry_decision_applied';
  const NAV_GUARD_KEY = 'stjarndag_entry_nav_guard';
  const SERVER_ACTION_KEY = 'stjarndag_entry_server_action_done';

  let _coldStartPromise = null;

  function clearOrchestratorSessionState() {
    try {
      sessionStorage.removeItem(DECISION_KEY);
      sessionStorage.removeItem(APPLIED_KEY);
      sessionStorage.removeItem(NAV_GUARD_KEY);
      sessionStorage.removeItem(SERVER_ACTION_KEY);
      sessionStorage.setItem(ACTIVE_FLAG_KEY, '0');
    } catch (_) { /* ignore */ }
  }

  (function markDeferSessionGatePaths() {
    try {
      const p = (window.location.pathname || '').replace(/\/$/, '') || '/';
      if (p === '/login' || p === '/child-login' || p.indexOf('/child-login') === 0
        || p === '/child/profile-picker') {
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

  function storeEntryResponseMeta(body) {
    if (!body || typeof body !== 'object') return;
    if (window.ProfileSwitchChrome && typeof ProfileSwitchChrome.storeEntryMeta === 'function') {
      ProfileSwitchChrome.storeEntryMeta(body);
    }
    try {
      if (body.dailyUxActive === true) {
        sessionStorage.setItem(DAILY_UX_KEY, '1');
      } else {
        sessionStorage.removeItem(DAILY_UX_KEY);
      }
      if (Array.isArray(body.allowedChildren)) {
        sessionStorage.setItem(ALLOWED_COUNT_KEY, String(body.allowedChildren.length));
      }
      if (body.pinRequiredForParents === true) {
        sessionStorage.setItem('stjarndag_entry_pin_required_for_parents', '1');
      } else if (body.pinRequiredForParents === false) {
        sessionStorage.setItem('stjarndag_entry_pin_required_for_parents', '0');
      }
    } catch (_) { /* ignore */ }
  }

  function isDailyUxActive() {
    try {
      return sessionStorage.getItem(DAILY_UX_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function getAllowedChildCount() {
    try {
      const n = parseInt(sessionStorage.getItem(ALLOWED_COUNT_KEY), 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    } catch (_) {
      return null;
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
    const params = new URLSearchParams();
    if (intentChildId) {
      params.set('intent_child_id', intentChildId);
    }
    const url = '/api/auth/app-entry' + (params.toString() ? '?' + params.toString() : '');
    const res = await fetch(url, { credentials: 'include' });
    const body = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      return { ok: false, status: res.status, body: body };
    }
    setActiveFlag(body.orchestratorActive === true);
    storeEntryResponseMeta(body);
    if (body.orchestratorActive !== true) {
      clearOrchestratorSessionState();
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

    let doneKey = null;
    try {
      doneKey = SERVER_ACTION_KEY + ':' + action + ':' + (decision.childId || '');
      if (sessionStorage.getItem(doneKey) === '1') {
        return { ok: true, code: 'SERVER_ACTION_ALREADY_DONE' };
      }
    } catch (_) { /* ignore */ }

    function markActionDone() {
      if (!doneKey) return;
      try {
        sessionStorage.setItem(doneKey, '1');
      } catch (_) { /* ignore */ }
    }

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
        markActionDone();
        return { ok: true, picker: true, allowed: body.allowed_children };
      }
      const ok = res.ok && body.ok !== false;
      if (ok) markActionDone();
      return { ok: ok, body: body };
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
      const ok = res.ok && body.ok === true;
      if (ok) markActionDone();
      return { ok: ok, body: body };
    }

    if (action === 'restore-parent') {
      const res = await fetch('/api/auth/trusted-device/restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(function () { return {}; });
      if (body.ok && body.user && window.Auth && Auth.setAuth) {
        Auth.setAuth(body.user, null);
      }
      const ok = res.ok && body.ok === true;
      if (ok) markActionDone();
      return { ok: ok, body: body };
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
      if (!opts.forceReapply && isDecisionApplied()) {
        return {
          ok: true,
          code: 'ALREADY_APPLIED',
          decision: getAppliedDecision(),
        };
      }

      try {
        window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
      } catch (_) { /* ignore */ }

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
        if (!isDailyUxActive() && typeof window.showSharedDevicePicker === 'function') {
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

  /**
   * Trusted Family Device cold start — server app-entry is authoritative.
   * When orchestratorActive, never fall through to legacy child-login PIN.
   * @returns {Promise<{handled:boolean, code?:string, decision?:object}>}
   */
  async function redirectAuthoritativeEntryOrLegacy(options) {
    const opts = options || {};
    try {
      window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
    } catch (_) { /* ignore */ }

    const fetched = await fetchEntryDecision(opts.intentChildId || null);
    if (!fetched.ok) {
      return { handled: false, code: fetched.code || 'FETCH_FAILED' };
    }
    if (!fetched.orchestratorActive) {
      return { handled: false, code: 'ORCHESTRATOR_OFF' };
    }

    const decision = fetched.decision;
    const failClosedLogin =
      decision.destination === 'parent-login' &&
      (decision.failClosed === true || decision.reason === 'trusted_device_revoked');

    if (failClosedLogin || decision.destination === 'device-setup') {
      if (!opts.skipRedirect && decision.path) {
        markDecisionApplied(decision);
        navigateOnce(decision.path);
      }
      return { handled: true, code: decision.reason || decision.destination, decision: decision };
    }

    if (decision.destination === 'parent-login') {
      if (!opts.skipRedirect && decision.path) {
        markDecisionApplied(decision);
        navigateOnce(decision.path);
      }
      return { handled: true, code: 'PARENT_LOGIN', decision: decision };
    }

    const cold = await runColdStart({
      intentChildId: opts.intentChildId,
      skipRedirect: opts.skipRedirect,
      forceReapply: opts.forceReapply === true,
      source: opts.source || 'authoritative_entry',
    });

    if (cold.ok) {
      return { handled: true, code: cold.code || 'OK', decision: cold.decision || decision };
    }

    if (!opts.skipRedirect && decision.path) {
      markDecisionApplied(decision);
      navigateOnce(decision.path);
    }
    return { handled: true, code: cold.code || 'COLD_START_FAILED', decision: decision };
  }

  function shouldBlockLegacyChildPinFlow() {
    return isActive();
  }

  function legacyChildPinFallbackPath() {
    if (isDailyUxActive()) {
      return '/child/profile-picker';
    }
    return '/child-login?shared_device=1&entry_picker=1';
  }

  async function bootstrapOnEntryPage() {
    const result = await runColdStart({
      source: 'entry_page',
    });
    if (result.ok) return result;
    if (result.code === 'ORCHESTRATOR_OFF') {
      window.__DEFER_SESSION_GATE_FOR_ENTRY__ = false;
      if (window.SessionGate && SessionGate.run) SessionGate.run();
    }
    return result;
  }

  /**
   * After device role setup — re-fetch authoritative entry and navigate once.
   */
  async function applyAfterDeviceSetup() {
    clearOrchestratorSessionState();
    _coldStartPromise = null;
    try {
      sessionStorage.removeItem(NAV_GUARD_KEY);
    } catch (_) { /* ignore */ }
    return runColdStart({ source: 'device_setup_complete', forceReapply: true });
  }

  window.AppEntryOrchestrator = {
    fetchEntryDecision: fetchEntryDecision,
    runColdStart: runColdStart,
    redirectAuthoritativeEntryOrLegacy: redirectAuthoritativeEntryOrLegacy,
    bootstrapOnEntryPage: bootstrapOnEntryPage,
    applyAfterDeviceSetup: applyAfterDeviceSetup,
    isActive: isActive,
    shouldUseOrchestrator: shouldUseOrchestrator,
    shouldBlockLegacyChildPinFlow: shouldBlockLegacyChildPinFlow,
    shouldDeferSessionGate: shouldDeferSessionGate,
    isDecisionApplied: isDecisionApplied,
    getAppliedDecision: getAppliedDecision,
    getAppliedViewContext: getAppliedViewContext,
    markDecisionApplied: markDecisionApplied,
    validateDecision: validateDecision,
    isDailyUxActive: isDailyUxActive,
    getAllowedChildCount: getAllowedChildCount,
    legacyChildPinFallbackPath: legacyChildPinFallbackPath,
    clearOrchestratorSessionState: clearOrchestratorSessionState,
  };
})();
