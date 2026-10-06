'use strict';

/**
 * Strings a seoEnabled path locale must be able to render:
 * navigation, footer, primary CTA, and the language/market labels.
 */

const CHROME = Object.freeze({
  en: Object.freeze({
    languageLabel: 'Language',
    marketLabel: 'Market',
    home: 'My Starday',
    primaryCta: 'Get My Starday',
    footer: 'Home',
  }),
  nl: Object.freeze({
    languageLabel: 'Taal',
    marketLabel: 'Markt',
    home: 'My Starday',
    primaryCta: 'Zo werkt het',
    footer: 'Start',
    guides: 'Gidsen',
    faq: 'Veelgestelde vragen',
    privacy: 'Privacy',
    terms: 'Voorwaarden',
    backHome: 'Terug naar My Starday',
  }),
});

function chromeFor(localeCode) {
  return CHROME[localeCode] || null;
}

module.exports = {
  CHROME,
  chromeFor,
};
