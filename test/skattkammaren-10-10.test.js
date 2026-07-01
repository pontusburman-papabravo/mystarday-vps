'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REWARDS = path.join(ROOT, 'public/js/child-dashboard-rewards.js');

describe('Skattkammaren barn 10/10', () => {
  it('vision is product-only constitution', () => {
    const vision = fs.readFileSync(path.join(ROOT, 'docs/skattkammaren-vision.md'), 'utf8');
    assert.match(vision, /Olle-test/);
    assert.match(vision, /Filterregel/);
    assert.match(vision, /Priority Ladder/);
    assert.match(vision, /Icke-mål/);
    assert.match(vision, /Tillståndsmaskin/);
    assert.match(vision, /Vanliga felidéer/);
    assert.match(vision, /nästa steg/);
    assert.match(vision, /teknikagnostiskt/i);
    assert.doesNotMatch(vision, /child-dashboard-rewards\.js/);
    assert.doesNotMatch(vision, /npm run test:gate/);
  });

  it('agent prompt owns implementation details', () => {
    const prompt = fs.readFileSync(path.join(ROOT, 'docs/skattkammaren-agent-prompt.md'), 'utf8');
    assert.match(prompt, /child-dashboard-rewards\.js/);
    assert.match(prompt, /npm run test:gate/);
    assert.match(prompt, /Tillståndsmaskin/);
  });

  it('uses hero with star count and goal progress (Olle-test)', () => {
    const src = fs.readFileSync(REWARDS, 'utf8');
    assert.match(src, /skatt-hero-v10/);
    assert.match(src, /stjärnor samlade/);
    assert.match(src, /skatt-hero-progress-fill/);
    assert.match(src, /Stjärnburken/);
  });

  it('has at most one primary CTA pattern', () => {
    const src = fs.readFileSync(REWARDS, 'utf8');
    assert.match(src, /skatt-primary-cta/);
    assert.match(src, /Fråga om att lösa in/);
    assert.doesNotMatch(src, /Du har råd nu!/);
    assert.doesNotMatch(src, /skatt-reward-grid/);
  });

  it('reward list uses progress rows with Klar tag', () => {
    const src = fs.readFileSync(REWARDS, 'utf8');
    assert.match(src, /skatt-reward-list/);
    assert.match(src, /skatt-reward-row/);
    assert.match(src, />Klar!</);
    assert.match(src, /sortRewardsForList/);
  });

  it('hides empty trophy shelf', () => {
    const src = fs.readFileSync(REWARDS, 'utf8');
    assert.doesNotMatch(src, /Lös in en belöning — och vinn din första trofé/);
    assert.match(src, /if \(trophies\.length > 0\)/);
  });

  it('keeps kind denied copy', () => {
    const src = fs.readFileSync(REWARDS, 'utf8');
    assert.match(src, /deniedRecent/);
    assert.match(src, /Inte den här gången/);
  });

  it('SW bumped for Skattkammaren 10/10', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cache-version.json'), 'utf8'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + cache.cacheName + "'"));
    assert.ok(cache.cacheName >= 'stjarndag-v442');
  });
});
