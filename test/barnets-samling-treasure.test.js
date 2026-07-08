'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling Skattkammaren route — #591', () => {
  it('SAMLING_WORLDS treasure tab uses /child/treasure', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('SAMLING_WORLDS'), src.indexOf('LEGACY_HASH'));
    assert.match(block, /id: 'treasure'/);
    assert.match(block, /\/child\/treasure/);
    assert.match(block, /Skattkammaren/);
  });

  it('child-worlds exposes treasure route helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /treasureCanonicalPath/);
    assert.match(src, /syncChildRoute/);
    assert.match(src, /prepareTreasureEntry/);
    assert.match(src, /exitFromTreasureRoute/);
    assert.match(src, /shouldSkipHubForRewards/);
    assert.match(src, /hashForWorld/);
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
    assert.match(src, /prepareTreasureEntry/);
    assert.match(src, /syncChildRoute/);
    assert.match(src, /\/child\/treasure/);
  });

  it('loadRewards prepares treasure entry and skips hub when gate on', () => {
    const rewards = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    const dash = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(rewards, /prepareTreasureEntry/);
    assert.match(rewards, /shouldSkipHubForRewards/);
    assert.match(dash, /shouldSkipHubForRewards/);
  });

  it('openSkattkammaren uses skipHub and treasure route when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    const fn = src.slice(src.indexOf('function openSkattkammaren'), src.indexOf('function shouldPreferSkatt'));
    assert.match(fn, /shouldSkipHubForRewards/);
    assert.match(fn, /syncChildRoute\('treasure'\)/);
    assert.match(fn, /skipHub/);
  });

  it('child-shell bootstraps treasure without legacy world hub', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-shell.js'), 'utf8');
    assert.match(src, /worldId === 'treasure'/);
    assert.match(src, /prepareTreasureEntry/);
  });

  it('rewards engine treats world scenes inactive when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-rewards-engine.js'), 'utf8');
    const fn = src.slice(src.indexOf('function isWorldSceneActive'), src.indexOf('function clearGoalChrome'));
    assert.match(fn, /isWorldHubEntryDisabled/);
  });

  it('server registers /child/treasure route', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/treasure/);
  });

  it('legacy LEGACY_WORLDS still uses /child/world when gate off', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('LEGACY_WORLDS'), src.indexOf('SAMLING_WORLDS'));
    assert.match(block, /\/child\/world/);
    assert.match(block, /Min värld/);
  });
});
