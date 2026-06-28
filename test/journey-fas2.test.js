'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { deriveContext } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');
const { needsHandoff } = require('../src/lib/journey/phases');

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

describe('journey Fas 2 — handoff v2', () => {
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

describe('journey Fas 2 — API contracts', () => {
  it('pending-completions route exists', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/journey-context.js'),
      'utf8'
    );
    assert.match(src, /pending-completions/);
    assert.match(src, /FLAG_KEYS\.parentAckV1/);
  });

  it('parent_ack_dismissed maps to parent_saw_completion', () => {
    const { CLIENT_INTENTS } = require('../src/lib/journey/ingest');
    assert.equal(CLIENT_INTENTS.parent_ack_dismissed, 'parent_saw_completion');
  });
});
