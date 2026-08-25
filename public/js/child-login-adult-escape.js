/**
 * child-login-adult-escape.js — rollback-safety escape on legacy /child-login.
 *
 * When Family Device is OFF, an already-enrolled device cold-starts into legacy
 * /child-login. That page must never be a dead-end for an adult: it needs a
 * discreet-but-reachable "Logga in som vuxen" control on every step (child-profile
 * step, PIN step, and single-child direct-PIN mode).
 *
 * SECURITY: the control performs NO authorization itself. It does not set Parent
 * Auth, does not set parent DeviceMode, and does not navigate to the dashboard.
 * It clears the child session and routes to explicit adult login via the existing
 * Auth.redirectToParentBackupLogin('/dashboard'); adult authentication is still
 * required before any parent view.
 */
(function () {
  'use strict';

  const ADULT_LOGIN_NEXT = '/dashboard';

  /**
   * @returns {boolean} true when the canonical escape (child-session clearing +
   *   explicit adult login) was invoked.
   */
  function goAdultLogin() {
    const auth = window.Auth;
    if (auth && typeof auth.redirectToParentBackupLogin === 'function') {
      auth.redirectToParentBackupLogin(ADULT_LOGIN_NEXT);
      return true;
    }
    // Defensive fallback only if Auth is unavailable: navigate to the EXISTING
    // adult login route. This sets no parent auth/DeviceMode and never opens the
    // dashboard — adult authentication is still required.
    if (window.location) {
      window.location.href = '/login?parent=1&next=' + encodeURIComponent(ADULT_LOGIN_NEXT);
    }
    return false;
  }

  function init() {
    const btn = document.getElementById('clAdultEscapeBtn');
    if (!btn || btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', function (e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      goAdultLogin();
    });
  }

  window.ChildLoginAdultEscape = { init: init, goAdultLogin: goAdultLogin };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
