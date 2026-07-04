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
  it('exposes generic enterWorld/exitWorld and garden wrappers', () => {
    const { api } = loadTransitionModule();
    assert.ok(api);
    assert.equal(typeof api.enterWorld, 'function');
    assert.equal(typeof api.exitWorld, 'function');
    assert.equal(typeof api.enterGarden, 'function');
    assert.equal(typeof api.exitGarden, 'function');
    assert.equal(typeof api.isActive, 'function');
    assert.equal(typeof api.activeWorldId, 'function');
    assert.equal(typeof api.registerWorld, 'function');
    assert.equal(api.CHROME_MS >= 200 && api.CHROME_MS <= 500, true);
    assert.equal(api.DOOR_MS >= 200 && api.DOOR_MS <= 500, true);
  });

  it('enterGarden delegates to enterWorld with garden id', () => {
    assert.match(TRANSITION_SRC, /async function enterGarden\(opts\) \{\s*return enterWorld\('garden', opts\);/);
    assert.match(TRANSITION_SRC, /async function exitGarden\(\) \{\s*return exitWorld\('garden'\);/);
  });

  it('tracks activeWorldId after garden enter', async () => {
    const context = {
      document: {
        body: {
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
        },
        getElementById: (id) => {
          if (id === 'skattkammarView' || id === 'rewardsView') {
            return { classList: { add: () => {}, remove: () => {} } };
          }
          return null;
        },
        createElement: () => ({
          classList: { add: () => {}, remove: () => {} },
          setAttribute: () => {},
          offsetWidth: 0,
        }),
      },
      window: {
        matchMedia: () => ({ matches: true }),
        ChildGarden: {
          mount: async () => true,
          deactivate: () => {},
        },
        ChildMorgonhus: { tryRemountCached: () => true },
        LivingWorldTransition: null,
      },
      setTimeout: (fn) => { fn(); return 1; },
      clearTimeout: () => {},
    };
    vm.runInNewContext(TRANSITION_SRC, context);
    assert.equal(context.window.LivingWorldTransition.activeWorldId(), null);
    await context.window.LivingWorldTransition.enterWorld('garden', { doorEl: null });
    assert.equal(context.window.LivingWorldTransition.isActive(), true);
    assert.equal(context.window.LivingWorldTransition.activeWorldId(), 'garden');
  });

  it('enterWorld returns false for unknown worldId', async () => {
    const { api } = loadTransitionModule();
    const result = await api.enterWorld('unknown_world', {});
    assert.equal(result, false);
  });

  it('CSS hides app chrome during living-world-active', () => {
    assert.match(TRANSITION_CSS, /living-world-chrome-out #childMainHeader/);
    assert.match(TRANSITION_CSS, /living-world-active #childBottomNav/);
    assert.match(TRANSITION_CSS, /living-world-active #progressSection/);
    assert.match(TRANSITION_CSS, /living-world-active #rewardsView/);
    assert.match(TRANSITION_CSS, /100dvh/);
    assert.match(TRANSITION_CSS, /childGoalProgressMount/);
    assert.match(TRANSITION_SRC, /mount\(null, \{ viaTransition: true \}\)/);
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

  it('enterGarden calls ChildGarden.mount with null state and viaTransition opts', async () => {
    let mountArgs = null;
    const context = {
      document: {
        body: {
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
        },
        getElementById: (id) => {
          if (id === 'skattkammarView' || id === 'rewardsView') {
            return { classList: { add: () => {}, remove: () => {} } };
          }
          return null;
        },
        createElement: () => ({
          classList: { add: () => {}, remove: () => {} },
          setAttribute: () => {},
          offsetWidth: 0,
        }),
      },
      window: {
        matchMedia: () => ({ matches: true }),
        ChildGarden: {
          mount: async function (state, opts) {
            mountArgs = { state: state, opts: opts };
            return true;
          },
          deactivate: () => {},
        },
        ChildMorgonhus: { tryRemountCached: () => true },
        LivingWorldTransition: null,
      },
      setTimeout: (fn) => { fn(); return 1; },
      clearTimeout: () => {},
    };
    vm.runInNewContext(TRANSITION_SRC, context);
    await context.window.LivingWorldTransition.enterGarden({ doorEl: null });
    assert.equal(mountArgs.state, null);
    assert.equal(mountArgs.opts.viaTransition, true);
  });

  it('garden path uses LivingWorldTransition.enterMemoryHall when gate open', () => {
    assert.match(GARDEN_SRC, /LivingWorldTransition\.enterMemoryHall/);
    assert.match(GARDEN_SRC, /leads_to_memory_hall/);
    assert.match(GARDEN_SRC, /tryck igen om du vill gå dit/);
    assert.match(GARDEN_SRC, /_pathConfirmUntil/);
  });

  it('enterMemoryHall and exitMemoryHall delegate to generic world API', () => {
    assert.match(TRANSITION_SRC, /async function enterMemoryHall\(opts\) \{\s*return enterWorld\('memory_hall', opts\);/);
    assert.match(TRANSITION_SRC, /async function exitMemoryHall\(\) \{\s*return exitWorld\('memory_hall'\);/);
    const { api } = loadTransitionModule();
    assert.equal(typeof api.enterMemoryHall, 'function');
    assert.equal(typeof api.exitMemoryHall, 'function');
  });

  it('memory_hall enter deactivates garden before mount', async () => {
    let gardenDeactivated = false;
    let memoryMounted = false;
    const context = {
      document: {
        body: {
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
        },
        getElementById: (id) => {
          if (id === 'skattkammarView' || id === 'rewardsView') {
            return { classList: { add: () => {}, remove: () => {} } };
          }
          return null;
        },
        createElement: () => ({
          classList: { add: () => {}, remove: () => {} },
          setAttribute: () => {},
          offsetWidth: 0,
        }),
      },
      window: {
        matchMedia: () => ({ matches: true }),
        ChildGarden: {
          mount: async () => true,
          deactivate: () => { gardenDeactivated = true; },
        },
        ChildMemoryHall: {
          mount: async () => { memoryMounted = true; return true; },
          deactivate: () => {},
        },
        LivingWorldTransition: null,
      },
      setTimeout: (fn) => { fn(); return 1; },
      clearTimeout: () => {},
    };
    vm.runInNewContext(TRANSITION_SRC, context);
    const ok = await context.window.LivingWorldTransition.enterMemoryHall({ pathEl: null });
    assert.equal(ok, true);
    assert.equal(gardenDeactivated, true);
    assert.equal(memoryMounted, true);
    assert.equal(context.window.LivingWorldTransition.activeWorldId(), 'memory_hall');
  });

  it('service worker precaches transition and memory hall assets', () => {
    const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
    assert.match(sw, /child-living-world-transition\.js/);
    assert.match(sw, /child-living-world-transition\.css/);
    assert.match(sw, /child-memory-hall\.js/);
    assert.match(sw, /memory-hall-asset-pipeline\.js/);
    assert.match(sw, /stjarndag-v502/);
  });
});
