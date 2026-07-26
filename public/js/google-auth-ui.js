/**
 * google-auth-ui.js — Google Sign In on login/register (web PWA + Android native).
 */
(function () {
  'use strict';

  let _googlePendingEmail = null;
  let _googlePendingIdToken = null;

  function afterAuthSuccess(data) {
    if (!data || !data.user) return;
    Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
    if (data.isNewAccount && window.MarketingEvents && typeof MarketingEvents.trackSignup === 'function') {
      MarketingEvents.trackSignup('google');
    }
    if (data.user.onboarding_completed === false) {
      window.location.href = '/onboarding';
    } else {
      Auth.redirectToDashboard();
    }
  }

  function pageKind() {
    return document.getElementById('googleRegisterSection') ? 'register' : 'login';
  }

  function showGoogleLinkingPrompt() {
    const prompt = document.getElementById('googleLinkingPrompt');
    if (prompt) prompt.classList.remove('hidden');
  }

  function dismissGoogleLinking() {
    _googlePendingEmail = null;
    _googlePendingIdToken = null;
    const prompt = document.getElementById('googleLinkingPrompt');
    if (prompt) prompt.classList.add('hidden');
  }

  function openGoogleLinkModal() {
    if (!_googlePendingEmail) return;
    const emailEl = document.getElementById('googleLinkEmail');
    const pwEl = document.getElementById('googleLinkPassword');
    const errEl = document.getElementById('googleLinkModalError');
    const modal = document.getElementById('googleLinkModal');
    if (emailEl) emailEl.value = _googlePendingEmail;
    if (pwEl) pwEl.value = '';
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }
    if (modal) modal.classList.remove('hidden');
    if (pwEl) setTimeout(function () { pwEl.focus(); }, 50);
  }

  function closeGoogleLinkModal() {
    const modal = document.getElementById('googleLinkModal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitGoogleLink() {
    if (!_googlePendingEmail || !_googlePendingIdToken) return;
    const passwordEl = document.getElementById('googleLinkPassword');
    const errEl = document.getElementById('googleLinkModalError');
    const btn = document.getElementById('googleLinkSubmitBtn');
    const password = passwordEl ? passwordEl.value : '';
    if (!password) {
      if (errEl) {
        errEl.textContent = 'Ange ditt lösenord.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Länkar…';
    }

    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          (window.LoginLocale && LoginLocale.withLoginLocale)
            ? LoginLocale.withLoginLocale({ email: _googlePendingEmail, password: password })
            : { email: _googlePendingEmail, password: password }
        ),
      });
      const loginData = await loginRes.json().catch(function () { return {}; });
      if (!loginRes.ok) {
        if (errEl) {
          errEl.textContent = loginData.error || 'Fel lösenord.';
          errEl.style.display = 'block';
        }
        return;
      }

      const linkRes = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': loginData.csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ idToken: _googlePendingIdToken }),
      });
      const linkData = await linkRes.json().catch(function () { return {}; });
      if (!linkRes.ok) {
        if (errEl) {
          errEl.textContent = linkData.error || 'Länkning misslyckades.';
          errEl.style.display = 'block';
        }
        return;
      }

      Auth.setAuth(null, loginData.user, loginData.csrfToken, loginData.expiresAt);
      closeGoogleLinkModal();
      dismissGoogleLinking();
      if (loginData.user && loginData.user.onboarding_completed === false) {
        window.location.href = '/onboarding';
      } else {
        Auth.redirectToDashboard();
      }
    } catch {
      if (errEl) {
        errEl.textContent = 'Länkning misslyckades.';
        errEl.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Länka';
      }
    }
  }

  function getGoogleBtnLabel(btn) {
    if (!btn) return null;
    return btn.querySelector('.google-btn-magic__label');
  }

  function setGoogleBtnLoading(btn, loading, loadingText) {
    if (!btn) return;
    const labelEl = getGoogleBtnLabel(btn);
    btn.disabled = loading;
    if (labelEl) {
      if (loading) {
        if (!labelEl.dataset.origLabel) labelEl.dataset.origLabel = labelEl.textContent;
        labelEl.textContent = loadingText || 'Google…';
      } else {
        labelEl.textContent = labelEl.dataset.origLabel || labelEl.textContent;
      }
      return;
    }
    if (loading) {
      if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
      btn.textContent = loadingText || 'Google…';
    } else {
      btn.textContent = btn.dataset.origLabel || btn.textContent;
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
    dismissGoogleLinking();

    const btn = opts.buttonEl || document.getElementById('googleLoginBtn') || document.getElementById('googleRegisterBtn');
    setGoogleBtnLoading(btn, true);
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
        body: JSON.stringify(
          (window.LoginLocale && LoginLocale.withLoginLocale)
            ? LoginLocale.withLoginLocale({ idToken: result.idToken })
            : { idToken: result.idToken }
        ),
      });
      const data = await res.json().catch(function () { return {}; });

      if (res.ok && data.user) {
        if (window.AppEntry && typeof AppEntry.trackAuthSuccess === 'function') {
          AppEntry.trackAuthSuccess('google');
        }
        afterAuthSuccess(data);
      } else if (res.status === 409 && data.error === 'email_conflict') {
        if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
          AppEntry.trackAuthFailed('google', 'email_conflict');
        }
        if (pageKind() === 'login' && document.getElementById('googleLinkingPrompt')) {
          _googlePendingEmail = data.email || '';
          _googlePendingIdToken = result.idToken;
          showGoogleLinkingPrompt();
        } else {
          showErr(
            errEl,
            'Ett konto med denna e-postadress finns redan. Logga in och länka Google under Inställningar, eller använd lösenordsinloggning.'
          );
        }
      } else {
        if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
          AppEntry.trackAuthFailed('google', data.error || 'login_failed');
        }
        showErr(errEl, data.error || 'Google-inloggning misslyckades.');
      }
    } catch (e) {
      const msg = e && e.message ? e.message : 'Google Sign In misslyckades.';
      if (msg === 'Avbruten') return;
      if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
        AppEntry.trackAuthFailed('google', msg);
      }
      showErr(errEl, msg);
    } finally {
      setGoogleBtnLoading(btn, false);
    }
  }

  function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = '';
    if (el.classList) el.classList.remove('hidden');
  }

  function bindGoogleButton(btn, errorId) {
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      handleGoogleLogin({ buttonEl: btn, errorEl: document.getElementById(errorId) });
    });
  }

  async function initButtons() {
    if (window.AuthLoginPlatform && typeof AuthLoginPlatform.applyAuthSections === 'function') {
      await AuthLoginPlatform.applyAuthSections({ page: pageKind() });
    }

    const loginSec = document.getElementById('googleLoginSection');
    if (loginSec && !loginSec.classList.contains('hidden')) {
      bindGoogleButton(document.getElementById('googleLoginBtn'), 'googleLoginError');
    }
    const regSec = document.getElementById('googleRegisterSection');
    if (regSec && !regSec.classList.contains('hidden')) {
      bindGoogleButton(document.getElementById('googleRegisterBtn'), 'googleRegisterError');
    }

    const pwEl = document.getElementById('googleLinkPassword');
    if (pwEl && !pwEl.dataset.bound) {
      pwEl.dataset.bound = '1';
      pwEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submitGoogleLink();
      });
    }
  }

  window.handleGoogleLogin = handleGoogleLogin;
  window.openGoogleLinkModal = openGoogleLinkModal;
  window.closeGoogleLinkModal = closeGoogleLinkModal;
  window.submitGoogleLink = submitGoogleLink;
  window.dismissGoogleLinking = dismissGoogleLinking;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons);
  } else {
    initButtons();
  }
})();
