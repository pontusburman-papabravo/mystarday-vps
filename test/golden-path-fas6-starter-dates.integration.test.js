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
  countStarterItemsForChildDay,
  enableFirstStarMode,
  withFixedNow,
  clockLocalDateStr,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 starter — UTC 22:00Z maps to next Stockholm calendar day for starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-02T22:00:00Z', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'UtcNext', emoji: '⭐' });
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      const dateStr = clockLocalDateStr();
      assert.equal(dateStr, '2026-08-03');
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('Fas6 starter — UTC midday same calendar date as Stockholm', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-03T10:00:00Z', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'UtcSame', emoji: '⭐' });
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      const dateStr = clockLocalDateStr();
      assert.equal(dateStr, '2026-08-03');
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
