'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');

const GARDEN_SLUG = 'garden_playable';
const MORGHUS_SLUG = 'morgonhus_playable';
const FAMILY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function mockFeatureAccess(allowedSlugs, familyId = FAMILY_A) {
  const mock = injectMockDb();
  mock.setQuery(async (sql, params) => {
    const q = String(sql);

    if (q.includes('FROM features WHERE slug')) {
      const slug = params[0];
      if (!allowedSlugs.has(slug)) return { rows: [] };
      return { rows: [{ slug, status: 'dev' }] };
    }

    if (q.includes('FROM family_features WHERE family_id')) {
      const [fid, slug] = params;
      if (fid === familyId && allowedSlugs.has(slug)) {
        return { rows: [{ family_id: fid }] };
      }
      return { rows: [] };
    }

    if (q.includes('child_progression_node')) {
      return { rows: [] };
    }

    if (q.includes('family_subscriptions') || q.includes('has_component')) {
      return { rows: [{ has_component: true }] };
    }

    return { rows: [] };
  });
  return mock;
}

function loadGardenPlayable() {
  const modPath = require.resolve('../src/lib/garden-playable');
  const featuresPath = require.resolve('../db/features');
  const accessPath = require.resolve('../src/lib/living-world-access');
  delete require.cache[modPath];
  delete require.cache[featuresPath];
  delete require.cache[accessPath];
  return require(modPath);
}

function loadMorgonhusPlayable() {
  const modPath = require.resolve('../src/lib/morgonhus-playable');
  const accessPath = require.resolve('../src/lib/living-world-access');
  const featuresPath = require.resolve('../db/features');
  delete require.cache[modPath];
  delete require.cache[accessPath];
  delete require.cache[featuresPath];
  return require(modPath);
}

describe('garden_playable — playable scene (experience slice)', () => {
  it('migration seeds Pontus allowlist only', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809150000000_garden_playable_allowlist.js'),
      'utf8'
    );
    assert.match(src, /garden_playable/);
    assert.match(src, /Pontus@burman\.cc/);
    assert.match(src, /family_features/);
    assert.doesNotMatch(src, /INSERT INTO features/);
  });

  it('garden route is feature-gated with 503', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/garden.js'),
      'utf8'
    );
    assert.match(src, /isPlayableEnabled\(req\.user\.familyId\)/);
    assert.match(src, /503/);
    assert.match(src, /Trädgården ej aktiverad/);
  });

  it('buildSceneState returns ambient garden from pack — no verbs', async () => {
    clearPackCache();
    const { buildSceneState } = loadGardenPlayable();
    const state = await buildSceneState('child-test-1');
    assert.equal(state.world_slug, 'garden');
    assert.equal(state.display_name, 'Trädgården');
    assert.match(state.first_enter_message, /Trädgården/);
    assert.ok(state.scenery.length >= 2);
    assert.ok(state.scenery.every((s) => !s.verb));
    assert.equal(JSON.stringify(state).includes('plant'), false);
    assert.equal(JSON.stringify(state).includes('harvest'), false);
  });

  it('isPlayableEnabled denied without allowlist', async () => {
    mockFeatureAccess(new Set());
    const { isPlayableEnabled } = loadGardenPlayable();
    assert.equal(await isPlayableEnabled(FAMILY_A), false);
  });

  it('isPlayableEnabled allowed with garden_playable allowlist', async () => {
    mockFeatureAccess(new Set([GARDEN_SLUG]));
    const { isPlayableEnabled } = loadGardenPlayable();
    assert.equal(await isPlayableEnabled(FAMILY_A), true);
  });

  it('morgonhus exposes gate_to_garden when garden_playable allowed', async () => {
    clearPackCache();
    mockFeatureAccess(new Set([MORGHUS_SLUG, GARDEN_SLUG]));
    const { buildSceneState } = loadMorgonhusPlayable();
    const state = await buildSceneState('child-test-1', FAMILY_A);
    assert.equal(state.gate_to_garden, true);
    const door = state.props.find((p) => p.prop_id === 'door');
    assert.ok(door);
    assert.equal(door.leads_to_garden, true);
    assert.match(door.child_message, /trädgården/i);
  });

  it('morgonhus hides garden gate without feature', async () => {
    clearPackCache();
    mockFeatureAccess(new Set([MORGHUS_SLUG]));
    const { buildSceneState } = loadMorgonhusPlayable();
    const state = await buildSceneState('child-test-1', FAMILY_A);
    assert.equal(state.gate_to_garden, false);
    const door = state.props.find((p) => p.prop_id === 'door');
    assert.equal(door.leads_to_garden, false);
  });
});

describe('ChildGarden client module', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../public/js/child-garden.js'),
    'utf8'
  );
  const mhSrc = fs.readFileSync(
    path.join(__dirname, '../public/js/child-morgonhus.js'),
    'utf8'
  );

  function loadGardenModule() {
    const dom = {
      readyState: 'complete',
      getElementById: (id) => {
        if (id === 'skattkammarView') {
          return {
            innerHTML: '',
            style: { display: '' },
            querySelector: () => null,
            querySelectorAll: () => [],
          };
        }
        if (id === 'skattkammarLoading') return { style: { display: '' } };
        return null;
      },
      body: { classList: { add: () => {}, remove: () => {} } },
    };
    const context = {
      document: dom,
      window: {
        matchMedia: () => ({ matches: false }),
        GardenAssetPipeline: {
          assetUrl: (id) => '/assets/worlds/garden/' + id + '.webp?v=1.0.0',
          preloadCritical: async () => true,
          watchSceneAssets: () => function () {},
        },
        Auth: { api: async () => ({
          enabled: true,
          display_name: 'Trädgården',
          first_enter_message: 'Trädgården väntar på dig',
          ambient_message: 'Gräset rör sig långsamt i brisen.',
          scenery: [{ scenery_id: 'garden_path', label_sv: 'Stigen', emoji: '🌿' }],
        }) },
        ChildMorgonhus: { deactivate: () => {} },
        ChildGarden: null,
        document: dom,
      },
      setTimeout,
      clearTimeout,
    };
    vm.runInNewContext(src, context);
    return context.window.ChildGarden;
  }

  it('renderScene is immersive place — no cards, labels, or toasts', () => {
    const ChildGarden = loadGardenModule();
    const html = ChildGarden.renderScene({
      display_name: 'Trädgården',
      scenery: [
        { scenery_id: 'garden_path', label_sv: 'Stigen' },
        { scenery_id: 'garden_bed', label_sv: 'Blomsterbädden' },
        { scenery_id: 'garden_sky', label_sv: 'Himlen' },
      ],
    });
    assert.match(html, /gd-scene/);
    assert.match(html, /gd-scene--asset/);
    assert.match(html, /gd-asset--background/);
    assert.match(html, /assets\/worlds\/garden\/house-left\.webp/);
    assert.match(html, /gd-hotspot--path/);
    assert.match(html, /gd-back-fab/);
    assert.match(html, /aria-label="Tillbaka till Morgonhuset"/);
    assert.doesNotMatch(html, /gd-scenery-label/);
    assert.doesNotMatch(html, /gd-scene-title/);
    assert.doesNotMatch(html, /gd-scene-toast/);
    assert.doesNotMatch(html, /gd-house-wall/);
    assert.doesNotMatch(html, /gd-sunflower/);
    assert.doesNotMatch(html, /Tillbaka till Morgonhuset<\/button>/);
  });

  it('garden uses visual feedback, not toast', () => {
    assert.doesNotMatch(src, /showToast/);
    assert.match(src, /triggerVisual/);
    assert.match(src, /spawnSparkles/);
  });

  it('garden CSS has ambient motion layers', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '../public/css/child-garden.css'),
      'utf8'
    );
    assert.match(css, /gd-cloud-drift/);
    assert.match(css, /gd-bird-fly/);
    assert.match(css, /gd-layer--house/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /min-height: calc\(100dvh/);
  });

  it('door transition uses through-door class for continuity', () => {
    assert.match(mhSrc, /gd-exit-through-door/);
    assert.match(src, /gd-scene--entering/);
  });

  it('morgonhus door navigates to garden when leads_to_garden', () => {
    assert.match(mhSrc, /leads_to_garden/);
    assert.match(mhSrc, /ChildGarden\.enterFromMorgonhus/);
    assert.match(mhSrc, /deactivate/);
  });

  it('garden exit returns to morgonhus via tryMountWorld', () => {
    assert.match(src, /exitToMorgonhus/);
    assert.match(src, /ChildMorgonhus\.tryMountWorld/);
  });

  it('child-dashboard showTab respects garden active state', () => {
    const dashSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard.js'),
      'utf8'
    );
    assert.match(dashSrc, /ChildGarden\.isActive/);
  });

  it('garden fetch is fail-closed: offline, timeout, errors return null', () => {
    assert.match(src, /navigator\.onLine === false/);
    assert.match(src, /AbortController/);
    assert.match(src, /FETCH_TIMEOUT_MS/);
    assert.match(src, /err\.status === 503/);
  });

  it('garden enter failure keeps child in Morgonhus with toast', () => {
    assert.match(mhSrc, /enterFromMorgonhus\(\)\.then/);
    assert.match(mhSrc, /Du är kvar i Morgonhuset/);
  });

  it('garden exit falls back to cached Morgonhus then Skattkammaren', () => {
    assert.match(src, /tryRemountCached/);
    assert.match(src, /openSkattkammaren/);
    assert.match(mhSrc, /tryRemountCached/);
    assert.match(mhSrc, /_cachedSceneState/);
  });

  it('no LOE gameplay verbs in garden client', () => {
    assert.doesNotMatch(src, /\bverb\b.*plant|\bplant\b|\bharvest\b|timer_ms/i);
  });
});
