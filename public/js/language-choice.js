/**
 * Mandatory language choice for new users (P-i18n-Language-Launch-Foundation).
 * Browser locale may suggest but user must actively confirm.
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
    if (!window.I18n) return 'sv-SE';
    const nav = navigator.languages || [navigator.language || ''];
    for (const l of nav) {
      const n = I18n._normalize ? I18n._normalize(l) : null;
      if (n) return n;
    }
    return 'sv-SE';
  }

  function isConfirmed() {
    return sessionStorage.getItem(CONFIRMED_KEY) === '1';
  }

  function markConfirmed(locale) {
    sessionStorage.setItem(CONFIRMED_KEY, '1');
    sessionStorage.setItem(I18n.STORAGE_KEY, locale);
  }

  function buildHtml(suggest) {
    const svActive = suggest === 'sv-SE' ? ' language-choice__btn--suggested' : '';
    const enActive = suggest === 'en-GB' ? ' language-choice__btn--suggested' : '';
    return `
      <section class="language-choice" role="group" aria-labelledby="languageChoiceHeading">
        <h2 id="languageChoiceHeading" class="language-choice__title">
          <span data-i18n="language.choice.title">Välj språk</span>
          <span class="language-choice__title-en" lang="en"> / Choose your language</span>
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
            <span class="language-choice__beta">Beta</span>
          </button>
        </div>
        <p class="language-choice__beta-note" data-i18n="language.choice.betaNote" hidden>
          Den engelska versionen är i beta. Viss text kan fortfarande visas på svenska.
        </p>
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
      .language-choice__title-en { font-weight: 500; color: #5A6178; font-size: 0.95rem; }
      .language-choice__desc { font-size: 0.8125rem; color: #5A6178; margin-bottom: 0.75rem; }
      .language-choice__buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      .language-choice__btn {
        min-width: 8.5rem; min-height: 44px; padding: 0.75rem 1rem; border-radius: 12px;
        border: 2px solid #EDE7F6; background: #fff; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
        display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
      }
      .language-choice__btn--suggested { border-color: #F5A623; box-shadow: 0 0 0 1px #F5A62333; }
      .language-choice__btn--selected { border-color: #F5A623; background: #FFF8EB; }
      .language-choice__label { font-weight: 700; color: #1B2340; font-size: 1rem; }
      .language-choice__beta {
        font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
        color: #6B3FA0; background: #EDE7F6; padding: 0.1rem 0.4rem; border-radius: 999px;
      }
      .language-choice__beta-note { font-size: 0.75rem; color: #6B3FA0; margin-top: 0.65rem; }
      .language-choice__child-note { font-size: 0.75rem; color: #5A6178; margin-top: 0.5rem; line-height: 1.45; }
      .language-choice__error { font-size: 0.8125rem; color: #ef4444; margin-top: 0.5rem; }
    `;
    document.head.appendChild(style);
  }

  async function mount(container) {
    if (!container || container.dataset.languageChoiceMounted) return;
    injectStyles();
    await I18n.init();
    const suggest = suggestedLocale();
    container.dataset.languageChoiceMounted = '1';
    container.innerHTML = buildHtml(suggest);
    I18n.apply(container);

    const betaNote = container.querySelector('.language-choice__beta-note');
    const childNote = container.querySelector('.language-choice__child-note');
    const errorEl = container.querySelector('[data-language-choice-error]');
    let selected = isConfirmed() ? I18n.getCurrentLang() : null;

    if (selected) {
      const btn = container.querySelector(`[data-locale-choice="${selected}"]`);
      if (btn) btn.classList.add('language-choice__btn--selected');
      if (selected === 'en-GB' && betaNote) betaNote.hidden = false;
      if (selected === 'en-GB' && childNote) childNote.hidden = false;
    }

    if (!sessionStorage.getItem(VIEWED_SESSION_KEY)) {
      track('language_choice_viewed', { suggested_locale: suggest, route: location.pathname });
      sessionStorage.setItem(VIEWED_SESSION_KEY, '1');
      track('language_selected', { locale: suggest, selection_source: 'browser_suggestion', beta_shown: suggest === 'en-GB' });
    }

    container.querySelectorAll('[data-locale-choice]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const locale = btn.getAttribute('data-locale-choice');
        container.querySelectorAll('[data-locale-choice]').forEach((b) => {
          b.classList.toggle('language-choice__btn--selected', b === btn);
        });
        selected = locale;
        markConfirmed(locale);
        await I18n.load(locale);
        I18n.apply(document);
        if (betaNote) betaNote.hidden = locale !== 'en-GB';
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
      requireSelection: () => {
        if (selected) return true;
        if (errorEl) {
          errorEl.textContent = I18n.t('language.choice.required');
          errorEl.hidden = false;
        }
        return false;
      },
      isConfirmed: () => Boolean(selected) || isConfirmed(),
    };
  }

  function gateRegisterForm() {
    // Registration uses combined language + country gate in country-choice.js.
    if (document.body.dataset.countryChoiceGate === 'register') return;
    const formCard = document.getElementById('formCard');
    const mount = document.querySelector('[data-language-choice-mount]');
    if (!formCard || !mount) return;

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

  document.addEventListener('DOMContentLoaded', () => {
    autoMount();
  });

  window.LanguageChoice = { mount, autoMount, isConfirmed };
})();
