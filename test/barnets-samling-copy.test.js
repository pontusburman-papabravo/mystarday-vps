'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling copy — #589', () => {
  it('SAMLING_WORLDS has no Min värld label', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const samlingBlock = src.slice(src.indexOf('SAMLING_WORLDS'), src.indexOf('LEGACY_HASH'));
    assert.doesNotMatch(samlingBlock, /Min värld/);
    assert.match(samlingBlock, /Min samling/);
    assert.match(samlingBlock, /Skattkammaren/);
  });

  it('LEGACY_WORLDS keeps Min värld when gate off', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const legacyBlock = src.slice(src.indexOf('LEGACY_WORLDS'), src.indexOf('SAMLING_WORLDS'));
    assert.match(legacyBlock, /Min värld/);
  });

  it('child-worlds exposes gate-aware copy helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /worldTabLabel/);
    assert.match(src, /worldBackLabel/);
    assert.match(src, /worldHubSubcopy/);
    assert.match(src, /analyticsNavMode/);
  });

  it('child-memory-hall uses worldBackConfig', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-memory-hall.js'), 'utf8');
    assert.match(src, /worldBackConfig/);
    assert.match(src, /ChildWorlds\.worldBackLabel/);
    assert.match(src, /back: worldBackConfig\(\)/);
  });

  it('child-world-hub uses gate-aware subcopy', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-world-hub.js'), 'utf8');
    assert.match(src, /worldHubSubcopy/);
  });

  it('child-shell analytics includes nav_mode', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-shell.js'), 'utf8');
    assert.match(src, /nav_mode/);
    assert.match(src, /analyticsNavMode/);
  });
});
