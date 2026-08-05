'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  runSc5CleanupContract,
  evaluateSc5CleanupOk,
} = require('../scripts/ops/founder-smoke-sc5-cleanup.cjs');

describe('founder smoke sc5 cleanup', () => {
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
