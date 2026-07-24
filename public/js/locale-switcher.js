/**
 * Simple language switcher — registration, login, settings.
 * English option shows Beta label; settings persist via family API.
 */
(function localeSwitcherModule() {
  const SWITCHER_CLASS = 'locale-switcher';

  function track(eventType, metadata) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, metadata || {});
    }
  }

  function buildSwitcherHtml() {
    return `
      <div class="${SWITCHER_CLASS}" role="group" aria-label="${escapeAttr(I18n.t('language.switchAria'))}">
        <label for="localeSelect" class="sr-only">${escapeAttr(I18n.t('language.label'))}</label>
        <select id="localeSelect" class="locale-switcher__select" data-locale-switcher>
          <option value="sv-SE">${escapeHtml(I18n.t('language.sv-SE'))}</option>
          <option value="en-GB" data-locale-en>${escapeHtml(I18n.t('language.en-GB-beta') || I18n.t('language.en-GB'))}</option>
        </select>
        <p class="locale-switcher__beta-hint text-xs text-text-soft mt-2 hidden" data-locale-beta-hint data-i18n="settings.language.betaNote"></p>
      </div>`;
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

  function updateBetaHint(select, container) {
    const hint = container.querySelector('[data-locale-beta-hint]');
    if (!hint) return;
    hint.classList.toggle('hidden', select.value !== 'en-GB');
  }

  async function mount(container) {
    if (!container || container.dataset.localeSwitcherMounted) return;
    await I18n.init();
    container.dataset.localeSwitcherMounted = '1';
    container.innerHTML = buildSwitcherHtml();

    const select = container.querySelector('[data-locale-switcher]');
    const enOption = select.querySelector('[data-locale-en]');
    const englishOk = await isEnglishAllowed();

    if (!englishOk) {
      enOption.disabled = true;
      enOption.hidden = true;
    }

    select.value = I18n.getCurrentLang();
    if (select.value === 'en-GB' && !englishOk) {
      select.value = 'sv-SE';
    }
    updateBetaHint(select, container);
    I18n.apply(container);

    select.addEventListener('change', async () => {
      const previous = I18n.getCurrentLang();
      const next = select.value;
      if (next === 'en-GB' && !englishOk) {
        select.value = 'sv-SE';
        return;
      }
      sessionStorage.setItem(I18n.STORAGE_KEY, next);
      await I18n.load(next);
      updateBetaHint(select, container);
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
