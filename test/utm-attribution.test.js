'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { RegisterSchema } = require('../src/lib/schemas');

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
});
