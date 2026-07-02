'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { deriveContext } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');
const { needsHandoff } = require('../src/lib/journey/phases');
const { contextWantsHandoff } = require('../src/lib/journey/handoff-gate');
const { loadJsonFallback } = require('../src/lib/journey/registry');
const { setupTestDb } = require('./helpers/setup.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');

const ROOT = path.join(__dirname, '..');

describe('journey Fas 2 — parent ack blocking', () => {
  it('blocks with parent_ack_completion before first_success', () => {
    const ctx = deriveContext({
      phase: 'FIRST_USE',
      milestones: {
        routine_ready: 'a',
        rewards_ready: 'b',
        child_logged_in: 'c',
        child_first_completion: 'd',
      },
    });
    assert.equal(ctx.blocking_experience, 'parent_ack_completion');
    assert.ok(ctx.reason.includes(ReasonCode.WAITING_FOR_PARENT_ACK));
  });
});

describe('journey Fas 2 — handoff v2 gate', () => {
  it('handoff_v2 requires blocking_experience only', () => {
    assert.equal(contextWantsHandoff({
      capabilities: { handoff_v2: true },
      blocking_experience: 'handoff_to_child',
    }), true);
    assert.equal(contextWantsHandoff({
      capabilities: { handoff_v2: true },
      priority: 'handoff',
      recommended_experiences: ['handoff_to_child'],
    }), false);
    assert.equal(contextWantsHandoff({
      capabilities: { handoff_v2: true },
      blocking_experience: null,
    }), false);
  });

  it('needsHandoff for FIRST_USE without child login', () => {
    assert.equal(
      needsHandoff({ routine_ready: 'a', rewards_ready: 'b' }, 'FIRST_USE'),
      true
    );
  });

  it('needsHandoff false when child logged in', () => {
    assert.equal(
      needsHandoff({ _children_logged_in: ['child-1'] }, 'FIRST_USE'),
      false
    );
  });

  it('EXPANDING handoff targets pending child only', () => {
    assert.equal(
      needsHandoff({
        _pending_handoff_child_id: 'child-2',
        _children_logged_in: ['child-1'],
      }, 'EXPANDING'),
      true
    );
    assert.equal(
      needsHandoff({
        _pending_handoff_child_id: 'child-2',
        _children_logged_in: ['child-1', 'child-2'],
      }, 'EXPANDING'),
      false
    );
  });
});

describe('journey Fas 2 — registry fallback', () => {
  it('JSON fallback includes parent_ack_completion', () => {
    const registry = loadJsonFallback();
    assert.ok(registry.phases.FIRST_USE?.parent_ack_completion);
    assert.match(registry.phases.FIRST_USE.parent_ack_completion.headline, /aktivitet/i);
  });
});

describe('journey Fas 2 — API contracts', () => {
  it('pending-completions route exists', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/journey-context.js'), 'utf8');
    assert.match(src, /pending-completions/);
    assert.match(src, /FLAG_KEYS\.parentAckV1/);
    assert.match(src, /parent_ack_shown/);
  });

  it('admin journey metrics and registry routes exist', () => {
    const admin = fs.readFileSync(path.join(ROOT, 'src/routes/admin.js'), 'utf8');
    assert.match(admin, /journey-metrics/);
    assert.match(admin, /journey-registry/);
    const metricsLib = fs.readFileSync(path.join(ROOT, 'src/lib/journey/metrics.js'), 'utf8');
    assert.match(metricsLib, /handoff_completion_rate/);
  });

  it('registry endpoint sets version header', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/journey-context.js'), 'utf8');
    assert.match(src, /X-Journey-Registry-Version/);
  });

  it('parent_ack_dismissed maps to parent_saw_completion', () => {
    const { CLIENT_INTENTS } = require('../src/lib/journey/ingest');
    assert.equal(CLIENT_INTENTS.parent_ack_dismissed, 'parent_saw_completion');
  });

  it('enable migration seeds Fas 2 flags', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1809310000000_enable_journey_fas2_flags.js'),
      'utf8'
    );
    assert.match(mig, /family_journey_registry_v2/);
    assert.match(mig, /family_journey_handoff_v2/);
    assert.match(mig, /family_journey_parent_ack_v1/);
  });
});

describe('journey Fas 2 — DB integration', () => {
  async function enableFas2Flags(query) {
    const keys = [
      FLAG_KEYS.ingestEnabled,
      FLAG_KEYS.evaluatorEnabled,
      FLAG_KEYS.contextApi,
      FLAG_KEYS.registryV2,
      FLAG_KEYS.handoffV2,
      FLAG_KEYS.parentAckV1,
    ];
    for (const key of keys) {
      await query(
        `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
         ON CONFLICT (key) DO UPDATE SET enabled = true`,
        [key]
      );
    }
  }

  it('parent_ack_dismissed → parent_saw_completion → first_success', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await enableFas2Flags(db.query);
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Fas2 Ack', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Barn', '⭐', 'fas2barn', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;

      const { ingestMilestone, ingestClientIntent, maybeDeriveFirstSuccess, recomputePhase } =
        require('../src/lib/journey/ingest');

      await ingestMilestone({ familyId, milestone: 'routine_ready', source: 'system' });
      await ingestMilestone({ familyId, milestone: 'rewards_ready', source: 'system' });
      await ingestMilestone({ familyId, milestone: 'child_logged_in', childId, source: 'system' });
      await ingestMilestone({ familyId, milestone: 'child_first_completion', childId, source: 'system' });

      const ack = await ingestClientIntent({
        familyId,
        intent: 'parent_ack_dismissed',
        metadata: { parent_id: '00000000-0000-4000-8000-000000000001' },
      });
      assert.equal(ack.ok, true);
      assert.equal(ack.inserted, true);

      await maybeDeriveFirstSuccess(familyId);
      const phase = await recomputePhase(familyId);
      assert.equal(phase, 'BUILDING_ROUTINE');

      const dup = await ingestClientIntent({
        familyId,
        intent: 'parent_ack_dismissed',
        metadata: { parent_id: '00000000-0000-4000-8000-000000000001' },
      });
      assert.equal(dup.inserted, false);
    } finally {
      await db.cleanup();
    }
  });

  it('handoff metrics compute rate', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Fas2 Metrics', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      await db.query(
        `INSERT INTO family_milestones (family_id, milestone, scope_key, source)
         VALUES ($1, 'handoff_started', '', 'system')`,
        [familyId]
      );

      const { getHandoffCompletionRate } = require('../src/lib/journey/metrics');
      let metrics = await getHandoffCompletionRate();
      assert.ok(metrics.handoff_started_families >= 1);
      assert.equal(metrics.handoff_completion_rate, 0);

      await db.query(
        `INSERT INTO family_milestones (family_id, milestone, scope_key, source)
         VALUES ($1, 'child_logged_in', '', 'system')`,
        [familyId]
      );
      metrics = await getHandoffCompletionRate();
      assert.ok(metrics.handoff_completion_rate > 0);
    } finally {
      await db.cleanup();
    }
  });
});
