'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('admin history warning banner', () => {
  it('exports shared warning copy and helpers', () => {
    const src = read('public/admin/admin-history-warning.js');
    assert.match(src, /Historik begränsad efter serverbyte/);
    assert.match(src, /setHistoryLimitedWarning/);
    assert.match(src, /isLongOverviewPeriod/);
    assert.match(src, /isLongActivationWindow/);
  });

  it('is wired into scoped admin surfaces only', () => {
    assert.match(read('public/admin/admin-library.js'), /overviewHistoryWarning/);
    assert.match(read('public/admin/admin-user-stats.js'), /historyLimitedWarningHtml/);
    assert.match(read('public/admin/admin-analytics.js'), /analyticsRetentionHistoryWarning/);
    assert.match(read('public/admin/admin-activation-program.js'), /activationHistoryWarning/);
    assert.match(read('public/admin/admin-subscription-settings.js'), /packageStatsHistoryWarning/);
    assert.match(read('public/admin/admin-for-dig.js'), /forDigInstallationsHistoryWarning/);
    assert.match(read('public/admin/index.html'), /admin-history-warning\.js/);
  });

  it('does not warn on 7-day overview period', () => {
    const src = read('public/admin/admin-history-warning.js');
    assert.match(src, /period === '30d' \|\| period === '365d'/);
    assert.doesNotMatch(src, /period === '7d'/);
  });
});
