'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache, loadPack, getWorldDef } = require('../src/lib/experience-pack');

const FEATURE_SLUG = 'memory_hall_playable';
const WORLD_SLUG = 'memory_hall';
const FAMILY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CHILD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function mockFeatureAccess(scenario) {
  const mock = injectMockDb();
  mock.setQuery(async (sql, params) => {
    const q = String(sql);

    if (q.includes('FROM features WHERE slug')) {
      const slug = params[0];
      if (slug !== FEATURE_SLUG) return { rows: [] };
      if (scenario.status === 'missing') return { rows: [] };
      return { rows: [{ slug, status: scenario.status || 'dev' }] };
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

function loadMemoryHallPlayable() {
  const modPath = require.resolve('../src/lib/memory-hall-playable');
  const featuresPath = require.resolve('../db/features');
  const accessPath = require.resolve('../src/lib/living-world-access');
  delete require.cache[modPath];
  delete require.cache[featuresPath];
  delete require.cache[accessPath];
  return require(modPath);
}

function loadChildMemoryHall() {
  const src = fs.readFileSync(
    path.join(__dirname, '../public/js/child-memory-hall.js'),
    'utf8'
  );
  const dom = {
    readyState: 'complete',
    getElementById: () => null,
    body: { classList: { add: () => {}, remove: () => {} } },
  };
  const ctx = {
    document: dom,
    window: {
      matchMedia: () => ({ matches: false }),
      ChildMemoryHall: null,
      document: dom,
    },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(src, ctx);
  return ctx.window.ChildMemoryHall;
}

describe('memory_hall_playable — world 3 scaffold (BL-029)', () => {
  beforeEach(() => clearPackCache());

  it('migration registers dev feature without family allowlist', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809510000000_memory_hall_playable_feature.js'),
      'utf8'
    );
    assert.match(src, /memory_hall_playable/);
    assert.match(src, /'dev'/);
    assert.doesNotMatch(src, /family_features.*INSERT/i);
    assert.doesNotMatch(src, /Pontus@burman\.cc/);
  });

  it('seed-features registers memory_hall_playable as dev scaffold', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../scripts/seed-features.js'),
      'utf8'
    );
    assert.match(src, /slug: 'memory_hall_playable'/);
    assert.match(src, /status: 'dev'/);
    assert.match(src, /BL-012/);
  });

  it('route returns 503 when feature not allowlisted', () => {
    const routeSrc = fs.readFileSync(
      path.join(__dirname, '../src/routes/memory-hall.js'),
      'utf8'
    );
    assert.match(routeSrc, /503/);
    assert.match(routeSrc, /isPlayableEnabled/);
    assert.match(routeSrc, /memory-hall/);
  });

  it('isPlayableEnabled denied without family_features row', async () => {
    mockFeatureAccess({ status: 'dev', allowlist: new Set() });
    const mod = loadMemoryHallPlayable();
    assert.equal(await mod.isPlayableEnabled(FAMILY_A), false);
  });

  it('isPlayableEnabled allowed when family on dev allowlist', async () => {
    mockFeatureAccess({ status: 'dev', allowlist: new Set([FAMILY_A]) });
    const mod = loadMemoryHallPlayable();
    assert.equal(await mod.isPlayableEnabled(FAMILY_A), true);
  });

  it('pack defines memory_hall world with ambient_scenery', () => {
    const pack = loadPack('child_se');
    const world = getWorldDef(pack, WORLD_SLUG);
    assert.ok(world, 'memory_hall world required in worlds.json');
    assert.equal(world.display_name_sv, 'Minnesrummet');
    assert.ok((world.ambient_scenery || []).length >= 2);
    assert.ok(world.ambient_scenery.every((s) => s.hotspot_class && s.label_sv));
  });

  it('buildSceneState returns pride tone and memory exhibits', async () => {
    injectMockDb().setQuery(async (sql) => {
      if (String(sql).includes('child_achievement')) return { rows: [] };
      if (String(sql).includes('reward_redemption')) return { rows: [] };
      return { rows: [] };
    });

    const mod = loadMemoryHallPlayable();
    const state = await mod.buildSceneState(CHILD_ID, FAMILY_A);
    assert.equal(state.world_slug, WORLD_SLUG);
    assert.equal(state.tone, 'pride');
    assert.equal(state.display_name, 'Minnesrummet');
    assert.deepEqual(state.exhibits, []);
    assert.ok(state.scenery.length >= 2);
  });

  it('child-memory-hall loaded in child-dashboard for dev entry wiring', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../public/child-dashboard.html'),
      'utf8'
    );
    assert.match(html, /child-memory-hall\.js/);
    assert.match(html, /child-memory-hall\.css/);
    assert.match(html, /memory-hall-asset-pipeline\.js/);
  });

  it('child-memory-hall uses MemoryHallAssetPipeline when illustrated', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/child-memory-hall.js'),
      'utf8'
    );
    assert.match(src, /MemoryHallAssetPipeline/);
    assert.match(src, /scenePictureMarkup/);
    assert.match(src, /bindAssetWatch/);
    assert.match(src, /preloadScene/);
    assert.match(src, /mu-scene--illustrated/);
  });

  it('client renderScene has accessible hotspots and empty state', () => {
    const ChildMemoryHall = loadChildMemoryHall();
    const scene = ChildMemoryHall.renderScene({
      display_name: 'Minnesrummet',
      scenery: [
        { scenery_id: 'memory_hall_window', label_sv: 'Fönstret', hotspot_class: 'mu-hotspot--window' },
      ],
    });
    assert.match(scene, /aria-label="Fönstret"/);
    assert.match(scene, /aria-live="polite"/);

    const empty = ChildMemoryHall.renderEmptyState();
    assert.match(empty, /role="status"/);
    assert.match(empty, /växer minnen/);

    const withExhibits = ChildMemoryHall.renderScene({
      display_name: 'Minnesrummet',
      scenery: [],
      exhibits: [{
        slot_id: 'frame_1',
        slot_type: 'proud_moment',
        label_sv: 'Första stjärnan',
        content: { emoji: '⭐', title: 'Första stjärnan' },
      }],
    });
    assert.match(withExhibits, /role="list"/);
    assert.match(withExhibits, /aria-label="Första stjärnan"/);
    assert.match(withExhibits, /mu-frame--filled/);
    assert.match(withExhibits, /mu-scene-title/);
    assert.doesNotMatch(withExhibits, /mu-exhibit-label/);
  });

  it('prep doc and BL-012 ADR exist for human decision', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../docs/museum-world-prep.md')));
    assert.ok(fs.existsSync(path.join(__dirname, '../docs/decisions/adr-memory-hall-bl012.md')));
    const prep = fs.readFileSync(path.join(__dirname, '../docs/museum-world-prep.md'), 'utf8');
    assert.match(prep, /BL-012/);
    assert.match(prep, /memory_hall/);
    const adr = fs.readFileSync(path.join(__dirname, '../docs/decisions/adr-memory-hall-bl012.md'), 'utf8');
    assert.match(adr, /pride/i);
    assert.match(adr, /dev/);
  });
});
