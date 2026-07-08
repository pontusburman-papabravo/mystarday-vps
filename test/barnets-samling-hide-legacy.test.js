'use strict';

/**
 * #593 — Göm/avlänka gammal värld bakom barnets_samling.
 * Cleanup/unlink only — legacy code paths preserved for gate OFF.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('barnets_samling hide legacy world — #593', () => {
  it('configureFromFeatures redirects /child/treasure → /child/world when gate off', () => {
    const src = read('public/js/child-worlds.js');
    const fn = src.slice(src.indexOf('function configureFromFeatures'), src.indexOf('function normalizePath'));
    assert.match(fn, /\/child\/treasure/);
    assert.match(fn, /\/child\/world/);
    assert.match(fn, /pOff === '\/child\/treasure'/);
    assert.match(fn, /} else \{/);
  });

  it('journey day-4 discovery uses treasureCanonicalPath at click time', () => {
    const src = read('public/js/journey-first-week.js');
    assert.match(src, /routeForExperience/);
    assert.match(src, /fw_day4_discovery/);
    assert.match(src, /treasureCanonicalPath/);
    assert.match(src, /const route = routeForExperience\(expKey\)/);
  });

  it('child-world-bg-lazy skips hub illustration when gate on', () => {
    const src = read('public/js/child-world-bg-lazy.js');
    const fn = src.slice(src.indexOf('function onLayer'), src.indexOf('function watchLayer'));
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /key === 'world'/);
  });

  it('catalog room mount blocked when gate on', () => {
    const src = read('public/js/child-catalog-room.js');
    const fn = src.slice(src.indexOf('async function mount'), src.indexOf('function registerTransitionHandlers'));
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /return false/);
  });

  it('child-dashboard home tab does not show SkattHouse hub when gate on', () => {
    const src = read('public/js/child-dashboard.js');
    const block = src.slice(src.indexOf('ChildTodayFocus.onTabChange'), src.indexOf('// ── Rewards & Goals'));
    assert.match(block, /isWorldHubEntryDisabled/);
    assert.match(block, /ChildSkattHouse\.showHub/);
    assert.match(block, /!hubBlocked/);
  });

  it('child-world.js already gates showHub when hub entry disabled', () => {
    const src = read('public/js/child-world.js');
    assert.match(src, /isWorldHubEntryDisabled/);
    assert.match(src, /!hubBlocked/);
  });

  it('legacy hub remount paths remain for gate off', () => {
    const worlds = read('public/js/child-worlds.js');
    const hub = read('public/js/child-world-hub.js');
    assert.match(worlds, /remountWorldHubLegacy/);
    assert.match(worlds, /LEGACY_WORLDS/);
    assert.match(hub, /renderHub/);
  });

  it('sub-scene back still uses returnFromWorldSubScene (gate-aware)', () => {
    const garden = read('public/js/child-garden.js');
    const memory = read('public/js/child-memory-hall.js');
    assert.match(garden, /returnFromWorldSubScene/);
    assert.match(memory, /returnFromWorldSubScene/);
  });
});
