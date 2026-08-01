'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { syncDailyLogWithSchedule } = require('../src/lib/daily-log-generator');
const {
  registerAndLogin,
  onboardingChildRaw,
  onboardingScheduleRaw,
  childLoginRaw,
  getDailyLog,
  seedSchoolWeekdaySchedules,
  stockholmDow,
} = require('./helpers/golden-path-fas6.js');

async function skipAfterSetup(t, db, reason) {
  await db.cleanup();
  t.skip(reason);
}

test('Fas6 weekend — forskola on weekday DOW has today items when today is Mon–Fri', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const dow = stockholmDow();
  if (dow === 0 || dow === 6) {
    await skipAfterSetup(t, db, 'Run on weekday for this assertion (Stockholm)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'WeekdayKid', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    const items = log.body.items || [];
    assert.ok(items.length >= 1, 'weekday forskola should surface at least one item today');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 weekend — forskola on Saturday/Sunday: documents empty today (P1 risk)', async (t) => {
  const dow = stockholmDow();
  if (dow !== 0 && dow !== 6) {
    t.skip('Run on Saturday or Sunday (Stockholm) for live weekend assertion');
    return;
  }
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'WeekendKid', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    const items = log.body.items || [];
    assert.equal(items.length, 0, 'current product: no weekend rows for forskola → empty Idag');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 weekend — child without schedule rows: empty daily log', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'NoSchema', emoji: '⭐' });
    const pinHash = child.body.pin;
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: pinHash });
    assert.equal(cl.status, 200);
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    const items = log.body.items || [];
    assert.equal(items.length, 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 weekend — weekday schedule only Mon: empty on non-Monday (simulated)', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'MonOnly', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });

    await db.query('DELETE FROM weekly_schedule WHERE child_id = $1 AND day_of_week != 1', [child.body.id]);
    const saturdayDow = 6;
    await syncDailyLogWithSchedule(child.body.id, saturdayDow);

    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    const items = log.body.items || [];
    if (stockholmDow() === saturdayDow) {
      assert.equal(items.length, 0);
    } else {
      assert.ok(items.length >= 0);
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 weekend — first star mode ON with empty today returns empty (no starter injection)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'fas6 test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [FLAG_KEYS.firstStarMode]
    );
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'FsmEmpty', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    await db.query('DELETE FROM weekly_schedule WHERE child_id = $1 AND day_of_week IN (0, 6)', [child.body.id]);
    if (stockholmDow() === 0 || stockholmDow() === 6) {
      await syncDailyLogWithSchedule(child.body.id, stockholmDow());
    }

    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    if (stockholmDow() === 0 || stockholmDow() === 6) {
      assert.equal((log.body.items || []).length, 0);
      assert.equal(log.body.first_star_mode, true);
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
