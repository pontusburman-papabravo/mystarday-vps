'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling treasure tab — #591', () => {
  it('child-treasure-view delegates to loadRewards with skipHub when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-treasure-view.js'), 'utf8');
    assert.match(src, /ChildTreasureView/);
    assert.match(src, /loadRewards/);
    assert.match(src, /skipHub/);
    assert.match(src, /isBarnetsSamlingEnabled/);
    assert.match(src, /deactivateWorldSubScenes/);
    assert.match(src, /syncTreasurePath/);
  });

  it('child-worlds exposes treasure route helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /syncTreasurePath/);
    assert.match(src, /exitFromTreasureRoute/);
    assert.match(src, /exitToTreasureRoute/);
    assert.match(src, /\/child\/treasure/);
    assert.match(src, /\/child\/today/);
  });

  it('exitFromTreasureRoute goes to Idag when gate on, legacy hub when off', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const fn = src.slice(
      src.indexOf('async function exitFromTreasureRoute'),
      src.indexOf('function isConfigured')
    );
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /\/child\/today/);
    assert.match(fn, /showTab\('schedule'\)/);
    assert.match(fn, /remountWorldHubLegacy/);
  });

  it('child-shell bootstraps treasure world via ChildTreasureView', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-shell.js'), 'utf8');
    assert.match(src, /worldId === 'treasure'/);
    assert.match(src, /ChildTreasureView\.onEnter/);
  });

  it('child-dashboard uses ChildTreasureView for rewards tab', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /ChildTreasureView\.refresh/);
  });

  it('child-worlds-nav treasure tab always uses /child/treasure when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    const fn = src.slice(src.indexOf('function navigateWorld'), src.indexOf('function applyV2Chrome'));
    assert.match(fn, /worldId === 'treasure'/);
    assert.match(fn, /\/child\/treasure/);
    assert.match(fn, /\/child\/world/);
  });

  it('openSkattkammaren passes skipHub when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    const fn = src.slice(src.indexOf('function openSkattkammaren'), src.indexOf('function shouldPreferSkatt'));
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /skipHub/);
    assert.match(fn, /syncTreasurePath/);
  });

  it('skatt-house room back uses exitFromTreasureRoute when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-skatt-house.js'), 'utf8');
    const fn = src.slice(src.indexOf('function bindRoomEvents'), src.indexOf('function bindChestTap'));
    assert.match(fn, /exitFromTreasureRoute/);
    assert.match(fn, /isWorldHubEntryDisabled/);
  });

  it('child-dashboard.html includes treasure modules', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-treasure-view\.js/);
    assert.match(html, /child-treasure-present\.js/);
    assert.match(html, /child-treasure-present\.css/);
  });

  it('legacy gate off keeps world tab and hub path', () => {
    const worlds = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const legacyBlock = worlds.slice(worlds.indexOf('LEGACY_WORLDS'), worlds.indexOf('SAMLING_WORLDS'));
    assert.match(legacyBlock, /id: 'world'/);
    assert.match(legacyBlock, /\/child\/world/);
    assert.match(worlds, /remountWorldHubLegacy/);
  });

  it('loadRewards still gates hub mount when barnets_samling active', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(src, /isWorldHubEntryDisabled/);
    assert.match(src, /options\.skipHub/);
  });
});

describe('barnets_samling treasure presentation — gate ON', () => {
  it('renderSkattkammaren delegates to ChildTreasurePresent when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    const fn = src.slice(src.indexOf('function renderSkattkammaren'), src.indexOf('// ── Coin sound'));
    assert.match(fn, /ChildTreasurePresent\.shouldUse/);
    assert.match(fn, /ChildTreasurePresent\.render/);
    assert.match(fn, /return;/);
  });

  it('child-treasure-present uses warm Swedish copy, no shop words', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-treasure-present.js'), 'utf8');
    assert.match(src, /stjärnor att använda/);
    assert.match(src, /Du sparar till/);
    assert.match(src, /Väntar på vuxen/);
    assert.match(src, /Kan lösas in/);
    assert.match(src, /Genomförd/);
    assert.match(src, /Belöningar jag sparat ihop till/);
    assert.match(src, /resolveSkattState/);
    assert.doesNotMatch(src, /\bshop\b/i);
    assert.doesNotMatch(src, /\bköp\b/i);
    assert.doesNotMatch(src, /\bclaim\b/i);
    assert.doesNotMatch(src, /\bloot\b/i);
  });

  it('presentation maps five status labels from existing reward state', () => {
    const presentSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-treasure-present.js'), 'utf8');
    const rewardsSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    const ctx = {
      window: {},
      document: { createElement: function () { return { textContent: '', innerHTML: '' }; } },
      console: console,
      minimalUiActive: false,
      childUiMagic: false,
      me: { name: 'Anna' },
      escHtml: function (s) { return String(s); },
      navigator: { onLine: true },
      Auth: { api: async function () { return {}; } },
      rewardsLoaded: false,
      matchMedia: function () { return { matches: true }; },
    };
    vm.runInNewContext(rewardsSrc, ctx);
    vm.runInNewContext(presentSrc, ctx);

    const status = ctx.window.ChildTreasurePresent.rewardPresentStatus;
    assert.equal(status({ isRedeemed: true }).label, 'Genomförd');
    assert.equal(status({ hasPending: true }).label, 'Väntar på vuxen');
    assert.equal(status({ ready: true }).label, 'Kan lösas in');
    assert.equal(status({ ready: false, hasPending: false, isRedeemed: false }).label, 'Sparar');
  });

  it('gate presentation CSS scoped to data-barnets-samling on', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-treasure-present.css'), 'utf8');
    assert.match(css, /\[data-barnets-samling="on"\]/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /\.btp-header/);
  });
});
