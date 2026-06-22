/**
 * Apple Sign In diagnostics — visible errors + step logging for App Review debugging.
 * Steps 1–5: login.html. Steps 6–8: post-login redirect/session trace (auth.js, dashboard.js).
 */
(function () {
  'use strict';

  var TRACE_KEY = 'apple_login_trace';

  function isParentLoginVisible() {
    var section = document.getElementById('parent-login-section');
    if (!section) return false;
    var display = section.style.display || window.getComputedStyle(section).display;
    return display === 'flex';
  }

  function sessionSnapshot() {
    var snap = { path: typeof location !== 'undefined' ? location.pathname : '' };
    if (typeof Auth !== 'undefined') {
      snap.hasUser = !!Auth.getUser();
      snap.isLoggedIn = !!Auth.isLoggedIn();
      var u = Auth.getUser();
      if (u) {
        snap.userType = u.type;
        snap.onboarding_completed = u.onboarding_completed;
      }
      if (typeof Auth.getCsrfToken === 'function') {
        snap.hasCsrf = !!Auth.getCsrfToken();
      }
    }
    snap.hasAccessCookie = typeof document !== 'undefined' && document.cookie.indexOf('access_token') !== -1;
    // access_token is httpOnly — document.cookie is always false; cookies still sent via credentials:include
    snap.accessTokenHttpOnly = true;
    return snap;
  }

  function appleLog(step, detail) {
    var payload = {
      channel: 'apple_sign_in',
      step: step,
      detail: detail || null,
      ts: Date.now(),
    };
    if (typeof Platform !== 'undefined') {
      payload.native = !!(Platform.isNative && Platform.isNative());
      payload.ios = !!(Platform.isIOS && Platform.isIOS());
      payload.applePlugin = !!(Platform.appleSignIn && Platform.appleSignIn.isAvailable && Platform.appleSignIn.isAvailable());
    }
    console.log('[APPLE]', step, detail || '');
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch { /* ignore */ }
  }

  function startPostLoginTrace() {
    try { sessionStorage.setItem(TRACE_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  function endPostLoginTrace() {
    try { sessionStorage.removeItem(TRACE_KEY); } catch { /* ignore */ }
  }

  function isPostLoginTraceActive() {
    try { return !!sessionStorage.getItem(TRACE_KEY); } catch { return false; }
  }

  /** Steps 6–8 — only emitted after a successful Apple login in this session. */
  function logPost(step, detail) {
    if (!isPostLoginTraceActive()) return;
    var merged = detail ? Object.assign({}, detail) : {};
    merged.session = sessionSnapshot();
    appleLog(step, merged);
  }

  function traceLoginBounce(reason, extra) {
    if (!isPostLoginTraceActive()) return;
    var detail = extra ? Object.assign({ reason: reason }, extra) : { reason: reason };
    logPost('step_9_auth_guard_redirect', detail);
    endPostLoginTrace();
  }

  function hideAllAppleErrors() {
    ['roleAppleError', 'appleLoginError'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
  }

  function showVisibleAppleError(msg) {
    var targetIds = isParentLoginVisible() ? ['appleLoginError'] : ['roleAppleError'];
    hideAllAppleErrors();
    targetIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = msg;
        el.style.display = '';
      }
    });
  }

  function hideAppleLinkingPrompts() {
    ['appleLinkingPrompt', 'roleAppleLinkingPrompt'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function showAppleLinkingPrompt() {
    hideAppleLinkingPrompts();
    var id = isParentLoginVisible() ? 'appleLinkingPrompt' : 'roleAppleLinkingPrompt';
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function getActiveAppleButton(clickedBtn) {
    if (clickedBtn) return clickedBtn;
    return isParentLoginVisible()
      ? document.getElementById('appleLoginBtn')
      : document.getElementById('roleAppleBtn');
  }

  window.AppleSignInDiagnostics = {
    log: appleLog,
    logPost: logPost,
    sessionSnapshot: sessionSnapshot,
    startPostLoginTrace: startPostLoginTrace,
    endPostLoginTrace: endPostLoginTrace,
    isPostLoginTraceActive: isPostLoginTraceActive,
    traceLoginBounce: traceLoginBounce,
    showError: showVisibleAppleError,
    hideErrors: hideAllAppleErrors,
    showLinkingPrompt: showAppleLinkingPrompt,
    hideLinkingPrompts: hideAppleLinkingPrompts,
    isParentLoginVisible: isParentLoginVisible,
    getActiveAppleButton: getActiveAppleButton,
  };
})();
