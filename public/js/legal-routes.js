/**
 * Legal link resolver for registration/settings — jurisdiction from country, not locale alone.
 */
(function legalRoutesModule() {
  'use strict';

  async function fetchLegalRoutes(countryCode, locale) {
    const params = new URLSearchParams();
    if (countryCode) params.set('country_code', countryCode);
    if (locale) params.set('locale', locale);
    const res = await fetch(`/api/market/legal-routes?${params.toString()}`);
    if (!res.ok) throw new Error('legal-routes failed');
    return res.json();
  }

  function applyToRegisterLinks(routes) {
    const termsLink = document.querySelector('[data-legal-terms-link]');
    const privacyLink = document.querySelector('[data-legal-privacy-link]');
    if (termsLink && routes.terms) termsLink.setAttribute('href', routes.terms);
    if (privacyLink && routes.privacy) privacyLink.setAttribute('href', routes.privacy);
  }

  async function syncRegisterLegalLinks() {
    const country = (window.CountryChoice && CountryChoice.getCountryCode && CountryChoice.getCountryCode())
      || sessionStorage.getItem('sd_country_code')
      || 'SE';
    const locale = (window.I18n && I18n.getCurrentLang && I18n.getCurrentLang()) || 'sv-SE';
    try {
      const routes = await fetchLegalRoutes(country, locale);
      applyToRegisterLinks(routes);
      return routes;
    } catch (_) {
      return null;
    }
  }

  document.addEventListener('country-choice-confirmed', () => {
    syncRegisterLegalLinks();
  });
  document.addEventListener('language-choice-confirmed', () => {
    syncRegisterLegalLinks();
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('[data-legal-terms-link]')) {
      syncRegisterLegalLinks();
    }
  });

  window.LegalRoutes = {
    fetchLegalRoutes,
    syncRegisterLegalLinks,
    applyToRegisterLinks,
  };
})();
