'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { describeCommercialOfferCopy } = require('../src/lib/commercial-offer-copy');
const { describeLaunchCohortAcquisition } = require('../src/lib/launch-cohort-offer-copy');
const {
  presentLandingExperience,
  publicStores,
} = require('../src/lib/landing-experience');

const NOW = new Date('2026-10-10T12:00:00.000Z');

function view(country, locale, extra) {
  const commercial = describeCommercialOfferCopy(country, { createdAt: NOW, locale });
  return presentLandingExperience({
    countryCode: country,
    locale,
    commercial,
    cohort: { phase: 'hidden', offer_enabled: false },
    readiness: { marketOpen: true, allowed: true, reason: 'trial' },
    stores: publicStores(country),
    languages: [],
    ...extra,
  });
}

function cohort(locale, assigned) {
  const remaining = 25 - assigned;
  return {
    phase: remaining > 0 ? 'active' : 'full',
    offer_enabled: true,
    slot_limit: 25,
    slots_assigned: assigned,
    slots_remaining: remaining,
    copy: describeLaunchCohortAcquisition(locale, remaining > 0 ? remaining : null),
  };
}

test('Finland in Swedish shows the live places and not Sweden’s price', () => {
  const body = view('FI', 'sv-SE', {
    cohort: cohort('sv-SE', 7),
    readiness: { marketOpen: true, allowed: true, reason: 'launch_cohort_available' },
  });
  assert.equal(body.country_code, 'FI');
  assert.equal(body.status, 'launch_cohort');
  assert.equal(body.copy_fallback, false);
  assert.equal(body.launch_cohort.slots_assigned, 7);
  assert.equal(body.launch_cohort.slots_remaining, 18);
  assert.equal(body.launch_cohort.slot_limit, 25);
  assert.match(body.copy.for_country, /Finland/);
  assert.match(body.copy.remaining_label, /18/);
  assert.equal(body.commercial.monthly_price, null);
  assert.equal(body.commercial.currency === 'SEK', false);
  assert.equal(body.stores.ios, 'unavailable');
});

test('Finland in English keeps the same country and places', () => {
  const body = view('FI', 'en-GB', {
    cohort: cohort('en-GB', 24),
    readiness: { marketOpen: true, allowed: true, reason: 'launch_cohort_available' },
  });
  assert.equal(body.country_code, 'FI');
  assert.equal(body.launch_cohort.slots_remaining, 1);
  assert.match(body.copy.remaining_label, /1 of 25/);
  assert.equal(body.copy_locale, 'en-GB');
});

test('Germany in English stays closed and does not borrow another country’s offer', () => {
  const body = view('DE', 'en-GB', {
    cohort: cohort('en-GB', 7),
    readiness: { marketOpen: false, allowed: false, code: 'MARKET_EU_CLOSED' },
  });
  assert.equal(body.status, 'coming_soon');
  assert.equal(body.launch_cohort.phase, 'hidden');
  assert.equal(body.launch_cohort.slots_remaining, null);
  assert.equal(body.launch_cohort.slots_assigned, null);
  assert.match(body.copy.coming_soon_body, /Germany/);
  assert.equal(body.copy.commercial_text, null);
  assert.doesNotMatch(JSON.stringify(body.copy), /59/);
  assert.doesNotMatch(JSON.stringify(body.copy), /Ireland/);
});

test('Sweden in English keeps the 14-day price and no launch counter', () => {
  const body = view('SE', 'en-GB');
  assert.equal(body.status, 'ordinary');
  assert.equal(body.commercial.entitlement, 'trial');
  assert.equal(body.commercial.trial_days, 14);
  assert.match(body.commercial.monthly_price, /59/);
  assert.match(body.copy.commercial_text, /Sweden/);
  assert.match(body.copy.commercial_text, /59/);
  assert.equal(body.launch_cohort.slots_remaining, null);
  assert.equal(body.stores.ios, 'available');
  assert.equal(body.stores.android, 'available');
});

test('Canada in French uses the complimentary period and an explicit English fallback', () => {
  const body = view('CA', 'fr-FR');
  assert.equal(body.commercial.entitlement, 'complimentary_until');
  assert.equal(body.commercial.monthly_price, null);
  assert.equal(body.copy_fallback, true);
  assert.equal(body.copy_locale, 'en-GB');
  assert.ok(body.copy.fallback_notice);
  assert.match(body.copy.commercial_text, /Canada/);
  assert.equal(body.stores.ios, 'available');
  assert.equal(body.stores.android, 'unavailable');
  assert.equal(body.stores.android_url, null);
});

test('a full offer shows the ordinary terms only when registration is possible', () => {
  const open = view('FI', 'en-GB', {
    cohort: cohort('en-GB', 25),
    readiness: { marketOpen: true, allowed: true, reason: 'trial' },
  });
  assert.equal(open.status, 'ordinary_after_full');
  assert.equal(open.launch_cohort.slots_assigned, 25);
  assert.equal(open.launch_cohort.slots_remaining, 0);
  assert.match(open.copy.commercial_text, /14/);
  assert.doesNotMatch(open.copy.commercial_text, /59/);

  const blocked = view('FI', 'en-GB', {
    cohort: cohort('en-GB', 25),
    readiness: { marketOpen: true, allowed: false, code: 'MARKET_BILLING_NOT_READY' },
  });
  assert.equal(blocked.status, 'full_unavailable');
  assert.equal(blocked.copy.commercial_text, null);
  assert.equal(blocked.launch_cohort.slots_remaining, 0);
});

test('a hidden offer never publishes a place count', () => {
  const body = view('FI', 'en-GB', {
    cohort: { phase: 'hidden', offer_enabled: false, slot_limit: 25, slots_assigned: 7, slots_remaining: 18 },
    readiness: { marketOpen: true, allowed: false, code: 'MARKET_BILLING_NOT_READY' },
  });
  assert.equal(body.launch_cohort.phase, 'hidden');
  assert.equal(body.launch_cohort.slots_assigned, null);
  assert.equal(body.launch_cohort.slots_remaining, null);
  assert.equal(body.launch_cohort.slot_limit, null);
});

test('the landing page does not confirm residence or rewrite a family locale', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/js/landing-experience.js'), 'utf8');
  assert.doesNotMatch(js, /sd_country_confirmed/);
  assert.doesNotMatch(js, /sd_preferred_locale/);
  assert.doesNotMatch(js, /preferred_locale/);
  assert.match(js, /residence_explicit', '0'/);
  assert.match(js, /landing-nav__lang/);
  assert.match(js, /showLoadError/);
  assert.doesNotMatch(js, /18 of 25/);
});

test('language pages keep their canonical and hreflang', () => {
  const sv = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const en = fs.readFileSync(path.join(__dirname, '../public/en.html'), 'utf8');
  assert.match(sv, /rel="canonical" href="__SITE_URL__\/"/);
  assert.match(sv, /hreflang="sv"/);
  assert.match(sv, /hreflang="en"/);
  assert.match(sv, /hreflang="x-default"/);
  assert.match(en, /rel="canonical" href="https:\/\/[^"\s]+\/en"/);
  assert.match(en, /hreflang="sv"/);
  assert.match(en, /hreflang="en"/);
  assert.match(en, /Free until 31 December 2026\. No payment required during the free period\./);
  assert.match(en, /data-static-market-offer="IE CA"[^>]*>Ireland and Canada: no subscription is created automatically/);
  const css = fs.readFileSync(path.join(__dirname, '../public/css/landing.css'), 'utf8');
  assert.match(css, /a\.store-badge-link\[hidden\]\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(en, /14-day trial/i);
  assert.match(sv, /data-landing-country-button/);
  assert.match(en, /data-landing-language-button/);
  const landing = fs.readFileSync(path.join(__dirname, '../src/routes/landing.js'), 'utf8');
  assert.doesNotMatch(landing, /router\.get\('\/en\/:country'/);
});
