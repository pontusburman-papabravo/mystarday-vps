'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');

const FEATURE_SLUG = 'morgonhus_playable';
const FAMILY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const FAMILY_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function mockFeatureAccess(scenario) {
  const mock = injectMockDb();
  mock.setQuery(async (sql, params) => {
    const q = String(sql);

    if (q.includes('FROM features WHERE slug')) {
      const slug = params[0];
      if (slug !== FEATURE_SLUG) return { rows: [] };
      if (scenario.status === 'missing') return { rows: [] };
      return { rows: [{ slug, status: scenario.status }] };
    }

    if (q.includes('FROM family_features WHERE family_id')) {
      const [familyId, slug] = params;
      if (slug !== FEATURE_SLUG) return { rows: [] };
      if (scenario.allowlist && scenario.allowlist.has(familyId)) {
        return { rows: [{ family_id: familyId }] };
      }
      return { rows: [] };
    }

    if (q.includes('family_subscriptions') || q.includes('has_component')) {
      return { rows: [{ has_component: true }] };
    }

    return { rows: [] };
  });
  return mock;
}

function loadMorgonhusPlayable() {
  const modPath = require.resolve('../src/lib/morgonhus-playable');
  const featuresPath = require.resolve('../db/features');
  delete require.cache[modPath];
  delete require.cache[featuresPath];
  return require(modPath);
}

describe('morgonhus_playable — feature access rollout', () => {
  it('migration registers dev feature, seeds Pontus allowlist, removes legacy flag', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809130000000_morgonhus_feature_access.js'),
      'utf8'
    );
    assert.match(src, /morgonhus_playable/);
    assert.match(src, /'dev'/);
    assert.match(src, /family_features/);
    assert.match(src, /Pontus@burman\.cc/);
    assert.match(src, /LOWER\(p\.email\) = LOWER/);
    assert.doesNotMatch(src, /ILIKE '%pontus%'/);
    assert.match(src, /status = 'dev'/);
    assert.match(src, /DELETE FROM feature_flag WHERE key = 'morgonhus_playable_v1'/);
  });

  it('seed-features registers morgonhus_playable as dev', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../scripts/seed-features.js'),
      'utf8'
    );
    assert.match(src, /slug: 'morgonhus_playable'/);
    assert.match(src, /status: 'dev'/);
  });

  it('isPlayableEnabled uses hasAccess, not global feature_flag', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/morgonhus-playable.js'),
      'utf8'
    );
    assert.match(src, /hasAccess\(familyId, FEATURE_SLUG\)/);
    assert.doesNotMatch(src, /feature_flag/);
    assert.doesNotMatch(src, /morgonhus_playable_v1/);
  });

  it('off — denied for all families', async () => {
    mockFeatureAccess({ status: 'off', allowlist: new Set([FAMILY_A]) });
    const { isPlayableEnabled } = loadMorgonhusPlayable();
    assert.equal(await isPlayableEnabled(FAMILY_A), false);
    assert.equal(await isPlayableEnabled(FAMILY_B), false);
  });

  it('dev + allowlist — allowed only for assigned family', async () => {
    mockFeatureAccess({ status: 'dev', allowlist: new Set([FAMILY_A]) });
    const { isPlayableEnabled } = loadMorgonhusPlayable();
    assert.equal(await isPlayableEnabled(FAMILY_A), true);
    assert.equal(await isPlayableEnabled(FAMILY_B), false);
  });

  it('dev + not on allowlist — denied', async () => {
    mockFeatureAccess({ status: 'dev', allowlist: new Set() });
    const { isPlayableEnabled } = loadMorgonhusPlayable();
    assert.equal(await isPlayableEnabled(FAMILY_A), false);
  });

  it('live — allowed for any family', async () => {
    mockFeatureAccess({ status: 'live', allowlist: new Set() });
    const { isPlayableEnabled } = loadMorgonhusPlayable();
    assert.equal(await isPlayableEnabled(FAMILY_A), true);
    assert.equal(await isPlayableEnabled(FAMILY_B), true);
  });

  it('missing familyId — denied', async () => {
    mockFeatureAccess({ status: 'live', allowlist: new Set() });
    const { isPlayableEnabled } = loadMorgonhusPlayable();
    assert.equal(await isPlayableEnabled(null), false);
    assert.equal(await isPlayableEnabled(undefined), false);
  });

  it('child route passes familyId to isPlayableEnabled', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/morgonhus.js'),
      'utf8'
    );
    assert.match(src, /isPlayableEnabled\(req\.user\.familyId\)/);
    assert.match(src, /503/);
    assert.match(src, /Morgonhuset ej aktiverat/);
  });

  it('features API serves child sessions (family-scoped)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/features.js'),
      'utf8'
    );
    assert.match(src, /getAccessibleFeatures\(familyId\)/);
    assert.doesNotMatch(src, /type !== 'parent'/);
  });

  it('feature-gate admin bypass skips hasAccess (existing pattern)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/middleware/feature-gate.js'),
      'utf8'
    );
    assert.match(src, /req\.user\?\.isAdmin\) return next\(\)/);
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

  it('morgonhus scene does not depend on platform_runtime_enabled flag', () => {
    const libSrc = fs.readFileSync(
      path.join(__dirname, '../src/lib/morgonhus-playable.js'),
      'utf8'
    );
    const routeSrc = fs.readFileSync(
      path.join(__dirname, '../src/routes/morgonhus.js'),
      'utf8'
    );
    assert.doesNotMatch(libSrc, /platform_runtime_enabled/);
    assert.doesNotMatch(libSrc, /isRuntimeEnabled/);
    assert.doesNotMatch(routeSrc, /isRuntimeEnabled/);
    assert.match(libSrc, /always_active: true/);
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

    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, '../public/js/child-world-wayfinder.js'), 'utf8'),
      context
    );
    vm.runInNewContext(src, context);
    return { ChildMorgonhus: context.window.ChildMorgonhus, listeners, context };
  }

  it('renderScene uses wayfinder chrome with labeled navigation', () => {
    const { ChildMorgonhus } = loadModule();
    const html = ChildMorgonhus.renderScene({
      display_name: 'Morgonhuset',
      gate_to_garden: true,
      props: [
        { prop_id: 'welcome_mat', node_id: 'routine_home_welcome_mat', label_sv: 'Välkomstmatta', unlocked: true, visual_token: 'welcome_mat_glow' },
        { prop_id: 'first_light', node_id: 'routine_home_first_light', label_sv: 'Morgonljus', unlocked: false },
        { prop_id: 'door', node_id: null, label_sv: 'Dörren', unlocked: true, always_active: true, leads_to_garden: true },
      ],
    });

    assert.match(html, /cww-shell/);
    assert.match(html, /Morgonhuset/);
    assert.match(html, /Min värld/);
    assert.match(html, /data-cww-action="back"/);
    assert.doesNotMatch(html, /data-cww-action="garden"/);
    assert.doesNotMatch(html, /mh-nav-dock/);
    assert.doesNotMatch(html, /mh-prop-emoji/);
    assert.doesNotMatch(html, /mh-scene-title/);
  });

  it('bindInteractions wires wayfinder back to hub', () => {
    const { ChildMorgonhus, context } = loadModule();
    const state = { gate_to_garden: true, props: [], display_name: 'Morgonhuset' };
    let hubShown = false;
    const backBtn = {
      getAttribute: (name) => (name === 'data-cww-action' ? 'back' : null),
      disabled: false,
      classList: { contains: () => false },
      addEventListener: function (_evt, fn) { this._click = fn; },
      dispatchEvent: function () { if (this._click) this._click(); return true; },
    };
    const root = {
      innerHTML: ChildMorgonhus.renderScene(state),
      querySelector: function () { return null; },
      querySelectorAll: function (sel) {
        if (sel === '[data-cww-action]') return [backBtn];
        return [];
      },
    };
    context.window.ChildWorldHub = { show: function () { hubShown = true; } };
    ChildMorgonhus.bindInteractions(root, state, {});
    backBtn.dispatchEvent();
    assert.equal(hubShown, true);
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

  it('bindWayfinder returns to hub on back', () => {
    assert.match(src, /ChildWorldHub\.show/);
    assert.match(src, /bindWayfinder/);
  });

  it('Skattkammaren round-trip uses preferSkatt, not session skip', () => {
    assert.doesNotMatch(src, /_skipForSession/);
    assert.match(src, /_preferSkatt/);
    assert.match(src, /shouldPreferSkatt/);
    assert.match(src, /clearPreferSkatt/);
  });

  it('toast uses visible mh-toast-off classes (not Tailwind hidden)', () => {
    assert.match(src, /mh-toast-off/);
    assert.match(src, /is-visible/);
    assert.doesNotMatch(src, /classList\.remove\('hidden'\)/);
  });

  it('showTab remounts Morgonhus when leaving Skattkammaren', () => {
    const dashSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard.js'),
      'utf8'
    );
    assert.match(dashSrc, /isUniverse && window\.ChildMorgonhus && !window\.ChildMorgonhus\.isActive\(\)/);
    assert.match(dashSrc, /loadRewards\(\{ force: true \}\)/);
  });

  it('loadRewards shows world hub when morgonhus_playable is on', () => {
    const rewardsSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard-rewards.js'),
      'utf8'
    );
    assert.match(rewardsSrc, /morgonhus_playable/);
    assert.match(rewardsSrc, /fetchStjarndagFeatures/);
    assert.match(rewardsSrc, /shouldPreferSkatt/);
    assert.match(rewardsSrc, /options\.force/);
    assert.match(rewardsSrc, /clearPreferSkatt/);
    assert.match(rewardsSrc, /ChildWorldHub\.tryShow/);
    assert.match(rewardsSrc, /skipHub/);
  });
});
