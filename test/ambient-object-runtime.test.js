'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RUNTIME_PATH = path.join(__dirname, '../public/js/ambient-object-runtime.js');
const PACK_PATH = path.join(__dirname, '../public/js/ambient-objects-pack.js');
const CONFIG_PATH = path.join(__dirname, '../config/experience-packs/child_se/ambient-objects.json');

function loadAmbientModules(reducedMotion = false) {
  const context = {
    window: {
      matchMedia: () => ({ matches: reducedMotion }),
      AmbientObjectsPack: null,
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
  vm.runInNewContext(fs.readFileSync(RUNTIME_PATH, 'utf8'), context);

  return {
    AmbientObjectRuntime: context.window.AmbientObjectRuntime,
    AmbientObjectsPack: context.window.AmbientObjectsPack,
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
    const btn = {
      _aoId: match[1],
      className: '',
      disabled: false,
      classList: {
        _set: new Set(),
        add: function (...c) {
          c.forEach((x) => this._set.add(x));
          btn.className = [...this._set].join(' ');
        },
        remove: function (...c) {
          c.forEach((x) => this._set.delete(x));
          btn.className = [...this._set].join(' ');
        },
        contains: function (c) { return this._set.has(c); },
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
    };
    buttons.push(btn);
  }

  return { root, buttons };
}

describe('ambient-objects pack', () => {
  it('config JSON matches client pack scene counts', () => {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const { AmbientObjectsPack } = loadAmbientModules();
    assert.equal(AmbientObjectsPack.getScene('routine_home').length, config.scenes.routine_home.objects.length);
    assert.equal(AmbientObjectsPack.getScene('garden').length, config.scenes.garden.objects.length);
    assert.ok(config.scenes.routine_home.objects.length >= 6);
    assert.ok(config.scenes.garden.objects.length >= 8);
  });

  it('manifest includes ambient_objects', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/experience-packs/child_se/manifest.json'),
      'utf8'
    ));
    assert.equal(manifest.includes.ambient_objects, 'ambient-objects.json');
  });
});

describe('AmbientObjectRuntime', () => {
  beforeEach(() => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    AmbientObjectRuntime.clearCooldowns();
  });

  it('renderLayer mounts objects for routine_home', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const html = AmbientObjectRuntime.renderLayer('routine_home', { gate_to_garden: true }, {});
    assert.match(html, /ao-layer/);
    assert.match(html, /ao-hotspot--door/);
    assert.match(html, /ao-hotspot--treasure_chest/);
    assert.match(html, /ao-hotspot--window/);
  });

  it('hides door when gate_to_garden is false', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const html = AmbientObjectRuntime.renderLayer('routine_home', { gate_to_garden: false }, {});
    assert.doesNotMatch(html, /ao-hotspot--door/);
  });

  it('tap object triggers feedback callback', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const state = { gate_to_garden: true };
    const html = AmbientObjectRuntime.renderLayer('routine_home', state, {});
    const { root, buttons } = makeDomRoot(html, 'routine_home');
    let feedback = null;
    let openedSkatt = false;

    AmbientObjectRuntime.bindLayer(root, 'routine_home', state, {
      showFeedback: function (msg) { feedback = msg; },
      onOpenSkattkammaren: function () { openedSkatt = true; },
    });

    const chest = buttons.find((b) => b._aoId === 'treasure_chest');
    assert.ok(chest);
    chest.dispatchEvent();
    assert.equal(feedback, 'Dina stjärnor väntar!');
    assert.equal(openedSkatt, true);
  });

  it('cooldown prevents spam taps', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const state = { gate_to_garden: true };
    const html = AmbientObjectRuntime.renderLayer('routine_home', state, {});
    const { root, buttons } = makeDomRoot(html, 'routine_home');
    let tapCount = 0;

    AmbientObjectRuntime.bindLayer(root, 'routine_home', state, {
      onOpenSkattkammaren: function () { tapCount += 1; },
    });

    const chest = buttons.find((b) => b._aoId === 'treasure_chest');
    chest.dispatchEvent();
    chest.dispatchEvent();
    assert.equal(tapCount, 1);
    assert.equal(AmbientObjectRuntime._isOnCooldown('routine_home:treasure_chest'), true);
  });

  it('gameplay delegation works for garden bed', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const html = AmbientObjectRuntime.renderLayer('garden', {}, {});
    const { root, buttons } = makeDomRoot(html, 'garden');
    let bedTapped = false;

    AmbientObjectRuntime.bindLayer(root, 'garden', {}, {
      onGameplayBed: async function () { bedTapped = true; return true; },
      getExtraClasses: function (obj) {
        return obj.object_id === 'garden_bed' ? ' gd-hotspot--bed-ready' : '';
      },
      isDisabled: function () { return false; },
    });

    const bed = buttons.find((b) => b._aoId === 'garden_bed');
    assert.ok(bed);
    bed.dispatchEvent();
    assert.equal(bedTapped, true);
  });

  it('morgonhus door navigates to garden via delegate', () => {
    const { AmbientObjectRuntime } = loadAmbientModules();
    const state = { gate_to_garden: true };
    const html = AmbientObjectRuntime.renderLayer('routine_home', state, {});
    const { root, buttons } = makeDomRoot(html, 'routine_home');
    let gardenEntered = false;

    AmbientObjectRuntime.bindLayer(root, 'routine_home', state, {
      onNavigateGarden: async function () { gardenEntered = true; return true; },
    });

    const door = buttons.find((b) => b._aoId === 'door');
    door.dispatchEvent();
    assert.equal(gardenEntered, true);
  });

  it('reduced motion skips particle spawn', () => {
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
        if (sel === '.ao-particle-layer') {
          return { appendChild: function () { particleAdded = true; } };
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
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 44, height: 44 }),
        disabled: false,
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
    });

    buttons.find((b) => b._aoId === 'window').dispatchEvent();
    assert.equal(particleAdded, false);
  });
});

describe('scene integration wiring', () => {
  it('child-morgonhus uses AmbientObjectRuntime', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/child-morgonhus.js'), 'utf8');
    assert.match(src, /AmbientObjectRuntime/);
    assert.match(src, /bindAmbientObjects/);
    assert.doesNotMatch(src, /renderDoorHotspot/);
    assert.doesNotMatch(src, /bindSceneHotspots/);
  });

  it('child-garden uses AmbientObjectRuntime for bed and scenery', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/child-garden.js'), 'utf8');
    assert.match(src, /AmbientObjectRuntime/);
    assert.match(src, /bindAmbientObjects/);
    assert.match(src, /onGameplayBed/);
    assert.doesNotMatch(src, /renderBedHotspot/);
    assert.doesNotMatch(src, /bindSceneryButton/);
  });

  it('child-dashboard loads ambient scripts before scenes', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/child-dashboard.html'), 'utf8');
    const packIdx = html.indexOf('ambient-objects-pack.js');
    const runtimeIdx = html.indexOf('ambient-object-runtime.js');
    const morgIdx = html.indexOf('child-morgonhus.js');
    assert.ok(packIdx > 0);
    assert.ok(runtimeIdx > packIdx);
    assert.ok(morgIdx > runtimeIdx);
    assert.match(html, /ambient-object\.css/);
  });
});
