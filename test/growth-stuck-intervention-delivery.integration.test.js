'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const interventionDb = require('../db/family-growth-intervention');
const { INTERVENTION_KEYS } = require('../src/lib/growth-stuck-intervention-templates');

function mockSendEmail(handler) {
  const emailPath = require.resolve('../src/lib/email');
  const previousEmail = require.cache[emailPath];
  require.cache[emailPath] = {
    id: emailPath,
    filename: emailPath,
    loaded: true,
    exports: {
      ...require('../src/lib/email'),
      sendEmail: handler,
    },
  };
  return () => {
    if (previousEmail) require.cache[emailPath] = previousEmail;
    else delete require.cache[emailPath];
  };
}

function clearInterventionModuleCache() {
  delete require.cache[require.resolve('../src/lib/growth-stuck-intervention')];
}

async function seedStuckFamily(db, suffix = Date.now()) {
  const createdAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const fam = await db.query(
    `INSERT INTO family (name, timezone, created_at)
     VALUES ($1, 'Europe/Stockholm', $2)
     RETURNING id`,
    [`Stuck Delivery ${suffix}`, createdAt]
  );
  const familyId = fam.rows[0].id;
  const email = `stuck-delivery-${suffix}@example.com`;

  const parent = await db.query(
    `INSERT INTO parent (
       family_id, email, password_hash, name, verified, family_role, onboarding_completed
     ) VALUES ($1, $2, 'hash', 'Stuck Parent', true, 'förälder', true)
     RETURNING id`,
    [familyId, email]
  );
  const parentId = parent.rows[0].id;

  await db.query(
    `INSERT INTO family_activation_state (
       family_id, signup_at, schema_saved_at, child_access_completed_at
     ) VALUES ($1, $2, $3, NULL)`,
    [familyId, createdAt, new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)]
  );

  return {
    familyId,
    parentId,
    email,
    interventionKey: INTERVENTION_KEYS.schema_without_child_access,
    cohort: 'schema_no_child_login',
  };
}

describe('growth-stuck-intervention delivery hardening', () => {
  let db;
  let restoreEmail;

  before(async () => {
    db = await setupTestDb();
  });

  after(async () => {
    if (restoreEmail) restoreEmail();
    clearInterventionModuleCache();
    if (db && !db.skip && db.cleanup) await db.cleanup();
  });

  it('claimPendingIntervention is conflict-safe for concurrent claims', async (t) => {
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }

    const { familyId, parentId, interventionKey, cohort } = await seedStuckFamily(db);
    const claimRow = {
      familyId,
      cohort,
      interventionKey,
      sentBy: parentId,
      subjectSnapshot: 'Test subject',
      bodyVersion: 'v1',
    };

    const [first, second] = await Promise.all([
      interventionDb.claimPendingIntervention(claimRow),
      interventionDb.claimPendingIntervention(claimRow),
    ]);

    const winners = [first, second].filter(Boolean);
    assert.equal(winners.length, 1, 'exactly one concurrent claim should win');
    assert.equal(winners[0].family_id, familyId);
    assert.equal(winners[0].intervention_key, interventionKey);
    assert.ok(winners[0].idempotency_key);

    const statuses = await db.query(
      `SELECT status FROM family_growth_intervention
       WHERE family_id = $1 AND intervention_key = $2`,
      [familyId, interventionKey]
    );
    assert.equal(statuses.rows.length, 1);
    assert.equal(statuses.rows[0].status, 'pending');
  });

  it('concurrent sendStuckIntervention performs exactly one email attempt', async (t) => {
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }

    const prevEmailEnabled = process.env.EMAIL_ENABLED;
    delete process.env.EMAIL_ENABLED;

    const { familyId, parentId } = await seedStuckFamily(db, `send-${Date.now()}`);

    let releaseSend;
    const sendGate = new Promise((resolve) => {
      releaseSend = resolve;
    });
    let sendCalls = 0;
    const idempotencyKeys = [];

    restoreEmail = mockSendEmail(async (opts) => {
      sendCalls += 1;
      if (opts.idempotencyKey) idempotencyKeys.push(opts.idempotencyKey);
      await sendGate;
      return { success: true, provider: 'test' };
    });
    clearInterventionModuleCache();
    const { sendStuckIntervention } = require('../src/lib/growth-stuck-intervention');

    const p1 = sendStuckIntervention(familyId, parentId);
    const p2 = sendStuckIntervention(familyId, parentId);

    await new Promise((r) => setImmediate(r));
    releaseSend();

    const [r1, r2] = await Promise.all([p1, p2]);

    const successes = [r1, r2].filter((r) => r.ok);
    const failures = [r1, r2].filter((r) => !r.ok);
    assert.equal(successes.length, 1, 'exactly one send should succeed');
    assert.equal(failures.length, 1, 'loser should be blocked');
    assert.equal(sendCalls, 1, 'sendEmail must be invoked once');

    const expectedKey = interventionDb.buildIdempotencyKey(
      familyId,
      INTERVENTION_KEYS.schema_without_child_access
    );
    assert.deepEqual(idempotencyKeys, [expectedKey]);

    const sentRows = await db.query(
      `SELECT status, idempotency_key FROM family_growth_intervention
       WHERE family_id = $1 AND intervention_key = $2`,
      [familyId, INTERVENTION_KEYS.schema_without_child_access]
    );
    assert.equal(sentRows.rows.length, 1);
    assert.equal(sentRows.rows[0].status, 'sent');
    assert.equal(sentRows.rows[0].idempotency_key, expectedKey);

    if (prevEmailEnabled !== undefined) process.env.EMAIL_ENABLED = prevEmailEnabled;
    restoreEmail();
    restoreEmail = null;
    clearInterventionModuleCache();
  });
});
