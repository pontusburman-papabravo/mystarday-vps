'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { deriveContext } = require('../src/lib/journey/evaluator');
const { FLAG_KEYS } = require('../src/lib/journey/flags');

const JOURNEY_FLAGS_ON = [
  FLAG_KEYS.ingestEnabled,
  FLAG_KEYS.evaluatorEnabled,
  FLAG_KEYS.contextApi,
];

async function enableJourneyFlags(query) {
  for (const key of JOURNEY_FLAGS_ON) {
    await query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

describe('journey golden path (DB integration)', () => {
  it('milestones → phase → context through full chain', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await enableJourneyFlags(db.query);

      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Golden Path Test', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;

      const { ingestMilestone, maybeDeriveFirstSuccess, recomputePhase } = require('../src/lib/journey/ingest');
      const { buildContextForFamily } = require('../src/lib/journey/context-builder');

      const steps = [
        { milestone: 'account_created', expectPhase: 'SETTING_UP' },
        { milestone: 'routine_ready', expectPhase: 'SETTING_UP' },
        { milestone: 'rewards_ready', expectPhase: 'FIRST_USE' },
      ];

      for (const step of steps) {
        await ingestMilestone({ familyId, milestone: step.milestone, source: 'system' });
        const phase = await recomputePhase(familyId);
        assert.equal(phase, step.expectPhase, `after ${step.milestone}`);
      }

      let ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.phase, 'FIRST_USE');
      assert.equal(ctx.blocking_experience, 'handoff_to_child');

      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Testbarn', '⭐', 'testbarn', 'hash', 0) RETURNING id`,
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
      ctx = await buildContextForFamily(familyId);
      assert.notEqual(ctx.blocking_experience, 'handoff_to_child');

      await ingestMilestone({
        familyId,
        milestone: 'child_first_completion',
        childId,
        source: 'system',
      });
      ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.blocking_experience, 'parent_ack_completion');

      await ingestMilestone({
        familyId,
        milestone: 'parent_saw_completion',
        source: 'system',
      });
      await maybeDeriveFirstSuccess(familyId);
      const phase = await recomputePhase(familyId);
      assert.equal(phase, 'BUILDING_ROUTINE');

      ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.celebration, 'celebrate_first_success');

      // Idempotency: duplicate child_logged_in
      const dup = await ingestMilestone({
        familyId,
        milestone: 'child_logged_in',
        childId,
        scopeKey: `child:${childId}`,
        source: 'system',
      });
      assert.equal(dup.inserted, false);

      // Evaluator determinism spot-check
      const evalCtx = deriveContext({
        phase: 'FIRST_USE',
        milestones: { routine_ready: 'a', rewards_ready: 'b' },
      });
      assert.equal(evalCtx.blocking_experience, 'handoff_to_child');
    } finally {
      await db.cleanup();
    }
  });
});

describe('journey rollout wave derivation', () => {
  it('deriveActiveWave is sequential', () => {
    const { deriveActiveWave } = require('../src/lib/journey/rollout');
    const map = {};
    assert.equal(deriveActiveWave(map), 0);
    map.family_journey_ingest_enabled = true;
    map.family_journey_evaluator_enabled = true;
    map.family_journey_context_api = true;
    assert.equal(deriveActiveWave(map), 1);
  });
});
