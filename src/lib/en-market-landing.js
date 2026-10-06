'use strict';

const fs = require('fs');
const path = require('path');
const {
  APPLE_APP_STORE_IE_URL,
  APPLE_APP_STORE_CA_URL,
  getIrelandPlayStoreUrl,
} = require('../../config/store-links');
const { swedishOrigin } = require('./public-seo');

const FREE_PERIOD = 'Free until 31 December 2026. No payment required during the free period. It does not automatically become a subscription.';

const MARKETS = Object.freeze({
  IE: Object.freeze({
    code: 'IE',
    name: 'Ireland',
    path: '/en/ie',
    title: 'My Starday in Ireland — visual schedules for children',
    h1: 'Visual schedules for families in Ireland',
    description: 'My Starday in Ireland. Visual schedules, routines and picture support for children. Free until 31 December 2026. No payment required during the free period.',
    appleUrl: APPLE_APP_STORE_IE_URL,
    play: 'live',
    storeStatus: 'The App Store and Google Play are available in Ireland.',
    availability: 'The free period ends at the same instant for every Ireland account: 31 December 2026. No payment is required during that period, and it does not turn into a subscription.',
  }),
  CA: Object.freeze({
    code: 'CA',
    name: 'Canada',
    path: '/en/ca',
    title: 'My Starday in Canada — visual schedules for children',
    h1: 'Visual schedules for families in Canada',
    description: 'My Starday in Canada. Visual schedules, routines and picture support for children. Free until 31 December 2026. The App Store is available now. Google Play is coming soon.',
    appleUrl: APPLE_APP_STORE_CA_URL,
    play: 'soon',
    storeStatus: 'The App Store is available in Canada. Google Play is not open in Canada yet.',
    availability: 'The free period ends at the same instant for every Canada account: 31 December 2026, not at local midnight. No payment is required during that period, and it does not turn into a subscription.',
  }),
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function playHtml(market) {
  if (market.play !== 'live') {
    return '<span class="store-android-soon" role="status">Google Play — coming soon</span>';
  }
  const url = escapeHtml(getIrelandPlayStoreUrl());
  return `<a href="${url}" class="store-badge-link" data-store-cta="play" data-market="IE" target="_blank" rel="noopener noreferrer" data-track="play_store_click" data-store-placement="hero" aria-label="Get it on Google Play in Ireland"><img src="/img/google-play-badge-en.svg" alt="" class="store-badge" width="140" height="47"></a>`;
}

function renderEnMarketPage(code) {
  const market = MARKETS[code];
  if (!market) throw new Error(`Unknown English market page: ${code}`);
  const template = fs.readFileSync(path.join(__dirname, '../views/en-market-landing.html'), 'utf8');
  const replacements = {
    __MARKET_CODE__: market.code,
    __CANADA_ATTR__: market.code === 'CA' ? 'data-canada-ios-launch="1"' : '',
    __TITLE__: escapeHtml(market.title),
    __DESCRIPTION__: escapeHtml(market.description),
    __SV_HOME__: escapeHtml(`${swedishOrigin()}/`),
    __IE_CURRENT__: market.code === 'IE' ? 'aria-current="page"' : '',
    __CA_CURRENT__: market.code === 'CA' ? 'aria-current="page"' : '',
    __MARKET_NAME__: escapeHtml(market.name),
    __H1__: escapeHtml(market.h1),
    __FREE_PERIOD__: escapeHtml(FREE_PERIOD),
    __STORE_STATUS__: escapeHtml(market.storeStatus),
    __APPLE_URL__: escapeHtml(market.appleUrl),
    __PLAY_HTML__: playHtml(market),
    __AVAILABILITY_FAQ__: escapeHtml(market.availability),
  };
  return Object.keys(replacements).reduce(
    (html, token) => html.split(token).join(replacements[token]),
    template,
  );
}

function legacyCountryCampaignPath(query) {
  const { localeMarketQueryPath } = require('../../config/web-markets');
  return localeMarketQueryPath('/en', query);
}

module.exports = {
  EN_MARKET_PAGES: MARKETS,
  FREE_PERIOD,
  renderEnMarketPage,
  legacyCountryCampaignPath,
};
