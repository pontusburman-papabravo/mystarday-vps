'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling SPA tab navigation', () => {
  it('navigateWorld uses showTab + syncChildRoute without location.href when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    const fn = src.slice(src.indexOf('function navigateWorld'), src.indexOf('function applyV2Chrome'));
    const gateBlock = fn.slice(fn.indexOf('if (gateOn)'), fn.indexOf('if (world && world.href)'));
    assert.match(gateBlock, /showTab\(tabKey\)/);
    assert.match(gateBlock, /syncChildRoute\(worldId/);
    assert.doesNotMatch(gateBlock, /location\.href/);
  });

  it('legacy gate off still allows full-page href between paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    const fn = src.slice(src.indexOf('function navigateWorld'), src.indexOf('function applyV2Chrome'));
    assert.match(fn, /location\.href = world\.href/);
  });

  it('child-universe-client loads in HTML (not deferred-only)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-universe-client\.js/);
  });

  it('ChildSamlingView warns when ChildUniverse missing', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-view.js'), 'utf8');
    assert.match(src, /ChildUniverse unavailable/);
    assert.match(src, /showCachedIfReady/);
  });

  it('showTab skips force reload for treasure when samling gate and rewardsLoaded', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    const fn = src.slice(src.indexOf('function showTab'), src.indexOf('// ── Rewards'));
    assert.match(fn, /samlingGate && window\.rewardsLoaded/);
    assert.match(fn, /ChildTreasureView\.refresh\(samlingGate \? \{\}/);
  });
});
