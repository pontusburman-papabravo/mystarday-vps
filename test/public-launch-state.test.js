'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PUBLIC_LAUNCH_STATES,
  resolvePublicLaunchState,
  resolvePublicLaunchStates,
} = require('../src/lib/public-launch-state');

describe('public launch-state model', () => {
  it('maps signup + billing to CLOSED / OPEN_PREBILLING / OPEN_PAID', () => {
    assert.equal(resolvePublicLaunchState({ signupAllowed: false, publicBillingUsable: false }), PUBLIC_LAUNCH_STATES.CLOSED);
    assert.equal(resolvePublicLaunchState({ signupAllowed: false, publicBillingUsable: true }), PUBLIC_LAUNCH_STATES.CLOSED);
    assert.equal(resolvePublicLaunchState({ signupAllowed: true, publicBillingUsable: false }), PUBLIC_LAUNCH_STATES.OPEN_PREBILLING);
    assert.equal(resolvePublicLaunchState({ signupAllowed: true, publicBillingUsable: true }), PUBLIC_LAUNCH_STATES.OPEN_PAID);
  });

  it('derives per-country states from registration-gates inputs', () => {
    const states = resolvePublicLaunchStates({
      signupAllowedByCountry: { SE: true, IE: false, FI: false },
      publicBillingUsable: false,
    });
    assert.equal(states.SE, PUBLIC_LAUNCH_STATES.OPEN_PREBILLING);
    assert.equal(states.IE, PUBLIC_LAUNCH_STATES.CLOSED);
    assert.equal(states.FI, PUBLIC_LAUNCH_STATES.CLOSED);
  });
});

describe('public English surfaces follow launch state, not waitlist-as-English', () => {
  it('landing-market-state consumes launch_state and does not cap CTA retargeting', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/landing-market-state.js'), 'utf8');
    assert.match(js, /launch_state/);
    assert.match(js, /open_prebilling/);
    assert.match(js, /subscription is not required yet/);
    assert.doesNotMatch(js, /index > 2/);
    assert.match(js, /\/api\/market\/registration-gates/);
    assert.match(js, /anyOpen\(state, \['SE', 'IE', 'FI'\]\)/);
    assert.doesNotMatch(js, /english_available === true\s*\n\s*\|\| anyOpen/);
    assert.match(js, /Google Play for Android/);
    assert.match(js, /data-hero-launch="ireland"/);
    assert.match(js, /hasIrelandWelcome/);
    assert.match(js, /quietIrelandWelcomeHero/);
    assert.doesNotMatch(js, /Android coming soon/);
    assert.doesNotMatch(js, /applyIeIosFirstStorePresentation/);
  });

  it('paywall shows both store links for Ireland web users', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/paywall.js'), 'utf8');
    assert.doesNotMatch(js, /applyIeWebPaywallPresentation/);
    assert.doesNotMatch(js, /statusAndroidComingSoon/);
    assert.doesNotMatch(js, /replacePlayLinkWithComingSoon/);
    assert.match(js, /cfg\.storeLinks\.play/);
  });

  it('English landing does not claim English is coming soon', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/en.html'), 'utf8');
    assert.match(html, /app-store-badge-en\.svg/);
    assert.match(html, /google-play-badge-en\.svg/);
    assert.doesNotMatch(html, /app-store-badge-sv\.svg/);
    assert.doesNotMatch(html, /English coming soon/i);
    assert.doesNotMatch(html, /Swedish only/i);
    assert.doesNotMatch(html, /priceCurrency": "SEK"/);
    assert.match(html, /href="\/en\/eea\/privacy"/);
    assert.match(html, /href="\/en\/eea\/terms"/);
    assert.match(html, /Get the app/);
    assert.match(html, /id="waitlist"/);
    assert.match(html, /data-hero-launch="ireland"/);
    assert.match(html, /Welcome Ireland/);
    assert.match(html, /14-day trial in Ireland/);
    assert.match(html, /Is My Starday free\?/);
    assert.match(html, /New families in Ireland get 14 days free/);
    assert.match(html, /After the 14-day trial, a subscription is required to continue using Premium features/);
    assert.match(html, /subscription is required to continue using Premium features/);
    assert.doesNotMatch(html, /We are finally live/);
    assert.doesNotMatch(html, /glad-sommar-2026/);
    assert.doesNotMatch(html, /id="summer-greeting"/);
    assert.doesNotMatch(html, /No payment required/);
    assert.doesNotMatch(html, /Basic is included/);
    assert.doesNotMatch(html, /at no cost/);
    assert.match(html, /\/img\/en-landing\/01-parent-home\.webp/);
    assert.match(html, /\/img\/en-landing\/02-child-activity\.webp/);
    assert.match(html, /\/img\/en-landing\/05-treasure-chest\.webp/);
    assert.doesNotMatch(html, /pub-629428d185ca4960a0a73c850d32294b/);
    assert.doesNotMatch(html, /Barninloggning/);
    assert.doesNotMatch(html, /Välkomstskärm/);
  });

  it('English FAQ page does not claim a free Basic tier', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/en-faq.html'), 'utf8');
    assert.match(html, /Is My Starday free\?/);
    assert.match(html, /New families in Ireland get 14 days free/);
    assert.match(html, /After the 14-day trial, a subscription is required to continue using Premium features/);
    assert.doesNotMatch(html, /Basic is included/);
    assert.doesNotMatch(html, /No payment is required\./);
  });

  it('Swedish landing does not add an Ireland welcome bump', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert.doesNotMatch(html, /Welcome Ireland/);
    assert.doesNotMatch(html, /data-hero-launch="ireland"/);
    assert.match(html, /Basic ingår utan kostnad/);
    assert.match(html, /pub-629428d185ca4960a0a73c850d32294b/);
    assert.doesNotMatch(html, /\/img\/en-landing\//);
  });

  it('English pricing does not send families to a waitlist for English', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/en-pricing.html'), 'utf8');
    assert.doesNotMatch(html, /Join waitlist/);
    assert.doesNotMatch(html, /English version is ready/);
    assert.match(html, /Get the app/);
    assert.doesNotMatch(html, /href="\/register"/);
    assert.match(html, /EUR in Ireland and Finland/);
    assert.match(html, /landing-market-state\.js/);
  });

  it('customer legal pages do not publish internal engineering banners', () => {
    const files = [
      'public/en/eea-privacy.html',
      'public/en/eea-terms.html',
      'public/en/eea-child-privacy.html',
      'public/en/tracking-choices.html',
    ];
    for (const rel of files) {
      const html = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
      assert.doesNotMatch(html, /not externally legally verified/i, rel);
      assert.doesNotMatch(html, /Internal compliance sign-off/i, rel);
      assert.doesNotMatch(html, /review-notice version/i, rel);
    }
  });

  it('country picker features Ireland and does not force Sweden on English pages', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/country-choice.js'), 'utf8');
    assert.match(js, /option value="IE"/);
    assert.match(js, /path\.startsWith\('\/en'\)/);
    const countries = require('../config/market-countries');
    assert.equal(countries.IRELAND.code, 'IE');
    assert.equal(countries.IRELAND.group, 'featured');
    assert.equal(countries.REGISTRATION_COUNTRIES[1].code, 'IE');
  });
});
