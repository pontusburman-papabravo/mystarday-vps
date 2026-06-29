'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { derivePhase } = require('../src/lib/journey/phases');
const { deriveContext } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');
const { projectPushForFamily, PUSH_EXPERIENCE_PREFIX } = require('../src/lib/journey/push-projector');

describe('journey Fas 5 — EXPANDING phase', () => {
  it('derivePhase returns EXPANDING for second_child_created', () => {
    assert.equal(
      derivePhase(
        { first_success: 'a', second_child_created: 'c' },
        { expandingEnabled: true }
      ),
      'EXPANDING'
    );
  });

  it('handoff blocking in EXPANDING for pending child', () => {
    const ctx = deriveContext({
      phase: 'EXPANDING',
      milestones: {
        first_success: 'a',
        child_first_completion: 'b',
        parent_saw_completion: 'c',
        second_child_created: 'child-2',
        _pending_handoff_child_id: 'child-2',
        _children_logged_in: ['child-1'],
        _celebration_shown: true,
      },
      opts: { expandingEnabled: true },
    });
    assert.equal(ctx.blocking_experience, 'handoff_to_child');
    assert.ok(ctx.reason.includes(ReasonCode.EXPANDING_HANDOFF));
  });
});

describe('journey Fas 5 — INDEPENDENCE phase', () => {
  it('derivePhase returns INDEPENDENCE when self-sufficient week', () => {
    assert.equal(
      derivePhase(
        { child_self_sufficient_week: 'a' },
        { independenceEnabled: true }
      ),
      'INDEPENDENCE'
    );
  });

  it('INDEPENDENCE context has no blocking experiences', () => {
    const ctx = deriveContext({
      phase: 'INDEPENDENCE',
      milestones: { child_self_sufficient_week: 'a' },
      opts: { independenceEnabled: true },
    });
    assert.equal(ctx.priority, 'none');
    assert.equal(ctx.blocking_experience, null);
    assert.ok(ctx.reason.includes(ReasonCode.INDEPENDENCE_ACHIEVED));
  });
});

describe('journey Fas 5 — push projector', () => {
  it('exports PUSH_EXPERIENCE_PREFIX', () => {
    assert.equal(PUSH_EXPERIENCE_PREFIX, 'push_');
  });

  it('projectPushForFamily returns null when push flag off', async () => {
    const result = await projectPushForFamily('00000000-0000-4000-8000-000000000001');
    assert.equal(result, null);
  });

  it('journey push scheduler is started from server', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../server.js'),
      'utf8'
    );
    assert.match(src, /startJourneyPushScheduler/);
  });
});
