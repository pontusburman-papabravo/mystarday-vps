'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TRANSITION_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/child-living-world-transition.js'),
  'utf8'
);
const TRANSITION_CSS = fs.readFileSync(
  path.join(__dirname, '../public/css/child-living-world-transition.css'),
  'utf8'
);
const GARDEN_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/child-garden.js'),
  'utf8'
);
const MORGHUS_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/child-morgonhus.js'),
  'utf8'
);
const DASH_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/child-dashboard.js'),
  'utf8'
);

function loadTransitionModule() {
  const timers = [];
  const context = {
    document: {
      body: { classList: { add: () => {}, remove: () => {} } },
      getElementById: () => null,
      createElement: () => ({ classList: { add: () => {}, remove: () => {} }, setAttribute: () => {} }),
    },
    window: {
      matchMedia: () => ({ matches: true }),
      ChildGarden: {
        mount: async () => true,
        deactivate: () => {},
      },
      ChildMorgonhus: {
        tryRemountCached: () => true,
        tryMountWorld: async () => true,
      },
      LivingWorldTransition: null,
    },
    setTimeout: (fn, ms) => { timers.push(ms); fn(); return timers.length; },
    clearTimeout: () => {},
  };
  vm.runInNewContext(TRANSITION_SRC, context);
  return { api: context.window.LivingWorldTransition, timers };
}

describe('Living World transition — place mode', () => {
  it('exposes enterGarden, exitGarden, isActive', () => {
    const { api } = loadTransitionModule();
    assert.ok(api);
    assert.equal(typeof api.enterGarden, 'function');
    assert.equal(typeof api.exitGarden, 'function');
    assert.equal(typeof api.isActive, 'function');
    assert.equal(api.CHROME_MS >= 200 && api.CHROME_MS <= 500, true);
    assert.equal(api.DOOR_MS >= 200 && api.DOOR_MS <= 500, true);
  });

  it('CSS hides app chrome during living-world-active', () => {
    assert.match(TRANSITION_CSS, /living-world-chrome-out #childMainHeader/);
    assert.match(TRANSITION_CSS, /living-world-active #childBottomNav/);
    assert.match(TRANSITION_CSS, /living-world-active #progressSection/);
    assert.match(TRANSITION_CSS, /living-world-active #rewardsView/);
    assert.match(TRANSITION_CSS, /100dvh/);
    assert.match(TRANSITION_CSS, /prefers-reduced-motion/);
  });

  it('CSS has door open and portal through-door animations', () => {
    assert.match(TRANSITION_CSS, /lw-door-opening/);
    assert.match(TRANSITION_CSS, /lw-portal-enter/);
    assert.match(TRANSITION_CSS, /lw-portal-exit/);
    assert.match(TRANSITION_CSS, /lw-portal-return/);
  });

  it('morgonhus door uses LivingWorldTransition.enterGarden', () => {
    assert.match(MORGHUS_SRC, /LivingWorldTransition\.enterGarden/);
    assert.match(MORGHUS_SRC, /doorEl: btn/);
    assert.doesNotMatch(MORGHUS_SRC, /gd-exit-through-door/);
  });

  it('garden back uses LivingWorldTransition.exitGarden when active', () => {
    assert.match(GARDEN_SRC, /LivingWorldTransition\.exitGarden/);
    assert.match(GARDEN_SRC, /LivingWorldTransition\.isActive/);
  });

  it('showTab blocked while living world active', () => {
    assert.match(DASH_SRC, /LivingWorldTransition\.isActive\(\)/);
    assert.match(DASH_SRC, /function showTab\(tab\)/);
  });

  it('service worker precaches transition assets', () => {
    const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
    assert.match(sw, /child-living-world-transition\.js/);
    assert.match(sw, /child-living-world-transition\.css/);
    assert.match(sw, /stjarndag-v423/);
  });
});
