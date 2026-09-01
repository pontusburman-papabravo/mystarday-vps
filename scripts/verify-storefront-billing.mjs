#!/usr/bin/env node
/**
 * Re-fetch public Apple / Play storefronts. Does not use App Store Connect,
 * Play Console, or RevenueCat (those stay BLOCKED without operator credentials).
 *
 *   node scripts/verify-storefront-billing.mjs
 *
 * Never treats iTunes `kind=software` price as an IAP price.
 */
import { createRequire } from 'node:module';
import {
  classifyItunesSoftwareListing,
  classifyAppleAppOffer,
  classifyPlayIapRange,
  paidAppDownloadIsCommercialBlocker,
  EVIDENCE,
} from '../src/lib/storefront-billing-evidence.js';

const require = createRequire(import.meta.url);
const { ANDROID_PACKAGE_NAME } = require('../config/iap-product-contract.js');

const TRACK_ID = '6774493098';
const PLAY_PACKAGE = ANDROID_PACKAGE_NAME;
const UA = 'Mozilla/5.0 (compatible; storefront-billing-check/1.0)';

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.text();
}

function extractAppleOffer(html, trackId) {
  const marker = `"adamId":"${trackId}"`;
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const window = html.slice(Math.max(0, idx - 80), idx + 900);
  const offerType = /"offerType":"app"/.test(window);
  const isFree = /"isFree":true/.test(window);
  const hasIap = /"hasInAppPurchases":true/.test(window);
  const price = window.match(/"priceFormatted":"([^"]+)"/);
  if (!offerType) return null;
  return classifyAppleAppOffer({
    offerType: 'app',
    isFree,
    hasInAppPurchases: hasIap,
    priceFormatted: price ? price[1] : null,
  });
}

function extractPlayRange(html) {
  const m = html.match(/\["([^"]*if billed through Play)"/);
  return classifyPlayIapRange(m ? m[1] : '');
}

async function appleCountry(country) {
  const data = await getJson(`https://itunes.apple.com/lookup?id=${TRACK_ID}&country=${country}`);
  const listing = classifyItunesSoftwareListing(data.results?.[0] || null);
  let offer = null;
  try {
    const html = await getText(
      `https://apps.apple.com/${country}/app/id${TRACK_ID}?see-all=in-app-purchases`
    );
    offer = extractAppleOffer(html, TRACK_ID);
  } catch {
    offer = null;
  }
  return { listing, offer };
}

async function playCountry(gl) {
  const html = await getText(
    `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&gl=${gl}&hl=en`
  );
  const available = /<title/i.test(html) && html.includes('In-app purchases');
  return {
    available,
    installCta: /\bInstall\b/.test(html),
    iapRange: extractPlayRange(html),
  };
}

const ie = await appleCountry('ie');
const fi = await appleCountry('fi');
const playIe = await playCountry('IE');
const playFi = await playCountry('FI');

const report = {
  fetched_at: new Date().toISOString(),
  evidence_statuses: EVIDENCE,
  apple_ie: {
    APP_DOWNLOAD_PRICE_IE: ie.listing.formattedPrice,
    paid_download: paidAppDownloadIsCommercialBlocker(ie.listing),
    hasInAppPurchases: ie.offer ? ie.offer.hasInAppPurchases : null,
    itunes_kind: ie.listing.kind,
    p0_paid_download: paidAppDownloadIsCommercialBlocker(ie.listing),
  },
  apple_fi: {
    APP_DOWNLOAD_PRICE_FI: fi.listing.formattedPrice,
    paid_download: paidAppDownloadIsCommercialBlocker(fi.listing),
    hasInAppPurchases: fi.offer ? fi.offer.hasInAppPurchases : null,
    itunes_kind: fi.listing.kind,
    p0_paid_download: paidAppDownloadIsCommercialBlocker(fi.listing),
  },
  google_ie: playIe,
  google_fi: playFi,
  revenuecat: { status: EVIDENCE.BLOCKED, reason: 'No RevenueCat credentials in this environment' },
};

console.log(JSON.stringify(report, null, 2));
if (report.apple_ie.p0_paid_download || report.apple_fi.p0_paid_download) {
  console.error('P0: Apple app download is paid on IE and/or FI. Do not treat this as IAP.');
  process.exitCode = 2;
}
