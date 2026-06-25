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

  it('admin analytics exposes funnel and experiment', () => {
    const routes = read('src/routes/admin/analytics.js');
    assert.match(routes, /activation-funnel/);
    assert.match(routes, /activation-experiment/);
    const ui = read('public/admin/admin-analytics.js');
    assert.match(ui, /loadActivationFunnel/);
    assert.match(ui, /loadActivationExperiment/);
  });

  it('nudge migration adds column and flag', () => {
    const mig = read('migrations/1808630000000_activation_nudge_sent.js');
    assert.match(mig, /activation_nudge_sent_at/);
    assert.match(mig, /activation_nudge_v1/);
  });
});
