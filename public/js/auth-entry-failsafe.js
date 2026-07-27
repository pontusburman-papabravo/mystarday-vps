/**
 * Auth entry failsafe — runs before auth-entry-i18n.js.
 * Reveals the page if locale bootstrap hangs. Never shows a blocking overlay.
 */
(function authEntryFailsafeModule() {
  const PENDING = 'auth-entry-pending';
  const FAILSAFE_MS = 3000;

  function revealPage() {
    window.authEntryI18nBootstrapped = true;
    document.documentElement.classList.remove(PENDING);
    const loader = document.getElementById('auth-entry-locale-loader');
    if (loader) loader.remove();
    const fb = document.getElementById('auth-entry-fallback');
    if (fb) {
      fb.hidden = true;
      fb.style.setProperty('display', 'none', 'important');
    }
  }

  window.__dismissAuthEntryFallback = revealPage;

  function scheduleReveal() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', revealPage);
    } else {
      revealPage();
    }
    window.setTimeout(function authEntryFailsafeTimeout() {
      if (!window.authEntryI18nBootstrapped) revealPage();
    }, FAILSAFE_MS);
  }

  document.documentElement.classList.add(PENDING);
  scheduleReveal();

  window.__clearAuthEntryFailsafe = function clearAuthEntryFailsafe() {
    revealPage();
  };
})();
