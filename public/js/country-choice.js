/**
 * Mandatory country-of-residence choice for new users (P-i18n market model).
 * Independent from language — see ADR-018.
 */
(function countryChoiceModule() {
  'use strict';

  const CONFIRMED_KEY = 'sd_country_confirmed';
  const STORAGE_KEY = 'sd_country_code';

  function getCountries() {
    return (window.MarketCountries && window.MarketCountries.REGISTRATION_COUNTRIES) || [];
  }

  function track(eventType, metadata) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, metadata || {});
    }
  }

  function labelFor(entry, locale) {
    if (!entry || !entry.labels) return entry?.code || '';
    return entry.labels[locale] || entry.labels['en-GB'] || entry.code;
  }

  function suggestedCountry() {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (/^sv/i.test(nav) || location.pathname === '/' || (!location.pathname.startsWith('/en'))) {
      return 'SE';
    }
    return 'SE';
  }

  function isConfirmed() {
    return sessionStorage.getItem(CONFIRMED_KEY) === '1' && Boolean(sessionStorage.getItem(STORAGE_KEY));
  }

  function markConfirmed(code) {
    sessionStorage.setItem(CONFIRMED_KEY, '1');
    sessionStorage.setItem(STORAGE_KEY, code);
  }

  function buildHtml(suggest) {
    const locale = (window.I18n && I18n.getCurrentLang()) || 'sv-SE';
    const countries = getCountries().length
      ? getCountries()
      : [{ code: 'SE', labels: { 'sv-SE': 'Sverige', 'en-GB': 'Sweden' } }];

    const featured = countries.filter((c) => c.group === 'featured' || ['SE', 'GB', 'US', 'ZZ'].includes(c.code));
    const eu = countries.filter((c) => !featured.includes(c));

    let options = `<option value="">${labelFor({ labels: { 'sv-SE': 'Välj land', 'en-GB': 'Choose country' } }, locale)}</option>`;
    options += `<option value="SE"${suggest === 'SE' ? ' selected' : ''}>${labelFor({ code: 'SE', labels: { 'sv-SE': 'Sverige', 'en-GB': 'Sweden' } }, locale)}</option>`;
    if (eu.length) {
      options += `<optgroup label="${locale === 'en-GB' ? 'Other EU/EEA country' : 'Annat EU/EES-land'}">`;
      eu.forEach((c) => {
        options += `<option value="${c.code}"${suggest === c.code ? ' selected' : ''}>${labelFor(c, locale)}</option>`;
      });
      options += '</optgroup>';
    }
    const gb = featured.find((c) => c.code === 'GB') || { code: 'GB', labels: { 'sv-SE': 'Storbritannien', 'en-GB': 'United Kingdom' } };
    const us = featured.find((c) => c.code === 'US') || { code: 'US', labels: { 'sv-SE': 'USA', 'en-GB': 'United States' } };
    const other = featured.find((c) => c.code === 'ZZ') || { code: 'ZZ', labels: { 'sv-SE': 'Annat land', 'en-GB': 'Other country' } };
    options += `<option value="GB">${labelFor(gb, locale)}</option>`;
    options += `<option value="US">${labelFor(us, locale)}</option>`;
    options += `<option value="ZZ">${labelFor(other, locale)}</option>`;

    return `
      <section class="country-choice" role="group" aria-labelledby="countryChoiceHeading">
        <h2 id="countryChoiceHeading" class="country-choice__title" data-i18n="market.choice.title">Var bor familjen?</h2>
        <p class="country-choice__desc" data-i18n="market.choice.description">
          Vi använder detta för rätt villkor och integritetsinformation. Det är inte samma sak som språkval.
        </p>
        <label class="country-choice__label" for="countryChoiceSelect" data-i18n="market.choice.label">Land</label>
        <select id="countryChoiceSelect" class="country-choice__select" aria-describedby="countryChoiceHint">
          ${options}
        </select>
        <p id="countryChoiceHint" class="country-choice__hint" data-i18n="market.choice.hint" hidden></p>
        <p class="country-choice__error" data-country-choice-error hidden role="alert"></p>
      </section>`;
  }

  function injectStyles() {
    if (document.getElementById('country-choice-styles')) return;
    const style = document.createElement('style');
    style.id = 'country-choice-styles';
    style.textContent = `
      .country-choice { text-align: left; margin: 1rem 0 1.25rem; }
      .country-choice__title { font-size: 1.05rem; font-weight: 700; color: #1B2340; margin-bottom: 0.35rem; text-align: center; }
      .country-choice__desc { font-size: 0.8125rem; color: #5A6178; margin-bottom: 0.75rem; text-align: center; line-height: 1.45; }
      .country-choice__label { display: block; font-size: 0.8125rem; font-weight: 600; color: #1B2340; margin-bottom: 0.35rem; }
      .country-choice__select {
        width: 100%; min-height: 44px; padding: 0.65rem 0.75rem; border-radius: 12px;
        border: 2px solid #EDE7F6; background: #fff; color: #1B2340; font-size: 1rem;
      }
      .country-choice__hint { font-size: 0.75rem; color: #6B3FA0; margin-top: 0.5rem; }
      .country-choice__error { font-size: 0.8125rem; color: #ef4444; margin-top: 0.5rem; text-align: center; }
    `;
    document.head.appendChild(style);
  }

  function closedMarketMessage(code) {
    const locale = (window.I18n && I18n.getCurrentLang()) || 'sv-SE';
    if (code === 'GB') {
      return locale === 'en-GB'
        ? 'Registration from the United Kingdom is not open yet. You can still use English in Sweden during our beta.'
        : 'Registrering från Storbritannien är inte öppen ännu. Du kan fortfarande använda engelska i Sverige under betan.';
    }
    if (code === 'US') {
      return locale === 'en-GB'
        ? 'Registration from the United States is not open yet.'
        : 'Registrering från USA är inte öppen ännu.';
    }
    return '';
  }

  async function mount(container) {
    if (!container || container.dataset.countryChoiceMounted) return;
    injectStyles();
    if (window.I18n) await I18n.init();
    const suggest = sessionStorage.getItem(STORAGE_KEY) || suggestedCountry();
    container.dataset.countryChoiceMounted = '1';
    container.innerHTML = buildHtml(suggest);
    if (window.I18n) I18n.apply(container);

    const select = container.querySelector('#countryChoiceSelect');
    const hint = container.querySelector('.country-choice__hint');
    const errorEl = container.querySelector('[data-country-choice-error]');
    let selected = isConfirmed() ? sessionStorage.getItem(STORAGE_KEY) : null;

    if (selected && select) select.value = selected;

    function updateHint() {
      const code = select.value;
      const closed = closedMarketMessage(code);
      if (hint) {
        hint.textContent = closed;
        hint.hidden = !closed;
      }
    }

    select.addEventListener('change', () => {
      const code = select.value;
      if (!code) {
        selected = null;
        sessionStorage.removeItem(CONFIRMED_KEY);
        if (errorEl) errorEl.hidden = true;
        updateHint();
        return;
      }
      const closed = closedMarketMessage(code);
      if (closed) {
        selected = null;
        sessionStorage.removeItem(CONFIRMED_KEY);
        if (errorEl) {
          errorEl.textContent = closed;
          errorEl.hidden = false;
        }
        updateHint();
        return;
      }
      selected = code;
      markConfirmed(code);
      if (errorEl) errorEl.hidden = true;
      updateHint();
      track('country_selected', { country_code: code, selection_source: 'active_choice' });
      document.dispatchEvent(new CustomEvent('country-choice-confirmed', { detail: { country_code: code } }));
    });

    updateHint();

    return {
      getSelected: () => selected,
      requireSelection: () => {
        if (selected && !closedMarketMessage(selected)) return true;
        if (errorEl) {
          errorEl.textContent = (window.I18n && I18n.t('market.choice.required')) || 'Välj land för att fortsätta';
          errorEl.hidden = false;
        }
        return false;
      },
      isConfirmed: () => Boolean(selected) || isConfirmed(),
    };
  }

  function gateRegisterForm() {
    const formCard = document.getElementById('formCard');
    const mountEl = document.querySelector('[data-country-choice-mount]');
    if (!formCard || !mountEl) return;

    const updateForm = () => {
      const langOk = !window.LanguageChoice || LanguageChoice.isConfirmed();
      const countryOk = isConfirmed();
      const enabled = langOk && countryOk;
      formCard.style.opacity = enabled ? '1' : '0.45';
      formCard.style.pointerEvents = enabled ? '' : 'none';
    };

    updateForm();
    document.addEventListener('language-choice-confirmed', () => {
      if (mountEl.dataset.countryChoiceMounted !== '1') mount(mountEl);
      updateForm();
    });
    document.addEventListener('country-choice-confirmed', updateForm);
  }

  function autoMount() {
    const mounts = document.querySelectorAll('[data-country-choice-mount]');
    if (!mounts.length) return;
    document.addEventListener('language-choice-confirmed', () => {
      mounts.forEach((el) => mount(el));
    }, { once: true });
    if (document.body.dataset.countryChoiceGate === 'register') {
      gateRegisterForm();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    autoMount();
  });

  window.CountryChoice = { mount, autoMount, isConfirmed, getCountryCode: () => sessionStorage.getItem(STORAGE_KEY) };
})();
