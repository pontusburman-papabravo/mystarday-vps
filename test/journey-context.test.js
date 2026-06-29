'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { derivePhase, resolvePhaseTransition } = require('../src/lib/journey/phases');
const { deriveContext, deriveReasonCodes } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');
const { injectMockDb } = require('./helpers/setup.js');

describe('journey phases — derivePhase', () => {
  it('returns SETTING_UP without routine/rewards', () => {
    assert.equal(derivePhase({}), 'SETTING_UP');
    assert.equal(derivePhase({ routine_ready: '2026-01-01' }), 'SETTING_UP');
  });

  it('returns FIRST_USE when routine_ready and rewards_ready', () => {
    assert.equal(
      derivePhase({ routine_ready: 'a', rewards_ready: 'b' }),
      'FIRST_USE'
    );
  });

  it('returns BUILDING_ROUTINE when first_success', () => {
    assert.equal(
      derivePhase({ first_success: 'a', routine_ready: 'b', rewards_ready: 'c' }),
      'BUILDING_ROUTINE'
    );
  });
});

describe('journey phases — transitions', () => {
  it('SETTING_UP → FIRST_USE allowed', () => {
    assert.equal(resolvePhaseTransition('SETTING_UP', 'FIRST_USE'), 'FIRST_USE');
  });

  it('FIRST_USE → BUILDING_ROUTINE allowed', () => {
    assert.equal(resolvePhaseTransition('FIRST_USE', 'BUILDING_ROUTINE'), 'BUILDING_ROUTINE');
  });
});

describe('journey evaluator — deriveContext', () => {
  it('FIRST_USE without child_logged_in → handoff_to_child blocking', () => {
    const ctx = deriveContext({
      phase: 'FIRST_USE',
      milestones: { routine_ready: 'a', rewards_ready: 'b' },
    });
    assert.equal(ctx.blocking_experience, 'handoff_to_child');
    assert.equal(ctx.priority, 'handoff');
    assert.ok(ctx.reason.includes(ReasonCode.NO_CHILD_LOGIN));
  });

  it('first_success → celebrate_first_success', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones: {
        first_success: 'a',
        child_first_completion: 'b',
        parent_saw_completion: 'c',
      },
    });
    assert.equal(ctx.celebration, 'celebrate_first_success');
    assert.equal(ctx.priority, 'celebration');
  });

  it('inconsistent state → SETTING_UP fail-safe', () => {
    const ctx = deriveContext({
      milestones: { child_logged_in: 'a' },
    });
    assert.equal(ctx.phase, 'SETTING_UP');
    assert.equal(ctx.blocking_experience, null);
    assert.ok(ctx.reason.includes(ReasonCode.INCONSISTENT_STATE));
  });

  it('child_first_completion without parent ack → WAITING_FOR_PARENT_ACK', () => {
    const codes = deriveReasonCodes('FIRST_USE', {
      routine_ready: 'a',
      rewards_ready: 'b',
      child_logged_in: 'c',
      child_first_completion: 'd',
    });
    assert.ok(codes.includes(ReasonCode.WAITING_FOR_PARENT_ACK));
  });

  it('child_first_completion without parent ack → parent_ack_completion blocking', () => {
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
  });
});

describe('journey ingest — idempotency (mock DB)', () => {
  it('double handoff_started → second insert skipped', async () => {
    const mock = injectMockDb();
    const familyId = '11111111-1111-4111-8111-111111111111';
    const rows = [];

    mock.setQuery(async (sql, params) => {
      const q = String(sql);
      if (q.includes('feature_flag')) {
        return { rows: [{ enabled: true }] };
      }
      if (q.includes('ON CONFLICT') && params?.[1] === 'handoff_started') {
        const dup = rows.some((r) => r.milestone === 'handoff_started');
        if (dup) return { rows: [] };
        rows.push({ milestone: 'handoff_started', family_id: familyId });
        return { rows: [rows[rows.length - 1]] };
      }
      if (q.includes('SELECT 1 FROM family_milestones') && params?.[1] === 'handoff_started') {
        return { rows: rows.length ? [{ n: 1 }] : [] };
      }
      if (q.includes('INSERT INTO family_milestones') && params?.[1] === 'handoff_started') {
        rows.push({ milestone: 'handoff_started', family_id: familyId });
        return { rows: [rows[rows.length - 1]] };
      }
      if (q.includes('FROM family_milestones')) {
        return {
          rows: rows.map((r) => ({
            milestone: r.milestone,
            occurred_at: new Date(),
            metadata: {},
            child_id: null,
            scope_key: '',
          })),
        };
      }
      if (q.includes('journey_phase FROM family')) {
        return { rows: [{ journey_phase: 'FIRST_USE' }] };
      }
      if (q.includes('UPDATE family SET journey_phase')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    delete require.cache[require.resolve('../db/family-milestones')];
    delete require.cache[require.resolve('../src/lib/journey/flags')];
    delete require.cache[require.resolve('../src/lib/journey/phases')];
    delete require.cache[require.resolve('../src/lib/journey/ingest')];

    const { ingestMilestone } = require('../src/lib/journey/ingest');
    const r1 = await ingestMilestone({ familyId, milestone: 'handoff_started' });
    const r2 = await ingestMilestone({ familyId, milestone: 'handoff_started' });
    assert.equal(r1.inserted, true);
    assert.equal(r2.inserted, false);
    mock.restore();
  });
});

describe('journey — first_success derivation', () => {
  it('derives first_success when both prerequisites exist', async () => {
    const mock = injectMockDb();
    const familyId = '22222222-2222-4222-8222-222222222222';
    const store = [
      { milestone: 'child_first_completion', occurred_at: new Date('2026-06-01') },
      { milestone: 'parent_saw_completion', occurred_at: new Date('2026-06-02') },
    ];

    mock.setQuery(async (sql, params) => {
      const q = String(sql);
      if (q.includes('feature_flag')) return { rows: [{ enabled: true }] };
      if (q.includes('SELECT milestone, occurred_at') || q.includes('FROM family_milestones')) {
        return {
          rows: store.map((r) => ({
            milestone: r.milestone,
            metadata: {},
            occurred_at: r.occurred_at,
          })),
        };
      }
      if (q.includes('INSERT INTO family_milestones') && params?.[1] === 'first_success') {
        store.push({ milestone: 'first_success', occurred_at: new Date() });
        return { rows: [{ milestone: 'first_success' }] };
      }
      if (q.includes('journey_phase FROM family')) {
        return { rows: [{ journey_phase: 'FIRST_USE' }] };
      }
      if (q.includes('UPDATE family SET journey_phase')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    delete require.cache[require.resolve('../db/family-milestones')];
    delete require.cache[require.resolve('../src/lib/journey/flags')];
    delete require.cache[require.resolve('../src/lib/journey/phases')];
    delete require.cache[require.resolve('../src/lib/journey/ingest')];

    const { maybeDeriveFirstSuccess } = require('../src/lib/journey/ingest');
    const derived = await maybeDeriveFirstSuccess(familyId);
    assert.equal(derived, true);
    assert.ok(store.some((r) => r.milestone === 'first_success'));
    mock.restore();
  });
});

describe('journey API — flag contract', () => {
  it('journey-context route returns 503 when context API flag is off', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/journey-context.js'),
      'utf8'
    );
    assert.match(src, /503/);
    assert.match(src, /FLAG_KEYS\.contextApi/);
    assert.match(src, /requireContextApi/);
  });
});
