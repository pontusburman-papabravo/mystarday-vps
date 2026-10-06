/**
 * Language switcher — registration, login, settings.
 * Segmented Svenska | English control (no native select).
 */
(function localeSwitcherModule() {
  const SWITCHER_CLASS = 'locale-switcher';
  let _localeChangeInflight = false;

  function track(eventType, metadata) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, metadata || {});
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function isDarkSurface(container) {
    return Boolean(
      container.closest('.login-magic-bg')
      || container.closest('[data-locale-switcher-theme="dark"]')
    );
  }

  function selectorLocales() {
    if (window.I18n && typeof I18n.selectorLocales === 'function') {
      const list = I18n.selectorLocales();
      if (list && list.length) return list;
    }
    return [];
  }

  /**
   * english_app gates only the catalog row that asks for it (en-GB).
   * Other public locales stay selectable when the flag is off.
   */
  function localeChangeAllowed(entry, featureEnabled) {
    if (!entry || !entry.selectRequiresFeature) return true;
    if (entry.selectRequiresFeature === 'english_app') return featureEnabled === true;
    return true;
  }

  function buildSwitcherHtml() {
    const locales = selectorLocales();
    const buttons = locales.map((locale) => {
      const gated = locale.selectRequiresFeature
        ? ` data-locale-gated="${escapeAttr(locale.selectRequiresFeature)}"`
        : '';
      return `
          <button type="button" class="locale-switcher__option" data-locale-value="${escapeAttr(locale.id)}"${gated} aria-pressed="false">
            <span>${escapeHtml(locale.nativeName)}</span>
          </button>`;
    }).join('');
    return `
      <div class="${SWITCHER_CLASS}" role="group" aria-label="${escapeAttr(I18n.t('language.switchAria'))}">
        <div class="locale-switcher__track" data-locale-track style="--locale-count:${locales.length}">
          ${buttons}
        </div>
      </div>`;
  }

  function injectStyles() {
    if (document.getElementById('locale-switcher-styles')) return;
    const style = document.createElement('style');
    style.id = 'locale-switcher-styles';
    style.textContent = `
      .locale-switcher { width: 100%; max-width: 22rem; margin: 0 auto; text-align: center; }
      .locale-switcher__track {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.25rem;
        padding: 0.25rem;
        border-radius: 1rem;
        background: rgba(27, 35, 64, 0.06);
        border: 1px solid rgba(27, 35, 64, 0.08);
      }
      .locale-switcher__option {
        flex: 1 1 6.25rem;
        min-width: 0;
        min-height: 44px;
        padding: 0.4rem 0.55rem;
        border: none;
        border-radius: 999px;
        background: transparent;
        color: #5A6178;
        font-weight: 600;
        font-size: 0.8rem;
        line-height: 1.15;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        white-space: normal;
        transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      }
      .locale-switcher__option[aria-pressed="true"] {
        background: #fff;
        color: #1B2340;
        box-shadow: 0 1px 4px rgba(27, 35, 64, 0.12);
      }
      .locale-switcher--dark .locale-switcher__track {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(12px);
      }
      .locale-switcher--dark .locale-switcher__option {
        color: rgba(255, 255, 255, 0.78);
      }
      .locale-switcher--dark .locale-switcher__option[aria-pressed="true"] {
        background: rgba(255, 255, 255, 0.96);
        color: #1B2340;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
      }
      .locale-switcher--compact { max-width: 18rem; }
    `;
    document.head.appendChild(style);
  }

  async function isEnglishAllowed() {
    try {
      if (window.Auth && typeof Auth.api === 'function') {
        const me = await Auth.api('/api/auth/me');
        if (me?.type === 'parent') {
          const flags = await Auth.api('/api/family/locale-options');
          return flags?.english_app_enabled === true;
        }
      }
      const res = await fetch('/api/i18n/options');
      if (res.ok) {
        const data = await res.json();
        return data.english_app_enabled !== false;
      }
    } catch (_) {
      /* pre-auth: allow both */
    }
    return true;
  }

  function setSelected(container, locale) {
    container.querySelectorAll('[data-locale-value]').forEach((btn) => {
      const active = btn.getAttribute('data-locale-value') === locale;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  async function applyLocaleChange(container, next, previous, englishOk) {
    if (_localeChangeInflight) return;
    const nextEntry = selectorLocales().find((locale) => locale.id === next);
    if (!localeChangeAllowed(nextEntry, englishOk)) {
      setSelected(container, I18n.DEFAULT_LOCALE || 'sv-SE');
      return;
    }

    _localeChangeInflight = true;
    try {
    sessionStorage.setItem(I18n.STORAGE_KEY, next);
    try { localStorage.setItem(I18n.STORAGE_KEY, next); } catch (_) { /* ignore */ }
    try {
      sessionStorage.setItem(
        (window.LoginLocale && LoginLocale.EXPLICIT_KEY) || 'sd_locale_explicit_choice',
        '1'
      );
      localStorage.setItem(
        (window.LoginLocale && LoginLocale.EXPLICIT_KEY) || 'sd_locale_explicit_choice',
        '1'
      );
    } catch (_) { /* ignore */ }
    await I18n.load(next);
    setSelected(container, next);
    I18n.apply(container);

    if (window.Auth && typeof Auth.api === 'function') {
      let me = null;
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) me = await res.json();
      } catch (_) { /* pre-auth: no session */ }
      if (me?.type === 'parent') {
        await Auth.api('/api/family/settings', {
          method: 'PUT',
          body: JSON.stringify({ preferred_locale: next }),
        });
        const cached = Auth.getUser();
        if (cached) {
          cached.preferred_locale = next;
          try {
            localStorage.setItem(Auth.USER_KEY, JSON.stringify(cached));
          } catch (_) { /* ignore */ }
        }
        track('language_changed', {
          locale: next,
          previous_locale: previous,
          selection_source: 'settings',
        });
      }
    }

    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: next } }));
    document.dispatchEvent(new CustomEvent('parent-i18n-ready', { detail: { locale: next } }));
  } catch (err) {
    console.warn('[locale-switcher] Locale change failed:', err.message);
    try {
      sessionStorage.setItem(I18n.STORAGE_KEY, previous);
      localStorage.setItem(I18n.STORAGE_KEY, previous);
    } catch (_) { /* ignore */ }
    await I18n.load(previous);
    setSelected(container, previous);
    I18n.apply(container);
    const msg = I18n.t('auth.errors.serverError');
    if (typeof window.showToast === 'function' && msg && msg !== 'auth.errors.serverError') {
      window.showToast(msg);
    }
  } finally {
    _localeChangeInflight = false;
  }
  }

  async function mount(container) {
    if (!container || container.dataset.localeSwitcherMounted) return;
    injectStyles();
    await I18n.init();
    container.dataset.localeSwitcherMounted = '1';

    const dark = isDarkSurface(container);
    container.innerHTML = buildSwitcherHtml();
    const root = container.querySelector('.' + SWITCHER_CLASS);
    if (dark) root.classList.add('locale-switcher--dark', 'locale-switcher--compact');
    else root.classList.add('locale-switcher--compact');

    const englishOk = await isEnglishAllowed();
    if (!englishOk) {
      container.querySelectorAll('[data-locale-gated="english_app"]').forEach((btn) => {
        btn.disabled = true;
        btn.hidden = true;
      });
    }

    let locale = I18n.getCurrentLang();
    const activeEntry = selectorLocales().find((item) => item.id === locale);
    if (!localeChangeAllowed(activeEntry, englishOk)) {
      locale = I18n.DEFAULT_LOCALE || 'sv-SE';
    }
    setSelected(container, locale);
    I18n.apply(container);

    container.querySelectorAll('[data-locale-value]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const previous = I18n.getCurrentLang();
        const next = btn.getAttribute('data-locale-value');
        if (next === previous) return;
        await applyLocaleChange(container, next, previous, englishOk);
      });
    });
  }

  function autoMount() {
    document.querySelectorAll('[data-locale-switcher-mount]').forEach((el) => {
      mount(el);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body?.dataset?.i18nManualInit === 'true') return;
    autoMount();
  });

  window.LocaleSwitcher = { mount, autoMount, localeChangeAllowed };
})();
