'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const familyMilestones = require('../db/family-milestones');
const { evaluateCommunicationGate } = require('../src/lib/journey/communication-gate');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { RETENTION_FLAG } = require('../src/lib/journey/retention-home-decision');

async function seedEstablishedSilentFamily(db) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ('Comm Gate', 'Europe/Stockholm') RETURNING id`
  );
  const familyId = fam.rows[0].id;
  const parent = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, 'hash', $2, 'P', true, true) RETURNING id`,
    [`gate-${Date.now()}@test.local`, familyId]
  );
  const parentId = parent.rows[0].id;
  const child = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
     VALUES ($1, 'Kid', '⭐', $2, 'hash', 0) RETURNING id`,
    [familyId, `kid${Date.now()}`]
  );
  const childId = child.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentId, childId]
  );
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 't')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEYS.firstSuccessV1]
  );
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 't')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [RETENTION_FLAG]
  );
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
  const today = new Date().toISOString().slice(0, 10);
  const log = await db.query(
    'INSERT INTO daily_log (child_id, date) VALUES ($1, $2::date) RETURNING id',
    [childId, today]
  );
  await db.query(
    `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_at)
     VALUES ($1, 'Done', 'fm', 0, 1, true, NOW())`,
    [log.rows[0].id]
  );
  return { familyId, parentId };
}

describe('R4.6c retention home communication gate', () => {
  it('suppresses retention_push when Hem is SILENT', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const { familyId } = await seedEstablishedSilentFamily(db);
      const gate = await evaluateCommunicationGate(familyId, {
        channel: 'push',
        intent: 'retention_push',
        milestoneDay: 3,
      });
      assert.equal(gate.allowed, false);
      assert.equal(gate.reason, 'journey_home_silent');
    } finally {
      await db.cleanup();
    }
  });

  it('communication-gate module wires retention-home-comms', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/journey/communication-gate.js'),
      'utf8'
    );
    assert.match(src, /getRetentionHomeCommsBlock/);
    assert.match(src, /retention_comm_cooldown_same_day/);
  });
});
