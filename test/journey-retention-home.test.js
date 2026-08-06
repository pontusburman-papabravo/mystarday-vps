'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const familyMilestones = require('../db/family-milestones');
const {
  buildRetentionHomeDecision,
  RETENTION_FLAG,
} = require('../src/lib/journey/retention-home-decision');
const { buildCanonicalNextAction } = require('../src/lib/activation/canonical-next-action');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { loadLocales } = require('../src/lib/i18n');

before(() => {
  loadLocales();
});

async function insertFamilyWithParent(db) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ('Retention', 'Europe/Stockholm') RETURNING id`
  );
  const familyId = fam.rows[0].id;
  const parent = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, 'hash', $2, 'Parent', true, true) RETURNING id`,
    [`p-${Date.now()}@ret.test`, familyId]
  );
  const parentId = parent.rows[0].id;
  return { familyId, parentId };
}

async function insertChild(db, familyId, parentId, name) {
  const slug = name.toLowerCase().replace(/\s/g, '');
  const child = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
     VALUES ($1, $2, '⭐', $3, 'hash', 0) RETURNING id`,
    [familyId, name, `${slug}${Date.now()}`]
  );
  const childId = child.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentId, childId]
  );
  return childId;
}

async function enableFlags(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEYS.firstSuccessV1]
  );
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [RETENTION_FLAG]
  );
}

describe('journey retention home decision', () => {
  it('migration seeds journey_retention_home_v1 flag', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1810200000000_journey_retention_home_v1.js'),
      'utf8'
    );
    assert.match(src, /journey_retention_home_v1/);
  });

  it('SHOW_CHILD when routine ready and no child login', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFlags(db);
      const { familyId, parentId } = await insertFamilyWithParent(db);
      await insertChild(db, familyId, parentId, 'Astrid');
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
      });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'routine_ready',
        source: 'system',
      });

      const decision = await buildRetentionHomeDecision(familyId, parentId);
      assert.equal(decision.action, 'SHOW_CHILD');
      assert.equal(decision.show_primary_coach, true);
      assert.equal(decision.reason, 'ROUTINE_READY_NO_CHILD_ACCESS');

      const payload = await buildCanonicalNextAction(familyId, { parentId });
      assert.equal(payload.next_action, 'child_access');
      assert.equal(payload.show_primary_coach, true);
    } finally {
      await db.cleanup();
    }
  });

  it('SILENT when established routine', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFlags(db);
      const { familyId, parentId } = await insertFamilyWithParent(db);
      await insertChild(db, familyId, parentId, 'Erik');
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
      });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'established_routine',
        source: 'system',
      });

      const decision = await buildRetentionHomeDecision(familyId, parentId);
      assert.equal(decision.action, 'SILENT');
      assert.equal(decision.show_primary_coach, false);
    } finally {
      await db.cleanup();
    }
  });

  it('parent without child link gets SILENT (no leak)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFlags(db);
      const { familyId, parentId } = await insertFamilyWithParent(db);
      const otherParent = await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
         VALUES ('other@ret.test', 'hash', $1, 'Other', true, true) RETURNING id`,
        [familyId]
      );
      await insertChild(db, familyId, parentId, 'Kid');
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
      });

      const decision = await buildRetentionHomeDecision(familyId, otherParent.rows[0].id);
      assert.equal(decision.action, 'SILENT');
      assert.equal(decision.reason, 'no_accessible_children');
    } finally {
      await db.cleanup();
    }
  });
});

describe('journey retention home — welcome back and multi-child', () => {
  it('WELCOME_BACK after gap without guilt milestones', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFlags(db);
      const { familyId, parentId } = await insertFamilyWithParent(db);
      const childId = await insertChild(db, familyId, parentId, 'Astrid');
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
      });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'child_logged_in',
        childId,
        source: 'system',
      });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'child_first_completion',
        childId,
        source: 'system',
      });
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
      const log = await db.query(
        'INSERT INTO daily_log (child_id, date) VALUES ($1, $2::date) RETURNING id',
        [childId, fiveDaysAgo.toISOString().slice(0, 10)]
      );
      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_at)
         VALUES ($1, 'Tandborsta', 'fm', 0, 1, true, $2)`,
        [log.rows[0].id, fiveDaysAgo.toISOString()]
      );

      const decision = await buildRetentionHomeDecision(familyId, parentId);
      assert.equal(decision.action, 'WELCOME_BACK');
      assert.equal(decision.reason, 'RETURN_AFTER_GAP');

      const { retentionToCanonicalFields } = require('../src/lib/journey/retention-home-decision');
      const fields = await retentionToCanonicalFields(decision, familyId);
      const body = fields.body || '';
      assert.doesNotMatch(body, /streak|missat|missade/i);
    } finally {
      await db.cleanup();
    }
  });

  it('prefers child needing handoff when sibling already logged in', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFlags(db);
      const { familyId, parentId } = await insertFamilyWithParent(db);
      const childA = await insertChild(db, familyId, parentId, 'Astrid');
      const childB = await insertChild(db, familyId, parentId, 'Erik');
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
      });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'routine_ready',
        source: 'system',
      });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'child_logged_in',
        childId: childB,
        source: 'system',
      });

      const decision = await buildRetentionHomeDecision(familyId, parentId);
      assert.equal(decision.action, 'SHOW_CHILD');
      assert.equal(decision.child_id, childA);
    } finally {
      await db.cleanup();
    }
  });
});
