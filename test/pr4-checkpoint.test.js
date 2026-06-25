'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ACT-1 PR4 checkpoint', () => {
  it('starter-plan calls personalize when AI flag on', () => {
    const src = read('public/js/onboarding-starter-plan.js');
    assert.match(src, /starter-plan\/personalize/);
    assert.match(src, /activation_ai_starter_plan/);
    assert.match(src, /used_ai/);
    assert.match(src, /Anpassar schema/);
  });

  it('onboarding API has personalize route with generation events', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /starter-plan\/personalize/);
    assert.match(src, /starter_plan_generation_started/);
    assert.match(src, /starter_plan_generation_succeeded/);
    assert.match(src, /starter_plan_generation_failed/);
    assert.match(src, /generateStarterPlan/);
  });

  it('generate-plan and llm modules exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'src/lib/starter-plan/generate-plan.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'src/lib/starter-plan/llm.js')));
    const llm = read('src/lib/starter-plan/llm.js');
    assert.match(llm, /15000|DEFAULT_TIMEOUT_MS/);
  });
});
