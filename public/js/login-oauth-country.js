/**
 * Login OAuth country recovery (Apple / Google).
 *
 * Existing users log in without a country. New accounts created from the
 * login screen get COUNTRY_REQUIRED from the server (ADR-018). That is a
 * next step — not a failed Sign in with Apple / Google.
 */
(function loginOAuthCountryModule() {
  'use strict';

  const PENDING_KEY = 'sd_login_oauth_pending';
  const OPEN_SUGGESTION = 'SE';
  const retries = Object.create(null);

  function t(key, fallback) {
    try {
      if (window.authT) {
        const translated = window.authT(key);
        if (translated && translated !== key) return translated;
      }
      if (window.I18n && typeof window.I18n.t === 'function') {
        const translated = window.I18n.t(key);
        if (translated && translated !== key) return translated;
      }
    } catch (_) { /* keep fallback */ }
    return fallback || key;
  }

  function injectStyles() {
    if (document.getElementById('login-oauth-country-styles')) return;
    const style = document.createElement('style');
    style.id = 'login-oauth-country-styles';
    style.textContent = [
      '#loginOAuthCountryPanel{width:100%;margin:14px 0 4px;padding:16px 16px 14px;border-radius:16px;background:#fff;color:#1B2340;box-sizing:border-box;}',
      '#loginOAuthCountryPanel[hidden]{display:none!important;}',
      '.login-oauth-country__title{font-size:1.05rem;font-weight:700;text-align:center;margin:0 0 6px;color:#1B2340;}',
      '.login-oauth-country__body{font-size:0.85rem;color:#5A6178;text-align:center;margin:0 0 4px;line-height:1.45;}',
      '.login-oauth-country__server-error{font-size:0.8125rem;color:#b42318;text-align:center;margin:8px 0 0;}',
      '.login-oauth-country__server-error[hidden]{display:none!important;}',
      '.login-oauth-country__continue{width:100%;min-height:44px;margin-top:12px;border:none;border-radius:12px;background:#F5A623;color:#1B2340;font-weight:700;font-size:1rem;cursor:pointer;}',
      '.login-oauth-country__continue:disabled{opacity:0.65;cursor:default;}',
    ].join('');
    document.head.appendChild(style);
  }

  function panel() {
    return document.getElementById('loginOAuthCountryPanel');
  }

  function serverErrorEl() {
    return document.getElementById('loginOAuthCountryServerError');
  }

  function continueBtn() {
    return document.getElementById('loginOAuthCountryContinue');
  }

  function isCountryRequired(status, data) {
    return Number(status) === 400 && !!(data && data.code === 'COUNTRY_REQUIRED');
  }

  function isMarketClosed(status, data) {
    return Number(status) === 403 && !!(data && data.code);
  }

  function readPending() {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.provider || !parsed.idToken) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writePending(pending) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({
      provider: pending.provider,
      idToken: pending.idToken,
      name: pending.name || null,
    }));
  }

  function clearPending() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (_) { /* ignore */ }
  }

  function hideAppleGoogleErrors() {
    if (window.AppleSignInDiagnostics && typeof AppleSignInDiagnostics.hideErrors === 'function') {
      AppleSignInDiagnostics.hideErrors();
    }
    ['appleLoginError', 'googleLoginError'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = '';
      el.style.display = 'none';
      if (el.classList) el.classList.add('hidden');
    });
  }

  function applyPanelCopy(el) {
    if (!el) return;
    if (window.I18n && typeof I18n.apply === 'function') {
      I18n.apply(el);
    }
    const title = el.querySelector('[data-i18n="auth.login.oauthCountry.title"]');
    const body = el.querySelector('[data-i18n="auth.login.oauthCountry.body"]');
    const btn = el.querySelector('[data-i18n="auth.login.oauthCountry.continue"]');
    if (title) title.textContent = t('auth.login.oauthCountry.title', title.textContent);
    if (body) body.textContent = t('auth.login.oauthCountry.body', body.textContent);
    if (btn) btn.textContent = t('auth.login.oauthCountry.continue', btn.textContent);
  }

  function suggestOpenMarket() {
    const select = document.getElementById('countryChoiceSelect');
    if (!select || select.value) return;
    const hasSe = Array.from(select.options).some((opt) => opt.value === OPEN_SUGGESTION);
    if (hasSe) select.value = OPEN_SUGGESTION;
  }

  function confirmSelectedCountry() {
    const select = document.getElementById('countryChoiceSelect');
    if (select && select.value) {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (!window.CountryChoice || typeof CountryChoice.requireSelection !== 'function') {
      return false;
    }
    return CountryChoice.requireSelection() === true;
  }

  function showServerError(message) {
    const el = serverErrorEl();
    if (!el) return;
    el.textContent = message || t('auth.login.oauthCountry.retryFailed', 'Something went wrong. Please try again.');
    el.hidden = false;
  }

  function hideServerError() {
    const el = serverErrorEl();
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  function setContinueLoading(loading) {
    const btn = continueBtn();
    if (!btn) return;
    if (loading) {
      if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = t('auth.login.oauthCountry.continuing', 'Continuing…');
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.origLabel || t('auth.login.oauthCountry.continue', 'Continue');
    }
  }

  function hide() {
    const el = panel();
    if (el) el.hidden = true;
    hideServerError();
    setContinueLoading(false);
  }

  function reveal(pending) {
    if (!pending || !pending.provider || !pending.idToken) return false;
    injectStyles();
    writePending(pending);
    hideAppleGoogleErrors();
    hideServerError();

    const el = panel();
    if (!el) return false;
    el.hidden = false;
    applyPanelCopy(el);
    suggestOpenMarket();

    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const select = document.getElementById('countryChoiceSelect');
    if (select && typeof select.focus === 'function') {
      try { select.focus(); } catch (_) { /* ignore */ }
    }
    return true;
  }

  async function handleContinue() {
    hideServerError();
    if (!confirmSelectedCountry()) return;

    const pending = readPending();
    if (!pending) {
      showServerError(t('auth.login.oauthCountry.retryFailed', 'Something went wrong. Please try again.'));
      return;
    }

    const retry = retries[pending.provider];
    if (typeof retry !== 'function') {
      showServerError(t('auth.login.oauthCountry.retryFailed', 'Something went wrong. Please try again.'));
      return;
    }

    setContinueLoading(true);
    try {
      await retry(pending);
    } catch (_) {
      showServerError(t('auth.login.oauthCountry.retryFailed', 'Something went wrong. Please try again.'));
    } finally {
      setContinueLoading(false);
    }
  }

  function registerRetry(provider, fn) {
    if (!provider || typeof fn !== 'function') return;
    retries[provider] = fn;
  }

  function bindContinue() {
    const btn = continueBtn();
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      handleContinue();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindContinue);
  } else {
    bindContinue();
  }

  window.LoginOAuthCountry = {
    isCountryRequired: isCountryRequired,
    isMarketClosed: isMarketClosed,
    reveal: reveal,
    hide: hide,
    getPending: readPending,
    clearPending: clearPending,
    confirmSelectedCountry: confirmSelectedCountry,
    showServerError: showServerError,
    registerRetry: registerRetry,
    suggestOpenMarket: suggestOpenMarket,
  };
})();
