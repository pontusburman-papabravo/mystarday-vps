'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ACT-1 PR3 checkpoint', () => {
  it('starter-plan wizard has 7 questions and preview save flow', () => {
    const src = read('public/js/onboarding-starter-plan.js');
    assert.match(src, /QUESTIONS = \[/);
    const qCount = (src.match(/id: '/g) || []).length;
    assert.ok(qCount >= 7, 'expected at least 7 questions');
    assert.match(src, /activation_question_answered/);
    assert.match(src, /starter_plan_preview_viewed|renderPreview/);
    assert.match(src, /starter_plan_saved/);
    assert.match(src, /plan_edited_before_save/);
    assert.match(src, /activity_count/);
  });

  it('after save navigates to handoff step 5', () => {
    const src = read('public/js/onboarding-starter-plan.js');
    assert.match(src, /goToStep\(5\)/);
    assert.doesNotMatch(src, /goToStep\(4\)/);
  });

  it('onboarding API exposes suggest, preview, personalize', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /starter-plan\/suggest/);
    assert.match(src, /starter-plan\/preview/);
    assert.match(src, /starter_template_selected/);
    assert.match(src, /starter_plan_preview_viewed/);
  });

  it('onboarding.html loads starter-plan after onboarding.js', () => {
    const html = read('public/onboarding.html');
    const o = html.indexOf('onboarding.js');
    const s = html.indexOf('onboarding-starter-plan.js');
    assert.ok(o >= 0 && s > o);
  });
});
