/**
 * Simple language switcher — registration, login, settings.
 * English option requires english_app feature flag when family exists.
 */
(function localeSwitcherModule() {
  const SWITCHER_CLASS = 'locale-switcher';

  function buildSwitcherHtml() {
    return `
      <div class="${SWITCHER_CLASS}" role="group" aria-label="${escapeAttr(I18n.t('language.switchAria'))}">
        <label for="localeSelect" class="sr-only">${escapeAttr(I18n.t('language.label'))}</label>
        <select id="localeSelect" class="locale-switcher__select" data-locale-switcher>
          <option value="sv-SE">${escapeHtml(I18n.t('language.sv-SE'))}</option>
          <option value="en-GB" data-locale-en>${escapeHtml(I18n.t('language.en-GB'))}</option>
        </select>
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

    select.addEventListener('change', async () => {
      const next = select.value;
      if (next === 'en-GB' && !englishOk) {
        select.value = 'sv-SE';
        return;
      }
      sessionStorage.setItem(I18n.STORAGE_KEY, next);
      await I18n.load(next);

      if (window.Auth && typeof Auth.api === 'function') {
        try {
          const me = await Auth.api('/api/auth/me');
          if (me?.type === 'parent') {
            await Auth.api('/api/family/settings', {
              method: 'PUT',
              body: JSON.stringify({ preferred_locale: next }),
            });
          }
        } catch (err) {
          console.warn('[locale-switcher] Could not persist locale:', err.message);
        }
      }

      document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: next } }));
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
