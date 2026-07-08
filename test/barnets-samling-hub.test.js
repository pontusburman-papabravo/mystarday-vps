'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling hub bypass — #590', () => {
  it('child-worlds exposes hub entry guards and safe exit helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /isWorldHubEntryDisabled/);
    assert.match(src, /exitToTreasureRoute/);
    assert.match(src, /remountWorldHubLegacy/);
    assert.match(src, /returnFromWorldSubScene/);
    assert.match(src, /skipHub: true/);
  });

  it('ChildMorgonhus.tryMountWorld returns false when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    const fn = src.slice(src.indexOf('async function tryMountWorld'), src.indexOf('async function refresh'));
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /return false/);
  });

  it('ChildWorldHub.show is blocked when gate on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-world-hub.js'), 'utf8');
    const fn = src.slice(src.indexOf('async function show'), src.indexOf('async function tryShow'));
    assert.match(fn, /isWorldHubEntryDisabled/);
    assert.match(fn, /return false/);
  });

  it('loadRewards skips hub mount when barnets_samling active', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(src, /isWorldHubEntryDisabled/);
    assert.match(src, /options\.skipHub/);
  });

  it('sub-scene back navigation uses returnFromWorldSubScene', () => {
    const garden = fs.readFileSync(path.join(ROOT, 'public/js/child-garden.js'), 'utf8');
    const morgonhus = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    const memory = fs.readFileSync(path.join(ROOT, 'public/js/child-memory-hall.js'), 'utf8');
    assert.match(garden, /returnFromWorldSubScene/);
    assert.match(morgonhus, /returnFromWorldSubScene/);
    assert.match(memory, /returnFromWorldSubScene/);
  });

  it('living world and catalog room respect hub gate', () => {
    const lw = fs.readFileSync(path.join(ROOT, 'public/js/child-living-world-transition.js'), 'utf8');
    const catalog = fs.readFileSync(path.join(ROOT, 'public/js/child-catalog-room.js'), 'utf8');
    assert.match(lw, /isWorldHubEntryDisabled/);
    assert.match(catalog, /isWorldHubEntryDisabled/);
  });

  it('garden and memory hall mount blocked when gate on', () => {
    const garden = fs.readFileSync(path.join(ROOT, 'public/js/child-garden.js'), 'utf8');
    const memory = fs.readFileSync(path.join(ROOT, 'public/js/child-memory-hall.js'), 'utf8');
    const gardenMount = garden.slice(garden.indexOf('async function mount'), garden.indexOf('window.ChildGarden'));
    const memoryMount = memory.slice(memory.indexOf('async function mount'), memory.indexOf('window.ChildMemoryHall'));
    assert.match(gardenMount, /isWorldHubEntryDisabled/);
    assert.match(memoryMount, /isWorldHubEntryDisabled/);
  });

  it('legacy hub paths remain for gate off', () => {
    const worlds = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/child-world-hub.js'), 'utf8');
    assert.match(worlds, /remountWorldHubLegacy/);
    assert.match(worlds, /tryMountWorld/);
    assert.match(hub, /renderHub/);
  });

  it('/child/world redirects to treasure when gate on (from #588)', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/child-layer-router.js'), 'utf8');
    assert.match(router, /\/child\/world/);
    assert.match(router, /\/child\/treasure/);
    assert.match(router, /isBarnetsSamlingEnabled/);
  });
});
