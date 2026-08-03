'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { setupTestDb } = require('./helpers/setup.js');
const { FLAG_KEYS, isActivationFlagEnabled } = require('../src/lib/activation-flags');
const familyOverrides = require('../db/family-feature-overrides');
const overrideCache = require('../src/lib/activation-flag-family-cache');
const {
  assertFamilyEligibleForFounderOverride,
} = require('../src/lib/founder-qa-family-guard');

const ROOT = path.join(__dirname, '..');
const FEATURE = FLAG_KEYS.firstSuccessV1;

describe('family_feature_override migration', () => {
  it('defines table and down()', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1810160000000_family_feature_override.js'),
      'utf8'
    );
    assert.match(src, /family_feature_override/);
    assert.match(src, /down:/);
  });
});

describe('activation flag family override — integration', () => {
  let db;

  before(async () => {
    db = await setupTestDb();
  });

  after(async () => {
    if (db && !db.skip && db.cleanup) await db.cleanup();
  });

  async function createFamily() {
    const fam = await db.query(
      `INSERT INTO family (name, timezone) VALUES ('override-test', 'Europe/Stockholm') RETURNING id`
    );
    return fam.rows[0].id;
  }

  it('global OFF, no override → OFF', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const familyId = await createFamily();
    await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FEATURE]);
    overrideCache.invalidateFamilyOverrideCache(familyId, FEATURE);
    const on = await isActivationFlagEnabled(FEATURE, familyId);
    assert.equal(on, false);
  });

  it('global OFF, family allow → ON; other family OFF', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FEATURE]);
    const familyA = await createFamily();
    const familyB = await createFamily();
    await familyOverrides.upsertOverride(familyA, FEATURE, true, {
      reason: 'test-allow',
      source: 'test',
    });
    overrideCache.invalidateFamilyOverrideCache(familyA, FEATURE);
    overrideCache.invalidateFamilyOverrideCache(familyB, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyA), true);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyB), false);
    await familyOverrides.removeOverride(familyA, FEATURE);
  });

  it('global ON, family deny override → OFF', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [FEATURE]
    );
    const familyId = await createFamily();
    await familyOverrides.upsertOverride(familyId, FEATURE, false, {
      reason: 'test-deny',
      source: 'test',
    });
    overrideCache.invalidateFamilyOverrideCache(familyId, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), false);
    await familyOverrides.removeOverride(familyId, FEATURE);
  });

  it('override expiry → OFF after expiry', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FEATURE]);
    const familyId = await createFamily();
    await familyOverrides.upsertOverride(familyId, FEATURE, true, {
      reason: 'expiry-test',
      source: 'test',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    overrideCache.invalidateFamilyOverrideCache(familyId, FEATURE);
    const row = await familyOverrides.getActiveOverride(familyId, FEATURE);
    assert.equal(row, null);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), false);
    await db.query(
      'DELETE FROM family_feature_override WHERE family_id = $1 AND feature_key = $2',
      [familyId, FEATURE]
    );
  });

  it('archived family → OFF even with allow override', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const familyId = await createFamily();
    await familyOverrides.upsertOverride(familyId, FEATURE, true, { source: 'test' });
    await db.query(`UPDATE family SET archived_at = NOW() WHERE id = $1`, [familyId]);
    overrideCache.invalidateFamilyOverrideCache(familyId, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), false);
    await db.query(`UPDATE family SET archived_at = NULL WHERE id = $1`, [familyId]);
    await familyOverrides.removeOverride(familyId, FEATURE);
  });

  it('unknown feature key rejected by db module', () => {
    assert.throws(
      () => familyOverrides.assertOverrideFeatureKey('not_a_real_flag'),
      /not allowlisted/
    );
  });

  it('cache invalidation after remove', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FEATURE]);
    const familyId = await createFamily();
    await familyOverrides.upsertOverride(familyId, FEATURE, true, { source: 'test' });
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), true);
    await familyOverrides.removeOverride(familyId, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), true);
    overrideCache.invalidateFamilyOverrideCache(familyId, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), false);
  });
});

describe('founder QA guard', () => {
  it('refuses override when FOUNDER_QA_EMAIL unset', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const prev = process.env.FOUNDER_QA_EMAIL;
    const prevSkip = process.env.FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD;
    delete process.env.FOUNDER_QA_EMAIL;
    delete process.env.FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD;
    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('guard-test', 'Europe/Stockholm') RETURNING id`
      );
      await assert.rejects(
        () => assertFamilyEligibleForFounderOverride(db, fam.rows[0].id),
        /FOUNDER_QA_EMAIL/
      );
    } finally {
      if (prev === undefined) delete process.env.FOUNDER_QA_EMAIL;
      else process.env.FOUNDER_QA_EMAIL = prev;
      if (prevSkip === undefined) delete process.env.FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD;
      else process.env.FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD = prevSkip;
      if (db.cleanup) await db.cleanup();
    }
  });
});
