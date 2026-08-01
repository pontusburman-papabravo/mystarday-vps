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
  completeItemRaw,
  seedSchoolWeekdaySchedules,
  sumCompletedStarsForChild,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 G — dual child sessions: no double reward, shared server state', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'DualSes', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });

    const cl1 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const cl2 = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    assert.equal(cl1.status, 200);
    assert.equal(cl2.status, 200);

    const log1 = await getDailyLog(http.baseUrl, cl1.cookies, cl1.csrfToken);
    const item = (log1.body.items || []).find((i) => !i.completed);
    assert.ok(item);

    const [a, b] = await Promise.all([
      completeItemRaw(http.baseUrl, cl1.cookies, cl1.csrfToken, item.id),
      completeItemRaw(http.baseUrl, cl2.cookies, cl2.csrfToken, item.id),
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);

    const stars = await sumCompletedStarsForChild(db, child.body.id);
    assert.equal(stars, item.star_value || 1);

    const logAfter1 = await getDailyLog(http.baseUrl, cl1.cookies, cl1.csrfToken);
    const logAfter2 = await getDailyLog(http.baseUrl, cl2.cookies, cl2.csrfToken);
    const done1 = (logAfter1.body.items || []).filter((i) => i.completed).length;
    const done2 = (logAfter2.body.items || []).filter((i) => i.completed).length;
    assert.equal(done1, done2);
    assert.ok(done1 >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
