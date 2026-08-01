'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const {
  registerRaw,
  loginRaw,
  registerAndLogin,
  onboardingChildRaw,
  onboardingScheduleRaw,
  seedSchoolWeekdaySchedules,
  familyIdByEmail,
  activationRow,
  DEFAULT_PASSWORD,
  uniqueEmail,
} = require('./helpers/golden-path-fas6.js');

async function handoffContext(baseUrl, session) {
  const res = await fetch(`${baseUrl}/api/onboarding/handoff-context`, {
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
  return { status: res.status, body: await res.json() };
}

test('Fas6 B — resume after register only: login continues onboarding', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const email = uniqueEmail('resume-reg');

  try {
    const reg = await registerRaw(http.baseUrl, { email });
    assert.equal(reg.status, 201);

    const session2 = await loginRaw(http.baseUrl, { email });
    assert.equal(session2.status, 200);

    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session2.cookies) },
    });
    const me = await meRes.json();
    assert.equal(meRes.status, 200);
    assert.equal(me.onboarding_completed, false);

    const child = await onboardingChildRaw(http.baseUrl, session2, { name: 'ResumeKid', emoji: '🌟' });
    assert.equal(child.status, 201);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 B — resume after child without schema: 200 resume not forced duplicate', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const first = await onboardingChildRaw(http.baseUrl, session, { name: 'StuckBarn', emoji: '🌟' });
    assert.equal(first.status, 201);
    const childId = first.body.id;

    const session2 = await loginRaw(http.baseUrl, { email: session.email, password: session.password || DEFAULT_PASSWORD });
    const resume = await onboardingChildRaw(http.baseUrl, session2, { name: 'StuckBarn', emoji: '🌟' });
    assert.equal(resume.status, 200);
    assert.equal(resume.body.resumed, true);
    assert.equal(resume.body.id, childId);
    assert.ok(resume.body.pin);

    const ctx = await handoffContext(http.baseUrl, session2);
    assert.equal(ctx.body.can_resume_handoff, false);
    assert.equal(ctx.body.reason, 'no_schema');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 B — resume after schedule: onboarding complete, no child_access before login', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdByEmail(db, session.email);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'HandoffBarn', emoji: '⭐' });
    assert.equal(child.status, 201);
    const sched = await onboardingScheduleRaw(http.baseUrl, session, {
      child_id: child.body.id,
      template_group: 'helg',
    });
    assert.equal(sched.status, 200);

    const parentRow = await db.query('SELECT onboarding_completed FROM parent WHERE family_id = $1', [familyId]);
    assert.equal(parentRow.rows[0].onboarding_completed, true);

    const act = await activationRow(db, familyId);
    assert.ok(act.schema_saved_at);
    assert.equal(act.child_access_completed_at, null);

    const session2 = await loginRaw(http.baseUrl, { email: session.email, password: DEFAULT_PASSWORD });
    const ctx = await handoffContext(http.baseUrl, session2);
    assert.equal(ctx.body.can_resume_handoff, true);
    assert.equal(ctx.body.reason, 'schema_saved_no_child_access');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 B — duplicate child name after schema yields 409 with path forward via handoff', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'DupAfterSchema', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });

    const dup = await onboardingChildRaw(http.baseUrl, session, { name: 'DupAfterSchema', emoji: '⭐' });
    assert.equal(dup.status, 409);
    assert.ok(dup.body.code || dup.body.error);

    const ctx = await handoffContext(http.baseUrl, session);
    assert.equal(ctx.body.can_resume_handoff, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
