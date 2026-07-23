/**
 * Shared bootstrap for pre-auth entry pages (register, login, child-login, etc.).
 * Loads locale bundle, mounts language switcher, applies data-i18n, updates document title.
 */
(function authEntryI18nModule() {
  function applyPageTitle() {
    const titleKey = document.body?.dataset?.i18nTitle;
    if (!titleKey || !window.I18n) return;
    const translated = I18n.t(titleKey);
    if (translated && translated !== titleKey) {
      document.title = translated;
    }
  }

  async function bootstrap() {
    if (!window.I18n) return;
    await I18n.init();
    I18n.apply();
    applyPageTitle();
    if (window.LocaleSwitcher) {
      LocaleSwitcher.autoMount();
    }
    document.addEventListener('locale-changed', () => {
      I18n.apply();
      applyPageTitle();
    });
  }

  /** Safe translation helper for inline scripts on auth pages. */
  function authT(key, params) {
    if (!window.I18n) return key;
    return I18n.t(key, params);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch((err) => console.warn('[auth-entry-i18n] bootstrap failed:', err));
  });

  window.authT = authT;
})();
