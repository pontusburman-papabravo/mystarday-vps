/**
 * Account-creation Sign in with Apple preflight (register page).
 * Login does not preflight country (existing users must still sign in).
 * New accounts from login recover via login-oauth-country.js.
 */
(function () {
  'use strict';

  function t(key) {
    try {
      if (window.authT) return window.authT(key);
      if (window.I18n && typeof window.I18n.t === 'function') return window.I18n.t(key);
    } catch (_) { /* ignore */ }
    return key;
  }

  function preflight(Platform, CountryChoice) {
    try {
      if (!Platform || !Platform.appleSignIn) {
        return { ok: false, reason: 'unavailable', message: t('auth.login.apple.unavailable') };
      }
      if (typeof Platform.isIOS === 'function' && Platform.isIOS()) {
        if (typeof Platform.appleSignIn.isAvailable !== 'function' || !Platform.appleSignIn.isAvailable()) {
          return { ok: false, reason: 'notEnabled', message: t('auth.login.apple.notEnabled') };
        }
      }
      if (typeof Platform.appleSignIn.signIn !== 'function') {
        return { ok: false, reason: 'unavailable', message: t('auth.login.apple.unavailable') };
      }

      const lang = window.LanguageChoice;
      if (lang) {
        const langOk = typeof lang.requireSelection === 'function'
          ? lang.requireSelection() === true
          : lang.isConfirmed() === true;
        if (!langOk) {
          return { ok: false, reason: 'language', message: t('language.choice.required') };
        }
      }

      const gate = window.RegistrationCountryGate;
      let countryOk = false;
      if (gate && typeof gate.allow === 'function') {
        countryOk = gate.allow(CountryChoice) === true;
      } else if (!CountryChoice) {
        countryOk = true;
      }
      if (!countryOk) {
        return { ok: false, reason: 'country', message: t('market.choice.required') };
      }

      return { ok: true };
    } catch (_) {
      return { ok: false, reason: 'error', message: t('auth.login.apple.signInFailed') };
    }
  }

  /**
   * Language/country denials are not Apple failures — reveal the gate, do not
   * paint the coral Apple error box. Other denials use showAppleError.
   */
  function applyDeniedPreflight(pre, showAppleError) {
    try {
      if (!pre || pre.ok) return;
      if (pre.reason === 'language') {
        if (window.LanguageChoice && typeof LanguageChoice.revealLanguageError === 'function') {
          LanguageChoice.revealLanguageError();
        }
        return;
      }
      if (pre.reason === 'country') {
        if (window.RegistrationCountryGate && typeof RegistrationCountryGate.revealCountryError === 'function') {
          RegistrationCountryGate.revealCountryError();
        }
        if (window.CountryChoice && typeof CountryChoice.requireSelection === 'function') {
          CountryChoice.requireSelection();
        }
        return;
      }
      if (typeof showAppleError === 'function') {
        showAppleError(pre.message || t('auth.login.apple.unavailable'));
      }
    } catch (_) { /* never throw from register tap */ }
  }

  window.RegisterAppleAuth = { preflight: preflight, applyDeniedPreflight: applyDeniedPreflight };
})();
