'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateOverridePayload,
  isIsoDate,
} = require('../src/lib/custody-override-config');

describe('custody-override-config', () => {
  const homeA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const homeB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const valid = new Set([homeA, homeB]);

  it('isIsoDate accepts YYYY-MM-DD', () => {
    assert.equal(isIsoDate('2026-07-01'), true);
    assert.equal(isIsoDate('2026-7-01'), false);
  });

  it('validateOverridePayload rejects invalid dates and home', () => {
    assert.equal(validateOverridePayload({}, valid).ok, false);
    assert.match(validateOverridePayload({
      start_date: '2026-07-10',
      end_date: '2026-07-01',
      home_id: homeA,
    }, valid).error, /start_date/);
    assert.match(validateOverridePayload({
      start_date: '2026-07-01',
      end_date: '2026-07-10',
      home_id: 'bad',
    }, valid).error, /hem/);
  });

  it('validateOverridePayload accepts valid row', () => {
    const result = validateOverridePayload({
      start_date: '2026-07-01',
      end_date: '2026-07-14',
      home_id: homeA,
      reason: '  sportlov  ',
    }, valid);
    assert.equal(result.ok, true);
    assert.equal(result.row.home_id, homeA);
    assert.equal(result.row.reason, 'sportlov');
  });
});

describe('custody override engine + DB shape', () => {
  it('loadCustodyContext loads overrides from db module', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/lib/custody-schedule-engine/index.js'),
      'utf8'
    );
    assert.match(src, /listOverridesForChild/);
    assert.doesNotMatch(src, /overrides: \[\]/);
  });

  it('custody-settings exposes override UI', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../public/js/custody-settings.js'),
      'utf8'
    );
    assert.match(src, /custody-override-save/);
    assert.match(src, /\/api\/family\/custody\/overrides/);
    assert.match(src, /Undantag/);
  });

  it('custody routes expose override CRUD', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/family/custody.js'),
      'utf8'
    );
    assert.match(src, /router\.post\('\/overrides'/);
    assert.match(src, /router\.delete\('\/overrides/);
    assert.match(src, /custody_override_created/);
  });
});
