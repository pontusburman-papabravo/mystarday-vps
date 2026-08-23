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
  const EXPLICIT_PARENT_RESUME_KEY = 'stjarndag_explicit_parent_resume_v1';
  const NAV_GUARD_KEY = 'stjarndag_entry_nav_guard';
  const SERVER_ACTION_KEY = 'stjarndag_entry_server_action_done';

  const EXPLICIT_PARENT_RESUME_REASON = 'profile_picker_parent_resume';
  const EXPLICIT_PARENT_PENDING_TTL_MS = 60 * 1000;
  const EXPLICIT_PARENT_VERIFIED_FALLBACK_TTL_MS = 30 * 60 * 1000;

  let _coldStartPromise = null;

  function clearOrchestratorSessionState() {
    try {
      sessionStorage.removeItem(DECISION_KEY);
      sessionStorage.removeItem(APPLIED_KEY);
      sessionStorage.removeItem(EXPLICIT_PARENT_RESUME_KEY);
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

  function isExplicitParentResumeDecision(decision) {
    if (!decision || typeof decision !== 'object') return false;
    if (decision.explicitParentResume === true) return true;
    return decision.destination === 'parent-home'
      && decision.viewContext === 'parent'
      && decision.reason === EXPLICIT_PARENT_RESUME_REASON;
  }

  function readExplicitParentResumeMarker() {
    const raw = readJson(EXPLICIT_PARENT_RESUME_KEY);
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  }

  function writeExplicitParentResumeMarker(marker) {
    writeJson(EXPLICIT_PARENT_RESUME_KEY, marker);
  }

  function clearExplicitParentResumeMarker() {
    try {
      sessionStorage.removeItem(EXPLICIT_PARENT_RESUME_KEY);
    } catch (_) { /* ignore */ }
  }

  function isExplicitParentResumeMarkerExpired(marker) {
    if (!marker || !marker.expiresAt) return false;
    return Date.now() > marker.expiresAt;
  }

  function rejectExplicitParentResume() {
    clearExplicitParentResumeMarker();
    const decision = getAppliedDecision();
    if (decision && isExplicitParentResumeDecision(decision)) {
      try {
        sessionStorage.removeItem(DECISION_KEY);
        sessionStorage.removeItem(APPLIED_KEY);
      } catch (_) { /* ignore */ }
    }
  }

  function beginExplicitParentResume(redirectPath) {
    const now = Date.now();
    writeExplicitParentResumeMarker({
      status: 'pending',
      at: now,
      expiresAt: now + EXPLICIT_PARENT_PENDING_TTL_MS,
      path: redirectPath || '/dashboard',
    });
    try {
      window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
    } catch (_) { /* ignore */ }
  }

  function markExplicitParentResumeVerified(path, leaseUntil) {
    const now = Date.now();
    let expiresAt = now + EXPLICIT_PARENT_VERIFIED_FALLBACK_TTL_MS;
    if (leaseUntil) {
      const parsed = Date.parse(leaseUntil);
      if (Number.isFinite(parsed) && parsed > now) {
        expiresAt = parsed;
      }
    }
    writeExplicitParentResumeMarker({
      status: 'verified',
      at: now,
      expiresAt: expiresAt,
      path: path || '/dashboard',
    });
    setActiveFlag(true);
  }

  function isExplicitParentResumePending() {
    const marker = readExplicitParentResumeMarker();
    if (!marker || marker.status !== 'pending') return false;
    if (isExplicitParentResumeMarkerExpired(marker)) {
      rejectExplicitParentResume();
      return false;
    }
    return true;
  }

  function isExplicitParentResumeVerified() {
    const marker = readExplicitParentResumeMarker();
    if (!marker || marker.status !== 'verified') return false;
    if (isExplicitParentResumeMarkerExpired(marker)) {
      rejectExplicitParentResume();
      return false;
    }
    const decision = getAppliedDecision();
    return !!(decision && isExplicitParentResumeDecision(decision));
  }

  function buildExplicitParentResumeDecision(redirectPath) {
    return {
      destination: 'parent-home',
      viewContext: 'parent',
      credentialContext: 'parent',
      deviceMode: 'shared',
      childId: null,
      reason: EXPLICIT_PARENT_RESUME_REASON,
      explicitParentResume: true,
      path: redirectPath || '/dashboard',
    };
  }

  /** Verified explicit parent resume only — never true from marker alone. */
  function isExplicitParentResumeActive() {
    return isExplicitParentResumeVerified();
  }

  function beginExplicitParentResumeTransition(redirectPath) {
    beginExplicitParentResume(redirectPath);
    return buildExplicitParentResumeDecision(redirectPath);
  }

  /** @deprecated Use beginExplicitParentResumeTransition — picker sets pending only. */
  function commitExplicitParentResume(redirectPath) {
    return beginExplicitParentResumeTransition(redirectPath);
  }

  async function verifyExplicitParentResumeAuthority() {
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) {
        return { ok: false, code: 'ME_FAILED', status: meRes.status };
      }
      const me = await meRes.json().catch(function () { return {}; });
      if (!me || me.type !== 'parent') {
        return { ok: false, code: 'NOT_PARENT' };
      }

      const statusRes = await fetch('/api/family/adult-privilege/status', { credentials: 'include' });
      if (!statusRes.ok) {
        return { ok: false, code: 'STATUS_FAILED', status: statusRes.status };
      }
      const status = await statusRes.json().catch(function () { return {}; });
      if (!status.ok) {
        return { ok: false, code: status.code || 'STATUS_NOT_OK' };
      }
      if (!(status.privilegeActive === true || status.state === 'active')) {
        return { ok: false, code: 'PRIVILEGE_INACTIVE' };
      }
      return {
        ok: true,
        leaseUntil: status.privilegeLeaseUntil || status.expiresAt || null,
      };
    } catch (_) {
      return { ok: false, code: 'NETWORK' };
    }
  }

  async function resolveExplicitParentResumeIfNeeded() {
    const marker = readExplicitParentResumeMarker();
    if (!marker) return null;

    if (isExplicitParentResumeMarkerExpired(marker)) {
      rejectExplicitParentResume();
      return { rejected: true, code: 'MARKER_EXPIRED' };
    }

    if (marker.status === 'verified' && isExplicitParentResumeVerified()) {
      return {
        ok: true,
        code: 'EXPLICIT_PARENT_RESUME',
        decision: getAppliedDecision(),
      };
    }

    if (marker.status !== 'pending') {
      rejectExplicitParentResume();
      return { rejected: true, code: 'MARKER_INVALID' };
    }

    const verified = await verifyExplicitParentResumeAuthority();
    if (!verified.ok) {
      rejectExplicitParentResume();
      return { rejected: true, code: verified.code || 'VERIFY_FAILED' };
    }

    markExplicitParentResumeVerified(marker.path, verified.leaseUntil);
    const decision = buildExplicitParentResumeDecision(marker.path);
    markDecisionApplied(decision);
    return {
      ok: true,
      code: 'EXPLICIT_PARENT_RESUME',
      decision: decision,
    };
  }

  function markDecisionApplied(decision) {
    writeJson(DECISION_KEY, decision);
    try {
      sessionStorage.setItem(APPLIED_KEY, '1');
    } catch (_) { /* ignore */ }
    if (decision && decision.destination !== 'parent-home' && !isExplicitParentResumeDecision(decision)) {
      rejectExplicitParentResume();
    }
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
    if (isExplicitParentResumePending()) return true;
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

  function resolveAlreadyAppliedColdStart() {
    if (isDecisionApplied()) {
      return {
        ok: true,
        code: 'ALREADY_APPLIED',
        decision: getAppliedDecision(),
      };
    }
    return null;
  }

  async function runColdStart(options) {
    const opts = options || {};
    if (_coldStartPromise) return _coldStartPromise;

    _coldStartPromise = (async function () {
      if (!opts.forceReapply) {
        const explicit = await resolveExplicitParentResumeIfNeeded();
        if (explicit && explicit.ok) {
          return explicit;
        }
        const applied = resolveAlreadyAppliedColdStart();
        if (applied) return applied;
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
    beginExplicitParentResume: beginExplicitParentResume,
    beginExplicitParentResumeTransition: beginExplicitParentResumeTransition,
    commitExplicitParentResume: commitExplicitParentResume,
    isExplicitParentResumeActive: isExplicitParentResumeActive,
    isExplicitParentResumePending: isExplicitParentResumePending,
    rejectExplicitParentResume: rejectExplicitParentResume,
    verifyExplicitParentResumeAuthority: verifyExplicitParentResumeAuthority,
    resolveExplicitParentResumeIfNeeded: resolveExplicitParentResumeIfNeeded,
    validateDecision: validateDecision,
    isDailyUxActive: isDailyUxActive,
    getAllowedChildCount: getAllowedChildCount,
    legacyChildPinFallbackPath: legacyChildPinFallbackPath,
    clearOrchestratorSessionState: clearOrchestratorSessionState,
  };
})();
