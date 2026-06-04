'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildGlobalLibraryBundles } = require('../src/lib/global-library-import');

const ACT_ID = '880e8400-e29b-41d4-a716-446655440003';
const REWARD_ID = '990e8400-e29b-41d4-a716-446655440004';
const SCHED_ID = 'aa0e8400-e29b-41d4-a716-446655440005';
const ITEM_ID = 'bb0e8400-e29b-41d4-a716-446655440006';

function sampleLibrary() {
  return {
    format: 'global-library-v1',
    exported_at: '2026-06-02T12:00:00.000Z',
    activities: [
      {
        id: ACT_ID,
        name: 'Tänder',
        icon: '🦷',
        star_value: 1,
        sort_order: 0,
        sub_steps: [{ id: 'ss1', name: 'Steg 1', sort_order: 0 }],
        category_name: 'Morgon',
      },
    ],
    rewards: [{ id: REWARD_ID, name: 'Glass', icon: '🍦', star_cost: 5, sort_order: 0 }],
    schedules: [
      {
        id: SCHED_ID,
        name: 'Vardag',
        description: 'Test',
        icon: '📋',
        sort_order: 0,
        items: [
          {
            id: ITEM_ID,
            default_activity_template_id: ACT_ID,
            name: 'Tänder',
            section: 'morgon',
            star_value: 1,
            sort_order: 0,
          },
        ],
      },
    ],
  };
}

describe('global-library-import', () => {
  it('maps global-library-v1 to default_* bundles', () => {
    const { bundles, meta } = buildGlobalLibraryBundles(sampleLibrary());
    const byTable = Object.fromEntries(bundles.map((b) => [b.table, b]));

    assert.equal(meta.activities, 1);
    assert.equal(meta.rewards, 1);
    assert.equal(meta.schedules, 1);
    assert.equal(meta.scheduleItems, 1);

    assert.equal(byTable.default_activity_template.rows[0].name, 'Tänder');
    assert.equal(typeof byTable.default_activity_template.rows[0].sub_steps, 'string');

    assert.equal(byTable.default_reward.rows[0].star_cost, 5);
    assert.equal(byTable.default_schedule_item.rows[0].default_schedule_id, SCHED_ID);
  });

  it('rejects unknown format', () => {
    assert.throws(() => buildGlobalLibraryBundles({ format: 'nope' }), /global-library-v1/);
  });
});
