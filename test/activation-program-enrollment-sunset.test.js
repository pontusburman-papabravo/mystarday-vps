'use strict';

/**
 * R1 — activation_program_new_enrollments OFF: no new rows; existing programs unchanged.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');
const parentActivationProgram = require('../db/parent-activation-program');
const emailInviteDb = require('../db/activation-program-email-invite');

const NEW_ENROLL_KEY = FLAG_KEYS.activationNewEnrollments;

describe('activation program enrollment sunset', () => {
  let db;
  let http;
  const envBackup = {};

  before(async () => {
    db = await setupTestDb();
    if (db.skip) return;

    envBackup.ACTIVATION_PROGRAM_ENABLED = process.env.ACTIVATION_PROGRAM_ENABLED;
    envBackup.ACTIVATION_PROGRAM_LAUNCH_AT = process.env.ACTIVATION_PROGRAM_LAUNCH_AT;
    envBackup.REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION;
    envBackup.RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED;

    process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
    process.env.ACTIVATION_PROGRAM_LAUNCH_AT = '2020-01-01T00:00:00.000Z';
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    process.env.RATE_LIMIT_ENABLED = 'false';

    await db.query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, false, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = false`,
      [NEW_ENROLL_KEY]
    );

    delete require.cache[require.resolve(path.join(__dirname, '../app.js'))];
    const { createApp } = require('../app.js');
    http = await listenApp(createApp);
  });

  after(async () => {
    if (http) await http.close();
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
    if (db && !db.skip && db.cleanup) await db.cleanup();
  });

  async function programCount() {
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM parent_activation_program');
    return rows[0].n;
  }

  async function createParentSession() {
    const session = await registerAndLogin(http.baseUrl);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const me = await meRes.json();
    return {
      session,
      familyId: me.familyId || me.family_id,
      parentId: me.id,
    };
  }

  it('enroll-choice POST does not create a row when flag is off', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const before = await programCount();
    const { session } = await createParentSession();

    const res = await fetch(`${http.baseUrl}/api/me/activation-program/enroll-choice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        choice: 'guided',
        enroll_source: 'onboarding_complete',
      }),
    });

    assert.equal(res.status, 410);
    const after = await programCount();
    assert.equal(after, before);
  });

  it('enroll-choice GET does not offer enrollment when flag is off', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const { session } = await createParentSession();
    const res = await fetch(
      `${http.baseUrl}/api/me/activation-program/enroll-choice?enroll_source=onboarding_complete`,
      { headers: { Cookie: cookieHeader(session.cookies) } }
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.show, false);
    assert.equal(body.sunset, true);
  });

  it('public invite redirects home without creating a program row', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const before = await programCount();
    const { familyId, parentId } = await createParentSession();
    const invite = await emailInviteDb.createInvite(parentId, familyId);
    await emailInviteDb.markSent(invite.id);

    const res = await fetch(
      `${http.baseUrl}/api/public/activation-program/invite/${invite.token}`,
      { redirect: 'manual' }
    );
    assert.equal(res.status, 302);
    const location = res.headers.get('location') || '';
    assert.ok(!location.includes('activation-enroll.html'), 'must not open enroll UI');
    assert.ok(location.endsWith('/') || location.endsWith(http.baseUrl) || /\/$/.test(location));

    const refreshed = await emailInviteDb.getByToken(invite.token);
    assert.equal(refreshed.clicked_at, null);

    const after = await programCount();
    assert.equal(after, before);
  });

  it('existing enrollment remains readable when new enrollments are off', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const { session, familyId, parentId } = await createParentSession();
    const program = await parentActivationProgram.create({
      familyId,
      parentId,
      cohortArm: 'treatment',
      programType: 'onboarding_7d',
      enrollSource: 'onboarding_complete',
    });

    const res = await fetch(`${http.baseUrl}/api/me/activation-program`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.active, true);
    assert.equal(body.cohort_arm, 'treatment');

    const row = await parentActivationProgram.getActiveByFamily(familyId);
    assert.equal(row.id, program.id);
    assert.equal(row.status, 'active');
  });
});
