'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('PR-C race + timezone contracts', () => {
  it('N3: parent complete uses atomic UPDATE WHERE completed = false', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/daily-logs/items.js'), 'utf8');
    assert.match(src, /WHERE id = \$1 AND completed = false/);
    assert.match(src, /justCompleted/);
  });

  it('N3: child complete uses atomic UPDATE WHERE completed = false', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/daily-logs/child-self.js'), 'utf8');
    assert.match(src, /WHERE id = \$1 AND completed = false/);
    assert.match(src, /justCompleted/);
  });

  it('H3: daily_log_item unique index migration exists', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1809190000000_daily_log_item_unique_activity.js'),
      'utf8'
    );
    assert.match(mig, /daily_log_item_unique_activity_idx/);
    assert.match(mig, /daily_log_id, activity_template_id/);
  });

  it('H3: generator inserts use ON CONFLICT DO NOTHING', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/daily-log-generator.js'), 'utf8');
    assert.match(src, /ON CONFLICT \(daily_log_id, activity_template_id\) WHERE activity_template_id IS NOT NULL DO NOTHING/);
  });

  it('H4: push scheduler uses getLocalDateStr not UTC slice', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/push-reminder-scheduler.js'), 'utf8');
    assert.match(src, /getLocalDateStr/);
    assert.doesNotMatch(src, /toISOString\(\)\.slice\(0, 10\)/);
  });
});
