/**
 * Fail-closed registration country gate for email / Apple / Google signup.
 * Never throws. Does not apply to login.
 */
(function () {
  'use strict';

  function allow(CountryChoice) {
    try {
      if (!CountryChoice) return false;
      if (typeof CountryChoice.requireSelection !== 'function') return false;
      return CountryChoice.requireSelection() === true;
    } catch (_) {
      return false;
    }
  }

  function revealCountryError() {
    try {
      const mount = document.querySelector('[data-country-choice-mount]');
      if (mount && typeof mount.scrollIntoView === 'function') {
        mount.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (_) { /* ignore */ }
  }

  window.RegistrationCountryGate = {
    allow: allow,
    revealCountryError: revealCountryError,
  };
})();
