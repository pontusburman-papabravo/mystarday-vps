/**
 * Auth entry failsafe — runs before auth-entry-i18n.js.
 * If the locale bootstrap script never loads or hangs, reveal the page and
 * show #auth-entry-fallback after FAILSAFE_MS (must exceed auth-entry timeout).
 */
(function authEntryFailsafeModule() {
  const PENDING = 'auth-entry-pending';
  const FAILSAFE_MS = 5000;

  function localeReady() {
    return !!(
      window.I18n &&
      window.I18n.lang &&
      window.I18n.locale &&
      Object.keys(window.I18n.locale).length > 0
    );
  }

  function revealPage(opts) {
    const showFallback = opts && opts.showFallback === true;
    document.documentElement.classList.remove(PENDING);
    const loader = document.getElementById('auth-entry-locale-loader');
    if (loader) loader.remove();
    if (localeReady() && !window.authEntryI18nBootstrapped) {
      window.authEntryI18nBootstrapped = true;
    }
    const fb = document.getElementById('auth-entry-fallback');
    if (!fb || window.authEntryI18nBootstrapped) return;
    if (showFallback) fb.hidden = false;
  }

  document.documentElement.classList.add(PENDING);

  const timer = window.setTimeout(function authEntryFailsafeTimeout() {
    if (window.authEntryI18nBootstrapped) return;
    // Locale may have loaded via i18n.js while auth-entry-i18n bootstrap was interrupted
    // (e.g. post-logout silentRefresh reload). Page is usable — reveal without blocking overlay.
    revealPage({ showFallback: !localeReady() });
  }, FAILSAFE_MS);

  window.__clearAuthEntryFailsafe = function clearAuthEntryFailsafe() {
    window.clearTimeout(timer);
  };
})();
