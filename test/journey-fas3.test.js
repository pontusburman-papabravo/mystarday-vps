'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { derivePhase } = require('../src/lib/journey/phases');
const { deriveContext } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');

describe('journey Fas 3 — ESTABLISHED_ROUTINE phase', () => {
  it('derivePhase returns ESTABLISHED_ROUTINE when flag + milestone', () => {
    assert.equal(
      derivePhase(
        { first_success: 'a', established_routine: 'b' },
        { establishedEnabled: true }
      ),
      'ESTABLISHED_ROUTINE'
    );
  });

  it('coach_expand when established and coach enabled', () => {
    const ctx = deriveContext({
      phase: 'ESTABLISHED_ROUTINE',
      milestones: {
        first_success: 'a',
        child_first_completion: 'b',
        parent_saw_completion: 'c',
        established_routine: 'd',
        _celebration_shown: true,
      },
      opts: { coachEnabled: true, establishedEnabled: true },
    });
    assert.equal(ctx.priority, 'coach');
    assert.ok(ctx.recommended_experiences.includes('coach_expand'));
    assert.ok(ctx.reason.includes(ReasonCode.ESTABLISHED_ROUTINE));
  });
});

describe('journey Fas 3 — engine shadow module', () => {
  it('exports shadowCompare', () => {
    const mod = require('../src/lib/journey/engine-shadow');
    assert.equal(typeof mod.shadowCompare, 'function');
  });

  it('first-success route wires shadowCompare', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/family/first-success.js'),
      'utf8'
    );
    assert.match(src, /shadowCompare/);
  });
});

describe('journey Fas 3 — BUILDING_ROUTINE coach', () => {
  it('recommends coach_consistency when coach enabled', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones: {
        first_success: 'a',
        child_first_completion: 'b',
        parent_saw_completion: 'c',
        _celebration_shown: true,
      },
      opts: { coachEnabled: true },
    });
    assert.equal(ctx.priority, 'coach');
    assert.ok(ctx.recommended_experiences.includes('coach_consistency'));
  });
});
