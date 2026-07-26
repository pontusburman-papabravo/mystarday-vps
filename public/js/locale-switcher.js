/**
 * Language switcher — registration, login, settings.
 * Segmented Svenska | English·Beta control (no native select).
 */
(function localeSwitcherModule() {
  const SWITCHER_CLASS = 'locale-switcher';

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

  function buildSwitcherHtml() {
    return `
      <div class="${SWITCHER_CLASS}" role="group" aria-label="${escapeAttr(I18n.t('language.switchAria'))}">
        <div class="locale-switcher__track" data-locale-track>
          <button type="button" class="locale-switcher__option" data-locale-value="sv-SE" aria-pressed="false">
            <span data-i18n="language.sv-SE">Svenska</span>
          </button>
          <button type="button" class="locale-switcher__option" data-locale-value="en-GB" data-locale-en aria-pressed="false">
            <span class="locale-switcher__en-label" data-i18n="language.en-GB">English</span>
            <span class="locale-switcher__beta" data-i18n="language.betaBadge">Beta</span>
          </button>
        </div>
        <p class="locale-switcher__beta-hint hidden" data-locale-beta-hint data-i18n="language.choice.betaNote"></p>
      </div>`;
  }

  function injectStyles() {
    if (document.getElementById('locale-switcher-styles')) return;
    const style = document.createElement('style');
    style.id = 'locale-switcher-styles';
    style.textContent = `
      .locale-switcher { width: 100%; max-width: 20rem; margin: 0 auto; text-align: center; }
      .locale-switcher__track {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.25rem;
        padding: 0.25rem;
        border-radius: 999px;
        background: rgba(27, 35, 64, 0.06);
        border: 1px solid rgba(27, 35, 64, 0.08);
      }
      .locale-switcher__option {
        min-height: 44px;
        padding: 0.55rem 0.75rem;
        border: none;
        border-radius: 999px;
        background: transparent;
        color: #5A6178;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      }
      .locale-switcher__option[aria-pressed="true"] {
        background: #fff;
        color: #1B2340;
        box-shadow: 0 1px 4px rgba(27, 35, 64, 0.12);
      }
      .locale-switcher__beta {
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #6B3FA0;
        background: #EDE7F6;
        padding: 0.12rem 0.4rem;
        border-radius: 999px;
        line-height: 1.2;
      }
      .locale-switcher__option[aria-pressed="true"] .locale-switcher__beta {
        background: #F5A623;
        color: #1B2340;
      }
      .locale-switcher__beta-hint {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        line-height: 1.45;
        color: #6B3FA0;
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
      .locale-switcher--dark .locale-switcher__beta-hint {
        color: rgba(255, 255, 255, 0.72);
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

  function updateBetaHint(container, locale, showHints) {
    const hint = container.querySelector('[data-locale-beta-hint]');
    if (!hint) return;
    hint.classList.toggle('hidden', !showHints || locale !== 'en-GB');
  }

  async function applyLocaleChange(container, next, previous, englishOk, showHints) {
    if (next === 'en-GB' && !englishOk) {
      setSelected(container, 'sv-SE');
      return;
    }

    sessionStorage.setItem(I18n.STORAGE_KEY, next);
    try {
      sessionStorage.setItem(
        (window.LoginLocale && LoginLocale.EXPLICIT_KEY) || 'sd_locale_explicit_choice',
        '1'
      );
    } catch (_) { /* ignore */ }
    await I18n.load(next);
    setSelected(container, next);
    updateBetaHint(container, next, showHints);
    I18n.apply(container);

    if (window.Auth && typeof Auth.api === 'function') {
      try {
        const me = await Auth.api('/api/auth/me');
        if (me?.type === 'parent') {
          await Auth.api('/api/family/settings', {
            method: 'PUT',
            body: JSON.stringify({ preferred_locale: next }),
          });
          track('language_changed', {
            locale: next,
            previous_locale: previous,
            selection_source: 'settings',
          });
        }
      } catch (err) {
        console.warn('[locale-switcher] Could not persist locale:', err.message);
      }
    }

    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: next } }));
    document.dispatchEvent(new CustomEvent('parent-i18n-ready', { detail: { locale: next } }));
  }

  async function mount(container) {
    if (!container || container.dataset.localeSwitcherMounted) return;
    injectStyles();
    await I18n.init();
    container.dataset.localeSwitcherMounted = '1';

    const dark = isDarkSurface(container);
    const showHints = !dark;
    container.innerHTML = buildSwitcherHtml();
    const root = container.querySelector('.' + SWITCHER_CLASS);
    if (dark) root.classList.add('locale-switcher--dark', 'locale-switcher--compact');
    else root.classList.add('locale-switcher--compact');

    const enBtn = container.querySelector('[data-locale-en]');
    const englishOk = await isEnglishAllowed();
    if (!englishOk && enBtn) {
      enBtn.disabled = true;
      enBtn.hidden = true;
    }

    let locale = I18n.getCurrentLang();
    if (locale === 'en-GB' && !englishOk) locale = 'sv-SE';
    setSelected(container, locale);
    updateBetaHint(container, locale, showHints);
    I18n.apply(container);

    container.querySelectorAll('[data-locale-value]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const previous = I18n.getCurrentLang();
        const next = btn.getAttribute('data-locale-value');
        if (next === previous) return;
        await applyLocaleChange(container, next, previous, englishOk, showHints);
      });
    });
  }

  function autoMount() {
    document.querySelectorAll('[data-locale-switcher-mount]').forEach((el) => {
      mount(el);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    autoMount();
  });

  window.LocaleSwitcher = { mount, autoMount };
})();
