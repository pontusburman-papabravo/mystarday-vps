'use strict';

/**
 * Activation first-success defer — server-side durable state (#1023 PR A).
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { buildCanonicalNextAction } = require('../src/lib/activation/canonical-next-action');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { DEFER_DURATION_MS } = require('../src/lib/activation/defer-constants');
const { patchState } = require('../db/family-activation-state');
const familyMilestones = require('../db/family-milestones');
const { applyDeferralOverlay } = require('../src/lib/activation/step-deferrals');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function loadCreateApp() {
  delete require.cache[require.resolve('../app')];
  return require('../app').createApp;
}

const FLAG_KEY = FLAG_KEYS.firstSuccessV1;

async function enableFirstSuccessFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY]
  );
}

async function disableFirstSuccessFlag(db) {
  await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FLAG_KEY]);
}

async function enableRetentionHomeFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    ['journey_retention_home_v1']
  );
}

async function disableRetentionHomeFlag(db) {
  await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [
    'journey_retention_home_v1',
  ]);
}

async function setupPostFirstSuccessRetentionChildAccess(db, baseUrl, session) {
  const familyId = await familyIdForSession(db, session);
  await createChild(baseUrl, session, { name: 'Retention Kid' });
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
  return familyId;
}

async function insertFamily(db) {
  const { rows } = await db.query(`INSERT INTO family (name) VALUES ('Defer Test') RETURNING id`);
  return rows[0].id;
}

async function insertActivationAtSaveSchedule(db, familyId, extra = {}) {
  const now = extra.now || new Date();
  const stepDeferrals = extra.step_deferrals
    ? JSON.stringify(extra.step_deferrals)
    : '{}';
  await db.query(
    `INSERT INTO family_activation_state (family_id, signup_at, child_created_at, step_deferrals)
     VALUES ($1, $2, $2, $3::jsonb)`,
    [familyId, now, stepDeferrals]
  );
}

async function setupHttpAtSaveSchedule(db, baseUrl, session) {
  await createChild(baseUrl, session);
  const familyId = await familyIdForSession(db, session);
  await patchState(familyId, { child_created_at: new Date() });
  return familyId;
}

async function familyIdForSession(db, session) {
  const { rows } = await db.query('SELECT family_id FROM parent WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  return rows[0].family_id;
}

async function deferViaApi(baseUrl, session, nextAction) {
  const res = await fetch(`${baseUrl}/api/family/activation/defer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ next_action: nextAction }),
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function loginByEmail(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  const loginBody = JSON.parse(loginText);
  const { getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { email, cookies, csrfToken: loginBody.csrfToken };
}

describe('activation step defer (#1023 PR A)', () => {
  test('A1: no defer — canonical next action unchanged', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      const familyId = await insertFamily(db);
      await insertActivationAtSaveSchedule(db, familyId);

      const canonical = await buildCanonicalNextAction(familyId);
      assert.equal(canonical.enabled, true);
      assert.equal(canonical.next_action, 'save_schedule');
      assert.equal(canonical.show_primary_coach, true);
      assert.equal(canonical.deferred, false);
      assert.equal(canonical.deferred_until, undefined);
    } finally {
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A2: defer current action writes server timestamps to step_deferrals', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await setupHttpAtSaveSchedule(db, http.baseUrl, session);

      const before = Date.now();
      const res = await deferViaApi(http.baseUrl, session, 'save_schedule');
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.ok, true);
      assert.equal(res.body.next_action, 'save_schedule');
      assert.ok(res.body.deferred_until);

      const { rows } = await db.query(
        'SELECT step_deferrals, schema_saved_at FROM family_activation_state WHERE family_id = $1',
        [familyId]
      );
      const deferrals = rows[0].step_deferrals;
      assert.ok(deferrals.save_schedule);
      assert.ok(deferrals.save_schedule.deferred_at);
      assert.ok(deferrals.save_schedule.until);
      assert.equal(rows[0].schema_saved_at, null);

      const untilMs = new Date(deferrals.save_schedule.until).getTime();
      assert.ok(untilMs >= before + DEFER_DURATION_MS - 5000);
      assert.ok(untilMs <= Date.now() + DEFER_DURATION_MS + 5000);
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A3: milestone completion timestamp remains NULL after defer', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await setupHttpAtSaveSchedule(db, http.baseUrl, session);
      await deferViaApi(http.baseUrl, session, 'save_schedule');

      const { rows } = await db.query(
        `SELECT schema_saved_at, child_access_completed_at, first_completion_at
         FROM family_activation_state WHERE family_id = $1`,
        [familyId]
      );
      const s = rows[0];
      assert.equal(s.schema_saved_at, null);
      assert.equal(s.child_access_completed_at, null);
      assert.equal(s.first_completion_at, null);
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A4: active defer suppresses primary coach but keeps real next_action', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      const familyId = await insertFamily(db);
      const now = new Date('2026-08-18T10:00:00.000Z');
      await insertActivationAtSaveSchedule(db, familyId, {
        now,
        step_deferrals: {
          save_schedule: {
            deferred_at: now.toISOString(),
            until: new Date(now.getTime() + DEFER_DURATION_MS).toISOString(),
          },
        },
      });

      const canonical = await buildCanonicalNextAction(familyId, { now });
      assert.equal(canonical.next_action, 'save_schedule');
      assert.equal(canonical.show_primary_coach, false);
      assert.equal(canonical.deferred, true);
      assert.ok(canonical.deferred_until);
    } finally {
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A5: expired defer shows primary coach again', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      const familyId = await insertFamily(db);
      const now = new Date('2026-08-18T12:00:00.000Z');
      const pastUntil = new Date('2026-08-18T08:00:00.000Z');
      const childCreated = new Date('2026-08-18T06:00:00.000Z');
      await insertActivationAtSaveSchedule(db, familyId, {
        now: childCreated,
        step_deferrals: {
          save_schedule: {
            deferred_at: new Date('2026-08-17T20:00:00.000Z').toISOString(),
            until: pastUntil.toISOString(),
          },
        },
      });

      const canonical = await buildCanonicalNextAction(familyId, { now });
      assert.equal(canonical.next_action, 'save_schedule');
      assert.equal(canonical.show_primary_coach, true);
      assert.equal(canonical.deferred, false);
      assert.equal(canonical.deferred_until, undefined);
    } finally {
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A6: milestone completion during active defer advances ladder', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      const familyId = await insertFamily(db);
      const now = new Date('2026-08-18T10:00:00.000Z');
      await insertActivationAtSaveSchedule(db, familyId, {
        now,
        step_deferrals: {
          save_schedule: {
            deferred_at: now.toISOString(),
            until: new Date(now.getTime() + DEFER_DURATION_MS).toISOString(),
          },
        },
      });

      await patchState(familyId, { schema_saved_at: now });

      const canonical = await buildCanonicalNextAction(familyId, { now });
      assert.equal(canonical.next_action, 'child_access');
      assert.equal(canonical.show_primary_coach, true);
      assert.equal(canonical.deferred, false);
    } finally {
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A7: unknown next_action returns 400', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      await setupHttpAtSaveSchedule(db, http.baseUrl, session);

      const res = await deferViaApi(http.baseUrl, session, 'invite_adult');
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_ACTIVATION_ACTION');
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A8: defer non-current future step returns 409', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      await setupHttpAtSaveSchedule(db, http.baseUrl, session);

      const res = await deferViaApi(http.baseUrl, session, 'child_access');
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'ACTIVATION_STEP_CHANGED');
      assert.equal(res.body.current_next_action, 'save_schedule');
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A9: stale client defer after state advanced is rejected', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await setupHttpAtSaveSchedule(db, http.baseUrl, session);
      await patchState(familyId, { schema_saved_at: new Date() });

      const res = await deferViaApi(http.baseUrl, session, 'save_schedule');
      assert.equal(res.status, 409);
      assert.equal(res.body.current_next_action, 'child_access');
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A10: unauthenticated defer returns 401', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const res = await fetch(`${http.baseUrl}/api/family/activation/defer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_action: 'save_schedule' }),
      });
      assert.ok([401, 403].includes(res.status), `expected 401 or 403, got ${res.status}`);
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A11: pedagog-only parent cannot defer', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const tag = `a11-${Date.now()}`;
      const password = `pw-${tag}`;
      const passwordHash = await hashPassword(password);
      const familyId = (
        await db.query(`INSERT INTO family (name) VALUES ('Ped Defer') RETURNING id`)
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, account_type)
         VALUES ($1, $2, $3, 'Pedagog', true, true, 'educator')`,
        [`pedagog-${tag}@example.com`, passwordHash, familyId]
      );
      const childId = (
        await db.query(
          `INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Kid', '⭐') RETURNING id`,
          [familyId]
        )
      ).rows[0].id;
      const pedagogId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [`pedagog-${tag}@example.com`])
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'pedagog')`,
        [pedagogId, childId]
      );
      await insertActivationAtSaveSchedule(db, familyId);

      const session = await loginByEmail(http.baseUrl, `pedagog-${tag}@example.com`, password);
      const res = await deferViaApi(http.baseUrl, session, 'save_schedule');
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'PEDAGOG_ONLY');
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A12: cross-family isolation — defer only affects own family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const sessionA = await registerAndLogin(http.baseUrl);
      const familyA = await setupHttpAtSaveSchedule(db, http.baseUrl, sessionA);
      const sessionB = await registerAndLogin(http.baseUrl);
      const familyB = await familyIdForSession(db, sessionB);
      await deferViaApi(http.baseUrl, sessionA, 'save_schedule');

      const { rows: rowsB } = await db.query(
        'SELECT step_deferrals FROM family_activation_state WHERE family_id = $1',
        [familyB]
      );
      const deferralsB = rowsB[0]?.step_deferrals || {};
      assert.equal(deferralsB.save_schedule, undefined);

      const { rows: rowsA } = await db.query(
        'SELECT step_deferrals FROM family_activation_state WHERE family_id = $1',
        [familyA]
      );
      assert.ok(rowsA[0].step_deferrals.save_schedule);
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A13: repeated valid defer resets cooldown', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await setupHttpAtSaveSchedule(db, http.baseUrl, session);

      const first = await deferViaApi(http.baseUrl, session, 'save_schedule');
      const firstUntil = first.body.deferred_until;

      await new Promise((r) => setTimeout(r, 50));

      const second = await deferViaApi(http.baseUrl, session, 'save_schedule');
      assert.equal(second.status, 200);
      assert.ok(new Date(second.body.deferred_until).getTime() >= new Date(firstUntil).getTime());

      const { rows } = await db.query(
        'SELECT step_deferrals FROM family_activation_state WHERE family_id = $1',
        [familyId]
      );
      assert.ok(rows[0].step_deferrals.save_schedule);
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A14: flag off — defer endpoint returns 404', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await disableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const res = await deferViaApi(http.baseUrl, session, 'save_schedule');
      assert.equal(res.status, 404);
    } finally {
      await http.close();
      await enableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A15: GET next-action reflects defer overlay via HTTP', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    await enableFirstSuccessFlag(db);
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      await setupHttpAtSaveSchedule(db, http.baseUrl, session);
      await deferViaApi(http.baseUrl, session, 'save_schedule');

      const res = await fetch(`${http.baseUrl}/api/family/next-action`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.next_action, 'save_schedule');
      assert.equal(body.show_primary_coach, false);
      assert.equal(body.deferred, true);
      assert.ok(body.deferred_until);
    } finally {
      await http.close();
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A16: stale Activation child_access defer does not suppress retention coach', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      await enableRetentionHomeFlag(db);
      const http = await listenApp(loadCreateApp());
      try {
        const session = await registerAndLogin(http.baseUrl);
        const familyId = await setupPostFirstSuccessRetentionChildAccess(
          db,
          http.baseUrl,
          session
        );
        const parentId = (
          await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
            session.email.toLowerCase(),
          ])
        ).rows[0].id;
        const now = new Date('2026-08-18T10:00:00.000Z');
        await db.query(
          `UPDATE family_activation_state
           SET step_deferrals = $2::jsonb
           WHERE family_id = $1`,
          [
            familyId,
            JSON.stringify({
              child_access: {
                deferred_at: now.toISOString(),
                until: new Date(now.getTime() + DEFER_DURATION_MS).toISOString(),
              },
            }),
          ]
        );

        const canonical = await buildCanonicalNextAction(familyId, { parentId, now });
        assert.equal(canonical.authority, 'journey_retention');
        assert.equal(canonical.next_action, 'child_access');
        assert.equal(canonical.show_primary_coach, true);
        assert.equal(canonical.deferred, false);
        assert.equal(canonical.deferred_until, undefined);

        const overlayOnly = applyDeferralOverlay(
          {
            enabled: true,
            authority: 'journey_retention',
            next_action: 'child_access',
            show_primary_coach: true,
            reason: ['ROUTINE_READY_NO_CHILD_ACCESS'],
          },
          {
            child_access: {
              deferred_at: now.toISOString(),
              until: new Date(now.getTime() + DEFER_DURATION_MS).toISOString(),
            },
          },
          { now }
        );
        assert.equal(overlayOnly.show_primary_coach, true);
        assert.equal(overlayOnly.deferred, false);
        assert.equal(overlayOnly.deferred_until, undefined);
      } finally {
        await http.close();
      }
    } finally {
      await disableRetentionHomeFlag(db);
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });

  test('A17: POST defer rejected after first_success retention (step_deferrals unchanged)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      await enableRetentionHomeFlag(db);
      const http = await listenApp(loadCreateApp());
      try {
        const session = await registerAndLogin(http.baseUrl);
        const familyId = await setupPostFirstSuccessRetentionChildAccess(
          db,
          http.baseUrl,
          session
        );
        const parentId = (
          await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
            session.email.toLowerCase(),
          ])
        ).rows[0].id;

        const retention = await buildCanonicalNextAction(familyId, { parentId });
        assert.equal(retention.authority, 'journey_retention');
        assert.ok(['child_access', 'await_first_completion'].includes(retention.next_action));

        const before = await db.query(
          'SELECT step_deferrals FROM family_activation_state WHERE family_id = $1',
          [familyId]
        );
        const beforeDeferrals = before.rows[0]?.step_deferrals || {};

        const res = await deferViaApi(http.baseUrl, session, retention.next_action);
        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACTIVATION_NO_STEP');

        const after = await db.query(
          'SELECT step_deferrals FROM family_activation_state WHERE family_id = $1',
          [familyId]
        );
        assert.deepEqual(after.rows[0]?.step_deferrals || {}, beforeDeferrals);
      } finally {
        await http.close();
      }
    } finally {
      await disableRetentionHomeFlag(db);
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });
});
