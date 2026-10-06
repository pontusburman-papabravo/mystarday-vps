'use strict';

/**
 * English market page for every web market except the existing Ireland and
 * Canada campaign pages. Those two keep their own renderer.
 * Copy reads the commercial policy. It does not invent a price, a store
 * listing, or a free period.
 */

const { marketByCode, marketCommercialFacts, playUrlForMarket } = require('../../config/web-markets');
const { ENTITLEMENT } = require('./market-commercial-policy');

function openEnglishMarketPage(code) {
  const market = marketByCode(code);
  if (!market) throw new Error(`Unknown English market page: ${code}`);
  const facts = marketCommercialFacts(code);
  const name = market.name;
  const play = playUrlForMarket(market);
  const registration = facts.registrationOpenByDefault
    ? `New accounts in ${name} follow the existing registration gate. That gate is open by default.`
    : `New accounts in ${name} are not open by default. That follows the existing registration gate, not this page.`;
  let commercial;
  if (facts.complimentary) {
    commercial = `The existing complimentary period applies in ${name}. It does not turn into a subscription by itself. This page does not set a price.`;
  } else if (facts.entitlement === ENTITLEMENT.INTRO_YEAR) {
    commercial = `${name} keeps the offer already published on the Swedish site. This page does not set a price. There is no free period through 31 December 2026 on this market.`;
  } else {
    commercial = `If an account can be created here later, the existing rule outside Sweden, Ireland and Canada is a ${facts.trialDays}-day trial. Payment has to be available first. There is no free period through 31 December 2026 on this market, and nothing here turns into a subscription by itself. This page does not set a price.`;
  }
  const playHtml = play
    ? `<a href="${String(play).replace(/&/g, '&amp;')}" data-track="play_store_click" data-store-cta="play" data-market="${market.code}" data-store-placement="hero">Google Play</a>`
    : '<span role="status">Google Play — coming soon</span>';
  return Object.freeze({
    title: `My Starday in ${name} — visual schedules for children`,
    description: `My Starday for families in ${name}. Visual schedules, routines and picture support. This is a market page, not a separate language site.`,
    h1: `Visual schedules for families in ${name}`,
    ogTitle: `My Starday in ${name}`,
    marketCode: market.code,
    body: `
      <p class="lead">This page is the ${name} market. The English site stays a language site. Choosing a market does not change the language.</p>
      <p>${registration}</p>
      <p>${commercial}</p>
      <p>The App Store button opens the general listing, not a made-up ${name} product page. My Starday is a visual schedule for the day. It is not a treatment and it does not promise a medical result.</p>
      <p>
        <a href="${market.appleUrl}" data-track="app_store_click" data-market="${market.code}" data-store-placement="hero">App Store</a>
        ${playHtml}
      </p>
      <p><a href="/en/register" data-market="${market.code}">Create an account</a></p>
      <p>The form asks where the family lives. This link does not set a country or a price by itself.</p>
      <p><a href="/en/how-it-works">How it works</a></p>
    `,
  });
}

module.exports = {
  openEnglishMarketPage,
};
