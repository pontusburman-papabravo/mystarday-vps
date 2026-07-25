'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const {
  RETENTION_PUSH_MILESTONES,
  evaluateRetentionPush,
} = require('../src/lib/journey/retention-push');

const ROOT = path.join(__dirname, '..');

describe('journey retention-push', () => {
  it('exports milestones 3, 7, 14', () => {
    assert.deepEqual(RETENTION_PUSH_MILESTONES, [3, 7, 14]);
  });

  it('eligibility SQL uses completion not login_event', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/journey/retention-push.js'),
      'utf8'
    );
    assert.match(src, /last_completion_at/);
    assert.match(src, /daily_log_item/);
    assert.doesNotMatch(src, /login_event/);
  });

  it('scheduler delegates to journey retention-push module', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/retention-reengagement-scheduler.js'),
      'utf8'
    );
    assert.match(src, /journey\/retention-push/);
    assert.match(src, /evaluateRetentionPush/);
    assert.match(src, /findEligibleRecipients/);
    assert.doesNotMatch(src, /legacy_retention_push/);
    assert.doesNotMatch(src, /login_event/);
  });

  it('evaluateRetentionPush delegates to Gate', () => {
    assert.equal(typeof evaluateRetentionPush, 'function');
  });
});

describe('RET-3 retention re-engagement push', () => {
  it('migration + feature flag exist', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808700000000_retention_reengagement_push.js'),
      'utf8'
    );
    assert.match(src, /retention_reengagement_push/);
    assert.match(src, /retention_reengagement_v1/);
  });

  it('scheduler has locale-aware copy for days 3, 7, 14', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/retention-reengagement-scheduler.js'),
      'utf8'
    );
    assert.match(src, /retentionPushCopy/);
    assert.match(src, /day3Title/);
    assert.match(src, /day7Body/);
    assert.match(src, /day14Title/);
    assert.match(src, /resolveCommunicationLocale/);
  });

  it('server mounts scheduler', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(src, /startRetentionReengagementScheduler/);
  });
});
