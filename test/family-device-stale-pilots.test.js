'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const db = require('../src/lib/db');
const {
  cleanupStaleFdPilotFamilies,
  countGlobalStaleFdPilotRows,
  deletePilotFamily,
  enablePilotOverrides,
  tryAcquireStalePilotLock,
  releaseStalePilotLock,
} = require('../scripts/ops/family-device-pilot-db.cjs');
const { createDisposableFamilyDeviceQaFamily } = require('../scripts/ops/family-device-qa-fixture.cjs');
const { assertFamilyDevicePilotDisposableEmail } = require('../src/lib/family-device-pilot-guard');

process.env.FAMILY_DEVICE_PILOT_CONFIRM = '1';

test('stale fd-pilot lifecycle', async (t) => {
  const wrapper = await setupTestDb();
  if (wrapper.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await t.test('dry-run reports rows without deleting', async () => {
    const fixture = await createDisposableFamilyDeviceQaFamily(db, { childCount: 1 });
    await enablePilotOverrides(db, fixture.familyId, fixture.email, 'stale-pilot-test');
    try {
      const dry = await cleanupStaleFdPilotFamilies(db, { apply: false });
      assert.equal(dry.dryRun, true);
      assert.ok(dry.families >= 1);
      assert.ok(dry.overrides >= 1);
      const still = await countGlobalStaleFdPilotRows(db);
      assert.ok(still.families >= 1);
    } finally {
      await deletePilotFamily(db, fixture.familyId, fixture.email);
    }
  });

  await t.test('apply deletes only fd-pilot-*@example.com families', async () => {
    const fixture = await createDisposableFamilyDeviceQaFamily(db, { childCount: 1 });
    await enablePilotOverrides(db, fixture.familyId, fixture.email, 'stale-pilot-test');
    const applied = await cleanupStaleFdPilotFamilies(db, { apply: true });
    assert.equal(applied.dryRun, false);
    assert.ok(applied.deleted >= 1);
    assert.equal(applied.ok, true);
    const after = await countGlobalStaleFdPilotRows(db);
    assert.equal(after.families, 0);
    assert.equal(after.overrides, 0);
  });

  await t.test('concurrent lock is exclusive', async () => {
    const clientA = await db.getClient();
    const clientB = await db.getClient();
    try {
      assert.equal(await tryAcquireStalePilotLock(db, clientA), true);
      assert.equal(await tryAcquireStalePilotLock(db, clientB), false);
    } finally {
      await releaseStalePilotLock(db, clientA).catch(() => {});
      clientA.release();
      clientB.release();
    }
  });
});

test('stale fd-pilot cleanup: rejects non-disposable lookalike emails', () => {
  assert.throws(
    () => assertFamilyDevicePilotDisposableEmail('fd-pilot-notdigits@example.com'),
    /not fd-pilot/
  );
  assert.throws(
    () => assertFamilyDevicePilotDisposableEmail('at-pilot-1234567890123@example.com'),
    /not fd-pilot/
  );
});

test('stale fd-pilot cleanup: fail-closed when delete errors remain', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-pilot-db.cjs'),
    'utf8'
  );
  assert.match(src, /errors\.length === 0/);
  assert.match(src, /after\.families === 0 && after\.overrides === 0/);
});
