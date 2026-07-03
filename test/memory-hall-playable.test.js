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
    assert.equal(world.display_name_sv, 'Minneshallen');
    assert.ok((world.ambient_scenery || []).length >= 2);
    assert.ok(world.ambient_scenery.every((s) => s.hotspot_class && s.label_sv));
  });

  it('buildSceneState returns scaffold payload with empty exhibits', async () => {
    const mod = loadMemoryHallPlayable();
    const state = await mod.buildSceneState(CHILD_ID);
    assert.equal(state.world_slug, WORLD_SLUG);
    assert.equal(state.scaffold, true);
    assert.deepEqual(state.exhibits, []);
    assert.ok(state.scenery.length >= 2);
  });

  it('child-memory-hall not mounted in child-dashboard yet', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../public/child-dashboard.html'),
      'utf8'
    );
    assert.doesNotMatch(html, /child-memory-hall\.js/);
    assert.doesNotMatch(html, /child-memory-hall\.css/);
  });

  it('client renderScene has accessible hotspots and empty state', () => {
    const ChildMemoryHall = loadChildMemoryHall();
    const scene = ChildMemoryHall.renderScene({
      display_name: 'Minneshallen',
      scenery: [
        { scenery_id: 'memory_hall_entry', label_sv: 'Ingången', hotspot_class: 'mu-hotspot--entry' },
      ],
    });
    assert.match(scene, /aria-label="Ingången"/);
    assert.match(scene, /aria-live="polite"/);

    const empty = ChildMemoryHall.renderEmptyState();
    assert.match(empty, /role="status"/);
    assert.match(empty, /plats för minnen/);
  });

  it('prep doc and ADR draft exist for human decision', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../docs/museum-world-prep.md')));
    assert.ok(fs.existsSync(path.join(__dirname, '../docs/adr-draft-memory-hall-world.md')));
    const prep = fs.readFileSync(path.join(__dirname, '../docs/museum-world-prep.md'), 'utf8');
    assert.match(prep, /BL-012/);
    assert.match(prep, /memory_hall/);
  });
});
