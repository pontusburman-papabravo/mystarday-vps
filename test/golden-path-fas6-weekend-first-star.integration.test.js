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
  countStarterItemsForChildDay,
  activationRow,
  sumCompletedStarsForChild,
  enableFirstStarMode,
  withFixedNow,
  clockLocalDateStr,
  disableFirstStarMode,
} = require('./helpers/golden-path-fas6.js');

const FIX = {
  saturday: '2026-08-01T10:00:00+02:00',
  sunday: '2026-08-02T10:00:00+02:00',
  monday: '2026-08-03T10:00:00+02:00',
  utcNextStockholmDay: '2026-08-02T22:00:00Z',
  utcSameCalendarDay: '2026-08-03T10:00:00Z',
};

test('Fas6 starter — empty Saturday and Sunday: one starter each', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  try {
    for (const iso of [FIX.saturday, FIX.sunday]) {
      await withFixedNow(iso, async () => {
        const { createApp } = require('../app');
        const http = await listenApp(createApp);

        try {
          await enableFirstStarMode(db);
          await seedSchoolWeekdaySchedules(db);
          const session = await registerAndLogin(http.baseUrl);
          const child = await onboardingChildRaw(http.baseUrl, session, { name: `Weekend-${iso.slice(0, 10)}`, emoji: '⭐' });
          await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
          const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
          const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
          const items = log.body.items || [];
          assert.equal(items.length, 1, iso);
          assert.match(items[0].name, /första stjärna/i);
          const dateStr = clockLocalDateStr();
          assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1, iso);
        } finally {
          await http.close();
        }
      });
      await db.truncate();
    }
  } finally {
    await db.cleanup();
  }
});

test('Fas6 starter — empty Saturday: completion and milestone', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow(FIX.saturday, async () => {
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
      const dateStr = clockLocalDateStr();
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
});

test('Fas6 starter — child without schema gets one starter when FSM on', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow(FIX.saturday, async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'NoSchema', emoji: '⭐' });
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      assert.equal((log.body.items || []).length, 1);
      const dateStr = clockLocalDateStr();
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('Fas6 starter — retry child login does not duplicate starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow(FIX.saturday, async () => {
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
      const dateStr = clockLocalDateStr();
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('Fas6 starter — Mon-only schedule on empty Saturday gets starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow(FIX.saturday, async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFirstStarMode(db);
      await seedSchoolWeekdaySchedules(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'MonOnly', emoji: '⭐' });
      await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });
      await db.query('DELETE FROM weekly_schedule WHERE child_id = $1 AND day_of_week != 1', [child.body.id]);
      await syncDailyLogWithSchedule(child.body.id, 6);
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      assert.equal((log.body.items || []).length, 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
