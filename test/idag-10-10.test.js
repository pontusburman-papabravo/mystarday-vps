'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FOCUS = path.join(ROOT, 'public/js/child-today-focus.js');
const TASKS = path.join(ROOT, 'public/js/child-today-tasks.js');
const DASH = path.join(ROOT, 'public/js/child-dashboard.js');
const VISION = path.join(ROOT, 'docs/idag-vision.md');
const PROMPT = path.join(ROOT, 'docs/idag-agent-prompt.md');

describe('Idag barn 10/10', () => {
  it('vision is product-only constitution', () => {
    const vision = fs.readFileSync(VISION, 'utf8');
    assert.match(vision, /Olle-test/);
    assert.match(vision, /Filterregel/);
    assert.match(vision, /Tillståndsmaskin \(exklusiv\)/);
    assert.match(vision, /Vad ska jag göra nu/);
    assert.match(vision, /3–5 uppdrag/);
    assert.doesNotMatch(vision, /child-today-focus\.js/);
    assert.doesNotMatch(vision, /npm run test:gate/);
  });

  it('agent prompt cites resolveIdagState as single truth', () => {
    const prompt = fs.readFileSync(PROMPT, 'utf8');
    assert.match(prompt, /resolveIdagState/);
    assert.match(prompt, /npm run test:gate/);
    assert.doesNotMatch(prompt, /if \(!goal\)/);
  });

  it('has exclusive resolveIdagState wired to focus bar', () => {
    const src = fs.readFileSync(FOCUS, 'utf8');
    assert.match(src, /function resolveIdagState/);
    assert.match(src, /window\.resolveIdagState = resolveIdagState/);
    assert.match(src, /updateFromDailyLog/);
    assert.doesNotMatch(src, /ctf-goal-card/);
  });

  it('hides legacy chrome above fold', () => {
    const src = fs.readFileSync(FOCUS, 'utf8');
    assert.match(src, /weekNavSection/);
    assert.match(src, /childHeaderRing/);
    assert.match(src, /goalTeaserBtn/);
  });

  it('caps visible tasks at 5 with star teasers', () => {
    const src = fs.readFileSync(TASKS, 'utf8');
    assert.match(src, /MAX_VISIBLE\s*=\s*5/);
    assert.match(src, /ctf-reward-teaser/);
  });

  it('forces quest layout in today-focus mode', () => {
    const src = fs.readFileSync(DASH, 'utf8');
    assert.match(src, /focusQuestMode/);
    assert.match(src, /day_sections' && !\(isTodayFocusLayer\(\) && isToday\)/);
    assert.match(src, /ChildTodayFocus\.updateFromDailyLog/);
  });

  it('goal bar skipped in focus mode — stars live in Skattkammaren', () => {
    const src = fs.readFileSync(DASH, 'utf8');
    assert.match(src, /isTodayFocusLayer\(\)\) return/);
  });

  it('softens quest chrome — hides schema labels and later pile in focus mode', () => {
    const src = fs.readFileSync(TASKS, 'utf8');
    assert.match(src, /softenQuestChrome/);
    assert.match(src, /later-card/);
    assert.match(src, /nl-section-label/);
  });

  it('has idag hero with primary CTA wiring', () => {
    const focus = fs.readFileSync(FOCUS, 'utf8');
    const tasks = fs.readFileSync(TASKS, 'utf8');
    assert.match(focus, /idag-hero/);
    assert.match(focus, /renderProgressDots/);
    assert.match(tasks, /syncPrimaryCta/);
    assert.match(tasks, /idag-now-cta/);
  });
});
