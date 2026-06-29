'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapEngagementRow } = require('../db/win-back-email-stats');

describe('win-back-email-stats', () => {
  it('mapEngagementRow marks returned when family completed activities after send', () => {
    const sentAt = new Date('2026-06-01T10:00:00Z');
    const completionAt = new Date('2026-06-03T10:00:00Z');
    const row = mapEngagementRow({
      sent_at: sentAt,
      first_completion_at: completionAt,
      completion_within_7d: true,
      first_diagnostic_at: completionAt,
      diagnostic_source: 'login',
      for_dig_goal_slug: 'trygga-kvallar',
      for_dig_installed_at: completionAt,
      completions_after_send: 2,
      win_back_landings: 1,
    });

    assert.equal(row.returned, true);
    assert.equal(row.returned_within_7d, true);
    assert.equal(row.days_to_return, 2);
    assert.equal(row.return_source, 'completion');
    assert.equal(row.return_source_label, 'avbockning');
    assert.equal(row.completions_after_send, 2);
    assert.equal(row.had_diagnostic_activity, true);
  });

  it('mapEngagementRow treats login without completion as diagnostic only', () => {
    const sentAt = new Date('2026-06-01T10:00:00Z');
    const visitAt = new Date('2026-06-02T10:00:00Z');
    const row = mapEngagementRow({
      sent_at: sentAt,
      first_completion_at: null,
      completion_within_7d: false,
      first_diagnostic_at: visitAt,
      diagnostic_source: 'email_link',
      for_dig_goal_slug: null,
      for_dig_installed_at: null,
      completions_after_send: 0,
      win_back_landings: 1,
    });

    assert.equal(row.returned, false);
    assert.equal(row.had_diagnostic_activity, true);
    assert.equal(row.return_source, 'email_link');
    assert.equal(row.return_source_label, 'mejllänk');
  });

  it('mapEngagementRow handles no activity after send', () => {
    const row = mapEngagementRow({
      sent_at: new Date('2026-06-01T10:00:00Z'),
      first_completion_at: null,
      completion_within_7d: false,
      first_diagnostic_at: null,
      for_dig_goal_slug: null,
      for_dig_installed_at: null,
      completions_after_send: 0,
    });

    assert.equal(row.returned, false);
    assert.equal(row.had_diagnostic_activity, false);
    assert.equal(row.completions_after_send, 0);
  });
});
