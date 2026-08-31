'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');
const { GATE_DEFAULTS } = require('../src/lib/market-region');

describe('legal-routing', () => {
  it('SE sv-SE uses Swedish live legal routes', () => {
    const routes = resolveLegalRoutes({ countryCode: 'SE', marketRegion: 'EU', locale: 'sv-SE' });
    assert.equal(routes.privacy, '/privacy');
    assert.equal(routes.terms, '/terms');
    assert.equal(routes.status, 'live');
  });

  it('IE en-GB uses English EEA legal routes with live status', () => {
    const routes = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
    assert.equal(routes.privacy, '/en/eea/privacy');
    assert.equal(routes.terms, '/en/eea/terms');
    assert.equal(routes.childPrivacy, '/en/eea/child-privacy');
    assert.equal(routes.tracking, '/en/tracking-choices');
    assert.equal(routes.status, 'live');
  });

  it('FI sv-SE uses Swedish live legal routes (Finland is a Swedish-speaking market)', () => {
    const routes = resolveLegalRoutes({ countryCode: 'FI', marketRegion: 'EU', locale: 'sv-SE' });
    assert.equal(routes.privacy, '/privacy');
    assert.equal(routes.terms, '/terms');
    assert.equal(routes.status, 'live');
  });

  it('FI en-GB uses the same English EEA legal routes with live status (Track 1 extended to FI)', () => {
    const routes = resolveLegalRoutes({ countryCode: 'FI', marketRegion: 'EU', locale: 'en-GB' });
    assert.equal(routes.privacy, '/en/eea/privacy');
    assert.equal(routes.terms, '/en/eea/terms');
    assert.equal(routes.childPrivacy, '/en/eea/child-privacy');
    assert.equal(routes.tracking, '/en/tracking-choices');
    assert.equal(routes.status, 'live');
  });

  it('IE and FI resolve to identical EEA route objects except country_code', () => {
    const ie = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
    const fi = resolveLegalRoutes({ countryCode: 'FI', marketRegion: 'EU', locale: 'en-GB' });
    assert.deepEqual(ie, fi);
  });

  it('other EEA markets (NO, DK, generic EU) remain draft — unaffected by the IE/FI live flip', () => {
    for (const countryCode of ['NO', 'DK', 'DE']) {
      const routes = resolveLegalRoutes({ countryCode, marketRegion: 'EU', locale: 'en-GB' });
      assert.equal(routes.privacy, '/en/eea/privacy');
      assert.equal(routes.terms, '/en/eea/terms');
      assert.equal(routes.status, 'draft', `${countryCode} should remain draft`);
    }
  });

  it('SE en-GB uses English EEA routes, not UK (I)', () => {
    const routes = resolveLegalRoutes({ countryCode: 'SE', marketRegion: 'EU', locale: 'en-GB' });
    assert.equal(routes.privacy, '/en/eea/privacy');
    assert.equal(routes.terms, '/en/eea/terms');
    assert.equal(routes.childPrivacy, '/en/eea/child-privacy');
    assert.equal(routes.tracking, '/en/tracking-choices');
    assert.equal(routes.status, 'draft');
    assert.notEqual(routes.privacy, '/en/uk/privacy');
    assert.notEqual(routes.terms, '/en/uk/terms');
  });

  it('GB uses UK placeholder routes regardless of en-GB locale', () => {
    const routes = resolveLegalRoutes({ countryCode: 'GB', marketRegion: 'UK', locale: 'en-GB' });
    assert.equal(routes.privacy, '/en/uk/privacy');
    assert.equal(routes.terms, '/en/uk/terms');
    assert.equal(routes.status, 'placeholder');
  });

  it('market_ie_open and market_fi_open defaults remain OFF (legal routing does not change gates)', () => {
    assert.equal(GATE_DEFAULTS.market_ie_open, false);
    assert.equal(GATE_DEFAULTS.market_fi_open, false);
  });
});
