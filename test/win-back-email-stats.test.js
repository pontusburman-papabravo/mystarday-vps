'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapEngagementRow } = require('../db/win-back-email-stats');

describe('win-back-email-stats', () => {
  it('mapEngagementRow marks returned when parent logged in after send', () => {
    const sentAt = new Date('2026-06-01T10:00:00Z');
    const loginAt = new Date('2026-06-03T10:00:00Z');
    const row = mapEngagementRow({
      sent_at: sentAt,
      first_parent_login_at: loginAt,
      parent_login_within_7d: true,
      for_dig_goal_slug: 'trygga-kvallar',
      for_dig_installed_at: loginAt,
      completions_after_send: 2,
      win_back_landings: 1,
    });

    assert.equal(row.returned, true);
    assert.equal(row.returned_within_7d, true);
    assert.equal(row.days_to_return, 2);
    assert.equal(row.for_dig_goal_slug, 'trygga-kvallar');
    assert.equal(row.completions_after_send, 2);
    assert.equal(row.win_back_landings, 1);
  });

  it('mapEngagementRow handles no activity after send', () => {
    const row = mapEngagementRow({
      sent_at: new Date('2026-06-01T10:00:00Z'),
      first_parent_login_at: null,
      parent_login_within_7d: false,
      for_dig_goal_slug: null,
      for_dig_installed_at: null,
      completions_after_send: 0,
    });

    assert.equal(row.returned, false);
    assert.equal(row.completions_after_send, 0);
  });
});
