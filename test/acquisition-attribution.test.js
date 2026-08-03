'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAttributionInput,
  toAnalyticsMetadata,
  FIELD_LIMITS,
} = require('../src/lib/acquisition-attribution');

describe('acquisition attribution normalize', () => {
  it('maps utm_* to canonical fields and clamps length', () => {
    const long = 'x'.repeat(500);
    const n = normalizeAttributionInput({
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: long,
      utm_content: 'ad1',
      referral_code: 'stj-7qk2',
      landing_locale: 'en',
      platform: 'iOS',
      first_touch_at: '2026-06-01T12:00:00.000Z',
    });
    assert.equal(n.source, 'meta');
    assert.equal(n.medium, 'paid');
    assert.equal(n.campaign.length, FIELD_LIMITS.campaign);
    assert.equal(n.referral_code, 'STJ-7QK2');
    assert.equal(n.landing_locale, 'en-GB');
    assert.equal(n.platform, 'ios');
  });

  it('drops raw URLs and secret-like values', () => {
    const n = normalizeAttributionInput({
      utm_source: 'https://evil.example/path',
      utm_medium: 'Bearer abc.def.ghi',
      utm_campaign: 'ok-campaign',
      platform: 'web',
    });
    assert.equal(n.source, null);
    assert.equal(n.medium, null);
    assert.equal(n.campaign, 'ok-campaign');
  });

  it('supports direct/no-source with platform', () => {
    const n = normalizeAttributionInput({ platform: 'pwa' });
    assert.equal(n.source, 'direct');
    assert.equal(n.medium, 'none');
    assert.equal(n.platform, 'pwa');
  });

  it('returns null for empty input', () => {
    assert.equal(normalizeAttributionInput({}), null);
    assert.equal(normalizeAttributionInput(null), null);
  });

  it('toAnalyticsMetadata omits empty fields and never includes fbclid', () => {
    const meta = toAnalyticsMetadata(
      normalizeAttributionInput({
        utm_source: 'google',
        utm_medium: 'cpc',
        fbclid: 'should-not-appear',
        platform: 'android',
      })
    );
    assert.equal(meta.utm_source, 'google');
    assert.equal(meta.platform, 'android');
    assert.equal(meta.fbclid, undefined);
  });

  it('duplicate normalize calls stay first-touch compatible (idempotent payload)', () => {
    const a = normalizeAttributionInput({
      utm_source: 'meta',
      utm_medium: 'paid',
      referral_code: 'stj-abcd',
      platform: 'web',
    });
    const b = normalizeAttributionInput({
      utm_source: 'google',
      utm_medium: 'cpc',
      referral_code: 'stj-zzzz',
      platform: 'ios',
    });
    // Client/server must rely on DB COALESCE — later payloads may differ;
    // both normalize independently without mutating prior rows here.
    assert.equal(a.source, 'meta');
    assert.equal(b.source, 'google');
    assert.equal(a.referral_code, 'STJ-ABCD');
    assert.equal(b.referral_code, 'STJ-ZZZZ');
  });

  it('rejects JWT-like and password-like campaign values', () => {
    const n = normalizeAttributionInput({
      utm_source: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb',
      utm_campaign: 'password=hunter2',
      platform: 'web',
    });
    // Campaign fields dropped; platform alone becomes direct/none
    assert.equal(n.source, 'direct');
    assert.equal(n.medium, 'none');
    assert.equal(n.campaign, null);
    assert.equal(n.platform, 'web');
  });
});
