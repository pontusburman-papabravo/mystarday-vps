'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  phaseIndex,
  wholeDaysBetween,
} = require('../src/lib/journey/derived-state');
const {
  isLegacyWinBackDisabled,
  isLegacyActivationEmailDisabled,
} = require('../src/lib/journey/communication-gate');

describe('journey derived-state helpers', () => {
  it('phaseIndex orders BUILDING_ROUTINE after FIRST_USE', () => {
    assert.ok(phaseIndex('BUILDING_ROUTINE') > phaseIndex('FIRST_USE'));
  });

  it('wholeDaysBetween counts calendar day gaps', () => {
    const a = new Date('2026-06-01T12:00:00Z');
    const b = new Date('2026-06-08T11:00:00Z');
    assert.equal(wholeDaysBetween(a, b), 6);
  });
});

describe('journey communication-gate env', () => {
  it('legacy win-back disabled unless WIN_BACK_ENABLED=true', () => {
    const prev = process.env.WIN_BACK_ENABLED;
    delete process.env.WIN_BACK_ENABLED;
    assert.equal(isLegacyWinBackDisabled(), true);
    process.env.WIN_BACK_ENABLED = 'true';
    assert.equal(isLegacyWinBackDisabled(), false);
    if (prev === undefined) delete process.env.WIN_BACK_ENABLED;
    else process.env.WIN_BACK_ENABLED = prev;
  });

  it('legacy activation email disabled unless env true', () => {
    const prev = process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED;
    delete process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED;
    assert.equal(isLegacyActivationEmailDisabled(), true);
    process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED = 'true';
    assert.equal(isLegacyActivationEmailDisabled(), false);
    if (prev === undefined) delete process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED;
    else process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED = prev;
  });
});
