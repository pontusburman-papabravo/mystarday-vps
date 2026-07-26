/**
 * Auth entry failsafe — runs before auth-entry-i18n.js.
 * If the locale bootstrap script never loads or hangs, reveal the page and
 * show #auth-entry-fallback after FAILSAFE_MS (must exceed auth-entry timeout).
 */
(function authEntryFailsafeModule() {
  const PENDING = 'auth-entry-pending';
  const FAILSAFE_MS = 5000;

  document.documentElement.classList.add(PENDING);

  const timer = window.setTimeout(function authEntryFailsafeTimeout() {
    document.documentElement.classList.remove(PENDING);
    const loader = document.getElementById('auth-entry-locale-loader');
    if (loader) loader.remove();
    const fb = document.getElementById('auth-entry-fallback');
    if (fb && !window.authEntryI18nBootstrapped) {
      fb.hidden = false;
    }
  }, FAILSAFE_MS);

  window.__clearAuthEntryFailsafe = function clearAuthEntryFailsafe() {
    window.clearTimeout(timer);
  };
})();
