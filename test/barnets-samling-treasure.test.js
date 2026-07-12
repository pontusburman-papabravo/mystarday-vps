'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling Skattkammaren route — #591', () => {
  it('SAMLING_WORLDS treasure tab uses /child/treasure', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('SAMLING_WORLDS'), src.indexOf('LEGACY_HASH'));
    assert.match(block, /id: 'treasure'/);
    assert.match(block, /\/child\/treasure/);
    assert.match(block, /Skattkammaren/);
  });

  it('child-treasure-view delegates to loadRewards with skipHub when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-treasure-view.js'), 'utf8');
    assert.match(src, /ChildTreasureView/);
    assert.match(src, /loadRewards/);
    assert.match(src, /skipHub/);
    assert.match(src, /isBarnetsSamlingEnabled/);
    assert.match(src, /deactivateWorldSubScenes/);
  });

  it('child-worlds exposes treasure route helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /treasureCanonicalPath/);
    assert.match(src, /syncChildRoute/);
    assert.match(src, /prepareTreasureEntry/);
    assert.match(src, /exitFromTreasureRoute/);
    assert.match(src, /shouldSkipHubForRewards/);
    assert.match(src, /hashForWorld/);
    assert.match(src, /\/child\/treasure/);
  });

  it('exitFromTreasureRoute goes to Idag when gate on, legacy hub when off', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const fn = src.slice(
      src.indexOf('async function exitFromTreasureRoute'),
      src.indexOf('async function remountWorldHubLegacy')
    );
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /syncChildRoute\('today'\)/);
    assert.match(fn, /showTab\('schedule'\)/);
    assert.match(fn, /remountWorldHubLegacy/);
  });

  it('gate ON uses #treasure hash alias', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('SAMLING_HASH'), src.indexOf('let _barnetsSamling'));
    assert.match(block, /treasure: 'treasure'/);
    assert.match(block, /skattkammaren: 'treasure'/);
    assert.match(block, /world: 'treasure'/);
  });

  it('layer router syncs child route and redirects /child/world', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-layer-router.js'), 'utf8');
    assert.match(src, /syncChildRoute/);
    assert.match(src, /\/child\/treasure/);
    assert.match(src, /\/child\/world/);
    assert.match(src, /hashForWorld/);
    assert.match(src, /prepareTreasureEntry/);
  });

  it('nav treasure goes to canonical path when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    const fn = src.slice(src.indexOf('function navigateWorld'), src.indexOf('function applyV2Chrome'));
    assert.match(fn, /worldId === 'treasure'/);
    assert.match(fn, /\/child\/treasure/);
    assert.match(fn, /prepareTreasureEntry/);
    assert.match(fn, /syncChildRoute/);
    assert.doesNotMatch(fn, /gateOn[\s\S]*location\.href = '\/child\/treasure'/);
  });

  it('child-shell bootstraps treasure via ChildTreasureView and prepareTreasureEntry', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-shell.js'), 'utf8');
    assert.match(src, /worldId === 'treasure'/);
    assert.match(src, /ChildTreasureView\.onEnter/);
    assert.match(src, /prepareTreasureEntry/);
  });

  it('child-dashboard uses ChildTreasureView for rewards tab', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /ChildTreasureView\.refresh/);
    assert.match(src, /shouldSkipHubForRewards/);
  });

  it('openSkattkammaren uses skipHub and treasure route when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    const fn = src.slice(src.indexOf('function openSkattkammaren'), src.indexOf('function shouldPreferSkatt'));
    assert.match(fn, /shouldSkipHubForRewards/);
    assert.match(fn, /syncChildRoute\('treasure'\)/);
    assert.match(fn, /skipHub/);
  });

  it('skatt-house room back uses exitFromTreasureRoute when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-skatt-house.js'), 'utf8');
    const fn = src.slice(src.indexOf('function bindRoomEvents'), src.indexOf('function bindChestTap'));
    assert.match(fn, /exitFromTreasureRoute/);
    assert.match(fn, /isWorldHubEntryDisabled/);
  });

  it('rewards engine treats world scenes inactive when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-rewards-engine.js'), 'utf8');
    const fn = src.slice(src.indexOf('function isWorldSceneActive'), src.indexOf('function clearGoalChrome'));
    assert.match(fn, /isWorldHubEntryDisabled/);
  });

  it('loadRewards prepares treasure entry and skips hub when gate on', () => {
    const rewards = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(rewards, /prepareTreasureEntry/);
    assert.match(rewards, /shouldSkipHubForRewards/);
    assert.match(rewards, /isWorldHubEntryDisabled/);
    assert.match(rewards, /options\.skipHub/);
  });

  it('server registers /child/treasure route', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/treasure/);
  });

  it('child-dashboard.html includes treasure modules', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-treasure-view\.js/);
    assert.match(html, /child-treasure-present\.js/);
    assert.match(html, /child-treasure-present\.css/);
  });

  it('legacy LEGACY_WORLDS still uses /child/world when gate off', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('LEGACY_WORLDS'), src.indexOf('SAMLING_WORLDS'));
    assert.match(block, /\/child\/world/);
    assert.match(block, /Min värld/);
    assert.match(src, /remountWorldHubLegacy/);
  });
});

describe('barnets_samling treasure presentation — gate ON (Fas C slice)', () => {
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
    assert.match(src, /btp-plaque-label/);
    assert.match(src, /Du kan lösa in den här nu/);
    assert.match(src, /Här kommer belöningar du sparat ihop till att synas/);
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

  it('presentation maps status labels from existing reward state', () => {
    const presentSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-treasure-present.js'), 'utf8');
    const rewardsSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    const ctx = {
      window: {},
      document: { getElementById: function () { return null; }, createElement: function () { return { textContent: '', innerHTML: '' }; } },
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
    assert.match(css, /\.btp-hero/);
    assert.doesNotMatch(css, /^\.btp-/m);
    assert.doesNotMatch(css, /^body\.btp/m);
  });
});
