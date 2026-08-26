'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');

const ROOT = path.join(__dirname, '..');

async function enableNudgeFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled)
     VALUES ('activation_nudge_v1', true)
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
}

async function seedNudgeCandidateFamily(db, {
  suffix = Date.now(),
  signupHoursAgo = 30,
  schemaSavedAt = null,
  childAccessCompletedAt = null,
  handoffReminderSentAt = null,
  nudgeSentAt = null,
  p0ActivatedAt = null,
  emailEnabled = true,
} = {}) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ($1, 'Europe/Stockholm') RETURNING id`,
    [`Nudge Candidate ${suffix}`]
  );
  const familyId = fam.rows[0].id;
  const email = `nudge-candidate-${suffix}@example.com`;

  const parent = await db.query(
    `INSERT INTO parent (family_id, email, password_hash, name, verified, family_role, newsletter_subscribed)
     VALUES ($1, $2, 'hash', 'Nudge Parent', true, 'förälder', true)
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

  const signupAt = new Date(Date.now() - signupHoursAgo * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO family_activation_state (
       family_id, signup_at, schema_saved_at,
       child_access_completed_at, p0_activated_at,
       child_handoff_reminder_sent_at, activation_nudge_sent_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      familyId,
      signupAt,
      schemaSavedAt,
      childAccessCompletedAt,
      p0ActivatedAt,
      handoffReminderSentAt,
      nudgeSentAt,
    ]
  );

  return { familyId, parentId, email, signupAt };
}

describe('activation nudge scheduler (PR 5)', () => {
  it('uses notification_preference email_enabled', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/activation-nudge-scheduler.js'),
      'utf8'
    );
    assert.match(src, /notification_preference/);
    assert.match(src, /email_enabled/);
    assert.doesNotMatch(src, /newsletter_subscribed/);
  });

  it('excludes handoff segment (schema without child access) from nudge SQL', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/activation-nudge-scheduler.js'),
      'utf8'
    );
    assert.match(src, /schema_saved_at IS NULL OR s\.child_access_completed_at IS NOT NULL/);
    assert.doesNotMatch(src, /child_handoff_reminder_sent_at IS NULL/);
  });

  it('CTA points to onboarding without schema, Hem with schema', () => {
    const { resolveNudgeCtaUrl } = require('../src/lib/activation-nudge-scheduler');
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'https://example.test';
    try {
      assert.equal(resolveNudgeCtaUrl(null), 'https://example.test/onboarding');
      assert.equal(resolveNudgeCtaUrl(new Date()), 'https://example.test/dashboard');
    } finally {
      if (prev === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prev;
    }
  });

  it('nudge email uses separate copy for no_schema vs with_schema', () => {
    const email = fs.readFileSync(path.join(ROOT, 'src/lib/email.js'), 'utf8');
    assert.match(email, /activationNudgeCopyKeys/);
    assert.match(email, /resolveActivationNudgeVariant/);
    const sv = fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8');
    assert.match(sv, /"noSchema"/);
    assert.match(sv, /"withSchema"/);
    assert.match(sv, /Ni har redan ett schema/);
    assert.match(sv, /sätta upp ert schema/);
  });

  it('enable migration turns activation_nudge_v1 ON', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1809320000000_enable_activation_nudge_v1.js'),
      'utf8'
    );
    assert.match(mig, /activation_nudge_v1/);
    assert.match(mig, /enabled = EXCLUDED.enabled|enabled = true/);
  });
});

describe('activation nudge candidates (DB)', () => {
  it('selects family 24–48h after signup without P0', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchNudgeCandidates } = require('../src/lib/activation-nudge-scheduler');

    try {
      const { familyId } = await seedNudgeCandidateFamily(db, { suffix: `ok-${Date.now()}` });
      const result = await fetchNudgeCandidates(db);
      assert.ok(result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families with schema saved but no child access (handoff segment)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchNudgeCandidates } = require('../src/lib/activation-nudge-scheduler');

    try {
      const { familyId } = await seedNudgeCandidateFamily(db, {
        suffix: `handoff-segment-${Date.now()}`,
        schemaSavedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        childAccessCompletedAt: null,
      });
      const result = await fetchNudgeCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('includes families that received handoff reminder after child access completed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchNudgeCandidates } = require('../src/lib/activation-nudge-scheduler');

    try {
      const { familyId } = await seedNudgeCandidateFamily(db, {
        suffix: `handoff-then-access-${Date.now()}`,
        schemaSavedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        childAccessCompletedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        handoffReminderSentAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      });
      const result = await fetchNudgeCandidates(db);
      assert.ok(result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('includes families with schema and child access but no P0', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchNudgeCandidates } = require('../src/lib/activation-nudge-scheduler');

    try {
      const { familyId } = await seedNudgeCandidateFamily(db, {
        suffix: `access-done-${Date.now()}`,
        schemaSavedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        childAccessCompletedAt: new Date(),
      });
      const result = await fetchNudgeCandidates(db);
      assert.ok(result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });

  it('excludes families outside 24–48h signup window', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { fetchNudgeCandidates } = require('../src/lib/activation-nudge-scheduler');

    try {
      const { familyId } = await seedNudgeCandidateFamily(db, {
        suffix: `too-fresh-${Date.now()}`,
        signupHoursAgo: 12,
      });
      const result = await fetchNudgeCandidates(db);
      assert.ok(!result.rows.some((r) => r.family_id === familyId));
    } finally {
      await db.cleanup();
    }
  });
});

test('runActivationNudgeJob does not nudge handoff-segment family', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { runActivationNudgeJob } = require('../src/lib/activation-nudge-scheduler');

  try {
    await enableNudgeFlag(db);
    const { familyId } = await seedNudgeCandidateFamily(db, {
      suffix: `job-handoff-${Date.now()}`,
      schemaSavedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      childAccessCompletedAt: null,
    });

    await runActivationNudgeJob();
    const row = await db.query(
      `SELECT activation_nudge_sent_at FROM family_activation_state WHERE family_id = $1`,
      [familyId]
    );
    assert.equal(row.rows[0].activation_nudge_sent_at, null);
  } finally {
    await db.cleanup();
  }
});
