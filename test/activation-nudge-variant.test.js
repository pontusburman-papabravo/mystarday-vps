'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveActivationNudgeVariant,
  activationNudgeCopyKeys,
} = require('../src/lib/email');

describe('activation nudge variant', () => {
  it('resolveActivationNudgeVariant maps schema presence', () => {
    assert.equal(resolveActivationNudgeVariant(null), 'no_schema');
    assert.equal(resolveActivationNudgeVariant(undefined), 'no_schema');
    assert.equal(resolveActivationNudgeVariant(new Date()), 'with_schema');
  });

  it('activationNudgeCopyKeys returns distinct locale paths', () => {
    const noSchema = activationNudgeCopyKeys('no_schema');
    const withSchema = activationNudgeCopyKeys('with_schema');
    assert.match(noSchema.subject, /noSchema/);
    assert.match(withSchema.subject, /withSchema/);
    assert.notEqual(noSchema.body1, withSchema.body1);
  });
});
