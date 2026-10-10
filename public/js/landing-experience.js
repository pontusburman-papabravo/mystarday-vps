/**
 * Landing country and language choices.
 * Country selects the offer, gate, prices and stores.
 * Language selects the page. It does not change a family's country or locale.
 * Place counts are rendered only from the server payload.
 */
(function landingExperience() {
  'use strict';

  const EXPLICIT_KEY = 'sd_landing_country';

  function pageWebLocale() {
    const attr = document.documentElement.getAttribute('data-web-locale');
    if (attr) return String(attr).toLowerCase();
    const lang = String(document.documentElement.lang || '').toLowerCase();
    if (lang.indexOf('sv') === 0) return 'sv';
    if (lang.indexOf('en') === 0) return 'en';
    return lang.slice(0, 2) || 'en';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function readExplicit() {
    try {
      return localStorage.getItem(EXPLICIT_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function writeExplicit(code) {
    try {
      localStorage.setItem(EXPLICIT_KEY, code);
    } catch (_) { /* private mode */ }
  }

  function track(name, metadata) {
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(null, name, metadata || {});
    }
  }

  function queryParams() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function known(codes, code) {
    return Boolean(code) && codes.indexOf(code) !== -1;
  }

  function suggestionFromBrowser(codes) {
    const languages = navigator.languages || [navigator.language || ''];
    let i;
    for (i = 0; i < languages.length; i += 1) {
      const match = String(languages[i] || '').match(/[-_]([A-Za-z]{2})\b/);
      if (!match) continue;
      const code = match[1].toUpperCase();
      if (known(codes, code)) return code;
    }
    if (pageWebLocale() === 'sv' && known(codes, 'SE')) return 'SE';
    return '';
  }

  function labelFor(entry, webLocale) {
    const labels = entry && entry.labels ? entry.labels : {};
    if (webLocale === 'sv') return labels['sv-SE'] || labels['en-GB'] || entry.code;
    return labels['en-GB'] || labels['sv-SE'] || entry.code;
  }

  function hideStaticOffers() {
    document.querySelectorAll('[data-static-market-offer]').forEach(function (el) {
      el.hidden = true;
    });
  }

  function setStores(stores) {
    const iosOk = stores && stores.ios === 'available' && stores.ios_url;
    const androidOk = stores && stores.android === 'available' && stores.android_url;
    document.querySelectorAll('a[data-track="app_store_click"], a[href*="apps.apple.com"], a[href*="apple.co"]').forEach(function (el) {
      if (!el.closest || el.closest('#landingOffer')) return;
      if (iosOk) {
        el.href = stores.ios_url;
        el.removeAttribute('aria-disabled');
        el.hidden = false;
      } else {
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
        el.hidden = true;
      }
    });
    document.querySelectorAll('a[data-track="play_store_click"], a[href*="play.google.com"]').forEach(function (el) {
      if (!el.closest || el.closest('#landingOffer')) return;
      if (androidOk) {
        el.href = stores.android_url;
        el.removeAttribute('aria-disabled');
        el.hidden = false;
      } else {
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
        el.hidden = true;
      }
    });
    document.querySelectorAll('[data-store-trust]').forEach(function (el) {
      el.hidden = !(iosOk && androidOk);
    });
  }

  function storedUtm() {
    if (window.UtmCapture && typeof window.UtmCapture.get === 'function') {
      return window.UtmCapture.get() || {};
    }
    return {};
  }

  function guards() {
    if (!window.LandingChoiceGuards) throw new Error('landing guards');
    return window.LandingChoiceGuards;
  }

  function registerHref(payload, country, appLocale) {
    const web = pageWebLocale();
    const base = web === 'sv' ? '/register' : '/en/register';
    const loggedIn = window.Auth && typeof window.Auth.isLoggedIn === 'function' && window.Auth.isLoggedIn();
    const params = guards().registerSearch({
      country: country,
      appLocale: !loggedIn && appLocale ? appLocale : '',
      status: payload && payload.status,
      searchParams: queryParams(),
      stored: storedUtm(),
    });
    const qs = params.toString();
    return qs ? base + '?' + qs : base;
  }

  function renderOffer(payload, country, appLocale) {
    const mount = document.getElementById('landingOffer');
    if (!mount) return;
    const copy = payload && payload.copy ? payload.copy : {};
    if (!country) {
      mount.hidden = false;
      mount.innerHTML = '<p class="landing-offer__title">' + escapeHtml(copy.choose_country || 'Choose country') + '</p>'
        + '<p class="landing-offer__text">' + escapeHtml(copy.explicit_hint || '') + '</p>';
      return;
    }
    const status = payload.status;
    const parts = [];
    if (copy.fallback_notice) {
      parts.push('<p class="landing-offer__fallback" role="note">' + escapeHtml(copy.fallback_notice) + '</p>');
    }
    if (status === 'coming_soon') {
      parts.push('<p class="landing-offer__kicker">' + escapeHtml(copy.coming_soon_title) + '</p>');
      parts.push('<p class="landing-offer__title">' + escapeHtml(payload.country_name || '') + '</p>');
      parts.push('<p class="landing-offer__text">' + escapeHtml(copy.coming_soon_body) + '</p>');
    } else if (status === 'launch_cohort') {
      const cohort = payload.launch_cohort || {};
      const width = cohort.slot_limit ? Math.max(0, Math.min(100, (cohort.slots_assigned / cohort.slot_limit) * 100)) : 0;
      parts.push('<p class="landing-offer__kicker">' + escapeHtml(copy.cohort_title) + '</p>');
      parts.push('<h2 class="landing-offer__title">' + escapeHtml(copy.cohort_headline || copy.cohort_title) + '</h2>');
      parts.push('<p class="landing-offer__text">' + escapeHtml(copy.for_country) + '</p>');
      if (copy.remaining_label) {
        parts.push('<p class="landing-offer__remaining">' + escapeHtml(copy.remaining_label) + '</p>');
      }
      if (copy.progress_label && cohort.slot_limit != null) {
        parts.push('<div class="landing-offer__track" role="progressbar" aria-valuemin="0" aria-valuemax="'
          + escapeHtml(cohort.slot_limit) + '" aria-valuenow="' + escapeHtml(cohort.slots_assigned)
          + '" aria-label="' + escapeHtml(copy.progress_label) + '"><span style="width:' + width + '%"></span></div>');
        parts.push('<p class="landing-offer__progress">' + escapeHtml(copy.progress_label) + '</p>');
      }
      parts.push('<p class="landing-offer__text">' + escapeHtml(copy.premium_what) + '</p>');
      if (copy.premium_why) parts.push('<p class="landing-offer__text">' + escapeHtml(copy.premium_why) + '</p>');
      if (copy.no_payment_method || copy.no_auto_charge) {
        parts.push('<p class="landing-offer__text">' + escapeHtml(copy.no_payment_method || '') + ' ' + escapeHtml(copy.no_auto_charge || '') + '</p>');
      }
      if (copy.after) parts.push('<p class="landing-offer__text">' + escapeHtml(copy.after) + '</p>');
      if (copy.not_reserved) parts.push('<p class="landing-offer__note">' + escapeHtml(copy.not_reserved) + '</p>');
    } else if (status === 'ordinary_after_full' || status === 'full_unavailable') {
      parts.push('<p class="landing-offer__kicker">' + escapeHtml(copy.full_title) + '</p>');
      parts.push('<p class="landing-offer__title">' + escapeHtml(copy.full_body) + '</p>');
      if (copy.progress_label) parts.push('<p class="landing-offer__progress">' + escapeHtml(copy.progress_label) + '</p>');
      if (copy.commercial_text) parts.push('<p class="landing-offer__text">' + escapeHtml(copy.commercial_text) + '</p>');
      if (copy.premium_what) parts.push('<p class="landing-offer__text">' + escapeHtml(copy.premium_what) + '</p>');
    } else if (status === 'ordinary' || status === 'open_unavailable') {
      parts.push('<p class="landing-offer__kicker">' + escapeHtml(payload.country_name || '') + '</p>');
      parts.push('<p class="landing-offer__title">' + escapeHtml(copy.commercial_text || '') + '</p>');
      if (copy.premium_what) parts.push('<p class="landing-offer__text">' + escapeHtml(copy.premium_what) + '</p>');
    }
    const stores = payload.stores || {};
    if (copy.stores_note) {
      parts.push('<p class="landing-offer__note">' + escapeHtml(copy.stores_note) + '</p>');
    }
    if (payload.signup_allowed && status !== 'coming_soon' && copy.cta) {
      const href = registerHref(payload, country, appLocale);
      const offer = payload.status === 'launch_cohort' ? guards().LAUNCH_OFFER : '';
      parts.push('<a class="btn-primary landing-offer__cta" href="' + escapeHtml(href) + '" data-landing-register'
        + (offer ? ' data-landing-offer="' + escapeHtml(offer) + '"' : '')
        + ' data-landing-country="' + escapeHtml(country || '') + '">' + escapeHtml(copy.cta) + '</a>');
      parts.push('<p class="landing-offer__note">' + escapeHtml(copy.confirm_residence) + '</p>');
    } else if (copy.cta && status !== 'coming_soon') {
      parts.push('<p class="landing-offer__note">' + escapeHtml(copy.cta) + '</p>');
    }
    mount.hidden = false;
    mount.innerHTML = parts.join('');
    setStores(stores);
    hideStaticOffers();
  }

  function loadErrorText() {
    return pageWebLocale() === 'sv'
      ? 'Erbjudandet kunde inte hämtas. Sidan säger inget om hur många platser som finns kvar.'
      : 'The offer could not be loaded. This page is not stating how many places are left.';
  }

  function mountOfferTracking() {
    const mount = document.getElementById('landingOffer');
    if (!mount || mount.dataset.offerTrack === '1') return;
    mount.dataset.offerTrack = '1';
    mount.addEventListener('click', function (event) {
      const link = event.target && event.target.closest ? event.target.closest('[data-landing-offer]') : null;
      if (!link) return;
      track('landing_offer_cta', {
        landing_offer: link.getAttribute('data-landing-offer'),
        country_code: link.getAttribute('data-landing-country') || null,
        web_locale: pageWebLocale(),
      });
    });
  }

  function showLoadError(message) {
    const mount = document.getElementById('landingOffer');
    if (!mount) return;
    mount.hidden = false;
    mount.innerHTML = '<p class="landing-offer__note" role="status">' + escapeHtml(message) + '</p>';
    document.querySelectorAll('[data-static-market-offer]').forEach(function (el) { el.hidden = true; });
    document.querySelectorAll('a[data-track="app_store_click"], a[data-track="play_store_click"]').forEach(function (el) {
      el.removeAttribute('href');
      el.hidden = true;
    });
  }

  function optionButtons(list, items, selected, onPick) {
    list.innerHTML = '';
    items.forEach(function (item, index) {
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'landing-choice__option';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', item.value === selected ? 'true' : 'false');
      button.dataset.value = item.value;
      button.id = list.id + '-opt-' + index;
      button.textContent = item.label;
      button.addEventListener('click', function () { onPick(item.value); });
      li.appendChild(button);
      list.appendChild(li);
    });
  }

  function bindList(button, list) {
    function close() {
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
    function open() {
      list.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      const current = list.querySelector('[aria-selected="true"]') || list.querySelector('button');
      if (current) current.focus();
    }
    button.addEventListener('click', function () {
      if (list.hidden) open();
      else close();
    });
    button.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
    list.addEventListener('keydown', function (event) {
      const buttons = Array.prototype.slice.call(list.querySelectorAll('button'));
      const index = buttons.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        button.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (buttons[index + 1]) buttons[index + 1].focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (buttons[index - 1]) buttons[index - 1].focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        if (buttons[0]) buttons[0].focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        if (buttons[buttons.length - 1]) buttons[buttons.length - 1].focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (document.activeElement && document.activeElement.click) document.activeElement.click();
      }
    });
    document.addEventListener('click', function (event) {
      const bar = button.closest('[data-landing-choice]');
      if (bar && bar.contains(event.target)) return;
      close();
    });
    return { open: open, close: close };
  }

  async function start() {
    const countryButton = document.querySelector('[data-landing-country-button]');
    const languageButton = document.querySelector('[data-landing-language-button]');
    const countryList = document.querySelector('[data-landing-country-list]');
    const languageList = document.querySelector('[data-landing-language-list]');
    if (!countryButton || !languageButton || !countryList || !languageList) return;

    const countriesRes = await fetch('/api/market/countries', { credentials: 'same-origin' });
    if (!countriesRes.ok) throw new Error('countries');
    const countriesBody = await countriesRes.json();
    const countries = (countriesBody && countriesBody.countries) || [];
    const codes = countries.map(function (entry) { return entry.code; });
    const params = queryParams();
    const fromQuery = String(params.get('residence') || '').toUpperCase();
    let explicit = params.get('residence_explicit') === '1' || (!params.get('residence') && Boolean(readExplicit()));
    let country = '';
    if (known(codes, fromQuery)) country = fromQuery;
    else if (known(codes, readExplicit())) {
      country = readExplicit();
      explicit = true;
    } else country = suggestionFromBrowser(codes);
    if (explicit && country) writeExplicit(country);

    const web = pageWebLocale();
    let appLocale = web;
    let languages = [];

    const countryControls = bindList(countryButton, countryList);
    const languageControls = bindList(languageButton, languageList);
    const requestGuard = guards().createLandingRequestGuard();
    mountOfferTracking();

    function countryItems() {
      return [{ value: '', label: '…' }].concat(countries.map(function (entry) {
        return { value: entry.code, label: labelFor(entry, web) };
      }));
    }

    function goLanguage(code) {
      const next = languages.filter(function (item) { return item.code === code; })[0];
      if (!next || next.code === web) {
        languageControls.close();
        return;
      }
      track('landing_language_select', { web_locale: next.code, country_code: country || null });
      const nextParams = guards().preservedCampaignParams(queryParams(), storedUtm());
      if (country) {
        nextParams.set('residence', country);
        nextParams.set('residence_explicit', explicit ? '1' : '0');
      }
      const search = nextParams.toString();
      const localHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const target = (!localHost && next.home_url) ? next.home_url : next.home;
      window.location.assign(target + (search ? '?' + search : ''));
    }

    function bindNavLanguageLinks() {
      document.querySelectorAll('a.landing-nav__lang, a[data-locale-switch]').forEach(function (link) {
        if (link.dataset.landingLangBound === '1') return;
        link.dataset.landingLangBound = '1';
        link.addEventListener('click', function (event) {
          const code = String(link.getAttribute('data-locale-switch') || link.getAttribute('hreflang') || '').toLowerCase()
            || (web === 'sv' ? 'en' : 'sv');
          const next = languages.filter(function (item) { return item.code === code; })[0];
          if (!next || next.code === web) return;
          event.preventDefault();
          goLanguage(code);
        });
      });
    }

    function paintCountry() {
      const match = countries.filter(function (entry) { return entry.code === country; })[0];
      countryButton.textContent = match ? labelFor(match, web) : '…';
      optionButtons(countryList, countryItems().filter(function (item) { return item.value; }), country, function (value) {
        country = value;
        explicit = true;
        writeExplicit(value);
        countryControls.close();
        track('landing_country_select', { country_code: value, web_locale: web });
        paintCountry();
        refresh().catch(function () { showLoadError(loadErrorText()); });
      });
    }

    async function refresh() {
      const ticket = requestGuard.next();
      const requestedCountry = country;
      let url = '/api/market/landing-experience?locale=' + encodeURIComponent(web);
      if (requestedCountry) url += '&country_code=' + encodeURIComponent(requestedCountry);
      let res;
      try {
        res = await fetch(url, { credentials: 'same-origin', signal: ticket.signal });
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (!ticket.current()) return;
        throw err;
      }
      if (!ticket.current() || requestedCountry !== country) return;
      if (!res.ok) throw new Error('offer');
      const payload = await res.json();
      if (!ticket.current() || requestedCountry !== country) return;
      languages = payload.languages || languages;
      const current = languages.filter(function (item) { return item.code === web; })[0];
      if (payload.display_locale) appLocale = payload.display_locale;
      if (payload.copy) {
        const countryLabel = document.querySelector('[data-landing-country-label]');
        const languageLabel = document.querySelector('[data-landing-language-label]');
        if (countryLabel) countryLabel.textContent = payload.copy.country_label;
        if (languageLabel) languageLabel.textContent = payload.copy.language_label;
        const hint = document.querySelector('[data-landing-choice-hint]');
        if (hint) hint.textContent = explicit ? payload.copy.explicit_hint : payload.copy.suggested_hint;
      }
      languageButton.textContent = current ? current.native_name : web;
      optionButtons(languageList, languages.map(function (item) {
        return { value: item.code, label: item.native_name };
      }), web, goLanguage);
      bindNavLanguageLinks();
      renderOffer(payload, country, appLocale);
      paintCountry();
    }

    paintCountry();
    await refresh();
  }

  function boot() {
    start().catch(function () {
      showLoadError(loadErrorText());
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
