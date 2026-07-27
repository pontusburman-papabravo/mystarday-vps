/**
 * Auth entry failsafe — runs before auth-entry-i18n.js.
 * If the locale bootstrap script never loads or hangs, reveal the page after
 * FAILSAFE_MS (must exceed auth-entry-i18n timeout). Never block login with a
 * full-screen overlay — a usable login beats perfect copy (POS: complete signup).
 */
(function authEntryFailsafeModule() {
  const PENDING = 'auth-entry-pending';
  const FAILSAFE_MS = 5000;

  function revealPage() {
    window.authEntryI18nBootstrapped = true;
    document.documentElement.classList.remove(PENDING);
    const loader = document.getElementById('auth-entry-locale-loader');
    if (loader) loader.remove();
    const fb = document.getElementById('auth-entry-fallback');
    if (fb) fb.hidden = true;
  }

  document.documentElement.classList.add(PENDING);

  const timer = window.setTimeout(function authEntryFailsafeTimeout() {
    if (window.authEntryI18nBootstrapped) return;
    revealPage();
  }, FAILSAFE_MS);

  window.__clearAuthEntryFailsafe = function clearAuthEntryFailsafe() {
    window.clearTimeout(timer);
  };

  window.__dismissAuthEntryFallback = revealPage;
})();
