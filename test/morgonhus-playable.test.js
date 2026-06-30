'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');

describe('morgonhus_playable_v1 — playable morning house slice', () => {
  it('migration seeds flag default OFF', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809120000000_morgonhus_playable.js'),
      'utf8'
    );
    assert.match(src, /morgonhus_playable_v1/);
    assert.match(src, /VALUES \(\$1, false, \$2\)/);
    assert.match(src, /ON CONFLICT \(key\) DO NOTHING/);
  });

  it('isPlayableEnabled returns false when DB flag is off', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('morgonhus_playable_v1')) {
        return { rows: [{ enabled: false }] };
      }
      return { rows: [] };
    });

    const modPath = require.resolve('../src/lib/morgonhus-playable');
    delete require.cache[modPath];
    const { isPlayableEnabled } = require(modPath);

    assert.equal(await isPlayableEnabled(), false);
  });

  it('isPlayableEnabled returns false when flag row is missing', async () => {
    const mock = injectMockDb();
    mock.setQuery(async () => ({ rows: [] }));

    const modPath = require.resolve('../src/lib/morgonhus-playable');
    delete require.cache[modPath];
    const { isPlayableEnabled } = require(modPath);

    assert.equal(await isPlayableEnabled(), false);
  });

  it('child route returns 503 when flag is off', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/morgonhus.js'),
      'utf8'
    );
    assert.match(src, /503/);
    assert.match(src, /isPlayableEnabled/);
    assert.match(src, /Morgonhuset ej aktiverat/);
  });

  it('buildSceneState maps experience pack nodes to props', async () => {
    clearPackCache();
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('child_progression_node')) {
        return {
          rows: [{
            world_slug: 'routine_home',
            node_id: 'routine_home_welcome_mat',
            node_type: 'build',
            pack_config_key: 'progression.routine_home.welcome_mat',
            metadata: {},
            unlocked_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    });

    const progressionPath = require.resolve('../db/child-progression-node');
    const modPath = require.resolve('../src/lib/morgonhus-playable');
    delete require.cache[progressionPath];
    delete require.cache[modPath];
    const { buildSceneState } = require(modPath);

    const state = await buildSceneState('child-test-1');
    assert.equal(state.world_slug, 'routine_home');
    assert.equal(state.display_name, 'Morgonhuset');
    assert.ok(state.props.some((p) => p.prop_id === 'welcome_mat' && p.unlocked));
    assert.ok(state.props.some((p) => p.prop_id === 'first_light' && !p.unlocked));
    assert.ok(state.props.some((p) => p.prop_id === 'door' && p.always_active));
    assert.deepEqual(state.unlocked_node_ids, ['routine_home_welcome_mat']);

    const welcomeMat = state.props.find((p) => p.prop_id === 'welcome_mat');
    assert.equal(welcomeMat.visual_token, 'welcome_mat_glow');
    assert.match(welcomeMat.child_message, /Morgonhuset/);
  });
});

describe('ChildMorgonhus client module', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../public/js/child-morgonhus.js'),
    'utf8'
  );

  function loadModule() {
    const listeners = {};
    const dom = {
      readyState: 'complete',
      getElementById: () => null,
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        innerHTML: '',
        className: '',
        classList: {
          _set: new Set(),
          add: function (...c) { c.forEach((x) => this._set.add(x)); },
          remove: function (...c) { c.forEach((x) => this._set.delete(x)); },
          contains: function (c) { return this._set.has(c); },
          toggle: function (c, force) {
            if (force === true) this._set.add(c);
            else if (force === false) this._set.delete(c);
            else if (this._set.has(c)) this._set.delete(c);
            else this._set.add(c);
          },
        },
        setAttribute: function () {},
        getAttribute: function () { return null; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        addEventListener: function () {},
        dispatchEvent: function () { return true; },
      }),
      addEventListener: () => {},
      body: { classList: { add: () => {}, remove: () => {} } },
    };

    const context = {
      document: dom,
      ChildEventBus: { on: (evt, fn) => { listeners[evt] = fn; } },
      window: {
        matchMedia: () => ({ matches: true }),
        Auth: { api: async () => null },
        addEventListener: () => {},
        ChildMorgonhus: null,
        ChildEventBus: { on: (evt, fn) => { listeners[evt] = fn; } },
        document: dom,
      },
      setTimeout,
      clearTimeout,
    };

    vm.runInNewContext(src, context);
    return { ChildMorgonhus: context.window.ChildMorgonhus, listeners };
  }

  it('renderScene includes Morgonhuset room structure', () => {
    const { ChildMorgonhus } = loadModule();
    const html = ChildMorgonhus.renderScene({
      display_name: 'Morgonhuset',
      first_enter_message: 'Morgonhuset väntar på dig',
      props: [
        { prop_id: 'welcome_mat', node_id: 'routine_home_welcome_mat', label_sv: 'Välkomstmatta', unlocked: true, visual_token: 'welcome_mat_glow' },
        { prop_id: 'first_light', node_id: 'routine_home_first_light', label_sv: 'Morgonljus', unlocked: false },
        { prop_id: 'door', node_id: null, label_sv: 'Dörren', unlocked: true, always_active: true },
      ],
    });

    assert.match(html, /mh-scene/);
    assert.match(html, /data-prop="welcome_mat"/);
    assert.match(html, /data-prop="first_light"/);
    assert.match(html, /data-prop="door"/);
    assert.match(html, /Morgonhuset väntar på dig/);
  });

  it('bindInteractions fires on unlocked prop tap', () => {
    const { ChildMorgonhus } = loadModule();
    const state = {
      props: [
        {
          prop_id: 'welcome_mat',
          label_sv: 'Välkomstmatta',
          unlocked: true,
          visual_token: 'welcome_mat_glow',
          child_message: 'Morgonhuset känner att du kom.',
        },
      ],
    };
    const tapBtn = {
      getAttribute: (name) => (name === 'data-prop' ? 'welcome_mat' : null),
      classList: {
        _set: new Set(['is-unlocked']),
        add: function (...c) { c.forEach((x) => this._set.add(x)); },
        remove: function (...c) { c.forEach((x) => this._set.delete(x)); },
        contains: function (c) { return this._set.has(c); },
      },
      addEventListener: function (_evt, fn) { this._click = fn; },
      dispatchEvent: function () { if (this._click) this._click(); return true; },
    };
    const root = {
      innerHTML: ChildMorgonhus.renderScene(state),
      querySelector: function (sel) {
        if (sel === '#mhSceneToast') {
          return { textContent: '', classList: { remove: () => {}, add: () => {} } };
        }
        if (sel === '[data-prop="welcome_mat"]') return tapBtn;
        return null;
      },
      querySelectorAll: function (sel) {
        if (sel === '.mh-prop') return [tapBtn];
        return [];
      },
    };

    let tapped = null;
    ChildMorgonhus.bindInteractions(root, state, {
      onPropTap: (prop) => { tapped = prop.prop_id; },
    });

    tapBtn.dispatchEvent();
    assert.equal(tapped, 'welcome_mat');
    assert.ok(tapBtn.classList.contains('is-unlocked'));
  });

  it('applyUnlockedState marks locked and unlocked props', () => {
    const { ChildMorgonhus } = loadModule();
    const state = {
      props: [
        { prop_id: 'welcome_mat', unlocked: true, visual_token: 'welcome_mat_glow' },
        { prop_id: 'first_light', unlocked: false },
      ],
    };
    const welcomeBtn = {
      classList: {
        _set: new Set(),
        toggle: function (c, force) {
          if (force) this._set.add(c);
          else this._set.delete(c);
        },
        add: function (...c) { c.forEach((x) => this._set.add(x)); },
        contains: function (c) { return this._set.has(c); },
      },
    };
    const lightBtn = {
      classList: {
        _set: new Set(),
        toggle: function (c, force) {
          if (force) this._set.add(c);
          else this._set.delete(c);
        },
        add: function (...c) { c.forEach((x) => this._set.add(x)); },
        contains: function (c) { return this._set.has(c); },
      },
    };
    const root = {
      querySelector: function (sel) {
        if (sel === '[data-prop="welcome_mat"]') return welcomeBtn;
        if (sel === '[data-prop="first_light"]') return lightBtn;
        return null;
      },
    };

    ChildMorgonhus.applyUnlockedState(root, state);

    assert.ok(welcomeBtn.classList.contains('is-unlocked'));
    assert.ok(welcomeBtn.classList.contains('mh-token--welcome_mat_glow'));
    assert.ok(lightBtn.classList.contains('is-locked'));
    assert.ok(!lightBtn.classList.contains('is-unlocked'));
  });

  it('child-world defers to Morgonhus when module present', () => {
    const worldSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/child-world.js'),
      'utf8'
    );
    assert.match(worldSrc, /ChildMorgonhus/);
    assert.match(worldSrc, /!window\.ChildMorgonhus/);
  });

  it('loadRewards tries Morgonhus mount before Skattkammaren', () => {
    const rewardsSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard-rewards.js'),
      'utf8'
    );
    assert.match(rewardsSrc, /ChildMorgonhus\.tryMountWorld/);
  });
});
