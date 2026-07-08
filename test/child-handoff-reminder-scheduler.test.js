'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');

const ROOT = path.join(__dirname, '..');

async function enableHandoffFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled)
     VALUES ('activation_child_handoff_v1', true)
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
}

async function seedCandidateFamily(db, {
  suffix = Date.now(),
  schemaSavedHoursAgo = 3,
  childAccessCompletedAt = null,
  firstCompletionAt = null,
  p0ActivatedAt = null,
  reminderSentAt = null,
  emailEnabled = true,
} = {}) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ($1, 'Europe/Stockholm') RETURNING id`,
    [`Handoff Reminder ${suffix}`]
  );
  const familyId = fam.rows[0].id;
  const email = `handoff-reminder-${suffix}@example.com`;

  const parent = await db.query(
    `INSERT INTO parent (family_id, email, password_hash, name, verified, family_role, newsletter_subscribed)
     VALUES ($1, $2, 'hash', 'Reminder Parent', true, 'förälder', true)
     RETURNING id`,
    [familyId, email]
  );
  const parentId = parent.rows[0].id;

  if (emailEnabled === false) {
    await db.query(
      `INSERT INTO notification_preference (parent_id, email_enabled)
       VALUES ($1, false)
       ON CONFLICT (parent_id) DO UPDATE SET email_enabled = false`,
      [parentId]
    );
  }

  const schemaSavedAt = new Date(Date.now() - schemaSavedHoursAgo * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO family_activation_state (
       family_id, signup_at, schema_saved_at,
       child_access_completed_at, first_completion_at, p0_activated_at,
       child_handoff_reminder_sent_at
     ) VALUES ($1, NOW(), $2, $3, $4, $5, $6)`,
    [familyId, schemaSavedAt, childAccessCompletedAt, firstCompletionAt, p0ActivatedAt, reminderSentAt]
  );

  return { familyId, parentId, email, schemaSavedAt };
}

describe('child handoff reminder scheduler (PR 2)', () => {
  it('uses schema_saved_at segment, not child_handoff_skipped', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/child-handoff-reminder-scheduler.js'),
      'utf8'
    );
    assert.match(src, /schema_saved_at IS NOT NULL/);
    assert.match(src, /child_access_completed_at IS NULL/);
    assert.match(src, /first_completion_at IS NULL/);
    assert.match(src, /p0_activated_at IS NULL/);
    assert.match(src, /INTERVAL '2 hours'/);
    assert.match(src, /INTERVAL '48 hours'/);
    assert.doesNotMatch(src, /analytics_events/);
    assert.doesNotMatch(src, /event_type\s*=\s*'child_handoff_skipped'/);
  });

  it('uses notification_preference email_enabled (aligned with activation nudge)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/child-handoff-reminder-scheduler.js'),
      'utf8'
    );
    assert.match(src, /notification_preference/);
    assert.match(src, /email_enabled/);
    assert.doesNotMatch(src, /newsletter_subscribed/);
  });

  it('CTA points to onboarding handoff resume', () => {
    const { resolveHandoffReminderCtaUrl } = require('../src/lib/child-handoff-reminder-scheduler');
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'https://example.test';
    try {
      assert.equal(resolveHandoffReminderCtaUrl(), 'https://example.test/onboarding?resume=child-handoff');
    } finally {
      if (prev === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prev;
    }
  });

  it('email copy is neutral (no skip wording)', () => {
    const email = fs.readFileSync(path.join(ROOT, 'src/lib/email.js'), 'utf8');
    const block = email.slice(
      email.indexOf('async function sendChildHandoffReminderEmail'),
      email.indexOf('async function sendActivationNudgeEmail')
    );
    assert.match(block, /Låt barnet testa första steget/);
    assert.match(block, /Öppna barnläget/);
    assert.match(block, /Schemat är klart/);
    assert.match(block, /config\.email\.fromName/);
    assert.doesNotMatch(block, /hoppa över/i);
    assert.doesNotMatch(block, /inte gjort klart/i);
  });

  it('uses Journey communication gate with handoff reminder intent', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/child-handoff-reminder-scheduler.js'),
      'utf8'
    );
    assert.match(src, /evaluateCommunicationGate/);
    assert.match(src, /legacy_child_handoff_reminder/);
  });
});

describe('child handoff reminder candidates (DB)', () => {
  it('selects family with schema saved 2–48h ago and no child access', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, { suffix: `ok-${Date.now()}` });
      const result = await fetchHandoffReminderCandidates(db);
      const ids = result.rows.map((r) => r.family_id);
      assert.ok(ids.includes(familyId), 'eligible family should be a candidate');
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families without schema_saved_at', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('No schema', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      await db.query(
        `INSERT INTO parent (family_id, email, password_hash, name, verified, family_role)
         VALUES ($1, $2, 'hash', 'P', true, 'förälder')`,
        [familyId, `no-schema-${Date.now()}@example.com`]
      );
      await db.query(
        `INSERT INTO family_activation_state (family_id, signup_at)
         VALUES ($1, NOW())`,
        [familyId]
      );

      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families with child_access_completed_at', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `access-${Date.now()}`,
        childAccessCompletedAt: new Date(),
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families with first_completion_at', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `completion-${Date.now()}`,
        firstCompletionAt: new Date(),
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families with p0_activated_at', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `p0-${Date.now()}`,
        p0ActivatedAt: new Date(),
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families with reminder already sent', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `sent-${Date.now()}`,
        reminderSentAt: new Date(),
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes schema younger than 2 hours', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `young-${Date.now()}`,
        schemaSavedHoursAgo: 1,
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes schema older than 48 hours', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `old-${Date.now()}`,
        schemaSavedHoursAgo: 50,
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes parents with email_enabled = false', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchHandoffReminderCandidates } = require('../src/lib/child-handoff-reminder-scheduler');

    try {
      const { familyId } = await seedCandidateFamily(db, {
        suffix: `email-off-${Date.now()}`,
        emailEnabled: false,
      });
      const result = await fetchHandoffReminderCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });
});

test('runChildHandoffReminderJob sends once and claims sent_at', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { runChildHandoffReminderJob } = require('../src/lib/child-handoff-reminder-scheduler');

  try {
    await enableHandoffFlag(db);
    const { familyId } = await seedCandidateFamily(db, { suffix: `job-${Date.now()}` });

    await runChildHandoffReminderJob();
    const afterFirst = await db.query(
      `SELECT child_handoff_reminder_sent_at FROM family_activation_state WHERE family_id = $1`,
      [familyId]
    );
    assert.ok(afterFirst.rows[0].child_handoff_reminder_sent_at, 'first run should claim sent_at');

    await runChildHandoffReminderJob();
    const candidates = await db.query(
      `SELECT family_id FROM family_activation_state
       WHERE family_id = $1 AND child_handoff_reminder_sent_at IS NULL`,
      [familyId]
    );
    assert.equal(candidates.rows.length, 0, 'second run must not re-select family');
  } finally {
    await db.cleanup();
  }
});
