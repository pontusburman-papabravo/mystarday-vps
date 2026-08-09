'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sqlFamilyHadActivityWithinDays } = require('../src/lib/family-recent-activity');

describe('family-recent-activity', () => {
  it('builds login and completion EXISTS for a family column', () => {
    const sql = sqlFamilyHadActivityWithinDays('p.family_id', 28);
    assert.match(sql, /login_event/);
    assert.match(sql, /daily_log_item/);
    assert.match(sql, /INTERVAL '28 days'/);
    assert.match(sql, /p\.family_id/);
  });

  it('rejects invalid day counts', () => {
    assert.throws(() => sqlFamilyHadActivityWithinDays('f.id', 0));
    assert.throws(() => sqlFamilyHadActivityWithinDays('f.id', 1.5));
  });
});
