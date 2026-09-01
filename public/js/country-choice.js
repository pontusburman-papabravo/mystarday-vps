/**
 * Mandatory country-of-residence choice for new users (P-i18n market model).
 * Independent from language — see ADR-018.
 *
 * Country is an explicit user choice. A browser/path suggestion must never
 * appear selected or become confirmed. isConfirmed() means the user picked
 * a country in this session, not that one is merely displayed.
 */
(function countryChoiceModule() {
  'use strict';

  const CONFIRMED_KEY = 'sd_country_confirmed';
  const STORAGE_KEY = 'sd_country_code';

  function getCountries() {
    return (window.MarketCountries && window.MarketCountries.REGISTRATION_COUNTRIES) || [];
  }

  function track(eventType, metadata) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(null, eventType, metadata || {});
    }
  }

  function labelFor(entry, locale) {
    if (!entry || !entry.labels) return entry?.code || '';
    return entry.labels[locale] || entry.labels['en-GB'] || entry.code;
  }

  function suggestedCountry() {
    const path = location.pathname || '';
    const lang = (document.documentElement.lang || '').toLowerCase();
    if (path.startsWith('/en') || lang === 'en' || lang === 'en-gb') return '';
    return 'SE';
  }

  function sessionConfirmed() {
    try {
      return sessionStorage.getItem(CONFIRMED_KEY) === '1' && Boolean(sessionStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return false;
    }
  }

  function confirmedCountryCode() {
    return sessionConfirmed() ? sessionStorage.getItem(STORAGE_KEY) : null;
  }

  function isConfirmed() {
    return sessionConfirmed();
  }

  function markConfirmed(code) {
    sessionStorage.setItem(CONFIRMED_KEY, '1');
    sessionStorage.setItem(STORAGE_KEY, code);
  }

  function clearConfirmation() {
    sessionStorage.removeItem(CONFIRMED_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function selectedAttr(code, confirmedCode) {
    return confirmedCode === code ? ' selected' : '';
  }

  function buildHtml(confirmedCode) {
    const locale = (window.I18n && typeof window.I18n.getCurrentLang === 'function' && window.I18n.getCurrentLang()) || 'sv-SE';
    const countries = getCountries().length
      ? getCountries()
      : [{ code: 'SE', labels: { 'sv-SE': 'Sverige', 'en-GB': 'Sweden' } }];

    const featured = countries.filter((c) => c.group === 'featured' || ['SE', 'IE', 'FI', 'GB', 'US', 'ZZ'].includes(c.code));
    const eu = countries.filter((c) => !['SE', 'IE', 'FI', 'GB', 'US', 'ZZ'].includes(c.code));
    const suggest = suggestedCountry();

    const placeholderSelected = confirmedCode ? '' : ' selected';
    let options = `<option value=""${placeholderSelected}>${labelFor({ labels: { 'sv-SE': 'Välj land', 'en-GB': 'Choose country' } }, locale)}</option>`;
    options += `<option value="SE"${selectedAttr('SE', confirmedCode)}>${labelFor({ code: 'SE', labels: { 'sv-SE': 'Sverige', 'en-GB': 'Sweden' } }, locale)}</option>`;
    options += `<option value="IE"${selectedAttr('IE', confirmedCode)}>${labelFor({ code: 'IE', labels: { 'sv-SE': 'Irland', 'en-GB': 'Ireland' } }, locale)}</option>`;
    options += `<option value="FI"${selectedAttr('FI', confirmedCode)}>${labelFor({ code: 'FI', labels: { 'sv-SE': 'Finland', 'en-GB': 'Finland' } }, locale)}</option>`;
    if (eu.length) {
      options += `<optgroup label="${locale === 'en-GB' ? 'Other EU/EEA country' : 'Annat EU/EES-land'}">`;
      eu.forEach((c) => {
        options += `<option value="${c.code}"${selectedAttr(c.code, confirmedCode)}>${labelFor(c, locale)}</option>`;
      });
      options += '</optgroup>';
    }
    const gb = featured.find((c) => c.code === 'GB') || { code: 'GB', labels: { 'sv-SE': 'Storbritannien', 'en-GB': 'United Kingdom' } };
    const us = featured.find((c) => c.code === 'US') || { code: 'US', labels: { 'sv-SE': 'USA', 'en-GB': 'United States' } };
    const other = featured.find((c) => c.code === 'ZZ') || { code: 'ZZ', labels: { 'sv-SE': 'Annat land', 'en-GB': 'Other country' } };
    options += `<option value="GB"${selectedAttr('GB', confirmedCode)}>${labelFor(gb, locale)}</option>`;
    options += `<option value="US"${selectedAttr('US', confirmedCode)}>${labelFor(us, locale)}</option>`;
    options += `<option value="ZZ"${selectedAttr('ZZ', confirmedCode)}>${labelFor(other, locale)}</option>`;

    return `
      <section class="country-choice" role="group" aria-labelledby="countryChoiceHeading">
        <h2 id="countryChoiceHeading" class="country-choice__title" data-i18n="market.choice.title">Var bor familjen?</h2>
        <p class="country-choice__desc" data-i18n="market.choice.description">
          Vi använder detta för rätt villkor och integritetsinformation. Det är inte samma sak som språkval.
        </p>
        <label class="country-choice__label" for="countryChoiceSelect" data-i18n="market.choice.label">Land</label>
        <select id="countryChoiceSelect" class="country-choice__select" aria-describedby="countryChoiceHint" data-suggested-country="${suggest}">
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

  let gateMap = {
    SE: true,
    IE: false,
    FI: false,
    NO: false,
    DK: false,
    EU: false,
    UK: false,
    US: false,
    OTHER: false,
  };

  async function loadGates() {
    try {
      const res = await fetch('/api/market/registration-gates');
      if (!res.ok) return;
      const data = await res.json();
      const signup = data.signup_allowed || null;
      function canSignup(code, marketOpen, seDefaultOpen) {
        if (signup && Object.prototype.hasOwnProperty.call(signup, code)) {
          return signup[code] === true;
        }
        return seDefaultOpen ? marketOpen !== false : marketOpen === true;
      }
      gateMap = {
        SE: canSignup('SE', data.market_se_open, true),
        IE: canSignup('IE', data.market_ie_open, false),
        FI: canSignup('FI', data.market_fi_open, false),
        NO: canSignup('NO', data.market_no_open, false),
        DK: canSignup('DK', data.market_dk_open, false),
        EU: canSignup('DE', data.market_eu_open, false),
        UK: canSignup('GB', data.market_uk_open, false),
        US: canSignup('US', data.market_us_open, false),
        OTHER: canSignup('ZZ', data.market_other_open, false),
      };
    } catch (_) { /* keep defaults */ }
  }

  function isCountryOpen(code) {
    if (code === 'SE') return gateMap.SE;
    if (code === 'IE') return gateMap.IE;
    if (code === 'FI') return gateMap.FI;
    if (code === 'NO') return gateMap.NO;
    if (code === 'DK') return gateMap.DK;
    if (code === 'GB') return gateMap.UK;
    if (code === 'US') return gateMap.US;
    if (code === 'ZZ') return gateMap.OTHER;
    if (code && code !== 'SE') return gateMap.EU;
    return false;
  }

  function closedMarketMessage(code) {
    if (!code || isCountryOpen(code)) return '';
    try {
      if (window.I18n && typeof window.I18n.t === 'function') {
        if (code === 'IE') return window.I18n.t('market.choice.closedIe');
        if (code === 'FI') return window.I18n.t('market.choice.closedFi');
        if (code === 'NO') return window.I18n.t('market.choice.closedNo');
        if (code === 'DK') return window.I18n.t('market.choice.closedDk');
        if (code === 'GB') return window.I18n.t('market.choice.closedUk');
        if (code === 'US') return window.I18n.t('market.choice.closedUs');
        if (code === 'ZZ') return window.I18n.t('market.choice.closedOther');
        if (code !== 'SE') return window.I18n.t('market.choice.closedEu');
      }
    } catch (_) { /* fall through */ }
    return 'My Starday is not available in your country yet.';
  }

  function isOpenCountry(code) {
    return Boolean(code) && isCountryOpen(code) && !closedMarketMessage(code);
  }

  async function mount(container) {
    if (!container || container.dataset.countryChoiceMounted) return;
    injectStyles();
    if (window.I18n && typeof window.I18n.init === 'function') await window.I18n.init();
    await loadGates();
    const confirmedCode = confirmedCountryCode();
    container.dataset.countryChoiceMounted = '1';
    container.innerHTML = buildHtml(confirmedCode);
    if (window.I18n && typeof window.I18n.apply === 'function') window.I18n.apply(container);

    const select = container.querySelector('#countryChoiceSelect');
    const hint = container.querySelector('.country-choice__hint');
    const errorEl = container.querySelector('[data-country-choice-error]');
    let selected = isOpenCountry(confirmedCode) ? confirmedCode : null;

    if (confirmedCode && select) select.value = confirmedCode;

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
        clearConfirmation();
        if (errorEl) errorEl.hidden = true;
        updateHint();
        return;
      }
      const closed = closedMarketMessage(code);
      if (closed || !isCountryOpen(code)) {
        selected = null;
        clearConfirmation();
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
      requireSelection,
      isConfirmed: () => Boolean(selected) || isConfirmed(),
    };
  }

  function autoMount() {
    const mounts = document.querySelectorAll('[data-country-choice-mount]');
    if (!mounts.length) return;
    mounts.forEach((el) => mount(el));
    document.addEventListener('language-choice-confirmed', () => {
      mounts.forEach((el) => {
        delete el.dataset.countryChoiceMounted;
        el.innerHTML = '';
        mount(el);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    autoMount();
  });

  function showSelectionError() {
    const errorEl = document.querySelector('[data-country-choice-error]');
    if (!errorEl) return;
    let msg = 'Välj land för att fortsätta';
    try {
      if (window.I18n && typeof window.I18n.t === 'function') {
        msg = window.I18n.t('market.choice.required') || msg;
      }
    } catch (_) { /* keep fallback */ }
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function showGateError(code) {
    const errorEl = document.querySelector('[data-country-choice-error]');
    const closed = code ? closedMarketMessage(code) : '';
    if (closed && errorEl) {
      errorEl.textContent = closed;
      errorEl.hidden = false;
      return;
    }
    showSelectionError();
  }

  /**
   * Registration country gate. Fail-closed. Never throws.
   *
   * Only an explicit session confirmation of an open country passes.
   * A visible suggestion or an unconfirmed select value is not enough.
   */
  function requireSelection() {
    try {
      const code = confirmedCountryCode();
      if (isOpenCountry(code)) {
        const errorEl = document.querySelector('[data-country-choice-error]');
        if (errorEl) errorEl.hidden = true;
        return true;
      }
      showGateError(code);
      return false;
    } catch (_) {
      return false;
    }
  }

  window.CountryChoice = {
    mount,
    autoMount,
    isConfirmed,
    getCountryCode: () => {
      try {
        return confirmedCountryCode();
      } catch (_) {
        return null;
      }
    },
    requireSelection,
  };
})();
