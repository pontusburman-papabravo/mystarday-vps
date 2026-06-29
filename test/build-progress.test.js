'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  BUILD_MILESTONES,
  getStageForParts,
  milestoneCrossed,
  milestoneReward,
  guideMessage,
  applyMilestonePerk,
  enrichProject,
  unlockedWorldsFromProjects,
} = require('../src/lib/build-progress');

describe('build-progress', () => {
  it('has five milestones ending at 75', () => {
    assert.deepEqual(BUILD_MILESTONES, [15, 30, 45, 60, 75]);
  });

  it('getStageForParts advances garage stages', () => {
    assert.equal(getStageForParts('racerbil', 0).key, 'empty');
    assert.equal(getStageForParts('racerbil', 10).key, 'foundation');
    assert.equal(getStageForParts('racerbil', 50).key, 'door');
    assert.equal(getStageForParts('racerbil', 75).key, 'done');
  });

  it('milestoneCrossed detects threshold', () => {
    assert.equal(milestoneCrossed(14, 15), 15);
    assert.equal(milestoneCrossed(15, 16), null);
    assert.equal(milestoneCrossed(74, 75), 75);
  });

  it('milestoneReward returns garage color at 15', () => {
    const r = milestoneReward('racerbil', 15);
    assert.equal(r.perk, 'color_ocean_blue');
    assert.match(r.label, /färg/i);
  });

  it('applyMilestonePerk unlocks garage extras', () => {
    const c = applyMilestonePerk({}, 'racerbil', 30);
    assert.ok(c.milestone_perks.includes('decal_stars'));
    assert.equal(c.decal, 'stars');
  });

  it('guideMessage celebrates completion', () => {
    const msg = guideMessage('racerbil', {
      partsCollected: 75,
      partsRequired: 75,
      unlockLabel: 'Garaget',
      completed: true,
    });
    assert.match(msg, /Garaget/);
    assert.match(msg, /Meckis/);
  });

  it('enrichProject adds milestones and routine line', () => {
    const p = enrichProject({
      catalog_slug: 'husdjur',
      parts_collected: 26,
      parts_required: 75,
      unlock_label: 'Husdjurshemmet',
      icon: '🐾',
      status: 'active',
    });
    assert.equal(p.build_stage.key, 'house');
    assert.equal(p.next_milestone, 30);
    assert.equal(p.milestones.length, 5);
    assert.ok(p.milestones[0].reached);
    assert.ok(!p.milestones[1].reached);
    assert.match(p.routine_line, /husdjurshemmet/i);
  });

  it('unlockedWorldsFromProjects marks completed slugs', () => {
    const map = unlockedWorldsFromProjects([
      { catalog_slug: 'racerbil', status: 'completed', garage_unlocked: true },
    ]);
    const garage = map.find((w) => w.slug === 'racerbil');
    const pets = map.find((w) => w.slug === 'husdjur');
    assert.equal(garage.unlocked, true);
    assert.equal(pets.unlocked, false);
  });
});
