'use strict';

/**
 * R4.5 pilot — widget + trusted-device flags with family override precedence.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const familyOverrides = require('../db/family-feature-overrides');
const overrideCache = require('../src/lib/activation-flag-family-cache');
const { FLAG_NATIVE, FLAG_COMPLETION, isNativeWidgetEnabled, isWidgetCompletionEnabled } = require('../src/lib/widget-flags');
const { FLAG_KEY, isTrustedDeviceEnabled } = require('../src/lib/trusted-device-flags');

async function ensureFlagRow(db, key, enabled) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

async function createFamily(db) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ('pilot-flag-test', 'Europe/Stockholm') RETURNING id`
  );
  return fam.rows[0].id;
}

function invalidate(familyId, key) {
  overrideCache.invalidateFamilyOverrideCache(familyId, key);
}

test('R4.5 pilot flags: global OFF + no override → OFF', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  try {
    await ensureFlagRow(db, FLAG_NATIVE, false);
    await ensureFlagRow(db, FLAG_COMPLETION, false);
    await ensureFlagRow(db, FLAG_KEY, false);
    const familyId = await createFamily(db);
    invalidate(familyId, FLAG_NATIVE);
    assert.equal(await isNativeWidgetEnabled(familyId), false);
    assert.equal(await isWidgetCompletionEnabled(familyId), false);
    assert.equal(await isTrustedDeviceEnabled(familyId), false);
  } finally {
    await db.cleanup();
  }
});

test('R4.5 pilot flags: global OFF + family allow → ON for that family only', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  try {
    await ensureFlagRow(db, FLAG_NATIVE, false);
    await ensureFlagRow(db, FLAG_COMPLETION, false);
    await ensureFlagRow(db, FLAG_KEY, false);
    const familyA = await createFamily(db);
    const familyB = await createFamily(db);
    for (const key of [FLAG_NATIVE, FLAG_COMPLETION, FLAG_KEY]) {
      await familyOverrides.upsertOverride(familyA, key, true, { reason: 'pilot', source: 'test' });
      invalidate(familyA, key);
      invalidate(familyB, key);
    }
    assert.equal(await isNativeWidgetEnabled(familyA), true);
    assert.equal(await isWidgetCompletionEnabled(familyA), true);
    assert.equal(await isTrustedDeviceEnabled(familyA), true);
    assert.equal(await isNativeWidgetEnabled(familyB), false);
    assert.equal(await isWidgetCompletionEnabled(familyB), false);
    assert.equal(await isTrustedDeviceEnabled(familyB), false);
    for (const key of [FLAG_NATIVE, FLAG_COMPLETION, FLAG_KEY]) {
      await familyOverrides.removeOverride(familyA, key);
    }
  } finally {
    await db.cleanup();
  }
});

test('R4.5 pilot flags: global ON + family deny → OFF for that family', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  try {
    await ensureFlagRow(db, FLAG_NATIVE, true);
    await ensureFlagRow(db, FLAG_COMPLETION, true);
    await ensureFlagRow(db, FLAG_KEY, true);
    const familyId = await createFamily(db);
    await familyOverrides.upsertOverride(familyId, FLAG_NATIVE, false, { reason: 'deny', source: 'test' });
    invalidate(familyId, FLAG_NATIVE);
    assert.equal(await isNativeWidgetEnabled(familyId), false);
    assert.equal(await isWidgetCompletionEnabled(familyId), false);
    await familyOverrides.removeOverride(familyId, FLAG_NATIVE);
  } finally {
    await db.cleanup();
  }
});

test('R4.5 pilot flags: global ON + no override → ON', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  try {
    await ensureFlagRow(db, FLAG_NATIVE, true);
    await ensureFlagRow(db, FLAG_COMPLETION, true);
    const familyId = await createFamily(db);
    invalidate(familyId, FLAG_NATIVE);
    invalidate(familyId, FLAG_COMPLETION);
    assert.equal(await isNativeWidgetEnabled(familyId), true);
    assert.equal(await isWidgetCompletionEnabled(familyId), true);
  } finally {
    await db.cleanup();
  }
});
