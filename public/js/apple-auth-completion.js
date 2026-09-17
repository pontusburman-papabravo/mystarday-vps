/**
 * Apple account-completion surface (country + terms only).
 * Never asks for name, email, or password. Never starts a second authorize.
 */
(function appleAuthCompletionModule() {
  'use strict';

  function t(key, fallback) {
    try {
      if (window.authT) {
        const fromAuth = window.authT(key);
        if (fromAuth && fromAuth !== key) return fromAuth;
      }
      if (window.I18n && typeof window.I18n.tOrLiteral === 'function') {
        return window.I18n.tOrLiteral(key, fallback);
      }
      if (window.I18n && typeof window.I18n.t === 'function') {
        const fromI18n = window.I18n.t(key);
        if (fromI18n && fromI18n !== key) return fromI18n;
        if (typeof window.I18n.literalFallback === 'function') {
          return window.I18n.literalFallback(key, fallback);
        }
      }
    } catch (_) { /* keep fallback */ }
    if (window.I18n && typeof window.I18n.literalFallback === 'function') {
      return window.I18n.literalFallback(key, fallback);
    }
    return fallback || key;
  }

  function termsChecked() {
    const ids = ['appleTermsAccepted', 'appleCompletionTermsAccepted', 'termsAccepted'];
    for (let i = 0; i < ids.length; i += 1) {
      const el = document.getElementById(ids[i]);
      if (el && el.checked) return true;
    }
    return false;
  }

  function countryConfirmed() {
    return !!(window.CountryChoice && typeof CountryChoice.isConfirmed === 'function' && CountryChoice.isConfirmed());
  }

  function collectMissing() {
    const missing = [];
    if (!countryConfirmed()) missing.push('country');
    if (!termsChecked()) missing.push('terms');
    return missing;
  }

  function showPanel(missing) {
    const panel = document.getElementById('appleAccountCompletion');
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.hidden = false;
    panel.style.display = '';
    const countryBlock = document.getElementById('appleCompletionCountry');
    const termsBlock = document.getElementById('appleCompletionTerms');
    if (countryBlock) {
      countryBlock.hidden = missing && missing.indexOf('country') === -1 && countryConfirmed();
    }
    if (termsBlock) {
      termsBlock.hidden = missing && missing.indexOf('terms') === -1 && termsChecked();
    }
    const title = document.getElementById('appleCompletionTitle');
    if (title) title.textContent = t('auth.login.apple.completionTitle', 'Slutför kontot');
    const body = document.getElementById('appleCompletionBody');
    if (body) {
      body.textContent = t(
        'auth.login.apple.completionBody',
        'Välj land och godkänn villkoren. Apple har redan lämnat namn och e-post — vi frågar inte om dem igen.'
      );
    }
    if (missing && missing.indexOf('country') !== -1) {
      if (window.RegistrationCountryGate && typeof RegistrationCountryGate.revealCountryError === 'function') {
        RegistrationCountryGate.revealCountryError();
      }
      if (window.CountryChoice && typeof CountryChoice.requireSelection === 'function') {
        CountryChoice.requireSelection();
      }
    }
    if (panel.scrollIntoView) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function hidePanel() {
    const panel = document.getElementById('appleAccountCompletion');
    if (!panel) return;
    panel.classList.add('hidden');
    panel.hidden = true;
  }

  function hideEmailPasswordIdentityFields() {
    const form = document.getElementById('emailPasswordRegisterFields');
    if (form) form.classList.add('hidden');
    ['name', 'email', 'familyName', 'password', 'confirmPassword'].forEach(function (id) {
      const input = document.getElementById(id);
      if (!input) return;
      input.removeAttribute('required');
      const wrap = input.closest ? input.closest('.apple-hide-on-siwa') : input.parentElement;
      if (wrap) wrap.classList.add('hidden');
    });
    const submit = document.getElementById('submitBtn');
    if (submit) submit.classList.add('hidden');
  }

  function identityFieldsVisible() {
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    if (!name && !email && !password) return false;
    function visible(el) {
      if (!el) return false;
      if (el.classList && el.classList.contains('hidden')) return false;
      const wrap = el.closest ? el.closest('.apple-hide-on-siwa') : el.parentElement;
      if (wrap && wrap.classList && wrap.classList.contains('hidden')) return false;
      return true;
    }
    return visible(name) || visible(email) || visible(password);
  }

  window.AppleAuthCompletion = {
    termsChecked: termsChecked,
    countryConfirmed: countryConfirmed,
    collectMissing: collectMissing,
    showPanel: showPanel,
    hidePanel: hidePanel,
    hideEmailPasswordIdentityFields: hideEmailPasswordIdentityFields,
    identityFieldsVisible: identityFieldsVisible,
  };
})();
