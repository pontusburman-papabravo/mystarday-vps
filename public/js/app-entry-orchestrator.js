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

  let _coldStartPromise = null;
  let _entryFetchPromise = null;
  let _loginResumePromise = null;

  /** Diagnostics-only (P1): no PIN/token/cookie values, ever. */
  function diag(stage, detail) {
    if (window.TrustedSelectParentDiag && typeof window.TrustedSelectParentDiag.logStage === 'function') {
      window.TrustedSelectParentDiag.logStage(stage, detail);
    }
  }

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
        || p === '/open/child' || p.indexOf('/open/child') === 0
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

  /**
   * Normalize authoritative lease timestamps from server contract.
   * - finite Number => epoch ms
   * - numeric string => Number(value)
   * - ISO/date string => Date.parse(value)
   * - invalid/missing => null (never Date.parse(number))
   */
  function normalizeTimestampMs(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
      }
      const parsed = Date.parse(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
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

  /** @returns {boolean} false when no valid future authoritative lease — fail closed */
  function markExplicitParentResumeVerified(path, leaseUntil) {
    const now = Date.now();
    const expiresAt = normalizeTimestampMs(leaseUntil);
    if (expiresAt == null || expiresAt <= now) {
      return false;
    }
    writeExplicitParentResumeMarker({
      status: 'verified',
      at: now,
      expiresAt: expiresAt,
      path: path || '/dashboard',
    });
    setActiveFlag(true);
    return true;
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

  /**
   * Atomic child→adult handoff: the picker has already server-verified the exact
   * selected parent (trusted-device/select-parent + /api/auth/me id match) and holds
   * the authoritative lease from that response. Commit the resume as *verified* and
   * pre-apply the parent-home decision so the destination page does NOT re-run the
   * /me + /status verification race that otherwise bounces back to the picker.
   * @returns {boolean} true when a valid future lease produced a verified resume.
   */
  function commitVerifiedParentResume(redirectPath, leaseUntil) {
    const target = redirectPath || '/dashboard';
    diag('orch:commit_start', { target: target, leaseUntil: leaseUntil || null, now: Date.now() });
    // Fail closed: validate the authoritative lease BEFORE writing any marker.
    // markExplicitParentResumeVerified() returns false without writing when the
    // lease is missing/expired/malformed, so the atomic path NEVER leaves a
    // dangling `pending` marker (or any applied parent decision) behind.
    if (!markExplicitParentResumeVerified(target, leaseUntil)) {
      diag('orch:commit_lease_rejected', { target: target, leaseUntil: leaseUntil || null, now: Date.now() });
      rejectExplicitParentResume();
      return false;
    }
    const deviceModeBefore = window.DeviceMode && typeof DeviceMode.isChildMode === 'function' ? DeviceMode.isChildMode() : null;
    diag('orch:devicemode_before', { isChildMode: deviceModeBefore });
    markDecisionApplied(buildExplicitParentResumeDecision(target));
    const deviceModeAfter = window.DeviceMode && typeof DeviceMode.isChildMode === 'function' ? DeviceMode.isChildMode() : null;
    diag('orch:devicemode_after', { isChildMode: deviceModeAfter });
    diag('orch:commit_applied', { target: target });
    return true;
  }

  /** @deprecated Use beginExplicitParentResumeTransition — picker sets pending only. */
  function commitExplicitParentResume(redirectPath) {
    return beginExplicitParentResumeTransition(redirectPath);
  }

  async function verifyExplicitParentResumeAuthority() {
    try {
      diag('destination:me_start', {});
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) {
        diag('destination:me_end', { ok: false, status: meRes.status });
        return { ok: false, code: 'ME_FAILED', status: meRes.status };
      }
      const me = await meRes.json().catch(function () { return {}; });
      diag('destination:me_end', { ok: true, type: (me && me.type) || null, returnedId: (me && me.id) || null });
      if (!me || me.type !== 'parent') {
        return { ok: false, code: 'NOT_PARENT' };
      }

      diag('destination:status_start', {});
      const statusRes = await fetch('/api/family/adult-privilege/status', { credentials: 'include' });
      if (!statusRes.ok) {
        diag('destination:status_end', { ok: false, status: statusRes.status });
        return { ok: false, code: 'STATUS_FAILED', status: statusRes.status };
      }
      const status = await statusRes.json().catch(function () { return {}; });
      diag('destination:status_end', {
        ok: status.ok, privilegeActive: status.privilegeActive, state: status.state,
      });
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
      diag('destination:verify_authority_exception', {});
      return { ok: false, code: 'NETWORK' };
    }
  }

  async function resolveExplicitParentResumeIfNeeded() {
    const marker = readExplicitParentResumeMarker();
    diag('destination:resume_marker_state', {
      present: !!marker, status: marker && marker.status, expiresAt: (marker && marker.expiresAt) || null,
    });
    if (!marker) return null;

    if (isExplicitParentResumeMarkerExpired(marker)) {
      diag('destination:marker_expired', { expiresAt: marker.expiresAt, now: Date.now() });
      rejectExplicitParentResume();
      return { rejected: true, code: 'MARKER_EXPIRED' };
    }

    if (marker.status === 'verified' && isExplicitParentResumeVerified()) {
      diag('destination:resume_reused', { path: marker.path });
      return {
        ok: true,
        code: 'EXPLICIT_PARENT_RESUME',
        decision: getAppliedDecision(),
      };
    }

    if (marker.status !== 'pending') {
      diag('destination:resume_rejected', { code: 'MARKER_INVALID', status: marker.status });
      rejectExplicitParentResume();
      return { rejected: true, code: 'MARKER_INVALID' };
    }

    diag('destination:verify_authority_start', { path: marker.path });
    const verified = await verifyExplicitParentResumeAuthority();
    diag('destination:verify_authority_result', {
      ok: verified.ok, code: verified.code || null, leaseUntil: verified.leaseUntil || null,
    });
    if (!verified.ok) {
      diag('destination:resume_rejected', { code: verified.code || 'VERIFY_FAILED' });
      rejectExplicitParentResume();
      return { rejected: true, code: verified.code || 'VERIFY_FAILED' };
    }

    if (!markExplicitParentResumeVerified(marker.path, verified.leaseUntil)) {
      diag('destination:resume_rejected', { code: 'LEASE_INVALID', leaseUntil: verified.leaseUntil || null });
      rejectExplicitParentResume();
      return { rejected: true, code: 'LEASE_INVALID' };
    }
    const decision = buildExplicitParentResumeDecision(marker.path);
    markDecisionApplied(decision);
    diag('destination:resume_verified', { path: marker.path });
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
    const cacheKey = intentChildId || '';
    if (_entryFetchPromise && _entryFetchPromise.key === cacheKey) {
      return _entryFetchPromise.promise;
    }
    const promise = (async function () {
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
    })().finally(function () {
      if (_entryFetchPromise && _entryFetchPromise.key === cacheKey) {
        _entryFetchPromise = null;
      }
    });
    _entryFetchPromise = { key: cacheKey, promise: promise };
    return promise;
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

  /**
   * Native shell only. Web visitors on / must stay on the marketing page.
   * Missing classList (tests, incomplete document) is not native.
   */
  function isNativeShell() {
    try {
      if (typeof Capacitor !== 'undefined' && Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
        return true;
      }
    } catch (_) { /* ignore */ }
    try {
      if (window.Platform && typeof Platform.isNative === 'function' && Platform.isNative()) return true;
    } catch (_) { /* ignore */ }
    const el = document && document.documentElement;
    const list = el && el.classList;
    if (!list || typeof list.contains !== 'function') return false;
    return list.contains('is-native')
      || list.contains('is-native-android')
      || list.contains('is-native-ios')
      || list.contains('platform-native')
      || list.contains('platform-ios')
      || list.contains('platform-android');
  }

  /**
   * Safe no-session parent-login. Does not cover revoked devices or any
   * destination that needs a trusted-device server action.
   */
  function isLoggedOutNativeParentLogin(decision) {
    return !!(
      decision
      && decision.applyWhenOrchestratorOff === true
      && decision.destination === 'parent-login'
      && decision.reason === 'no_family_or_device_auth'
      && decision.failClosed !== true
    );
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
      diag('destination:cold_start_begin', {
        path: window.location.pathname, source: opts.source || null, forceReapply: !!opts.forceReapply,
      });
      if (!opts.forceReapply) {
        const explicit = await resolveExplicitParentResumeIfNeeded();
        if (explicit && explicit.ok) {
          diag('destination:cold_start_resume_used', { code: explicit.code });
          return explicit;
        }
        const applied = resolveAlreadyAppliedColdStart();
        if (applied) return applied;
      }

      try {
        window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
      } catch (_) { /* ignore */ }

      // Any /api/auth/app-entry call reaching this point happened AFTER the
      // explicit-parent-resume short-circuit above did not apply (missing/rejected/
      // expired marker) — exactly the "app-entry call after PIN" symptom under review.
      diag('destination:app_entry_refetch', { path: window.location.pathname, source: opts.source || null });
      const fetched = await fetchEntryDecision(opts.intentChildId || null);
      if (!fetched.ok) {
        return { ok: false, code: fetched.code || 'FETCH_FAILED' };
      }
      if (!fetched.orchestratorActive) {
        const offDecision = fetched.body && fetched.body.decision;
        // family_device_entry_v1 stays off. Only the logged-out native
        // parent-login decision is applied, and no trusted-device action runs.
        if (isNativeShell() && isLoggedOutNativeParentLogin(offDecision)) {
          // Stale local child-mode must not let SessionGate overwrite this hop
          // with /child-login. There is no server family or trusted device.
          try {
            if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
              DeviceMode.enterParent();
            }
          } catch (_) { /* ignore */ }
          if (!opts.skipRedirect) {
            navigateOnce('/login?entry=native_first_run&src=cold_start');
          }
          return { ok: true, code: 'LOGGED_OUT_NATIVE_ENTRY', decision: offDecision };
        }
        return { ok: false, code: 'ORCHESTRATOR_OFF' };
      }

      const decision = fetched.decision;
      if (decision.destination === 'profile-picker') {
        diag('destination:redirect_to_picker', { path: decision.path, reason: decision.reason || null });
      }
      const actionResult = await executeServerAction(decision);
      if (!actionResult.ok) {
        return { ok: false, code: 'SERVER_ACTION_FAILED', decision: decision };
      }

      markDecisionApplied(decision);
      diag('destination:decision_applied', { destination: decision.destination, path: decision.path });

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
   * /login cold start. One GET /api/auth/app-entry, then at most one navigation.
   * Does not location.reload and does not send the user back to /login.
   * 53a8b2e0: the crash loop was an unconditional /login → /dashboard href that
   * reloaded parent-magic 3D CSS, killed the WebView, and lost the sessionStorage
   * nav guard. Resume uses navigateOnce onto a shell whose GPU CSS is stripped.
   * @returns {Promise<{resumed:boolean, code?:string, decision?:object}>}
   */
  async function resumeFromLogin() {
    if (_loginResumePromise) return _loginResumePromise;
    _loginResumePromise = (async function () {
      const fetched = await fetchEntryDecision(null);
      if (!fetched.ok) {
        return { resumed: false, code: fetched.code || 'FETCH_FAILED' };
      }
      const decision = fetched.decision || (fetched.body && fetched.body.decision) || null;
      if (!decision || !decision.destination || !decision.path) {
        return { resumed: false, code: 'NO_DECISION' };
      }
      if (decision.destination === 'parent-login') {
        return { resumed: false, code: 'NO_RESUMABLE_STATE', decision: decision };
      }
      if (fetched.orchestratorActive === true) {
        const cold = await runColdStart({ source: 'login_resume' });
        const dest = cold && cold.decision && cold.decision.destination;
        if (cold && cold.ok && dest && dest !== 'parent-login') {
          return { resumed: true, code: cold.code || 'ORCHESTRATOR', decision: cold.decision };
        }
        return {
          resumed: false,
          code: (cold && cold.code) || 'ORCHESTRATOR_DECLINED',
          decision: (cold && cold.decision) || decision,
        };
      }
      // Flags off: follow a legacy JWT decision. Do not call trusted restore APIs.
      if ((decision.serverAction || 'none') !== 'none') {
        return { resumed: false, code: 'ORCHESTRATOR_REQUIRED', decision: decision };
      }
      // DeviceMode never grants parent authority. This is only a veto of
      // automatic parent resume. Explicit adult flow remains. Fail closed when
      // a parent cookie and child device state are out of sync: the server has
      // no trusted-device row, so a legacy parent JWT would otherwise open
      // /dashboard while the client is still in child mode.
      const legacyParentOnChildHint =
        decision.destination === 'parent-home'
        && decision.reason === 'legacy_parent_session_no_trusted_device'
        && window.DeviceMode
        && typeof DeviceMode.isChildMode === 'function'
        && DeviceMode.isChildMode();
      if (legacyParentOnChildHint) {
        return {
          resumed: false,
          code: 'LEGACY_PARENT_CHILD_HINT_CONFLICT',
          decision: decision,
        };
      }
      navigateOnce(decision.path);
      return { resumed: true, code: 'LEGACY_RESUME', decision: decision };
    })();
    try {
      return await _loginResumePromise;
    } finally {
      _loginResumePromise = null;
    }
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
    resumeFromLogin: resumeFromLogin,
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
    commitVerifiedParentResume: commitVerifiedParentResume,
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
