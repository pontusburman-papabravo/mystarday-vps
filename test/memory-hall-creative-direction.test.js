'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');

const CHILD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function loadResolver() {
  const modPath = require.resolve('../src/lib/memory-hall-exhibit-resolver');
  const universePath = require.resolve('../db/child-universe');
  delete require.cache[modPath];
  delete require.cache[universePath];
  return require(modPath);
}

describe('memory-hall-exhibit-resolver — pride memories (BL-012)', () => {
  beforeEach(() => clearPackCache());

  it('caps exhibits and omits aggregate stats', async () => {
    const achievements = Array.from({ length: 10 }, (_, i) => ({
      slug: `ach_${i}`,
      name: `Steg ${i + 1}`,
      emoji: '⭐',
      unlocked_at: new Date().toISOString(),
    }));

    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('child_achievement')) {
        return { rows: achievements };
      }
      if (q.includes('reward_redemption')) {
        return { rows: [{ created_at: new Date().toISOString(), name: 'Glass', icon: '🍦' }] };
      }
      return { rows: [] };
    });

    const { resolveExhibitMemories, MAX_PRIDE_EXHIBITS } = loadResolver();
    const exhibits = await resolveExhibitMemories(CHILD_ID);

    assert.ok(exhibits.length <= MAX_PRIDE_EXHIBITS);
    assert.ok(exhibits.every((e) => e.slot_type === 'proud_moment' || e.slot_type === 'remembered_gift'));
    assert.ok(exhibits.every((e) => !('count' in (e.content || {}))));
    assert.ok(exhibits.every((e) => !('streak' in (e.content || {}))));
  });

  it('maps achievements to proud_moment without shop language', async () => {
    injectMockDb().setQuery(async (sql) => {
      if (String(sql).includes('child_achievement')) {
        return { rows: [{ slug: 'first_star', name: 'Första stjärnan', emoji: '⭐', unlocked_at: new Date().toISOString() }] };
      }
      if (String(sql).includes('reward_redemption')) return { rows: [] };
      return { rows: [] };
    });

    const { resolveExhibitMemories } = loadResolver();
    const exhibits = await resolveExhibitMemories(CHILD_ID);
    assert.equal(exhibits[0].slot_type, 'proud_moment');
    assert.equal(exhibits[0].content.title, 'Första stjärnan');
  });
});

describe('memory hall creative direction — pack copy (BL-012)', () => {
  it('world copy avoids museum/shop/stats/dashboard tone', () => {
    const worlds = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/experience-packs/child_se/worlds.json'),
      'utf8'
    ));
    const hall = worlds.worlds.find((w) => w.world_slug === 'memory_hall');
    const blob = JSON.stringify(hall);
    assert.match(hall.display_name_sv, /Minnesrum/);
    assert.doesNotMatch(blob, /museum/i);
    assert.doesNotMatch(blob, /butik/i);
    assert.doesNotMatch(blob, /topplista/i);
    assert.doesNotMatch(blob, /streak/i);
    assert.match(blob, /stolt/i);
  });

  it('garden path gates to memory_hall behind memory_hall_playable', () => {
    const worlds = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/experience-packs/child_se/worlds.json'),
      'utf8'
    ));
    const garden = worlds.worlds.find((w) => w.world_slug === 'garden');
    const pathHotspot = (garden.ambient_scenery || []).find((s) => s.scenery_id === 'garden_path');
    assert.equal(pathHotspot.gate_to_world, 'memory_hall');
    assert.equal(pathHotspot.gate_feature_slug, 'memory_hall_playable');
  });

  it('client avoids stats-dashboard aria labels', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/child-memory-hall.js'), 'utf8');
    assert.match(src, /Mina minnen/);
    assert.match(src, /mu-frame--filled/);
    assert.match(src, /Det här minnet betyder något för dig/);
    assert.doesNotMatch(src, /Utställningar/);
    assert.doesNotMatch(src, /topplista/i);
    assert.doesNotMatch(src, /mu-exhibit-label/);
  });

  it('living-world transition wires enterMemoryHall and exitMemoryHall', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/child-living-world-transition.js'), 'utf8');
    assert.match(src, /enterMemoryHall/);
    assert.match(src, /exitMemoryHall/);
    assert.match(src, /memory_hall/);
    assert.match(src, /activeWorldId/);
  });
});
