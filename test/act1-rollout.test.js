'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const PR14_KEYS = [
  'activation_onboarding_v1',
  'activation_child_handoff_v1',
  'activation_first_star_guide_v1',
  'activation_ai_starter_plan',
];

describe('ACT-1 full rollout scripts', () => {
  it('enable-act1-flags.js defaults to PR 1–4 keys', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/enable-act1-flags.js'), 'utf8');
    assert.match(src, /ACT1_PR14_FLAG_KEYS/);
    assert.match(src, /--full/);
    const flagsSrc = fs.readFileSync(path.join(ROOT, 'src/lib/activation-flags.js'), 'utf8');
    for (const key of PR14_KEYS) {
      assert.match(flagsSrc, new RegExp(key));
    }
  });

  it('migration 180922 upserts PR 1–4 flags enabled', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1809220000000_enable_act1_pr1_4_flags.js'),
      'utf8'
    );
    assert.match(src, /ACT1_PR14_FLAG_KEYS/);
    assert.match(src, /enabled = true/);
    for (const key of PR14_KEYS) {
      assert.match(src, new RegExp(key));
    }
  });

  it('rollout-act1-full.sh runs migrate + enable + restart', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/rollout-act1-full.sh'), 'utf8');
    assert.match(src, /npm run migrate/);
    assert.match(src, /enable-act1-flags\.js/);
    assert.match(src, /systemctl restart/);
  });

  it('GitHub deploy workflow runs migrate + restart (PR 1–4 via migration 180922)', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/deploy.yml'), 'utf8');
    assert.match(wf, /npm run migrate/);
    assert.match(wf, /systemctl restart|VPS_RESTART_CMD/);
    assert.doesNotMatch(wf, /enable-act1-flags\.js/);
  });

  it('vps-after-pull.sh is manual deploy helper', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/vps-after-pull.sh'), 'utf8');
    assert.match(src, /enable-act1-flags\.js/);
    assert.match(src, /systemctl restart/);
  });

  it('act-1-rollout-runbook documents PR 1–4 go-live and rollback', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/act-1-rollout-runbook.md'), 'utf8');
    assert.match(doc, /activation_child_handoff_v1/);
    assert.match(doc, /activation_first_star_guide_v1/);
    assert.match(doc, /180922/);
    assert.match(doc, /enable-act1-flags/);
    assert.match(doc, /rollback/i);
  });
});
