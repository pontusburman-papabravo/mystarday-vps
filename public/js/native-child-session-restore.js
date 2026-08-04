/**
 * native-child-session-restore.js — Capacitor child-first cold launch session bootstrap.
 * Server-verified child session only; shared promise lock; loop-safe redirects.
 */
(function () {
  'use strict';

  const LOOP_GUARD_KEY = 'native_child_restore_hops';
  const LOOP_GUARD_MAX = 2;
  const AUTH_MODE = {
    PARENT: 'parent',
    CHILD: 'child',
    TRANSITIONING: 'transitioning',
    UNKNOWN: 'unknown',
  };

  let _activeMode = AUTH_MODE.UNKNOWN;
  let _bootstrapPromise = null;

  function isNativeClient() {
    if (document.documentElement.classList.contains('is-native-android')) return true;
    if (document.documentElement.classList.contains('platform-native')) return true;
    if (typeof window.Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) {
      return true;
    }
    return false;
  }

  function isChildRoute() {
    const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    return path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0;
  }

  function shouldRunNativeChildBootstrap() {
    if (!isNativeClient()) return false;
    if (!window.DeviceMode || !DeviceMode.isChildMode()) return false;
    return isChildRoute();
  }

  function readLoopHops() {
    try {
      const n = parseInt(sessionStorage.getItem(LOOP_GUARD_KEY) || '0', 10);
      return Number.isFinite(n) ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  function bumpLoopHops() {
    try {
      sessionStorage.setItem(LOOP_GUARD_KEY, String(readLoopHops() + 1));
    } catch (_) { /* ignore */ }
  }

  function clearLoopHops() {
    try {
      sessionStorage.removeItem(LOOP_GUARD_KEY);
    } catch (_) { /* ignore */ }
  }

  function childLoginFallbackUrl() {
    if (shouldRunNativeChildBootstrap() && readLoopHops() >= LOOP_GUARD_MAX) {
      return '/child-login?picker=1';
    }
    return '/child-login';
  }

  function setMode(mode) {
    _activeMode = mode;
  }

  function getMode() {
    return _activeMode;
  }

  async function fetchAuthMe() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return { ok: false, status: res.status, me: null };
    const me = await res.json();
    return { ok: true, status: res.status, me: me };
  }

  async function tryRefreshSession() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  function verifyFamilyScope(me) {
    if (!me || me.type !== 'child') return true;
    try {
      const deviceFamilyId = localStorage.getItem('stjarndag_device_family_id');
      const sessionFamily = me.familyId || me.family_id;
      if (deviceFamilyId && sessionFamily && deviceFamilyId !== sessionFamily) {
        return false;
      }
    } catch (_) { /* ignore */ }
    return true;
  }

  /**
   * Verify child session for native child-device cold launch.
   * @returns {Promise<{ ok: boolean, me?: object, code?: string }>}
   */
  async function bootstrapNativeChildSession(opts) {
    const options = opts || {};
    if (!shouldRunNativeChildBootstrap() && !options.force) {
      return { ok: false, code: 'NOT_APPLICABLE' };
    }

    if (_bootstrapPromise) return _bootstrapPromise;

    setMode(AUTH_MODE.TRANSITIONING);
    _bootstrapPromise = (async function () {
      let meResult = await fetchAuthMe();

      if (
        meResult.ok
        && meResult.me
        && meResult.me.type === 'parent'
        && shouldRunNativeChildBootstrap()
      ) {
        await tryRefreshSession();
        meResult = await fetchAuthMe();
      }

      if (!meResult.ok || !meResult.me) {
        setMode(AUTH_MODE.UNKNOWN);
        return { ok: false, code: 'ME_FAILED', status: meResult.status };
      }

      const me = meResult.me;
      if (me.type !== 'child') {
        setMode(AUTH_MODE.PARENT);
        return { ok: false, code: 'NOT_CHILD', me: me };
      }

      if (!verifyFamilyScope(me)) {
        if (window.Auth && typeof Auth.clearAuth === 'function') {
          Auth.clearAuth();
        }
        setMode(AUTH_MODE.UNKNOWN);
        return { ok: false, code: 'FAMILY_MISMATCH' };
      }

      if (window.Auth && typeof Auth.setAuth === 'function') {
        Auth.setAuth(null, me);
      }
      if (window.DeviceMode && typeof DeviceMode.enterChild === 'function') {
        DeviceMode.enterChild();
      }
      clearLoopHops();
      setMode(AUTH_MODE.CHILD);
      return { ok: true, me: me };
    })();

    try {
      return await _bootstrapPromise;
    } finally {
      _bootstrapPromise = null;
      if (_activeMode === AUTH_MODE.TRANSITIONING) {
        setMode(AUTH_MODE.UNKNOWN);
      }
    }
  }

  /**
   * Resume barnvy when server confirms child session (native child device only).
   */
  async function resumeActiveChildSessionIfPresent(opts) {
    const options = opts || {};
    if (options.forcePicker || options.resumeAddChild) return false;

    if (!shouldRunNativeChildBootstrap()) {
      return resumeLegacyChildSession(options);
    }

    const result = await bootstrapNativeChildSession();
    if (!result.ok) return false;

    bumpLoopHops();
    window.location.replace('/child/today');
    return true;
  }

  async function resumeLegacyChildSession() {
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) return false;
      const me = await meRes.json();
      if (!me || me.type !== 'child') return false;
      if (!verifyFamilyScope(me)) {
        if (window.Auth && typeof Auth.clearAuth === 'function') Auth.clearAuth();
        return false;
      }
      if (window.DeviceMode && typeof DeviceMode.enterChild === 'function') {
        DeviceMode.enterChild();
      }
      window.location.replace('/child/today');
      return true;
    } catch (_) {
      return false;
    }
  }

  window.NativeChildSessionRestore = {
    AUTH_MODE: AUTH_MODE,
    isNativeClient: isNativeClient,
    shouldRunNativeChildBootstrap: shouldRunNativeChildBootstrap,
    bootstrapNativeChildSession: bootstrapNativeChildSession,
    resumeActiveChildSessionIfPresent: resumeActiveChildSessionIfPresent,
    childLoginFallbackUrl: childLoginFallbackUrl,
    clearLoopHops: clearLoopHops,
    bumpLoopHops: bumpLoopHops,
    getMode: getMode,
  };
})();
