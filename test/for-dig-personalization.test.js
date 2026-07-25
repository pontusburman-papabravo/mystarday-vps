'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('För dig Sprint 3–5 personalization contracts', () => {
  it('for-dig.js filters goals by family age span', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /goalMatchesFamilyAge/);
    assert.match(src, /goalsForDisplay\(\)/);
  });

  it('recommendations use localized copy and sort helper', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /forDig\.sections\.recommendTitle/);
    assert.match(src, /sortRecommendationsForChild/);
  });

  it('goal catalog collapses to hero + Visa alla expand', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /showAllGoals/);
    assert.match(src, /heroGoalForDisplay/);
    assert.match(src, /forDig\.cta\.showAllGoals/);
    assert.match(src, /data-action="show-all-goals"/);
  });

  it('intent modal is one-click required (no valfritt dismiss)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.doesNotMatch(src, /\(valfritt\)/);
    assert.doesNotMatch(src, /post-activation-dismiss/);
    assert.match(src, /intentRecorded/);
  });

  it('post-activation uses single localized child view CTA', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /forDig\.cta\.openChildView/);
    assert.match(src, /href="\/child-login"/);
  });

  it('favorites section precedes goals in HTML', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/for-dig.html'), 'utf8');
    const favIdx = html.indexOf('id="forDigFavorites"');
    const goalsIdx = html.indexOf('id="forDigGoals"');
    assert.ok(favIdx > -1 && goalsIdx > -1);
    assert.ok(favIdx < goalsIdx);
  });

  it('favorites section hidden when empty (no empty-state markup)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.doesNotMatch(src, /for-dig-favorites--empty/);
    assert.match(src, /if \(items\.length === 0\) \{\s*mount\.innerHTML = '';/);
  });
});
