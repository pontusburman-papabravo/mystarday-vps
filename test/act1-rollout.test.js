'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('ACT-1 full rollout scripts', () => {
  it('enable-act1-flags.js lists all ACT-1 + referral + nudge keys', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/enable-act1-flags.js'), 'utf8');
    for (const key of [
      'activation_onboarding_v1',
      'activation_child_handoff_v1',
      'activation_first_star_guide_v1',
      'activation_ai_starter_plan',
      'activation_nudge_v1',
      'referral_program',
    ]) {
      assert.match(src, new RegExp(key));
    }
  });

  it('rollout-act1-full.sh runs migrate + enable + restart', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/rollout-act1-full.sh'), 'utf8');
    assert.match(src, /npm run migrate/);
    assert.match(src, /enable-act1-flags\.js/);
    assert.match(src, /systemctl restart/);
  });
});
