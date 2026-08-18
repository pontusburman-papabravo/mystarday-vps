'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { FLAG_KEYS, isActivationFlagEnabled } = require('../src/lib/activation-flags');
const familyOverrides = require('../db/family-feature-overrides');
const overrideCache = require('../src/lib/activation-flag-family-cache');

const FEATURE = FLAG_KEYS.growthSystemHelp;

describe('growth_system_help_v1 family override — integration', () => {
  let db;

  before(async () => {
    db = await setupTestDb();
  });

  after(async () => {
    if (db && !db.skip && db.cleanup) await db.cleanup();
  });

  async function createFamily() {
    const fam = await db.query(
      `INSERT INTO family (name, timezone) VALUES ('system-help-override-test', 'Europe/Stockholm') RETURNING id`
    );
    return fam.rows[0].id;
  }

  async function ensureFlagRow() {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = false`,
      [FEATURE]
    );
  }

  it('is allowlisted for family overrides', () => {
    assert.equal(familyOverrides.isOverrideFeatureKey(FEATURE), true);
  });

  it('global OFF, no override → OFF', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await ensureFlagRow();
    const familyId = await createFamily();
    overrideCache.invalidateFamilyOverrideCache(familyId, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyId), false);
  });

  it('global OFF, family allow → ON for test family; other family OFF', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    await ensureFlagRow();
    const familyA = await createFamily();
    const familyB = await createFamily();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await familyOverrides.upsertOverride(familyA, FEATURE, true, {
      reason: 'system-help-smoke',
      source: 'test',
      expiresAt,
    });
    overrideCache.invalidateFamilyOverrideCache(familyA, FEATURE);
    overrideCache.invalidateFamilyOverrideCache(familyB, FEATURE);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyA), true);
    assert.equal(await isActivationFlagEnabled(FEATURE, familyB), false);
    await familyOverrides.removeOverride(familyA, FEATURE);
  });
});
