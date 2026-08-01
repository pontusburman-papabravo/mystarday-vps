'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const {
  registerAndLogin,
  onboardingChildRaw,
  onboardingScheduleRaw,
  childLoginRaw,
  getDailyLog,
  seedSchoolWeekdaySchedules,
  familyIdByEmail,
  activationRow,
} = require('./helpers/golden-path-fas6.js');

function cookiesAfter(prev, res) {
  let jar = { ...prev };
  for (const header of getSetCookieHeaders(res)) {
    jar = mergeCookies(jar, [header]);
  }
  return jar;
}

test('Fas6 E — parent login → child login → child_access → parent restore via handoff', async (t) => {
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

    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'ChainBarn', emoji: '🌟' });
    assert.equal(child.status, 201);
    const { username, pin, id: childId } = child.body;

    await onboardingScheduleRaw(http.baseUrl, session, { child_id: childId, template_group: 'helg' });

    const beforeLogin = await activationRow(db, familyId);
    assert.equal(beforeLogin.child_access_completed_at, null);

    const cl = await childLoginRaw(http.baseUrl, { username, pin }, {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    });
    assert.equal(cl.status, 200, cl.text);
    assert.equal(cl.body.user?.type, 'child');
    assert.equal(cl.body.user?.id, childId);
    assert.equal(cl.body.user?.name, 'ChainBarn');

    const afterLogin = await activationRow(db, familyId);
    assert.ok(afterLogin.child_access_completed_at);
    assert.ok(cl.body.meta_milestones?.child_access_completed === true);

    const setPinRes = await fetch(`${http.baseUrl}/api/family/set-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ pin: '5678', confirmPin: '5678' }),
    });
    assert.equal(setPinRes.status, 200, await setPinRes.text());

    let childCookies = cookiesAfter(session.cookies, cl.res);
    const handoffVal = childCookies.stjarndag_parent_session;
    assert.ok(handoffVal);

    const logoutRes = await fetch(`${http.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': cl.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    assert.equal(logoutRes.status, 200);

    const pickerCookies = { stjarndag_parent_session: handoffVal };
    const pinRes = await fetch(`${http.baseUrl}/api/family/verify-pin-picker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(pickerCookies),
      },
      body: JSON.stringify({ pin: '5678' }),
    });
    const pinText = await pinRes.text();
    assert.equal(pinRes.status, 200, pinText);
    const pinBody = JSON.parse(pinText);
    assert.equal(pinBody.ok, true);
    assert.equal(pinBody.parent.type, 'parent');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 E — wrong PIN rejected; child_access unchanged', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'PinFail', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });

    const bad = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: '0000' });
    assert.notEqual(bad.status, 200);
    const act = await activationRow(db, familyId);
    assert.equal(act.child_access_completed_at, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 E — child in other family cannot login with our username', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedSchoolWeekdaySchedules(db);
    const sessionA = await registerAndLogin(http.baseUrl);
    const childA = await onboardingChildRaw(http.baseUrl, sessionA, { name: 'FamA', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, sessionA, { child_id: childA.body.id, template_group: 'helg' });

    const sessionB = await registerAndLogin(http.baseUrl);
    const otherChild = await onboardingChildRaw(http.baseUrl, sessionB, { name: 'FamB', emoji: '🌙' });
    const pinHash = await hashPassword('2222');
    await db.query('UPDATE child SET pin = $1 WHERE id = $2', [pinHash, otherChild.body.id]);

    const cross = await childLoginRaw(http.baseUrl, {
      username: childA.body.username,
      pin: '2222',
    });
    assert.notEqual(cross.status, 200);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
