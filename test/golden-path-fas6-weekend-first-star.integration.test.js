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
  completeItemRaw,
  seedSchoolWeekdaySchedules,
  stockholmDow,
  countStarterItemsForChildDay,
  activationRow,
  sumCompletedStarsForChild,
} = require('./helpers/golden-path-fas6.js');

async function enableFirstStarMode(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'fas6 test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEYS.firstStarMode]
  );
}

async function skipAfterSetup(t, db, reason) {
  await db.cleanup();
  t.skip(reason);
}

async function todayStockholm(db) {
  const row = await db.query(
    `SELECT (now() AT TIME ZONE 'Europe/Stockholm')::date AS d`
  );
  return row.rows[0].d;
}

test('Fas6 starter — weekday forskola: no starter when schedule has items', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const dow = stockholmDow();
  if (dow === 0 || dow === 6) {
    await skipAfterSetup(t, db, 'Run on weekday (Stockholm)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFirstStarMode(db);
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'WeekdayKid', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    assert.ok((log.body.items || []).length >= 1);
    const dateStr = await todayStockholm(db);
    assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 starter — empty Saturday: one starter after child login + daily-log', async (t) => {
  const dow = stockholmDow();
  if (dow !== 6) {
    t.skip('Run on Saturday (Stockholm)');
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
    await enableFirstStarMode(db);
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'SatKid', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    const items = log.body.items || [];
    assert.equal(items.length, 1);
    assert.match(items[0].name, /första stjärna/i);
    const dateStr = await todayStockholm(db);
    assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
    const done = await completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, items[0].id);
    assert.equal(done.status, 200);
    assert.ok(done.body.meta_milestones?.first_star_earned);
    assert.equal(await sumCompletedStarsForChild(db, child.body.id), 1);
    const act = await activationRow(db, (await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email])).rows[0].family_id);
    assert.ok(act.first_completion_at);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 starter — empty Sunday: one starter (same as Saturday)', async (t) => {
  const dow = stockholmDow();
  if (dow !== 0) {
    t.skip('Run on Sunday (Stockholm)');
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
    await enableFirstStarMode(db);
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'SunKid', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    assert.equal((log.body.items || []).length, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 starter — child without schema gets one starter when FSM on', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFirstStarMode(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'NoSchema', emoji: '⭐' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    assert.equal((log.body.items || []).length, 1);
    const dateStr = await todayStockholm(db);
    assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 starter — retry child login does not duplicate starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFirstStarMode(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'RetryStarter', emoji: '⭐' });
    const cl1 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    await getDailyLog(http.baseUrl, cl1.cookies, cl1.csrfToken);
    const cl2 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    await getDailyLog(http.baseUrl, cl2.cookies, cl2.csrfToken);
    const dateStr = await todayStockholm(db);
    assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 starter — Mon-only schedule on empty Saturday gets starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFirstStarMode(db);
    await seedSchoolWeekdaySchedules(db);
    const session = await registerAndLogin(http.baseUrl);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'MonOnly', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
    await db.query('DELETE FROM weekly_schedule WHERE child_id = $1 AND day_of_week != 1', [child.body.id]);
    if (stockholmDow() === 6) {
      await syncDailyLogWithSchedule(child.body.id, 6);
    }
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
    if (stockholmDow() === 6) {
      assert.equal((log.body.items || []).length, 1);
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
