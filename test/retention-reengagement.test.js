'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('RET-3 retention re-engagement push', () => {
  it('migration + feature flag exist', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808700000000_retention_reengagement_push.js'),
      'utf8'
    );
    assert.match(src, /retention_reengagement_push/);
    assert.match(src, /retention_reengagement_v1/);
  });

  it('scheduler has copy for days 3, 7, 14', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/retention-reengagement-scheduler.js'),
      'utf8'
    );
    assert.match(src, /milestone_day IN \(3, 7, 14\)|milestone_day = \$1/);
    assert.match(src, /COPY\s*=\s*\{/);
    assert.match(src, /3:\s*\{/);
    assert.match(src, /7:\s*\{/);
    assert.match(src, /14:\s*\{/);
  });

  it('server mounts scheduler', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(src, /startRetentionReengagementScheduler/);
  });

  it('enable-custody-beta script exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/enable-custody-beta.js')));
  });
});
