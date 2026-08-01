'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { ensureFirstStarStarterActivity } = require('../src/lib/first-star-starter');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');

const STARTER_RACE_RUNS = 20;

test(`Fas6 starter — concurrent ensure (${STARTER_RACE_RUNS} runs) one row per child-day`, async (t) => {
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
    countStarterItemsForChildDay,
  } = require('./helpers/golden-path-fas6.js');

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    for (let run = 0; run < STARTER_RACE_RUNS; run++) {
      await db.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, true, 'fas6')
         ON CONFLICT (key) DO UPDATE SET enabled = true`,
        [FLAG_KEYS.firstStarMode]
      );

      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: `RaceStarter${run}`, emoji: '⭐' });
      const familyId = (await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email])).rows[0].family_id;
      const dateStr = getLocalDateStr(undefined, 'Europe/Stockholm');

      await Promise.all([
        ensureFirstStarStarterActivity({ childId: child.body.id, familyId, dateStr, locale: 'sv-SE' }),
        ensureFirstStarStarterActivity({ childId: child.body.id, familyId, dateStr, locale: 'sv-SE' }),
      ]);

      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 1, `run ${run}`);
      await db.truncate();
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
