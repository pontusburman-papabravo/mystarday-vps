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
  disableFirstStarMode,
  withFixedNow,
  clockLocalDateStr,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 starter — GET self-heal: session without login ensure creates one starter', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-01T10:00:00+02:00', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await disableFirstStarMode(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'GetHeal', emoji: '⭐' });
      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const dateStr = clockLocalDateStr();
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 0);

      await enableFirstStarMode(db);
      const log1 = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      assert.equal((log1.body.items || []).length, 1);
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);

      const log2 = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      assert.equal((log2.body.items || []).length, 1);
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
