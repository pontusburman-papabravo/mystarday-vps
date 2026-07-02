'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const MIGRATED_SCHEDULERS = [
  'src/lib/push-reminder-scheduler.js',
  'src/lib/win-back-scheduler.js',
  'src/lib/retention-reengagement-scheduler.js',
  'src/lib/activation-program-scheduler.js',
  'src/lib/activation-program-email-scheduler.js',
  'src/lib/custody-handoff-scheduler.js',
  'src/lib/nyhet-scheduler.js',
  'src/lib/deletion-scheduler.js',
  'src/lib/library-notifications.js',
  'src/lib/activation-nudge-scheduler.js',
  'src/lib/journey-push-scheduler.js',
  'src/lib/child-handoff-reminder-scheduler.js',
];

const CLAIM_THEN_SEND = [
  'src/lib/activation-nudge-scheduler.js',
  'src/lib/child-handoff-reminder-scheduler.js',
];

describe('scheduler-lock helper (K2/K3)', () => {
  it('withAdvisoryLock uses dedicated client and fail-closed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/scheduler-lock.js'), 'utf8');
    assert.match(src, /getClient\(\)/);
    assert.match(src, /pg_try_advisory_lock/);
    assert.match(src, /pg_advisory_unlock/);
    assert.match(src, /skipped: 'error'/);
    assert.doesNotMatch(src, /lockAcquired = true/);
  });

  it('all PR-D schedulers use withAdvisoryLock and no fail-open lockAcquired', () => {
    for (const file of MIGRATED_SCHEDULERS) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.match(src, /withAdvisoryLock/, file);
      assert.doesNotMatch(src, /lockAcquired = true/, file);
      assert.doesNotMatch(src, /fail-open/i, file);
      assert.doesNotMatch(src, /return true;\s*\/\/ fail-open/, file);
    }
  });

  it('H5/N6 email schedulers claim before send', () => {
    for (const file of CLAIM_THEN_SEND) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const claimIdx = src.indexOf('RETURNING family_id');
      const sendCall = file.includes('nudge')
        ? 'await sendActivationNudgeEmail'
        : 'await sendChildHandoffReminderEmail';
      const sendIdx = src.indexOf(sendCall);
      assert.ok(claimIdx >= 0, `${file} should UPDATE … RETURNING before send`);
      assert.ok(sendIdx > claimIdx, `${file} should send email after claim`);
      assert.match(src, /_sent_at IS NULL/, file);
    }
  });

  it('scheduler-constants exports unique lock IDs for PR-D schedulers', () => {
    const constants = require('../src/lib/scheduler-constants');
    const ids = [
      constants.PUSH_REMINDER_SCHEDULER_LOCK_ID,
      constants.WIN_BACK_SCHEDULER_LOCK_ID,
      constants.RETENTION_REENGAGEMENT_LOCK_ID,
      constants.ACTIVATION_PROGRAM_SCHEDULER_LOCK_ID,
      constants.ACTIVATION_PROGRAM_EMAIL_LOCK_ID,
      constants.CUSTODY_HANDOFF_SCHEDULER_LOCK_ID,
      constants.NYHET_SCHEDULER_LOCK_ID,
      constants.DELETION_SCHEDULER_LOCK_ID,
      constants.LIBRARY_NOTIFICATION_SCHEDULER_LOCK_ID,
      constants.ACTIVATION_NUDGE_LOCK_ID,
      constants.JOURNEY_PUSH_LOCK_ID,
      constants.CHILD_HANDOFF_REMINDER_LOCK_ID,
    ];
    assert.equal(new Set(ids).size, ids.length, 'lock IDs must be unique');
  });
});
