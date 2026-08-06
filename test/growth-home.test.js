'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const familyMilestones = require('../db/family-milestones');
const { pickGrowthHomeStep, GROWTH_FLAG } = require('../src/lib/growth/home-growth-step');
const { buildWeeklyHighlight, formatHighlightCopy } = require('../src/lib/growth/weekly-highlight');
const { loadLocales, t } = require('../src/lib/i18n');
const referralDb = require('../db/referral');

before(() => {
  loadLocales();
});

async function seedFamily(db) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ('Growth', 'Europe/Stockholm') RETURNING id`
  );
  const familyId = fam.rows[0].id;
  const parent = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, 'hash', $2, 'P', true, true) RETURNING id`,
    [`g-${Date.now()}@test.local`, familyId]
  );
  const parentId = parent.rows[0].id;
  return { familyId, parentId };
}

async function enableGrowth(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 't')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [GROWTH_FLAG]
  );
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 't')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    ['journey_retention_home_v1']
  );
}

describe('growth home v1', () => {
  it('migration seeds growth_home_v1', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1810210000000_growth_home_v1.js'),
      'utf8'
    );
    assert.match(src, /growth_home_v1/);
  });

  it('no invite growth step before first_success', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableGrowth(db);
      const { familyId, parentId } = await seedFamily(db);
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'K', '⭐', $2, 'hash', 0) RETURNING id`,
        [familyId, `c${Date.now()}`]
      );
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
        [parentId, child.rows[0].id]
      );
      const step = await pickGrowthHomeStep(familyId, parentId);
      assert.equal(step, null);
    } finally {
      await db.cleanup();
    }
  });

  it('INVITE_ADULT after first_success with one parent', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableGrowth(db);
      const { familyId, parentId } = await seedFamily(db);
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'K', '⭐', $2, 'hash', 0) RETURNING id`,
        [familyId, `c${Date.now()}`]
      );
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
        [parentId, child.rows[0].id]
      );
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
      });
      const step = await pickGrowthHomeStep(familyId, parentId);
      assert.equal(step?.action, 'INVITE_ADULT');
    } finally {
      await db.cleanup();
    }
  });

  it('weekly highlight share text has no child names', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const { familyId, parentId } = await seedFamily(db);
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Astrid', '⭐', $2, 'hash', 0) RETURNING id`,
        [familyId, `a${Date.now()}`]
      );
      const childId = child.rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
        [parentId, childId]
      );
      const log = await db.query(
        'INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id',
        [childId]
      );
      for (let i = 0; i < 3; i++) {
        await db.query(
          `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_at)
           VALUES ($1, $2, 'fm', $3, 1, true, NOW())`,
          [log.rows[0].id, `Activity ${i}`, i]
        );
      }
      const children = [{ id: childId, name: 'Astrid' }];
      const highlight = await buildWeeklyHighlight(familyId, parentId, children);
      assert.ok(highlight);
      const copy = formatHighlightCopy('sv-SE', highlight);
      assert.doesNotMatch(copy.share_text, /Astrid/i);
      assert.doesNotMatch(copy.headline, /Astrid/i);
    } finally {
      await db.cleanup();
    }
  });

  it('referral qualifies only after first_success milestone', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const referred = await seedFamily(db);
      const referrerFam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Ref', 'Europe/Stockholm') RETURNING id`
      );
      const referrer = await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
         VALUES ('ref@test.local', 'hash', $1, 'R', true, true) RETURNING id`,
        [referrerFam.rows[0].id]
      );
      const before = await referralDb.qualifyReferralForFamily(referred.familyId);
      assert.equal(before, null);
      await familyMilestones.insertMilestone({
        familyId: referred.familyId,
        milestone: 'first_success',
        source: 'system',
      });
      await referralDb.createPendingReferral({
        referrerParentId: referrer.rows[0].id,
        referredFamilyId: referred.familyId,
        code: 'STJ-TEST',
      });
      const after = await referralDb.qualifyReferralForFamily(referred.familyId);
      assert.ok(after);
    } finally {
      await db.cleanup();
    }
  });
});
