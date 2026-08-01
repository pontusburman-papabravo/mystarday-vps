'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  registerAndLogin,
  onboardingChildRaw,
  onboardingScheduleRaw,
  childLoginRaw,
  getDailyLog,
  completeItemRaw,
  seedSchoolWeekdaySchedules,
  familyIdByEmail,
  activationRow,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 Steg3 — invalid schedule template: 400, no schema_saved', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdByEmail(db, session.email);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'BadTpl', emoji: '⭐' });

    const res = await fetch(`${http.baseUrl}/api/onboarding/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: require('./helpers/http.js').cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ child_id: child.body.id, template_group: 'not-a-template' }),
    });
    assert.equal(res.status, 400);
    const act = await activationRow(db, familyId);
    assert.equal(act?.schema_saved_at, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 Steg3 — child login fail then succeed: child_access only after good PIN', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'RetryPin', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });

    const bad = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: '9999' });
    assert.notEqual(bad.status, 200);
    let act = await activationRow(db, familyId);
    assert.equal(act.child_access_completed_at, null);

    const good = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    assert.equal(good.status, 200);
    act = await activationRow(db, familyId);
    assert.ok(act.child_access_completed_at);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 Steg3 — complete unknown item: 404, no first_completion', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'BadComplete', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });

    const fakeId = '00000000-0000-4000-8000-000000000099';
    const res = await completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, fakeId);
    assert.equal(res.status, 404);
    const act = await activationRow(db, familyId);
    assert.equal(act.first_completion_at, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 Steg3 — daily-log load after child create without schema: 200 empty, retry path open', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'LogRetry', emoji: '⭐' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    assert.equal(log.status, 200);
    assert.equal((log.body.items || []).length, 0);

    await seedSchoolWeekdaySchedules(db);
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });
    const log2 = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    assert.equal(log2.status, 200);
    assert.ok((log2.body.items || []).length >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
