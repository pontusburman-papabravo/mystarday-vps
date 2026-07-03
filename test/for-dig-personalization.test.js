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

  it('recommendations use Bra nästa steg copy and sort helper', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /Bra nästa steg för \$\{/);
    assert.match(src, /sortRecommendationsForChild/);
  });

  it('goal catalog collapses to hero + Visa alla expand', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /showAllGoals/);
    assert.match(src, /heroGoalForDisplay/);
    assert.match(src, /Visa alla \$\{total\} mål/);
    assert.match(src, /data-action="show-all-goals"/);
  });

  it('intent modal is one-click required (no valfritt dismiss)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.doesNotMatch(src, /\(valfritt\)/);
    assert.doesNotMatch(src, /post-activation-dismiss/);
    assert.match(src, /intentRecorded/);
  });

  it('post-activation uses single Öppna barnvy CTA', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/for-dig.js'), 'utf8');
    assert.match(src, /Öppna barnvy/);
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
