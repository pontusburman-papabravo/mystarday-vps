'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ACT-1 PR5 checkpoint', () => {
  it('activation nudge scheduler is wired in server', () => {
    const server = read('server.js');
    assert.match(server, /startActivationNudgeScheduler/);
    const sched = read('src/lib/activation-nudge-scheduler.js');
    assert.match(sched, /activation_nudge_sent/);
    assert.match(sched, /24 hours/);
    assert.match(sched, /48 hours/);
  });

  it('nudge email helper exists', () => {
    const email = read('src/lib/email.js');
    assert.match(email, /sendActivationNudgeEmail/);
  });

  it('admin analytics exposes funnel API and weekly report UI (AI-only)', () => {
    const routes = read('src/routes/admin/analytics.js');
    assert.match(routes, /activation-funnel/);
    assert.match(routes, /activation-experiment/);
    assert.match(routes, /activation-weekly-report/);
    const ui = read('public/admin/admin-analytics.js');
    assert.match(ui, /loadActivationWeeklyReport/);
    assert.match(ui, /renderActivationFunnelFromReport/);
    assert.doesNotMatch(ui, /loadActivationExperiment/);
  });

  it('nudge migration adds column and flag', () => {
    const mig = read('migrations/1808630000000_activation_nudge_sent.js');
    assert.match(mig, /activation_nudge_sent_at/);
    assert.match(mig, /activation_nudge_v1/);
    const enable = read('migrations/1809320000000_enable_activation_nudge_v1.js');
    assert.match(enable, /activation_nudge_v1/);
  });

  it('scheduler respects notification_preference', () => {
    const sched = read('src/lib/activation-nudge-scheduler.js');
    assert.match(sched, /notification_preference/);
    assert.match(sched, /resolveNudgeCtaUrl/);
  });
});
