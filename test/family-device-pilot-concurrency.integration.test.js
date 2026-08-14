'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const dbModule = require('../src/lib/db');
const {
  withFamilyDevicePilotLock,
  tryAcquireFamilyDevicePilotLock,
  releaseFamilyDevicePilotLock,
  cleanupStaleFdPilotFamilies,
  enumerateStalePilotCandidates,
} = require('../scripts/ops/family-device-pilot-db.cjs');
const { runFamilyDeviceProdPilot } = require('../scripts/ops/family-device-prod-pilot-core.cjs');

process.env.FAMILY_DEVICE_PILOT_CONFIRM = '1';

test('Family Device pilot lock protocol', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  try {
    await t.test('A: active prod-pilot lock blocks stale cleanup lock', async () => {
      let releaseHold;
      const hold = new Promise((resolve) => {
        releaseHold = resolve;
      });
      const pilotLock = withFamilyDevicePilotLock(dbModule, async () => {
        await hold;
        return { ok: true };
      });
      await new Promise((r) => setTimeout(r, 50));
      const staleLock = await withFamilyDevicePilotLock(dbModule, async () => ({ blocked: true }));
      assert.equal(staleLock.locked, false);
      assert.equal(staleLock.code, 'PILOT_LOCK_BUSY');
      releaseHold();
      const pilotResult = await pilotLock;
      assert.equal(pilotResult.locked, true);
    });

    await t.test('B: active lock blocks second prod pilot start', async () => {
      let releaseHold;
      const hold = new Promise((resolve) => {
        releaseHold = resolve;
      });
      const first = withFamilyDevicePilotLock(dbModule, async () => {
        await hold;
        return { ok: true };
      });
      await new Promise((r) => setTimeout(r, 50));
      const second = await runFamilyDeviceProdPilot({ db: dbModule, baseUrl: 'https://example.test', dryRun: false });
      assert.equal(second.lockBusy, true);
      assert.equal(second.code, 'PILOT_LOCK_BUSY');
      releaseHold();
      await first;
    });

    await t.test('C: lock released after normal completion', async () => {
      const first = await withFamilyDevicePilotLock(dbModule, async () => 'done');
      assert.equal(first.locked, true);
      const client = await dbModule.getClient();
      try {
        assert.equal(await tryAcquireFamilyDevicePilotLock(dbModule, client), true);
      } finally {
        await releaseFamilyDevicePilotLock(dbModule, client);
        client.release();
      }
    });

    await t.test('D: lock released after thrown error', async () => {
      await assert.rejects(
        () =>
          withFamilyDevicePilotLock(dbModule, async () => {
            throw new Error('simulated_pilot_failure');
          }),
        /simulated_pilot_failure/
      );
      const client = await dbModule.getClient();
      try {
        assert.equal(await tryAcquireFamilyDevicePilotLock(dbModule, client), true);
      } finally {
        await releaseFamilyDevicePilotLock(dbModule, client);
        client.release();
      }
    });

    await t.test('E: two concurrent destructive ops cannot overlap', async () => {
      let releaseHold;
      const hold = new Promise((resolve) => {
        releaseHold = resolve;
      });
      const active = withFamilyDevicePilotLock(dbModule, async () => {
        await hold;
        return { ok: true };
      });
      await new Promise((r) => setTimeout(r, 50));
      const snapshot = await enumerateStalePilotCandidates(dbModule);
      const blocked = await withFamilyDevicePilotLock(dbModule, async () =>
        cleanupStaleFdPilotFamilies(dbModule, { apply: true, snapshot })
      );
      assert.equal(blocked.locked, false);
      releaseHold();
      await active;
    });
  } finally {
    await db.cleanup();
  }
});
