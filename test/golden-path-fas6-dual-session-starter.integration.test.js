'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FLAG_KEYS } = require('../src/lib/activation-flags');

const DUAL_GET_RUNS = 20;

test(`Fas6 starter — dual session parallel GET (${DUAL_GET_RUNS} runs) one starter`, async (t) => {
  const { setupTestDb } = require('./helpers/setup.js');
  const { listenApp } = require('./helpers/http.js');
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const {
    registerAndLogin,
    onboardingChildRaw,
    childLoginRaw,
    getDailyLog,
    countStarterItemsForChildDay,
    withFixedNow,
    clockLocalDateStr,
  } = require('./helpers/golden-path-fas6.js');

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    for (let run = 0; run < DUAL_GET_RUNS; run++) {
      await withFixedNow('2026-08-01T10:00:00+02:00', async () => {
        await db.query(
          `INSERT INTO feature_flag (key, enabled, description)
           VALUES ($1, true, 'fas6')
           ON CONFLICT (key) DO UPDATE SET enabled = true`,
          [FLAG_KEYS.firstStarMode]
        );
        const session = await registerAndLogin(http.baseUrl);
        const child = await onboardingChildRaw(http.baseUrl, session, { name: `DualGet${run}`, emoji: '⭐' });
        const cl1 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
        const cl2 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
        const dateStr = clockLocalDateStr();

        await Promise.all([
          getDailyLog(http.baseUrl, cl1.cookies, cl1.csrfToken),
          getDailyLog(http.baseUrl, cl2.cookies, cl2.csrfToken),
        ]);

        assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1, `run ${run}`);
      });
      await db.truncate();
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
