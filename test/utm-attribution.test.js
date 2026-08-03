'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { RegisterSchema } = require('../src/lib/schemas');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('signup attribution (utm)', () => {
  it('RegisterSchema accepts optional utm fields', () => {
    const parsed = RegisterSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'morgon-lugn-jun26',
      fbclid: 'abc123',
    });
    assert.equal(parsed.utm_source, 'meta');
    assert.equal(parsed.utm_medium, 'paid');
    assert.equal(parsed.utm_campaign, 'morgon-lugn-jun26');
    assert.equal(parsed.fbclid, 'abc123');
  });

  it('RegisterSchema works without utm fields', () => {
    const parsed = RegisterSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
    });
    assert.equal(parsed.utm_source, undefined);
  });

  it('RegisterSchema accepts platform + first_touch_at', () => {
    const parsed = RegisterSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      platform: 'ios',
      first_touch_at: '2026-06-01T12:00:00.000Z',
    });
    assert.equal(parsed.platform, 'ios');
    assert.equal(parsed.first_touch_at, '2026-06-01T12:00:00.000Z');
  });

  it('utm-capture client stores platform and omits fbclid persistence', () => {
    const src = read('public/js/utm-capture.js');
    assert.match(src, /detectPlatform/);
    assert.match(src, /toRegisterFields/);
    assert.match(src, /landing_locale/);
    assert.doesNotMatch(src, /fbclid/);
  });
});
