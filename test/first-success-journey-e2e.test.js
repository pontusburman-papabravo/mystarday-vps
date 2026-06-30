'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');

const JOURNEY_FLAGS_ON = [
  FLAG_KEYS.ingestEnabled,
  FLAG_KEYS.evaluatorEnabled,
  FLAG_KEYS.contextApi,
  FLAG_KEYS.parentAckV1,
];

async function enableFlags(query) {
  const flags = [...JOURNEY_FLAGS_ON, 'platform_runtime_enabled'];
  for (const key of flags) {
    await query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

/**
 * End-to-end: registration milestones → child completion → platform runtime → parent ack copy.
 */
describe('First Success Journey E2E', () => {
  it('full journey from onboarding milestones to parent first-step message', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await enableFlags(db.query);

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('E2E Journey', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;

      const { ingestMilestone, maybeDeriveFirstSuccess, recomputePhase } = require('../src/lib/journey/ingest');
      const { buildContextForFamily } = require('../src/lib/journey/context-builder');
      const platformRuntime = require('../src/lib/platform-runtime');

      const onboardingSteps = [
        'account_created',
        'child_created',
        'routine_ready',
        'rewards_ready',
      ];
      for (const milestone of onboardingSteps) {
        await ingestMilestone({ familyId, milestone, source: 'system' });
      }

      let ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.phase, 'FIRST_USE');
      assert.equal(ctx.blocking_experience, 'handoff_to_child');

      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Alma', '⭐', 'alma', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;

      await ingestMilestone({
        familyId,
        milestone: 'child_logged_in',
        childId,
        scopeKey: `child:${childId}`,
        source: 'system',
      });

      const log = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
        [childId]
      );
      const item = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value)
         VALUES ($1, 'Tänder', 'fm', 0, 1) RETURNING id`,
        [log.rows[0].id]
      );
      const itemId = item.rows[0].id;

      await db.query(
        `UPDATE daily_log_item SET completed = true, completed_at = NOW(), completed_by = 'child' WHERE id = $1`,
        [itemId]
      );

      await ingestMilestone({
        familyId,
        milestone: 'child_first_completion',
        childId,
        metadata: { daily_log_item_id: itemId },
        source: 'system',
      });

      const runtimeResult = await platformRuntime.handleActivityComplete({
        childId,
        familyId,
        dailyLogItemId: itemId,
      }, db.query);

      assert.equal(runtimeResult.reward.granted, true);
      assert.match(
        runtimeResult.reward.feedback.parent_message,
        /Idag tog Alma sitt första steg/
      );

      ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.blocking_experience, 'parent_ack_completion');

      const parentFeedback = await platformRuntime.getParentFeedback(childId, itemId, db.query);
      assert.equal(parentFeedback.parent_message, 'Idag tog Alma sitt första steg.');
      assert.equal(parentFeedback.cta, 'Det ser jag');

      await ingestMilestone({
        familyId,
        milestone: 'parent_saw_completion',
        source: 'system',
      });
      await maybeDeriveFirstSuccess(familyId);
      await recomputePhase(familyId);

      ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.celebration, 'celebrate_first_success');
      assert.equal(ctx.phase, 'BUILDING_ROUTINE');
    } finally {
      await db.cleanup();
    }
  });
});
