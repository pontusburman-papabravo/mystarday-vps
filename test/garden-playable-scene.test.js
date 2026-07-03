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
  const ambientPath = require.resolve('../src/lib/world-ambient');
  delete require.cache[modPath];
  delete require.cache[accessPath];
  delete require.cache[featuresPath];
  delete require.cache[ambientPath];
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

  it('garden route is feature-gated and exposes verb POST', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/garden.js'),
      'utf8'
    );
    assert.match(src, /isPlayableEnabled\(req\.user\.familyId\)/);
    assert.match(src, /post\('\/garden\/verb'/i);
    assert.match(src, /applyLivingVerb/);
    assert.match(src, /503/);
    assert.match(src, /Trädgården ej aktiverad/);
  });

  it('buildSceneState returns ambient garden from pack with living slots', async () => {
    clearPackCache();
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('living_object_instance')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const modPath = require.resolve('../src/lib/garden-playable');
    delete require.cache[modPath];
    const { buildSceneState } = require(modPath);

    const state = await buildSceneState('child-test-1');
    assert.equal(state.world_slug, 'garden');
    assert.equal(state.display_name, 'Trädgården');
    assert.match(state.first_enter_message, /Trädgården/);
    assert.ok(state.scenery.length >= 2);
    assert.ok(state.living_slots.length >= 1);
    assert.equal(state.living_slots[0].slot_id, 'bed_1');
    assert.equal(JSON.stringify(state.scenery).includes('plant'), false);
    assert.equal(JSON.stringify(state.scenery).includes('harvest'), false);
  });

  it('ambient scenery is defined in experience pack worlds.json not hardcoded', () => {
    const worlds = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/experience-packs/child_se/worlds.json'),
      'utf8'
    ));
    const garden = worlds.worlds.find((w) => w.world_slug === 'garden');
    assert.ok(garden.ambient_scenery?.length, 'garden must define ambient_scenery in pack');
    assert.ok(garden.ambient_scenery.some((s) => s.scenery_id === 'garden_path'));

    const libSrc = fs.readFileSync(
      path.join(__dirname, '../src/lib/world-ambient.js'),
      'utf8'
    );
    const gardenSrc = fs.readFileSync(
      path.join(__dirname, '../src/lib/garden-playable.js'),
      'utf8'
    );
    assert.doesNotMatch(gardenSrc, /const AMBIENT_SCENERY/);
    assert.match(libSrc, /ambient_scenery/);
    assert.match(libSrc, /buildSceneryFromPack/);
    assert.match(gardenSrc, /world-ambient/);
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
          scenePictureHtml: () => '<picture class="gd-scene-picture"><img class="gd-scene-bg" src="/assets/worlds/garden/scene-bg.webp" alt="" /></picture>',
          preloadScene: async () => true,
          watchSceneImage: () => function () {},
        },
        LivingWorldTransition: {
          isActive: () => false,
          exitGarden: async () => true,
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
    assert.match(html, /gd-scene--illustrated/);
    assert.match(html, /gd-scene-bg/);
    assert.match(html, /picture/);
    assert.match(html, /scene-bg/);
    assert.match(html, /gd-hotspot--path/);
    assert.match(html, /gd-back-fab/);
    assert.match(html, /aria-label="Tillbaka till Morgonhuset"/);
    assert.doesNotMatch(html, /gd-scenery-label/);
    assert.doesNotMatch(html, /gd-scene-title/);
    assert.doesNotMatch(html, /gd-scene-toast/);
    assert.doesNotMatch(html, /gd-house-wall/);
    assert.doesNotMatch(html, /Tillbaka till Morgonhuset<\/button>/);
  });

  it('garden uses visual feedback, not toast', () => {
    assert.doesNotMatch(src, /showToast/);
    assert.match(src, /triggerVisual/);
    assert.match(src, /gd-tap-pulse/);
  });

  it('garden CSS is layout-only with responsive full-screen scene', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '../public/css/child-garden.css'),
      'utf8'
    );
    assert.match(css, /object-fit: cover/);
    assert.match(css, /gd-scene-bg/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /min-height: calc\(100dvh/);
    assert.doesNotMatch(css, /gd-house-edge/);
  });

  it('door transition uses living-world portal, not page navigation', () => {
    const transitionSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/child-living-world-transition.js'),
      'utf8'
    );
    assert.match(transitionSrc, /enterGarden/);
    assert.match(transitionSrc, /lw-portal-zoom/);
    assert.match(mhSrc, /LivingWorldTransition\.enterGarden/);
    assert.doesNotMatch(mhSrc, /gd-exit-through-door/);
  });

  it('morgonhus door navigates to garden when leads_to_garden', () => {
    assert.match(mhSrc, /leads_to_garden/);
    assert.match(mhSrc, /LivingWorldTransition\.enterGarden/);
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

  it('garden LOE uses pack-driven verbs via API, not hardcoded strings', () => {
    assert.match(src, /VERB_PATH/);
    assert.match(src, /available_verbs/);
    assert.match(src, /living_slot_id/);
    assert.match(src, /scheduleTimerRefresh/);
    assert.doesNotMatch(src, /['"]plant['"]/);
    assert.doesNotMatch(src, /['"]harvest['"]/);
  });
});
