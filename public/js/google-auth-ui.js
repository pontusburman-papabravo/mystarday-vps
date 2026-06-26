/**
 * google-auth-ui.js — Sprint 18: Google Sign In on login/register (Android native).
 */
(function () {
  'use strict';

  function afterAuthSuccess(data) {
    if (!data || !data.user) return;
    Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
    if (data.user.onboarding_completed === false) {
      window.location.href = '/onboarding';
    } else {
      Auth.redirectToDashboard();
    }
  }

  async function handleGoogleLogin(opts) {
    if (!window.Platform || !Platform.googleSignIn) return;
    opts = opts || {};
    const errEl = opts.errorEl || document.getElementById('googleLoginError') || document.getElementById('googleRegisterError');
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
      if (errEl.classList) errEl.classList.add('hidden');
    }

    const btn = opts.buttonEl || document.getElementById('googleLoginBtn') || document.getElementById('googleRegisterBtn');
    const orig = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Google…'; }
    if (window.AppEntry && typeof AppEntry.trackAuthMethod === 'function') {
      AppEntry.trackAuthMethod('google');
    }

    try {
      const result = await Platform.googleSignIn.signIn();
      if (!result || !result.idToken) return;

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: result.idToken }),
      });
      const data = await res.json().catch(function () { return {}; });

      if (res.ok && data.user) {
        if (window.AppEntry && typeof AppEntry.trackAuthSuccess === 'function') {
          AppEntry.trackAuthSuccess('google');
        }
        afterAuthSuccess(data);
      } else if (res.status === 404 && data.code === 'GOOGLE_ACCOUNT_NOT_FOUND') {
        if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
          AppEntry.trackAuthFailed('google', 'account_not_found');
        }
        showErr(errEl, 'Inget konto hittades. Registrera dig först med e-post.');
      } else {
        if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
          AppEntry.trackAuthFailed('google', data.error || 'login_failed');
        }
        showErr(errEl, data.error || 'Google-inloggning misslyckades.');
      }
    } catch (e) {
      if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
        AppEntry.trackAuthFailed('google', e.message || 'exception');
      }
      showErr(errEl, e.message || 'Google Sign In misslyckades.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    }
  }

  function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = '';
    if (el.classList) el.classList.remove('hidden');
  }

  function initButtons() {
    if (!window.Platform || typeof Platform.isGoogleSignInAvailable !== 'function') return;
    if (!Platform.isGoogleSignInAvailable()) return;

    ['googleLoginSection', 'googleRegisterSection'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });

    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn && !loginBtn.dataset.bound) {
      loginBtn.dataset.bound = '1';
      loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleGoogleLogin({ buttonEl: loginBtn, errorEl: document.getElementById('googleLoginError') });
      });
    }
    const regBtn = document.getElementById('googleRegisterBtn');
    if (regBtn && !regBtn.dataset.bound) {
      regBtn.dataset.bound = '1';
      regBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleGoogleLogin({ buttonEl: regBtn, errorEl: document.getElementById('googleRegisterError') });
      });
    }
  }

  window.handleGoogleLogin = handleGoogleLogin;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons);
  } else {
    initButtons();
  }
})();
