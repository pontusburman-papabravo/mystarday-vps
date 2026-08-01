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
  seedSchoolWeekdaySchedules,
  countStarterItemsForChildDay,
  enableFirstStarMode,
  withFixedNow,
  clockLocalDateStr,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 starter — weekday forskola: no starter when schedule has items', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  await withFixedNow('2026-08-03T10:00:00+02:00', async () => {
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const dateStr = clockLocalDateStr();

    try {
      await enableFirstStarMode(db);
      await seedSchoolWeekdaySchedules(db);
      const session = await registerAndLogin(http.baseUrl);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: 'WeekdayKid', emoji: '⭐' });
      await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'forskola' });

      const logRow = await db.query(
        `INSERT INTO daily_log (child_id, date)
         VALUES ($1, $2::date)
         ON CONFLICT (child_id, date) DO UPDATE SET child_id = EXCLUDED.child_id
         RETURNING id`,
        [child.body.id, dateStr]
      );
      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
         VALUES ($1, 'Skola', 'morgon', 0, 1, false)`,
        [logRow.rows[0].id]
      );

      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const log = await getDailyLog(http.baseUrl, cl.cookies, cl.csrfToken);
      assert.ok((log.body.items || []).length >= 1);
      assert.equal(await countStarterItemsForChildDay(db, child.body.id, dateStr), 0);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
