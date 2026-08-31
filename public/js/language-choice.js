/**
 * Language switcher for new users (P-i18n-Language-Launch-Foundation).
 * The language already on screen is the selection. Buttons change it.
 * Browser locale must not highlight a different language than the one displayed.
 */
(function languageChoiceModule() {
  'use strict';

  const CONFIRMED_KEY = 'sd_locale_confirmed';
  const VIEWED_SESSION_KEY = 'sd_language_choice_viewed';

  function track(eventType, metadata) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, metadata || {});
    }
  }

  function suggestedLocale() {
    if (location.pathname === '/en' || location.pathname.startsWith('/en/')) {
      return 'en-GB';
    }
    const i18n = window.I18n;
    if (!i18n) return 'sv-SE';
    const nav = navigator.languages || [navigator.language || ''];
    for (const l of nav) {
      const n = i18n._normalize ? i18n._normalize(l) : null;
      if (n) return n;
    }
    return 'sv-SE';
  }

  function localeBundleReady() {
    try {
      const i18n = window.I18n;
      return Boolean(i18n && i18n.locale && Object.keys(i18n.locale).length > 0);
    } catch (_) {
      return false;
    }
  }

  function displayedLocale() {
    try {
      const i18n = window.I18n;
      if (!localeBundleReady() || typeof i18n.getCurrentLang !== 'function') return null;
      const lang = i18n.getCurrentLang();
      if (lang === 'sv-SE' || lang === 'en-GB') return lang;
    } catch (_) { /* ignore */ }
    return null;
  }

  function sessionConfirmed() {
    try {
      return sessionStorage.getItem(CONFIRMED_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function isConfirmed() {
    return sessionConfirmed() || Boolean(displayedLocale());
  }

  function markConfirmed(locale) {
    sessionStorage.setItem(CONFIRMED_KEY, '1');
    sessionStorage.setItem((window.I18n && window.I18n.STORAGE_KEY) || 'sd_preferred_locale', locale);
    try {
      sessionStorage.setItem(
        (window.LoginLocale && LoginLocale.EXPLICIT_KEY) || 'sd_locale_explicit_choice',
        '1'
      );
    } catch (_) { /* ignore */ }
  }

  function acceptDisplayedLocale() {
    const locale = displayedLocale() || suggestedLocale();
    if (locale === 'sv-SE' || locale === 'en-GB') {
      markConfirmed(locale);
    }
    return locale;
  }

  function buildHtml(selected) {
    const svActive = selected === 'sv-SE' ? ' language-choice__btn--selected' : '';
    const enActive = selected === 'en-GB' ? ' language-choice__btn--selected' : '';
    return `
      <section class="language-choice" role="group" aria-labelledby="languageChoiceHeading">
        <h2 id="languageChoiceHeading" class="language-choice__title">
          <span data-i18n="language.choice.title">Språk</span>
        </h2>
        <p class="language-choice__desc" data-i18n="language.choice.description">
          Du kan ändra språk senare i Inställningar.
        </p>
        <div class="language-choice__buttons">
          <button type="button" class="language-choice__btn${svActive}" data-locale-choice="sv-SE">
            <span class="language-choice__label">Svenska</span>
          </button>
          <button type="button" class="language-choice__btn${enActive}" data-locale-choice="en-GB">
            <span class="language-choice__label">English</span>
          </button>
        </div>
        <p class="language-choice__child-note" data-i18n="language.choice.childNote" hidden></p>
        <p class="language-choice__error" data-language-choice-error hidden role="alert"></p>
      </section>`;
  }

  function injectStyles() {
    if (document.getElementById('language-choice-styles')) return;
    const style = document.createElement('style');
    style.id = 'language-choice-styles';
    style.textContent = `
      .language-choice { text-align: center; margin: 1rem 0 1.25rem; }
      .language-choice__title { font-size: 1.125rem; font-weight: 700; color: #1B2340; margin-bottom: 0.35rem; }
      .language-choice__desc { font-size: 0.8125rem; color: #5A6178; margin-bottom: 0.75rem; }
      .language-choice__buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      .language-choice__btn {
        min-width: 8.5rem; min-height: 44px; padding: 0.75rem 1rem; border-radius: 12px;
        border: 2px solid #EDE7F6; background: #fff; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
        display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
      }
      .language-choice__btn--selected { border-color: #F5A623; background: #FFF8EB; }
      .language-choice__label { font-weight: 700; color: #1B2340; font-size: 1rem; }
      .language-choice__child-note { font-size: 0.75rem; color: #5A6178; margin-top: 0.5rem; line-height: 1.45; }
      .language-choice__error { font-size: 0.8125rem; color: #ef4444; margin-top: 0.5rem; }
    `;
    document.head.appendChild(style);
  }

  async function mount(container) {
    if (!container || container.dataset.languageChoiceMounted) return;
    injectStyles();
    await window.I18n.init();
    const selectedLocale = acceptDisplayedLocale();
    container.dataset.languageChoiceMounted = '1';
    container.innerHTML = buildHtml(selectedLocale);
    window.I18n.apply(container);

    const childNote = container.querySelector('.language-choice__child-note');
    const errorEl = container.querySelector('[data-language-choice-error]');
    let selected = selectedLocale;

    if (selected === 'en-GB' && childNote) childNote.hidden = false;

    if (!sessionStorage.getItem(VIEWED_SESSION_KEY)) {
      track('language_choice_viewed', { suggested_locale: suggestedLocale(), route: location.pathname });
      sessionStorage.setItem(VIEWED_SESSION_KEY, '1');
      track('language_selected', {
        locale: selectedLocale,
        selection_source: 'displayed_locale',
        beta_shown: selectedLocale === 'en-GB',
      });
    }

    container.querySelectorAll('[data-locale-choice]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const locale = btn.getAttribute('data-locale-choice');
        container.querySelectorAll('[data-locale-choice]').forEach((b) => {
          b.classList.toggle('language-choice__btn--selected', b === btn);
        });
        selected = locale;
        markConfirmed(locale);
        await window.I18n.load(locale);
        window.I18n.apply(document);
        if (childNote) childNote.hidden = locale !== 'en-GB';
        if (errorEl) errorEl.hidden = true;
        track('language_selected', {
          locale,
          selection_source: 'active_choice',
          beta_shown: locale === 'en-GB',
        });
        document.dispatchEvent(new CustomEvent('language-choice-confirmed', { detail: { locale } }));
      });
    });

    return {
      getSelected: () => selected,
      requireSelection,
      isConfirmed: () => Boolean(selected) || isConfirmed(),
    };
  }

  function gateRegisterForm() {
    // Registration uses combined language + country gate in country-choice.js.
    if (document.body.dataset.countryChoiceGate === 'register') return;
    const formCard = document.getElementById('formCard');
    const mountEl = document.querySelector('[data-language-choice-mount]');
    if (!formCard || !mountEl) return;

    const hideForm = () => {
      formCard.style.opacity = '0.45';
      formCard.style.pointerEvents = 'none';
    };
    const showForm = () => {
      formCard.style.opacity = '1';
      formCard.style.pointerEvents = '';
    };

    if (!isConfirmed()) hideForm();
    document.addEventListener('language-choice-confirmed', showForm);
  }

  function autoMount() {
    const mounts = document.querySelectorAll('[data-language-choice-mount]');
    if (!mounts.length) return;
    mounts.forEach((el) => {
      mount(el);
    });
    if (document.body.dataset.languageChoiceGate === 'register') {
      gateRegisterForm();
    }
  }

  /**
   * Registration language gate. The language already on screen counts.
   * Fail-closed only when no locale is available. Never throws.
   */
  function requireSelection() {
    try {
      if (sessionConfirmed()) return true;
      if (displayedLocale()) {
        acceptDisplayedLocale();
        return true;
      }
      const errorEl = document.querySelector('[data-language-choice-error]');
      if (errorEl) {
        let msg = 'Välj språk för att fortsätta';
        try {
          if (window.I18n && typeof window.I18n.t === 'function') {
            msg = window.I18n.t('language.choice.required') || msg;
          }
        } catch (_) { /* keep fallback */ }
        errorEl.textContent = msg;
        errorEl.hidden = false;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function revealLanguageError() {
    try {
      requireSelection();
      const mountEl = document.querySelector('[data-language-choice-mount]');
      if (mountEl && typeof mountEl.scrollIntoView === 'function') {
        mountEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (_) { /* ignore */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    autoMount();
  });

  window.LanguageChoice = {
    mount,
    autoMount,
    isConfirmed,
    requireSelection,
    revealLanguageError,
  };
})();
