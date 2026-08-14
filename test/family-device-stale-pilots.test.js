'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { hashPassword } = require('../src/lib/hash');
const dbModule = require('../src/lib/db');
const {
  cleanupStaleFdPilotFamilies,
  countGlobalStaleFdPilotRows,
  deletePilotFamily,
  enablePilotOverrides,
  enumerateStalePilotCandidates,
  withFamilyDevicePilotLock,
} = require('../scripts/ops/family-device-pilot-db.cjs');
const {
  createDisposableFamilyDeviceQaFamily,
  FIXTURE_FAMILY_NAME,
} = require('../scripts/ops/family-device-qa-fixture.cjs');
const {
  classifyDisposablePilotFixtureOwnership,
  FIXTURE_PARENT_NAME,
} = require('../src/lib/family-device-pilot-guard');

process.env.FAMILY_DEVICE_PILOT_CONFIRM = '1';

test('stale fd-pilot ownership + cleanup', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  try {
    await t.test('canonical stale pilot -> eligible candidate with exact ids', async () => {
      const fixture = await createDisposableFamilyDeviceQaFamily(dbModule, { childCount: 1 });
      try {
        await enablePilotOverrides(dbModule, fixture.familyId, fixture.email, 'stale-pilot-test');
        const classified = await enumerateStalePilotCandidates(dbModule);
        assert.ok(classified.candidates.some((c) => c.family_id === fixture.familyId));
        assert.equal(classified.ambiguous.length, 0);
        const dry = await cleanupStaleFdPilotFamilies(dbModule, { apply: false });
        assert.equal(dry.mode, 'dry-run');
        assert.ok(dry.candidates.some((c) => c.family_id === fixture.familyId && c.email === fixture.email));
      } finally {
        await deletePilotFamily(dbModule, fixture.familyId, fixture.email).catch(() => {});
      }
    });

    await t.test('mixed family with fd-pilot-like parent + co-parent -> refused, no delete', async () => {
      const fixture = await createDisposableFamilyDeviceQaFamily(dbModule, { childCount: 1 });
      try {
        const passwordHash = await hashPassword('MixedParent1aA!');
        await dbModule.query(
          `INSERT INTO parent (family_id, email, password_hash, name, verified, onboarding_completed)
           VALUES ($1, 'customer-co-parent@example.com', $2, 'Customer Co-Parent', true, true)`,
          [fixture.familyId, passwordHash]
        );
        const verdict = await classifyDisposablePilotFixtureOwnership(dbModule, fixture.familyId);
        assert.equal(verdict.status, 'AMBIGUOUS_PILOT_OWNERSHIP');
        const snapshot = await enumerateStalePilotCandidates(dbModule);
        assert.equal(snapshot.candidates.some((c) => c.family_id === fixture.familyId), false);
        assert.ok(snapshot.ambiguous.some((c) => c.family_id === fixture.familyId));
        const apply = await cleanupStaleFdPilotFamilies(dbModule, { apply: true, snapshot });
        assert.equal(apply.ok, false);
        assert.equal(apply.deletedCount, 0);
        const still = await dbModule.query('SELECT 1 FROM family WHERE id = $1', [fixture.familyId]);
        assert.equal(still.rows.length, 1);
      } finally {
        await dbModule.query('DELETE FROM parent WHERE family_id = $1 AND email = $2', [
          fixture.familyId,
          'customer-co-parent@example.com',
        ]).catch(() => {});
        await deletePilotFamily(dbModule, fixture.familyId, fixture.email).catch(() => {});
      }
    });

    await t.test('canonical email but wrong family marker -> refused', async () => {
      const fixture = await createDisposableFamilyDeviceQaFamily(dbModule, { childCount: 1 });
      try {
        await dbModule.query('UPDATE family SET name = $1 WHERE id = $2', ['Wrong Marker', fixture.familyId]);
        const verdict = await classifyDisposablePilotFixtureOwnership(dbModule, fixture.familyId);
        assert.equal(verdict.status, 'REFUSED');
        const snapshot = await enumerateStalePilotCandidates(dbModule);
        assert.ok(snapshot.refused.some((c) => c.family_id === fixture.familyId));
        const scopedSnapshot = {
          candidates: [],
          refused: snapshot.refused.filter((c) => c.family_id === fixture.familyId),
          ambiguous: [],
        };
        const apply = await cleanupStaleFdPilotFamilies(dbModule, { apply: true, snapshot: scopedSnapshot });
        assert.equal(apply.deletedCount, 0);
        const still = await dbModule.query('SELECT 1 FROM family WHERE id = $1', [fixture.familyId]);
        assert.equal(still.rows.length, 1);
      } finally {
        await dbModule
          .query('UPDATE family SET name = $1 WHERE id = $2', [FIXTURE_FAMILY_NAME, fixture.familyId])
          .catch(() => {});
        await deletePilotFamily(dbModule, fixture.familyId, fixture.email).catch(() => {});
      }
    });

    await t.test('apply uses snapshot candidates exactly', async () => {
      const fixture = await createDisposableFamilyDeviceQaFamily(dbModule, { childCount: 1 });
      try {
        const snapshot = await enumerateStalePilotCandidates(dbModule);
        const target = snapshot.candidates.find((c) => c.family_id === fixture.familyId);
        assert.ok(target);
        const scopedSnapshot = {
          candidates: [target],
          refused: snapshot.refused.filter((c) => c.family_id !== fixture.familyId),
          ambiguous: snapshot.ambiguous.filter((c) => c.family_id !== fixture.familyId),
        };
        const lock = await withFamilyDevicePilotLock(dbModule, async () =>
          cleanupStaleFdPilotFamilies(dbModule, { apply: true, snapshot: scopedSnapshot })
        );
        assert.equal(lock.locked, true);
        assert.deepEqual(lock.result.deletedFamilyIds, [fixture.familyId]);
        assert.equal(lock.result.ok, true);
        const after = await countGlobalStaleFdPilotRows(dbModule);
        assert.equal(after.families, 0);
      } finally {
        await deletePilotFamily(dbModule, fixture.familyId, fixture.email).catch(() => {});
      }
    });
  } finally {
    await db.cleanup();
  }
});

test('stale fd-pilot cleanup: rejects non-disposable lookalike emails', () => {
  const { assertFamilyDevicePilotDisposableEmail } = require('../src/lib/family-device-pilot-guard');
  assert.throws(
    () => assertFamilyDevicePilotDisposableEmail('fd-pilot-notdigits@example.com'),
    /not fd-pilot/
  );
  assert.throws(
    () => assertFamilyDevicePilotDisposableEmail('at-pilot-1234567890123@example.com'),
    /not fd-pilot/
  );
});

test('stale fd-pilot cleanup: fail-closed ownership + snapshot semantics in source', () => {
  const dbSrc = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-pilot-db.cjs'),
    'utf8'
  );
  assert.match(dbSrc, /classifyDisposablePilotFixtureOwnership/);
  assert.match(dbSrc, /AMBIGUOUS_PILOT_OWNERSHIP/);
  assert.match(dbSrc, /deleteValidatedPilotSnapshot/);
  assert.match(dbSrc, /FIXTURE_FAMILY_NAME|canonical_fixture/);

  const cliSrc = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-stale-pilots.mjs'),
    'utf8'
  );
  assert.match(cliSrc, /candidates:/);
  assert.match(cliSrc, /enumerateStalePilotCandidates/);
  assert.match(cliSrc, /PILOT_LOCK_BUSY/);
});

test('canonical fixture markers are stable', () => {
  assert.equal(FIXTURE_FAMILY_NAME, 'FD Pilot QA (disposable)');
  assert.equal(FIXTURE_PARENT_NAME, 'FD Pilot Parent');
});
