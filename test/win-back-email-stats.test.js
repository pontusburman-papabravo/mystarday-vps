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
      first_return_at: loginAt,
      return_within_7d: true,
      return_source: 'login',
      for_dig_goal_slug: 'trygga-kvallar',
      for_dig_installed_at: loginAt,
      completions_after_send: 2,
      win_back_landings: 1,
    });

    assert.equal(row.returned, true);
    assert.equal(row.returned_within_7d, true);
    assert.equal(row.days_to_return, 2);
    assert.equal(row.return_source, 'login');
    assert.equal(row.return_source_label, 'inloggning');
    assert.equal(row.for_dig_goal_slug, 'trygga-kvallar');
    assert.equal(row.completions_after_send, 2);
    assert.equal(row.win_back_landings, 1);
  });

  it('mapEngagementRow counts email link visit as return', () => {
    const sentAt = new Date('2026-06-01T10:00:00Z');
    const visitAt = new Date('2026-06-02T10:00:00Z');
    const row = mapEngagementRow({
      sent_at: sentAt,
      first_return_at: visitAt,
      return_within_7d: true,
      return_source: 'email_link',
      for_dig_goal_slug: null,
      for_dig_installed_at: null,
      completions_after_send: 0,
      win_back_landings: 1,
    });

    assert.equal(row.returned, true);
    assert.equal(row.return_source, 'email_link');
    assert.equal(row.return_source_label, 'mejllänk');
  });

  it('mapEngagementRow handles no activity after send', () => {
    const row = mapEngagementRow({
      sent_at: new Date('2026-06-01T10:00:00Z'),
      first_return_at: null,
      return_within_7d: false,
      for_dig_goal_slug: null,
      for_dig_installed_at: null,
      completions_after_send: 0,
    });

    assert.equal(row.returned, false);
    assert.equal(row.completions_after_send, 0);
  });
});
