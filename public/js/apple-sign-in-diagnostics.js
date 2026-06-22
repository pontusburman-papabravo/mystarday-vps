/**
 * Apple Sign In diagnostics — visible errors + step logging for App Review debugging.
 * Used by login.html (and optionally register.html).
 */
(function () {
  'use strict';

  function isParentLoginVisible() {
    var section = document.getElementById('parent-login-section');
    if (!section) return false;
    var display = section.style.display || window.getComputedStyle(section).display;
    return display === 'flex';
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

  function hideAllAppleErrors() {
    ['roleAppleError', 'appleLoginError'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
  }

  /** Show error in the visible Apple UI context (role-selection or parent form). */
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
    showError: showVisibleAppleError,
    hideErrors: hideAllAppleErrors,
    showLinkingPrompt: showAppleLinkingPrompt,
    hideLinkingPrompts: hideAppleLinkingPrompts,
    isParentLoginVisible: isParentLoginVisible,
    getActiveAppleButton: getActiveAppleButton,
  };
})();
