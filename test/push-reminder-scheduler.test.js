'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { shouldSendScheduleReminder } = require('../src/lib/push-reminder-timing');

describe('shouldSendScheduleReminder', () => {
  const activityAt = 8 * 60 + 10; // 08:10

  it('fires once at default 10-minute lead (08:00 for 08:10 activity)', () => {
    const atEight = 8 * 60;
    assert.equal(shouldSendScheduleReminder(activityAt, atEight, 10), true);
    // Next cron tick 5 min later must not fire again
    assert.equal(shouldSendScheduleReminder(activityAt, atEight + 5, 10), false);
  });

  it('does not fire when activity already started or passed', () => {
    assert.equal(shouldSendScheduleReminder(activityAt, activityAt, 10), false);
    assert.equal(shouldSendScheduleReminder(activityAt, activityAt + 5, 10), false);
  });

  it('does not fire too early (outside lead window)', () => {
    const atSevenFifty = 7 * 60 + 50; // 15 min before
    assert.equal(shouldSendScheduleReminder(activityAt, atSevenFifty, 10), false);
  });

  it('fires once for custom 7-minute lead', () => {
    const atEightOhThree = 8 * 60 + 3; // 7 min before
    assert.equal(shouldSendScheduleReminder(activityAt, atEightOhThree, 7), true);
    assert.equal(shouldSendScheduleReminder(activityAt, atEightOhThree + 5, 7), false);
  });

  it('respects minimum 5-minute lead', () => {
    const atEightOhFive = 8 * 60 + 5;
    assert.equal(shouldSendScheduleReminder(activityAt, atEightOhFive, 5), true);
    assert.equal(shouldSendScheduleReminder(activityAt, atEightOhFive + 5, 5), false);
  });
});

describe('push reminder scheduler contracts', () => {
  it('star milestone dedup queries notification_log.metadata by child and milestone', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/push-reminder-scheduler.js'),
      'utf8'
    );
    assert.ok(src.includes("metadata->>'child_id'"), 'must dedupe star milestones via metadata.child_id');
    assert.ok(src.includes("metadata->>'milestone'"), 'must dedupe star milestones via metadata.milestone');
    assert.ok(src.includes('metadata: { child_id: child.id, milestone }'), 'must persist milestone metadata on send');
  });

  it('migration adds notification_log.metadata column', () => {
    const mod = require('../migrations/1809100000000_notification_log_metadata.js');
    assert.equal(mod.name, '1809100000000_notification_log_metadata');
    assert.equal(typeof mod.up, 'function');
    assert.equal(typeof mod.down, 'function');
  });
});
