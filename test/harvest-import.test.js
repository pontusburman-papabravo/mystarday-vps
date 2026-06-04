'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildHarvestImportBundles } = require('../src/lib/harvest-import');

const FAMILY_ID = '550e8400-e29b-41d4-a716-446655440000';
const PARENT_ID = '660e8400-e29b-41d4-a716-446655440001';
const CHILD_ID = '770e8400-e29b-41d4-a716-446655440002';
const ACTIVITY_ID = '880e8400-e29b-41d4-a716-446655440003';
const REWARD_ID = '990e8400-e29b-41d4-a716-446655440004';
const SCHED_ID = 'aa0e8400-e29b-41d4-a716-446655440005';
const ITEM_ID = 'bb0e8400-e29b-41d4-a716-446655440006';

function minimalHarvest() {
  return {
    format: 'api-harvest-v1',
    family_id: FAMILY_ID,
    family_name: 'Testfamiljen',
    api: {
      family: {
        id: FAMILY_ID,
        name: 'Testfamiljen',
        timezone: 'Europe/Stockholm',
        parents: [
          {
            id: PARENT_ID,
            email: 'test@example.com',
            name: 'Test Parent',
            family_role: 'primary',
            linked_child_ids: [CHILD_ID],
          },
        ],
        children: [
          {
            id: CHILD_ID,
            name: 'Astrid',
            emoji: '🌟',
            sort_order: 0,
          },
        ],
      },
      categories: [{ id: 'c1', name: 'Morgon', sort_order: 0, is_default: true }],
      activities: [
        {
          id: ACTIVITY_ID,
          name: 'Tänder',
          icon: '🦷',
          category_id: 'c1',
          star_value: 1,
          sort_order: 0,
        },
      ],
      rewards: [
        {
          id: REWARD_ID,
          name: 'Glass',
          icon: '🍦',
          star_cost: 5,
        },
      ],
      goals: { goals: [] },
      reward_redemptions: [
        {
          id: 'rr1',
          child_id: CHILD_ID,
          reward_name: 'Glass',
          status: 'approved',
          star_cost: 5,
          created_at: '2026-01-01T10:00:00.000Z',
        },
      ],
      subscription: {
        tier: 'lifetime_free',
        components: [{ component: 'basic_app', expires_at: null }],
      },
      schedules: {
        [CHILD_ID]: [{ id: SCHED_ID, day_of_week: 1, sort_order: 1 }],
        [`${CHILD_ID}_items`]: {
          [SCHED_ID]: {
            schedule_id: SCHED_ID,
            day_of_week: 1,
            items: [
              {
                id: ITEM_ID,
                activity_template_id: ACTIVITY_ID,
                sort_order: 0,
                section: 'morgon',
                sub_steps: [{ id: 'ss1', name: 'Steg 1', sort_order: 0 }],
              },
            ],
          },
        },
      },
      daily_logs: {
        [CHILD_ID]: [
          {
            from: '2026-05-01',
            to: '2026-05-31',
            data: [
              {
                id: 'dl1',
                date: '2026-05-15',
                is_paused: false,
                total_items: 3,
                completed_items: 2,
              },
            ],
          },
        ],
      },
      system_messages: [],
    },
  };
}

describe('harvest-import', () => {
  it('maps api-harvest-v1 to DB bundles', async () => {
    const { bundles, warnings, meta } = await buildHarvestImportBundles(minimalHarvest(), {
      defaultPassword: 'TestPass123!',
    });

    assert.equal(meta.familyId, FAMILY_ID);
    assert.equal(meta.familyName, 'Testfamiljen');

    const byTable = Object.fromEntries(bundles.map((b) => [b.table, b]));

    assert.equal(byTable.family.rows[0].is_lifetime_free, true);
    assert.equal(byTable.parent.rows[0].email, 'test@example.com');
    assert.ok(byTable.parent.rows[0].password_hash.includes(':'));

    assert.equal(byTable.child.rows[0].view_mode, 'auto');
    assert.equal(byTable.parent_child.rows.length, 1);

    assert.equal(byTable.activity_template.rows.length, 1);
    assert.equal(byTable.activity_sub_step.rows.length, 1);
    assert.equal(byTable.weekly_schedule_item.rows.length, 1);

    assert.equal(byTable.reward_redemption.rows.length, 1);
    assert.equal(byTable.reward_redemption.rows[0].reward_id, REWARD_ID);

    assert.equal(byTable.daily_log.rows.length, 1);
    assert.equal(byTable.streak.rows[0].child_id, CHILD_ID);
    assert.equal(byTable.streak.rows[0].current_streak, 0);
    assert.ok(!('longest_streak' in byTable.streak.rows[0]));

    assert.equal(byTable.family_subscriptions.rows[0].tier, 'lifetime_free');
    assert.equal(typeof byTable.family_subscriptions.rows[0].components, 'string');
    assert.deepEqual(JSON.parse(byTable.family_subscriptions.rows[0].components), [
      { component: 'basic_app', expires_at: null },
    ]);

    assert.ok(warnings.some((w) => w.includes('daily_log') || w.includes('harvest:history')));
    assert.ok(warnings.some((w) => w.includes('lösenord')));
  });

  it('rejects harvest without api.family', async () => {
    await assert.rejects(
      () => buildHarvestImportBundles({ format: 'api-harvest-v1', api: {} }),
      /api\.family/
    );
  });

  it('links orphan children to primary parent', async () => {
    const harvest = minimalHarvest();
    harvest.api.family.parents[0].linked_child_ids = [];
    const { bundles } = await buildHarvestImportBundles(harvest);
    const pc = bundles.find((b) => b.table === 'parent_child');
    assert.equal(pc.rows.length, 1);
    assert.equal(pc.rows[0].role, 'primary');
  });

  it('stringifies subscription components for JSONB insert', async () => {
    const harvest = minimalHarvest();
    harvest.api.subscription.components = JSON.stringify([
      { component: 'basic_app', expires_at: null, granted_at: '2026-01-01T00:00:00.000Z' },
    ]);
    const { bundles } = await buildHarvestImportBundles(harvest);
    const sub = bundles.find((b) => b.table === 'family_subscriptions');
    assert.equal(typeof sub.rows[0].components, 'string');
    assert.equal(JSON.parse(sub.rows[0].components)[0].component, 'basic_app');
  });

  it('nulls missing activity_template_id on daily_log_item import', async () => {
    const harvest = minimalHarvest();
    harvest.api.daily_log_details = {
      [CHILD_ID]: {
        '2026-05-15': {
          log: { id: 'dl1', date: '2026-05-15' },
          items: [
            {
              id: 'dli1',
              activity_template_id: '00000000-0000-0000-0000-000000000099',
              name: 'Borttagen aktivitet',
              icon: '⭐',
              completed: true,
              star_value: 1,
              section: 'morgon',
            },
          ],
        },
      },
    };
    const { bundles, warnings } = await buildHarvestImportBundles(harvest);
    const items = bundles.find((b) => b.table === 'daily_log_item');
    assert.equal(items.rows[0].activity_template_id, null);
    assert.ok(warnings.some((w) => w.includes('saknas')));
  });

  it('skips goals referencing missing rewards', async () => {
    const harvest = minimalHarvest();
    harvest.api.goals = {
      goals: [
        {
          id: 'goal-orphan',
          child_id: CHILD_ID,
          reward_id: '00000000-0000-0000-0000-000000000099',
          status: 'active',
        },
      ],
    };
    const { bundles, warnings } = await buildHarvestImportBundles(harvest);
    const goals = bundles.find((b) => b.table === 'child_reward_goal');
    assert.equal(goals.rows.length, 0);
    assert.ok(warnings.some((w) => w.includes('child_reward_goal')));
  });
});
