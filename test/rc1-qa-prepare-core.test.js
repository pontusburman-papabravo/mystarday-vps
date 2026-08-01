'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { RC1_QA_PARENT_EMAIL } = require('../test/support/rc1-qa-fixture');
const {
  validatePrepareEnv,
  verifyParentPinInTransaction,
} = require('../scripts/lib/rc1-qa-prepare-core');
const { RC1_QA_RESET_STEPS } = require('../scripts/lib/rc1-qa-reset-manifest');
const { hashPassword } = require('../src/lib/hash');

describe('rc1-qa-prepare validatePrepareEnv', () => {
  it('dry-run does not require DATABASE_URL', () => {
    const cfg = validatePrepareEnv({}, { dryRun: true });
    assert.equal(cfg.dryRun, true);
    assert.ok(cfg.qaEmail.includes('@'));
  });

  it('rejects founder email', () => {
    assert.throws(
      () => validatePrepareEnv({
        DATABASE_URL: 'postgres://local/test',
        RC1_QA_EMAIL: 'pontus@burman.cc',
        RC1_QA_PASSWORD: 'x',
        RC1_CHILD_PIN: '1234',
        RC1_PARENT_PIN: '5678',
      }),
      /allowlisted/
    );
  });

  it('requires fingerprint-free secrets with valid pins', () => {
    assert.throws(
      () => validatePrepareEnv({
        DATABASE_URL: 'postgres://local/test',
        RC1_QA_EMAIL: RC1_QA_PARENT_EMAIL,
        RC1_QA_PASSWORD: 'x',
        RC1_CHILD_PIN: '12',
        RC1_PARENT_PIN: '5678',
      }),
      /RC1_CHILD_PIN/
    );
  });
});

describe('verifyParentPinInTransaction', () => {
  it('returns false when hash missing', async () => {
    const client = {
      async query() {
        return { rows: [{ id: 'p1', family_id: 'f1', parent_pin_hash: null }] };
      },
    };
    const ok = await verifyParentPinInTransaction(client, {
      familyId: 'f1',
      parentId: 'p1',
      pin: '1234',
    });
    assert.equal(ok, false);
  });

  it('returns true when hash matches', async () => {
    const hash = await hashPassword('4321');
    const client = {
      async query() {
        return { rows: [{ id: 'p1', family_id: 'f1', parent_pin_hash: hash }] };
      },
    };
    const ok = await verifyParentPinInTransaction(client, {
      familyId: 'f1',
      parentId: 'p1',
      pin: '4321',
    });
    assert.equal(ok, true);
  });
});

describe('rc1-qa-prepare transaction rollback', () => {
  it('rolls back when mid-seed fails (no COMMIT)', async () => {
    const { runRc1QaPrepareTransaction } = require('../scripts/lib/rc1-qa-prepare-core');
    let committed = false;
    let rolledBack = false;
    const pinHash = await hashPassword('1111');
    const client = {
      async query(sql, params) {
        const s = String(sql);
        if (s === 'BEGIN') return;
        if (s === 'COMMIT') {
          committed = true;
          return;
        }
        if (s === 'ROLLBACK') {
          rolledBack = true;
          return;
        }
        if (s.includes('FROM parent WHERE LOWER(email)')) {
          return { rows: [{ id: 'parent-1', family_id: 'fam-1' }] };
        }
        if (s.includes('SELECT name FROM family')) {
          return { rows: [{ name: 'RC-1 QA Fixture (automation)' }] };
        }
        if (s.includes('parent_pin_hash FROM parent')) {
          return { rows: [{ id: 'parent-1', family_id: 'fam-1', parent_pin_hash: pinHash }] };
        }
        if (s.includes('INSERT INTO reward') && params?.[1] === 'Screen time') {
          throw new Error('simulated seed failure');
        }
        if (s.startsWith('SELECT id FROM child')) {
          return { rows: [{ id: 'child-1' }] };
        }
        if (s.includes('INSERT INTO activity_template')) {
          return { rows: [{ id: `act-${params[1]}` }] };
        }
        if (s.includes('INSERT INTO weekly_schedule ')) {
          return { rows: [{ id: 'ws-1' }] };
        }
        if (s.includes('INSERT INTO daily_log ')) {
          return { rows: [{ id: 'dl-1' }] };
        }
        return { rows: [] };
      },
    };

    await assert.rejects(
      () => runRc1QaPrepareTransaction(client, {
        qaEmail: RC1_QA_PARENT_EMAIL,
        parentPassword: 'pw',
        childPin: '2222',
        parentPin: '1111',
        expectedFamilyId: null,
      }),
      /simulated seed failure/
    );
    assert.equal(committed, false);
    assert.equal(rolledBack, true);
  });
});

describe('rc1-qa-reset-manifest', () => {
  it('lists reset tables with policies', () => {
    const reset = RC1_QA_RESET_STEPS.filter((s) => s.policy === 'reset');
    assert.ok(reset.length >= 15);
    const preserve = RC1_QA_RESET_STEPS.filter((s) => s.policy === 'preserve');
    assert.ok(preserve.some((p) => p.table === 'family'));
  });
});
