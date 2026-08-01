'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  registerAndLogin,
  onboardingChildRaw,
  childLoginRaw,
  getDailyLog,
  completeItemRaw,
  countStarterItemsForChildDay,
  enableFirstStarMode,
  withFixedNow,
  clockLocalDateStr,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 starter — tenant: other child and family cannot see or complete starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-01T10:00:00+02:00', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const dateStr = clockLocalDateStr();

    try {
      await enableFirstStarMode(db);
      const sessionA = await registerAndLogin(http.baseUrl);
      const childA = await onboardingChildRaw(http.baseUrl, sessionA, { name: 'TenantA', emoji: '⭐' });
      const sessionB = await registerAndLogin(http.baseUrl);
      const childB = await onboardingChildRaw(http.baseUrl, sessionB, { name: 'TenantB', emoji: '⭐' });

      const clA = await childLoginRaw(http.baseUrl, { username: childA.body.username, pin: childA.body.pin });
      await getDailyLog(http.baseUrl, clA.cookies, clA.csrfToken);
      assert.equal(await countStarterItemsForChildDay(db, childA.body.id, dateStr), 1);
      assert.equal(await countStarterItemsForChildDay(db, childB.body.id, dateStr), 0);

      const clB = await childLoginRaw(http.baseUrl, { username: childB.body.username, pin: childB.body.pin });
      const logB = await getDailyLog(http.baseUrl, clB.cookies, clB.csrfToken);
      assert.equal((logB.body.items || []).length, 1);
      assert.equal(await countStarterItemsForChildDay(db, childB.body.id, dateStr), 1);

      const starterA = await db.query(
        `SELECT dli.id FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         WHERE dl.child_id = $1 AND dl.date = $2::date AND dli.starter_kind = 'first_star'`,
        [childA.body.id, dateStr]
      );
      const hijack = await completeItemRaw(http.baseUrl, clB.cookies, clB.csrfToken, starterA.rows[0].id);
      assert.ok(hijack.status === 403 || hijack.status === 404);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('Fas6 starter — two siblings in same family each get own starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-01T10:00:00+02:00', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const dateStr = clockLocalDateStr();

    try {
      await enableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child1 = await onboardingChildRaw(http.baseUrl, session, { name: 'Sib1', emoji: '⭐' });
      const child2 = await onboardingChildRaw(http.baseUrl, session, { name: 'Sib2', emoji: '🌟' });

      const cl1 = await childLoginRaw(http.baseUrl, { username: child1.body.username, pin: child1.body.pin });
      await getDailyLog(http.baseUrl, cl1.cookies, cl1.csrfToken);
      const cl2 = await childLoginRaw(http.baseUrl, { username: child2.body.username, pin: child2.body.pin });
      await getDailyLog(http.baseUrl, cl2.cookies, cl2.csrfToken);

      assert.equal(await countStarterItemsForChildDay(db, child1.body.id, dateStr), 1);
      assert.equal(await countStarterItemsForChildDay(db, child2.body.id, dateStr), 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('Fas6 starter — after lifetime completion no new starter on empty day', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-01T10:00:00+02:00', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'DoneOnce', emoji: '⭐' });
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      await completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, log.body.items[0].id);

      const tomorrowStr = '2026-08-02';
      const cl2 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const log2 = await getDailyLog(http.baseUrl, cl2.cookies, cl2.csrfToken, tomorrowStr);
      assert.equal((log2.body.items || []).length, 0);
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, tomorrowStr), 0);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('Fas6 starter — Stockholm calendar day from DB matches starter log date', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-01T10:00:00+02:00', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'TzKid', emoji: '⭐' });
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);

      const row = await db.query(
        `SELECT dl.date::text AS d FROM daily_log dl
         JOIN daily_log_item dli ON dli.daily_log_id = dl.id
         WHERE dl.child_id = $1 AND dli.starter_kind = 'first_star'`,
        [child.body.id]
      );
      assert.equal(row.rows[0]?.d, clockLocalDateStr());
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
