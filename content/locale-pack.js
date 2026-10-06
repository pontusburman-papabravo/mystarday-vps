'use strict';

/**
 * Shared page builder for a public path locale.
 * Market copy reads the existing commercial policy. It does not invent a price.
 */

const { pathFor } = require('../config/web-content-keys');
const {
  marketByCode,
  marketCommercialFacts,
  marketDisplayName,
  playUrlForMarket,
} = require('../config/web-markets');
const { ENTITLEMENT } = require('../src/lib/market-commercial-policy');

const PAGE_KEYS = Object.freeze([
  'home',
  'howItWorks',
  'visualSchedule',
  'morningRoutine',
  'weeklySchedule',
  'neurodiverseRoutines',
  'rewardSystem',
  'resources',
  'faq',
  'privacy',
  'terms',
]);

const LEGAL_MARKERS = Object.freeze([
  'Papa Bravo',
  'IMY',
  'Neon',
  'Resend',
  'Cloudflare',
]);

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function defineLocalePages(localeCode, spec) {
  const pages = spec.pages || {};
  for (const key of PAGE_KEYS) {
    const page = pages[key];
    if (!page) throw new Error(`${localeCode} missing page ${key}`);
    for (const field of ['title', 'description', 'h1', 'body']) {
      if (!page[field] || !String(page[field]).trim()) {
        throw new Error(`${localeCode} ${key} missing ${field}`);
      }
    }
  }
  const marketCopy = spec.market || {};
  for (const field of [
    'title', 'description', 'h1', 'lead',
    'registrationOpen', 'registrationClosed',
    'complimentary', 'introYear', 'trial',
    'notTreatment', 'register', 'registerNote', 'how', 'playSoon',
  ]) {
    if (!marketCopy[field]) throw new Error(`${localeCode} market copy missing ${field}`);
  }

  function href(key) {
    const target = pathFor(key, localeCode);
    if (!target) throw new Error(`${localeCode} has no path for ${key}`);
    return target;
  }

  function renderBody(source) {
    return typeof source.body === 'function' ? source.body(href) : source.body;
  }

  function buildMarket(code) {
    const market = marketByCode(code);
    const facts = marketCommercialFacts(code);
    const rawName = marketDisplayName(market, localeCode);
    const name = esc(rawName);
    const registration = facts.registrationOpenByDefault
      ? marketCopy.registrationOpen(name)
      : marketCopy.registrationClosed(name);
    let commercial;
    if (facts.complimentary) commercial = marketCopy.complimentary(name);
    else if (facts.entitlement === ENTITLEMENT.INTRO_YEAR) commercial = marketCopy.introYear(name);
    else commercial = marketCopy.trial(name, facts.trialDays);
    const play = playUrlForMarket(market);
    const playHtml = play
      ? `<a href="${esc(play)}" data-track="play_store_click" data-store-cta="play" data-market="${market.code}" data-store-placement="hero">Google Play</a>`
      : `<span role="status">${esc(marketCopy.playSoon)}</span>`;
    return Object.freeze({
      title: marketCopy.title(rawName),
      description: marketCopy.description(rawName),
      h1: marketCopy.h1(rawName),
      ogTitle: marketCopy.title(rawName),
      marketCode: market.code,
      body: `
        <p class="lead">${marketCopy.lead(name)}</p>
        <p>${registration}</p>
        <p>${commercial}</p>
        <p>${marketCopy.notTreatment(name)}</p>
        <p>
          <a href="${esc(market.appleUrl)}" data-track="app_store_click" data-market="${market.code}" data-store-placement="hero">App Store</a>
          ${playHtml}
        </p>
        <p><a href="/en/register" data-market="${market.code}">${esc(marketCopy.register)}</a></p>
        <p>${esc(marketCopy.registerNote)}</p>
        <p><a href="${href('howItWorks')}">${esc(marketCopy.how)}</a></p>
      `,
    });
  }

  const privacyBody = renderBody(pages.privacy);
  for (const marker of LEGAL_MARKERS) {
    if (!privacyBody.includes(marker)) throw new Error(`${localeCode} privacy missing ${marker}`);
  }
  const termsBody = renderBody(pages.terms);
  if (!termsBody.includes('Papa Bravo')) throw new Error(`${localeCode} terms missing Papa Bravo`);
  if (!/\b59\b/.test(termsBody) || !/\b590\b/.test(termsBody)) {
    throw new Error(`${localeCode} terms missing verified price`);
  }

  return function pageFor(key) {
    if (key && key.startsWith('market-')) {
      const market = marketByCode(key.slice('market-'.length));
      if (!market || !market.campaignLocales.includes(localeCode)) return null;
      return buildMarket(market.code);
    }
    const source = pages[key];
    if (!source) return null;
    return Object.freeze({
      title: source.title,
      description: source.description,
      h1: source.h1,
      ogTitle: source.ogTitle || source.h1,
      faqs: source.faqs || null,
      contentKey: key,
      body: renderBody(source),
    });
  };
}

module.exports = {
  PAGE_KEYS,
  defineLocalePages,
};
