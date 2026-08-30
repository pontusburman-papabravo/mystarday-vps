/**
 * Account-creation Sign in with Apple preflight.
 * Login uses handleAppleLogin in login.html and is intentionally unchanged.
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

      const gate = window.RegistrationCountryGate;
      let countryOk = false;
      if (gate && typeof gate.allow === 'function') {
        countryOk = gate.allow(CountryChoice) === true;
      } else if (!CountryChoice) {
        countryOk = true;
      }
      if (!countryOk) {
        if (gate && typeof gate.revealCountryError === 'function') gate.revealCountryError();
        return { ok: false, reason: 'country', message: t('market.choice.required') };
      }

      return { ok: true };
    } catch (_) {
      return { ok: false, reason: 'error', message: t('auth.login.apple.signInFailed') };
    }
  }

  window.RegisterAppleAuth = { preflight: preflight };
})();
