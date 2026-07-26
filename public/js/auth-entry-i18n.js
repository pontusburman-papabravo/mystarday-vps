/**
 * Shared bootstrap for pre-auth entry pages (register, login, child-login, etc.).
 * Loads locale bundle, mounts language switcher, applies data-i18n, updates document title + OG meta.
 */
(function authEntryI18nModule() {
  const LOCALE_GATE_CLASS = 'auth-entry-pending';
  const LOCALE_GATE_TIMEOUT_MS = 4000;

  function brandName() {
    if (!window.I18n) return 'My Starday';
    return I18n.t('app.name');
  }

  function revealContent() {
    window.authEntryI18nBootstrapped = true;
    if (typeof window.__clearAuthEntryFailsafe === 'function') {
      window.__clearAuthEntryFailsafe();
    }
    document.documentElement.classList.remove(LOCALE_GATE_CLASS);
    const loader = document.getElementById('auth-entry-locale-loader');
    if (loader) loader.remove();
  }

  function ensureLocaleGate() {
    if (!document.body || document.body.dataset.authEntryLocaleGate === 'off') return;
    if (!document.documentElement.classList.contains(LOCALE_GATE_CLASS)) {
      document.documentElement.classList.add(LOCALE_GATE_CLASS);
    }
    if (!document.getElementById('auth-entry-locale-loader')) {
      const loader = document.createElement('div');
      loader.id = 'auth-entry-locale-loader';
      loader.className = 'auth-entry-locale-loader';
      loader.setAttribute('role', 'status');
      loader.setAttribute('aria-live', 'polite');
      document.body.prepend(loader);
    }
    window.setTimeout(revealContent, LOCALE_GATE_TIMEOUT_MS);
  }

  function applyPageTitle() {
    const titleKey = document.body?.dataset?.i18nTitle;
    if (!titleKey || !window.I18n) return;
    const brand = brandName();
    const translated = I18n.t(titleKey, { brand });
    if (translated && translated !== titleKey) {
      document.title = translated;
    }
  }

  function applyMetaTags() {
    if (!window.I18n) return;
    const brand = brandName();
    const ogTitle = I18n.t('auth.meta.ogTitle', { brand });
    const ogDesc = I18n.t('auth.meta.ogDescription');
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogTitleEl && ogTitle && ogTitle !== 'auth.meta.ogTitle') {
      ogTitleEl.setAttribute('content', ogTitle);
    }
    if (ogDescEl && ogDesc && ogDesc !== 'auth.meta.ogDescription') {
      ogDescEl.setAttribute('content', ogDesc);
    }
  }

  function applyBrandKeys(root = document) {
    if (!window.I18n) return;
    const brand = brandName();
    root.querySelectorAll('[data-i18n-brand]').forEach((el) => {
      const key = el.getAttribute('data-i18n-brand');
      const text = I18n.t(key, { brand });
      if (text !== key) el.textContent = text;
    });
  }

  function applyAltKeys(root = document) {
    if (!window.I18n) return;
    root.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const key = el.getAttribute('data-i18n-alt');
      const text = I18n.t(key);
      if (text !== key) el.setAttribute('alt', text);
    });
  }

  function applyAll() {
    if (!window.I18n) return;
    const brand = brandName();
    const params = { brand };
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = I18n.t(key, params);
      if (text !== key) el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      const text = I18n.t(key, params);
      if (text !== key) el.placeholder = text;
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (!key) return;
      const text = I18n.t(key, params);
      if (text !== key) el.title = text;
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      const text = I18n.t(key, params);
      if (text !== key) el.setAttribute('aria-label', text);
    });
    applyBrandKeys();
    applyAltKeys();
    applyPageTitle();
    applyMetaTags();
  }

  async function bootstrap() {
    if (!window.I18n) {
      revealContent();
      return;
    }
    ensureLocaleGate();
    await I18n.init();
    applyAll();
    revealContent();
    if (window.LocaleSwitcher) {
      LocaleSwitcher.autoMount();
    }
    document.addEventListener('locale-changed', () => {
      applyAll();
    });
  }

  function authT(key, params) {
    if (!window.I18n) return key;
    const brand = brandName();
    return I18n.t(key, { brand, ...(params || {}) });
  }

  if (!document.getElementById('auth-entry-i18n-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-entry-i18n-styles';
    style.textContent = `
      html.${LOCALE_GATE_CLASS} body > *:not(#auth-entry-locale-loader):not(script):not(style):not(link) {
        visibility: hidden;
      }
      .auth-entry-locale-loader {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .auth-entry-locale-loader::after {
        content: '';
        width: 2rem;
        height: 2rem;
        border: 3px solid rgba(27, 35, 64, 0.15);
        border-top-color: #F5A623;
        border-radius: 50%;
        animation: auth-entry-spin 0.7s linear infinite;
      }
      @keyframes auth-entry-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        .auth-entry-locale-loader::after { animation: none; opacity: 0.6; }
      }
      .auth-entry-fallback {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: rgba(27, 35, 64, 0.92);
        color: #fff;
        text-align: center;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: 0.95rem;
        line-height: 1.5;
      }
      .auth-entry-fallback a { color: #F5A623; font-weight: 600; }
      .auth-entry-noscript {
        margin: 0;
        padding: 1rem;
        background: #FFF3CD;
        color: #1B2340;
        text-align: center;
        font-family: system-ui, sans-serif;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch((err) => {
      console.warn('[auth-entry-i18n] bootstrap failed:', err);
      revealContent();
    });
  });

  window.authT = authT;
  window.authBrandName = brandName;
})();
