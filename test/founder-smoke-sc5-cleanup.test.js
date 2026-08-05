'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  runSc5CleanupContract,
  evaluateSc5CleanupOk,
  evaluateVpsLookupForAbsent,
} = require('../scripts/ops/founder-smoke-sc5-cleanup.cjs');

describe('founder smoke sc5 cleanup', () => {
  it('evaluateVpsLookupForAbsent fails on too_old', () => {
    const r = evaluateVpsLookupForAbsent({ family_id: null, reason: 'too_old' });
    assert.equal(r.verified_absent, false);
    assert.equal(r.fail_reason, 'too_old');
  });

  it('requires verified_absent for PASS', async () => {
    const cleanup = await runSc5CleanupContract({
      email: 'smoke-1@example.com',
      familyId: '00000000-0000-4000-8000-000000000001',
      registerCreatedFamily: true,
      tryApiDelete: async () => 500,
      tryVpsDelete: async () => false,
      verifyFamilyAbsent: async () => false,
    });
    assert.equal(cleanup.ok, false);
    assert.equal(evaluateSc5CleanupOk(cleanup), false);
  });

  it('ok when family verified deleted (lookup empty)', () => {
    const r = evaluateVpsLookupForAbsent({ family_id: null });
    assert.equal(r.verified_absent, true);
  });

  it('fails when register created but API cannot resolve family', async () => {
    const cleanup = await runSc5CleanupContract({
      email: 'smoke-9@example.com',
      familyId: null,
      registerCreatedFamily: true,
      tryApiDelete: async () => null,
      tryVpsDelete: async () => false,
      verifyFamilyAbsent: async () => false,
    });
    assert.equal(cleanup.ok, false);
  });

  it('ok when family never created and absent verified', async () => {
    const cleanup = await runSc5CleanupContract({
      email: 'smoke-2@example.com',
      familyId: null,
      registerCreatedFamily: false,
      tryApiDelete: async () => null,
      tryVpsDelete: async () => false,
      verifyFamilyAbsent: async () => true,
    });
    assert.equal(cleanup.ok, true);
  });
});
