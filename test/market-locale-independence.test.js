'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  getMarketCommercialPolicy,
  ENTITLEMENT,
  SWEDEN_TRIAL_FROM_ISO,
} = require('../src/lib/market-commercial-policy');
const { resolveNewAccountRegistrationContext } = require('../src/lib/registration-market-context');

const policySrc = fs.readFileSync(
  path.join(__dirname, '..', 'src/lib/market-commercial-policy.js'),
  'utf8'
);

function policy(countryCode, createdAt, extra) {
  return getMarketCommercialPolicy(countryCode, { createdAt, ...extra });
}

describe('market policy does not follow language', () => {
  const cutoff = new Date(SWEDEN_TRIAL_FROM_ISO);
  const before = new Date(cutoff.getTime() - 1000);
  const after = new Date(cutoff.getTime() + 1000);

  it('commercial policy source does not read locale', () => {
    assert.doesNotMatch(policySrc, /preferred_locale/);
    assert.doesNotMatch(policySrc, /en-GB|sv-SE/);
  });

  it('SE, IE, and CA keep their entitlements for both sv and en', () => {
    const seIntro = policy('SE', before);
    const seTrial = policy('SE', after);
    const ie = policy('IE', after);
    const ca = policy('CA', after);

    assert.equal(seIntro.entitlement, ENTITLEMENT.INTRO_YEAR);
    assert.equal(seTrial.entitlement, ENTITLEMENT.TRIAL);
    assert.equal(seTrial.trialDays, 14);
    assert.equal(ie.entitlement, ENTITLEMENT.COMPLIMENTARY_UNTIL);
    assert.equal(ca.entitlement, ENTITLEMENT.COMPLIMENTARY_UNTIL);
    assert.equal(ie.trialDays, 0);
    assert.equal(ca.trialDays, 0);

    assert.deepEqual(seTrial, policy('SE', after, { locale: 'en-GB' }));
    assert.deepEqual(ie, policy('IE', after, { locale: 'sv-SE' }));
    assert.deepEqual(ca, policy('CA', after, { locale: 'en-GB' }));
    assert.deepEqual(seIntro, policy('SE', before, { locale: 'en' }));
  });

  it('registration keeps country and locale apart', () => {
    function ctx(country, locale) {
      return resolveNewAccountRegistrationContext(
        { headers: { 'accept-language': locale } },
        { country_code: country, preferred_locale: locale }
      );
    }

    const seEn = ctx('SE', 'en-GB');
    const seSv = ctx('SE', 'sv-SE');
    const ieEn = ctx('IE', 'en-GB');
    const caEn = ctx('CA', 'en-GB');

    assert.equal(seEn.ok, true);
    assert.equal(seEn.familyLocale, 'en-GB');
    assert.equal(seSv.familyLocale, 'sv-SE');
    assert.equal(seEn.countryResolved.country_code, 'SE');
    assert.equal(seSv.countryResolved.country_code, 'SE');
    assert.equal(ieEn.countryResolved.country_code, 'IE');
    assert.equal(caEn.countryResolved.country_code, 'CA');
    assert.equal(seEn.familyLocale, ieEn.familyLocale);
    assert.equal(seEn.familyLocale, caEn.familyLocale);
    assert.equal(seEn.marketConfig.timezone, seSv.marketConfig.timezone);
    assert.notEqual(seEn.marketConfig.timezone, caEn.marketConfig.timezone);
    assert.equal(seEn.marketConfig.currency, seSv.marketConfig.currency);
  });
});
