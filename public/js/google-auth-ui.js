/**
 * google-auth-ui.js — Google Sign In on login/register (web PWA + Android native).
 */
(function () {
  'use strict';

  let _googlePendingEmail = null;
  let _googlePendingIdToken = null;

  function t(key, params) {
    if (window.authT) return authT(key, params);
    if (window.I18n && typeof I18n.t === 'function') return I18n.t(key, params);
    return key;
  }

  function afterAuthSuccess(data) {
    if (!data || !data.user) return;
    Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
    if (data.isNewAccount && window.MarketingEvents && typeof MarketingEvents.trackSignup === 'function') {
      MarketingEvents.trackSignup('google');
    }
    if (data.user.onboarding_completed === false) {
      window.location.replace('/onboarding');
    } else if (Auth.completeParentAuthRedirect && Auth.completeParentAuthRedirect(data.user)) {
      return;
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
        errEl.textContent = t('auth.login.linking.enterPassword');
        errEl.style.display = 'block';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = t('auth.login.linking.submitting');
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
          errEl.textContent = loginData.error || t('auth.login.linking.wrongPassword');
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
          errEl.textContent = linkData.error || t('auth.login.linking.failed');
          errEl.style.display = 'block';
        }
        return;
      }

      Auth.setAuth(null, loginData.user, loginData.csrfToken, loginData.expiresAt);
      closeGoogleLinkModal();
      dismissGoogleLinking();
      if (loginData.user && loginData.user.onboarding_completed === false) {
        window.location.replace('/onboarding');
      } else if (Auth.completeParentAuthRedirect && Auth.completeParentAuthRedirect(loginData.user)) {
        return;
      } else {
        Auth.redirectToDashboard();
      }
    } catch {
      if (errEl) {
        errEl.textContent = t('auth.login.linking.failed');
        errEl.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = t('auth.login.linking.submit');
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
        labelEl.textContent = loadingText || t('auth.login.googleLoading');
      } else {
        labelEl.textContent = labelEl.dataset.origLabel || labelEl.textContent;
      }
      return;
    }
    if (loading) {
      if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
      btn.textContent = loadingText || t('auth.login.googleLoading');
    } else {
      btn.textContent = btn.dataset.origLabel || btn.textContent;
    }
  }

  async function handleGoogleLogin(opts) {
    opts = opts || {};
    if (!opts.existingIdToken && (!window.Platform || !Platform.googleSignIn)) return;
    const errEl = opts.errorEl || document.getElementById('googleLoginError') || document.getElementById('googleRegisterError');
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
      if (errEl.classList) errEl.classList.add('hidden');
    }
    dismissGoogleLinking();
    if (!opts.existingIdToken && window.LoginOAuthCountry && typeof LoginOAuthCountry.hide === 'function') {
      LoginOAuthCountry.hide();
    }

    if (pageKind() === 'register') {
      var countryOk = false;
      try {
        countryOk = window.RegistrationCountryGate
          ? RegistrationCountryGate.allow(window.CountryChoice) === true
          : false;
      } catch (_) {
        countryOk = false;
      }
      if (!countryOk) {
        if (window.RegistrationCountryGate && RegistrationCountryGate.revealCountryError) {
          RegistrationCountryGate.revealCountryError();
        }
        if (errEl) {
          errEl.textContent = t('market.choice.required');
          if (errEl.classList) errEl.classList.remove('hidden');
          errEl.style.display = '';
        }
        return;
      }
    }

    const btn = opts.buttonEl || document.getElementById('googleLoginBtn') || document.getElementById('googleRegisterBtn');
    if (!opts.existingIdToken) setGoogleBtnLoading(btn, true);
    if (window.AppEntry && typeof AppEntry.trackAuthMethod === 'function') {
      AppEntry.trackAuthMethod('google');
    }

    try {
      let idToken = opts.existingIdToken || null;
      if (!idToken) {
        if (!window.Platform || !Platform.googleSignIn) return;
        const result = await Platform.googleSignIn.signIn();
        if (!result || !result.idToken) return;
        idToken = result.idToken;
      }

      const attr =
        (window.UtmCapture && UtmCapture.toRegisterFields && UtmCapture.toRegisterFields()) || {};
      const googleBody = Object.assign(
        { idToken: idToken },
        attr,
        {
          referral_code:
            (window.ReferralCapture && ReferralCapture.getCode && ReferralCapture.getCode()) ||
            undefined,
        }
      );
      const payload = (window.OAuthRegistrationPayload && OAuthRegistrationPayload.withOAuthRegistrationFields)
        ? OAuthRegistrationPayload.withOAuthRegistrationFields(googleBody)
        : ((window.LoginLocale && LoginLocale.withLoginLocale)
          ? LoginLocale.withLoginLocale(googleBody)
          : googleBody);
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(function () { return {}; });

      if (pageKind() === 'login' && window.LoginOAuthCountry && LoginOAuthCountry.isCountryRequired(res.status, data)) {
        LoginOAuthCountry.reveal({ provider: 'google', idToken: idToken });
        return;
      }
      if (pageKind() === 'login' && window.LoginOAuthCountry && LoginOAuthCountry.isMarketClosed(res.status, data)) {
        LoginOAuthCountry.reveal({ provider: 'google', idToken: idToken });
        LoginOAuthCountry.showServerError(data.error || t('auth.login.oauthCountry.retryFailed'));
        return;
      }

      if (res.ok && data.user) {
        if (window.LoginOAuthCountry) LoginOAuthCountry.clearPending();
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
          _googlePendingIdToken = idToken;
          showGoogleLinkingPrompt();
        } else {
          showErr(errEl, t('auth.login.google.emailConflictSettings'));
        }
      } else {
        if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
          AppEntry.trackAuthFailed('google', data.error || 'login_failed');
        }
        showErr(errEl, data.error || t('auth.login.google.loginFailed'));
      }
    } catch (e) {
      const msg = e && e.message ? e.message : '';
      if (msg === 'Avbruten') return;
      if (window.AppEntry && typeof AppEntry.trackAuthFailed === 'function') {
        AppEntry.trackAuthFailed('google', msg || 'exception');
      }
      showErr(errEl, msg || t('auth.login.google.signInFailed'));
    } finally {
      if (!opts.existingIdToken) setGoogleBtnLoading(btn, false);
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

  if (window.LoginOAuthCountry && typeof LoginOAuthCountry.registerRetry === 'function') {
    LoginOAuthCountry.registerRetry('google', function retryGoogleAfterCountry(pending) {
      return handleGoogleLogin({ existingIdToken: pending && pending.idToken });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons);
  } else {
    initButtons();
  }
})();
