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
const { loadLocales } = require('../src/lib/i18n');
const { describeCommercialOfferCopy, trialWelcomeMessages } = require('../src/lib/commercial-offer-copy');

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

  it('saves the resolved locale instead of forcing Swedish', () => {
    function ctx(headers, body) {
      return resolveNewAccountRegistrationContext({ headers }, body);
    }

    const swedishBrowser = ctx({ 'accept-language': 'sv-SE,sv;q=0.9' }, { country_code: 'SE' });
    const englishInSweden = ctx({ 'accept-language': 'en-IE,en;q=0.9' }, { country_code: 'SE' });
    const irelandDefault = ctx({}, { country_code: 'IE' });
    const canadaDefault = ctx({}, { country_code: 'CA' });
    const swedenDefault = ctx({}, { country_code: 'SE' });

    assert.equal(swedishBrowser.familyLocale, 'sv-SE');
    assert.equal(swedishBrowser.localeResolutionSource, 'accept_language');
    assert.equal(englishInSweden.familyLocale, 'en-GB');
    assert.equal(englishInSweden.countryResolved.country_code, 'SE');
    assert.equal(irelandDefault.familyLocale, 'en-GB');
    assert.equal(irelandDefault.localeResolutionSource, 'market_default');
    assert.equal(canadaDefault.familyLocale, 'en-GB');
    assert.equal(swedenDefault.familyLocale, 'sv-SE');
    assert.equal(swedenDefault.localeResolutionSource, 'market_default');
    assert.equal(englishInSweden.marketConfig.currency, swedenDefault.marketConfig.currency);
    assert.equal(irelandDefault.marketConfig.currency, 'EUR');
    assert.equal(canadaDefault.marketConfig.currency, 'CAD');
  });

  it('trial welcome copy follows market policy and the chosen language', () => {
    loadLocales();
    const after = new Date(new Date(SWEDEN_TRIAL_FROM_ISO).getTime() + 1000);
    const seEn = describeCommercialOfferCopy('SE', { createdAt: after, locale: 'en-GB' });
    const seSv = describeCommercialOfferCopy('SE', { createdAt: after, locale: 'sv-SE' });
    const ieEn = describeCommercialOfferCopy('IE', { createdAt: after, locale: 'en-GB' });
    const ieSv = describeCommercialOfferCopy('IE', { createdAt: after, locale: 'sv-SE' });
    const caEn = describeCommercialOfferCopy('CA', { createdAt: after, locale: 'en-GB' });

    assert.equal(seEn.entitlement, seSv.entitlement);
    assert.equal(seEn.trialDays, 14);
    assert.equal(seSv.trialDays, 14);
    assert.equal(ieEn.entitlement, ieSv.entitlement);
    assert.equal(ieEn.entitlement, caEn.entitlement);
    assert.equal(ieEn.trialDays, 0);

    const seEnCopy = trialWelcomeMessages('en-GB', seEn, { brand: 'Brand' });
    const seSvCopy = trialWelcomeMessages('sv-SE', seSv, { brand: 'Brand' });
    assert.match(seEnCopy.intro, /14/);
    assert.match(seEnCopy.pricing, /59 kr\/month/);
    assert.match(seSvCopy.pricing, /59 kr\/månad/);
    assert.doesNotMatch(seEnCopy.subject + seEnCopy.intro, /Ireland/);

    const ieEnCopy = trialWelcomeMessages('en-GB', ieEn, { brand: 'Brand' });
    const ieSvCopy = trialWelcomeMessages('sv-SE', ieSv, { brand: 'Brand' });
    assert.match(ieEnCopy.intro, /31 December 2026/);
    assert.match(ieSvCopy.intro, /31 december 2026/);
    assert.doesNotMatch(ieEnCopy.subject + ieEnCopy.intro + ieEnCopy.pricing, /Ireland|59 kr/);
    assert.doesNotMatch(ieSvCopy.intro + ieSvCopy.pricing, /59 kr|14 dagar/);
    assert.equal(ieEn.entitlement, caEn.entitlement);
  });
});
