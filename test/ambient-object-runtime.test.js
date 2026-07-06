'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RUNTIME_PATH = path.join(ROOT, 'public/js/ambient-object-runtime.js');
const DIRECTOR_PATH = path.join(ROOT, 'public/js/ambient-director.js');
const PACK_PATH = path.join(ROOT, 'public/js/ambient-objects-pack.js');
const CONFIG_PATH = path.join(ROOT, 'config/experience-packs/child_se/ambient-objects.json');

function loadAmbientModules(reducedMotion = false) {
  const context = {
    window: {
      matchMedia: () => ({ matches: reducedMotion }),
      AmbientObjectsPack: null,
      AmbientDirector: null,
      AmbientObjectRuntime: null,
      Platform: {
        haptics: { light: () => {}, medium: () => {}, heavy: () => {} },
      },
    },
    document: {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        classList: {
          _set: new Set(),
          add: function (...c) { c.forEach((x) => this._set.add(x)); },
          remove: function (...c) { c.forEach((x) => this._set.delete(x)); },
          contains: function (c) { return this._set.has(c); },
        },
        style: {},
        setAttribute: function () {},
        getAttribute: function () { return null; },
        appendChild: function () {},
        remove: function () {},
        addEventListener: function () {},
        removeEventListener: function () {},
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        closest: function () { return null; },
        insertAdjacentHTML: function () {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 44, height: 44 }),
      }),
    },
    setTimeout,
    clearTimeout,
  };
  context.window.document = context.document;

  vm.runInNewContext(fs.readFileSync(PACK_PATH, 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(DIRECTOR_PATH, 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(RUNTIME_PATH, 'utf8'), context);

  return {
    AmbientObjectRuntime: context.window.AmbientObjectRuntime,
    AmbientObjectsPack: context.window.AmbientObjectsPack,
    AmbientDirector: context.window.AmbientDirector,
    context,
  };
}

function makeDomRoot(html, sceneId) {
  const buttons = [];
  const layer = {
    querySelector: function (sel) {
      if (sel.indexOf('[data-ao-id=') === 0) {
        const id = sel.match(/data-ao-id="([^"]+)"/)[1];
        return buttons.find((b) => b._aoId === id) || null;
      }
      if (sel === '.ao-particle-layer') return { appendChild: () => {} };
      return null;
    },
  };

  const root = {
    innerHTML: html,
    querySelector: function (sel) {
      if (sel === '.ao-layer[data-ao-scene="' + sceneId + '"]') return layer;
      if (sel === '.ao-particle-layer') return { appendChild: () => {} };
      if (sel === '.mh-scene-canvas, .gd-scene-canvas') return null;
      return layer.querySelector(sel);
    },
    querySelectorAll: function () { return buttons; },
    closest: function () { return root; },
  };

  const re = /data-ao-id="([^"]+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    buttons.push({
      _aoId: match[1],
      className: '',
      disabled: false,
      classList: {
        _set: new Set(),
        add: function (...c) {
          c.forEach((x) => this._set.add(x));
          this._owner.className = [...this._set].join(' ');
        },
        remove: function (...c) {
          c.forEach((x) => this._set.delete(x));
          this._owner.className = [...this._set].join(' ');
        },
        contains: function (c) { return this._set.has(c); },
        _owner: null,
      },
      style: {},
      setAttribute: function (k) { if (k === 'disabled') this.disabled = true; },
      removeAttribute: function () { this.disabled = false; },
      getAttribute: function (name) {
        if (name === 'data-ao-id') return this._aoId;
        return null;
      },
      addEventListener: function (_evt, fn) { this._click = fn; },
      removeEventListener: function () {},
      dispatchEvent: function () { if (this._click) this._click(); return true; },
      appendChild: function () {},
      getBoundingClientRect: () => ({ left: 10, top: 10, width: 44, height: 44 }),
    });
    buttons[buttons.length - 1].classList._owner = buttons[buttons.length - 1];
  }

  return { root, buttons };
}

describe('ambient-objects pack generation', () => {
  it('generated pack is in sync with JSON', () => {
    execSync('node scripts/generate-ambient-objects.mjs --check', {
      cwd: ROOT,
      stdio: 'pipe',
    });
  });

  it('npm run check:ambient-objects passes', () => {
    execSync('npm run check:ambient-objects', { cwd: ROOT, stdio: 'pipe' });
  });

  it('pack uses generic animation tokens only', () => {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const allowed = new Set(['wiggle', 'flutter', 'sparkle', 'pulse', 'drip', 'hop', 'appear']);
    const tokenFields = ['idle', 'tap_animation', 'particle'];

    Object.keys(config.scenes).forEach((sceneId) => {
      config.scenes[sceneId].objects.forEach((obj) => {
        tokenFields.forEach((field) => {
          if (obj[field]) assert.ok(allowed.has(obj[field]), `${obj.object_id}.${field}=${obj[field]}`);
        });
        assert.equal(obj.idle_class, undefined);
        assert.equal(obj.tap_class, undefined);
        assert.equal(obj.particle_class, undefined);
      });
    });
  });
});

describe('AmbientDirector', () => {
  beforeEach(() => {
    const { AmbientDirector } = loadAmbientModules();
    AmbientDirector.reset();
  });

  it('limits simultaneous animations', () => {
    const { AmbientDirector } = loadAmbientModules();
    assert.equal(AmbientDirector.requestAnimation(1000), true);
    assert.equal(AmbientDirector.requestAnimation(1000), true);
    assert.equal(AmbientDirector.requestAnimation(1000), true);
    assert.equal(AmbientDirector.requestAnimation(1000), false);
  });

  it('budgetCooldown blocks repeat taps', () => {
    const { AmbientDirector } = loadAmbientModules();
    assert.equal(AmbientDirector.budgetCooldown('garden:bird', 500), true);
    assert.equal(AmbientDirector.budgetCooldown('garden:bird', 500), false);
  });
});

describe('AmbientObjectRuntime', () => {
  beforeEach(() => {
    const { AmbientDirector } = loadAmbientModules();
    AmbientDirector.reset();
  });

  it('renderLayer mounts objects for routine_home', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const html = AmbientObjectRuntime.renderLayer('routine_home', { gate_to_garden: true }, {});
    assert.match(html, /ao-layer/);
    assert.match(html, /ao-hotspot--door/);
    assert.match(html, /ao-idle--pulse/);
    assert.match(html, /ao-hotspot--treasure_chest/);
  });

  it('tap emits onAction payload to scene', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const state = { gate_to_garden: true };
    const html = AmbientObjectRuntime.renderLayer('routine_home', state, {});
    const { root, buttons } = makeDomRoot(html, 'routine_home');
    let payload = null;

    AmbientObjectRuntime.bindLayer(root, 'routine_home', state, {
      onAction: function (p) { payload = p; return true; },
    });

    buttons.find((b) => b._aoId === 'treasure_chest').dispatchEvent();
    assert.equal(payload.action, 'open_skattkammaren');
    assert.equal(payload.objectId, 'treasure_chest');
  });

  it('cooldown prevents spam via AmbientDirector', () => {
    const { AmbientObjectRuntime, AmbientDirector } = loadAmbientModules();
    const state = { gate_to_garden: true };
    const html = AmbientObjectRuntime.renderLayer('routine_home', state, {});
    const { root, buttons } = makeDomRoot(html, 'routine_home');
    let tapCount = 0;

    AmbientObjectRuntime.bindLayer(root, 'routine_home', state, {
      onAction: function () { tapCount += 1; return true; },
    });

    const chest = buttons.find((b) => b._aoId === 'treasure_chest');
    chest.dispatchEvent();
    chest.dispatchEvent();
    assert.equal(tapCount, 1);
    assert.equal(AmbientDirector.isOnCooldown('routine_home:treasure_chest'), true);
  });

  it('gameplay delegation stays in scene onAction handler', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const html = AmbientObjectRuntime.renderLayer('garden', {}, {});
    const { root, buttons } = makeDomRoot(html, 'garden');
    let bedTapped = false;

    AmbientObjectRuntime.bindLayer(root, 'garden', {}, {
      onAction: function (payload) {
        if (payload.action === 'gameplay_bed') bedTapped = true;
        return true;
      },
      getExtraClasses: function (obj) {
        return obj.object_id === 'garden_bed' ? ' gd-hotspot--bed-ready' : '';
      },
      isDisabled: function () { return false; },
    });

    buttons.find((b) => b._aoId === 'garden_bed').dispatchEvent();
    assert.equal(bedTapped, true);
  });

  it('reduced motion skips particles', () => {
    const { AmbientObjectRuntime } = loadAmbientModules(true);
    const state = { gate_to_garden: true };
    const html = AmbientObjectRuntime.renderLayer('routine_home', state, {});
    let particleAdded = false;

    const buttons = [];
    const layer = {
      querySelector: function (sel) {
        if (sel.indexOf('[data-ao-id=') === 0) {
          const id = sel.match(/data-ao-id="([^"]+)"/)[1];
          return buttons.find((b) => b._aoId === id) || null;
        }
        return null;
      },
    };

    const re = /data-ao-id="([^"]+)"/g;
    let match;
    while ((match = re.exec(html)) !== null) {
      buttons.push({
        _aoId: match[1],
        classList: { add: () => {}, remove: () => {} },
        addEventListener: function (_e, fn) { this._click = fn; },
        dispatchEvent: function () { if (this._click) this._click(); return true; },
        appendChild: function () { particleAdded = true; },
      });
    }

    const root = {
      querySelector: function (sel) {
        if (sel === '.ao-layer[data-ao-scene="routine_home"]') return layer;
        return null;
      },
      closest: function () { return root; },
    };

    AmbientObjectRuntime.bindLayer(root, 'routine_home', state, {
      prefersReducedMotion: true,
      onAction: function () { return true; },
    });

    buttons.find((b) => b._aoId === 'window').dispatchEvent();
    assert.equal(particleAdded, false);
  });
});

describe('scene integration wiring', () => {
  it('child-morgonhus handles ambient actions in scene', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    assert.match(src, /handleAmbientAction/);
    assert.match(src, /onAction/);
    assert.doesNotMatch(src, /onNavigateGarden/);
    assert.doesNotMatch(src, /onOpenSkattkammaren/);
  });

  it('child-garden handles LOE via onAction', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-garden.js'), 'utf8');
    assert.match(src, /onAction/);
    assert.match(src, /gameplay_bed/);
    assert.doesNotMatch(src, /onGameplayBed/);
  });

  it('child-dashboard loads director before runtime', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    const directorIdx = html.indexOf('ambient-director.js');
    const runtimeIdx = html.indexOf('ambient-object-runtime.js');
    assert.ok(directorIdx > 0);
    assert.ok(runtimeIdx > directorIdx);
  });

  it('generate:ambient-objects script exists', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(pkg.scripts['generate:ambient-objects'], /generate-ambient-objects/);
    assert.match(pkg.scripts['check:ambient-objects'], /--check/);
  });
});
