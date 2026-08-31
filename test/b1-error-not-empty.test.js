'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  hemLoadOutcome,
  hemTreatAsEmpty,
  hemCoachAllowed,
} = require('../src/lib/hem-attention');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('B1 error ≠ empty', () => {
  it('load outcomes distinguish loading, error, empty, and items', () => {
    assert.equal(hemLoadOutcome(null, false), 'loading');
    assert.equal(hemLoadOutcome(false, false), 'error');
    assert.equal(hemLoadOutcome(true, false), 'ok_empty');
    assert.equal(hemLoadOutcome(true, true), 'ok_items');
    assert.equal(hemTreatAsEmpty('error'), false);
    assert.equal(hemTreatAsEmpty('loading'), false);
    assert.equal(hemTreatAsEmpty('ok_empty'), true);
    assert.equal(hemCoachAllowed('error'), false);
    assert.equal(hemCoachAllowed('ok_empty'), true);
  });

  it('readiness failed fetch is not treated as no exceptions', () => {
    const src = read('public/js/home-readiness.js');
    assert.match(src, /renderLoadError/);
    assert.match(src, /data-readiness-error/);
    assert.match(src, /getLoadOutcome/);
    assert.doesNotMatch(src, /if \(!res\.ok\) return;/);
    assert.doesNotMatch(src, /catch \(_\) \{\s*mount\.classList\.add\('hidden'\)/);
  });

  it('Hem hub does not render empty-children copy on stats failure', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /opts\.loadError/);
    assert.match(hub, /home\.status\.loadError/);
    assert.match(hub, /data-hem-status="error"/);
    assert.match(hub, /loadError \? \[\] : buildWeekSeries/);
    const cards = read('public/js/dashboard-cards.js');
    assert.match(cards, /loadError: !cached/);
    assert.match(cards, /data-hem-status="error"/);
  });

  it('rewards hub does not show add-child empty copy after a failed fetch', () => {
    const hub = read('public/js/rewards-hub.js');
    assert.match(hub, /ok: false/);
    assert.match(hub, /starsSectionInner\(children, starsError\)/);
    assert.match(hub, /library\.rewardsHub\.loadError/);
    assert.doesNotMatch(hub, /if \(!res\.ok\) return \[\];/);
  });
});
