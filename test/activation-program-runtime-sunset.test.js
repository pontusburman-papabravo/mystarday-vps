'use strict';

/**
 * R1 — legacy Activation Program runtime sunset (participant-aware).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');
const parentActivationProgram = require('../db/parent-activation-program');

const NEW_ENROLL = FLAG_KEYS.activationNewEnrollments;
const API_DEPRECATED = FLAG_KEYS.activationApiDeprecated;

describe('activation program runtime sunset', () => {
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
       ON CONFLICT (key) DO UPDATE SET enabled = excluded.enabled`,
      [NEW_ENROLL]
    );
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = excluded.enabled`,
      [API_DEPRECATED]
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

  async function sessionWithIds() {
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

  it('family without program gets 410 on GET program when sunset flags are on', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const { session } = await sessionWithIds();
    const res = await fetch(`${http.baseUrl}/api/me/activation-program`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(res.status, 410);
    const body = await res.json();
    assert.ok(body.migration);
  });

  it('active participant keeps GET program when sunset flags are on', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const { session, familyId, parentId } = await sessionWithIds();
    await parentActivationProgram.create({
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
  });

  it('active participant can use progression route; family without program cannot', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const participant = await sessionWithIds();
    await parentActivationProgram.create({
      familyId: participant.familyId,
      parentId: participant.parentId,
      cohortArm: 'treatment',
      programType: 'onboarding_7d',
    });

    const okRes = await fetch(`${http.baseUrl}/api/me/activation-program/skip-day`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(participant.session.cookies),
        'X-CSRF-Token': participant.session.csrfToken,
      },
    });
    assert.equal(okRes.status, 200);

    const outsider = await sessionWithIds();
    const blocked = await fetch(`${http.baseUrl}/api/me/activation-program/skip-day`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(outsider.session.cookies),
        'X-CSRF-Token': outsider.session.csrfToken,
      },
    });
    assert.equal(blocked.status, 410);
  });

  it('completed program does not bypass sunset', async (t) => {
    if (db.skip) {
      t.skip('No DATABASE_URL');
      return;
    }
    const { session, familyId, parentId } = await sessionWithIds();
    const program = await parentActivationProgram.create({
      familyId,
      parentId,
      cohortArm: 'treatment',
      programType: 'onboarding_7d',
    });
    await parentActivationProgram.updateStatus(program.id, 'completed');

    const res = await fetch(`${http.baseUrl}/api/me/activation-program`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(res.status, 410);
  });
});
