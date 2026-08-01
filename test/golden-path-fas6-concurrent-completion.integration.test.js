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
  completeItemRaw,
  seedSchoolWeekdaySchedules,
  familyIdByEmail,
  activationRow,
  sumCompletedStarsForChild,
} = require('./helpers/golden-path-fas6.js');

const CONCURRENT_RACE_RUNS = 20;

test(`Fas6 F — concurrent completion on same item (${CONCURRENT_RACE_RUNS} races)`, async (t) => {
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
    const familyId = await familyIdByEmail(db, session.email);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'RaceBarn', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });
    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    assert.equal(cl.status, 200);

    const logRow = await db.query(
      `INSERT INTO daily_log (child_id, date)
       VALUES ($1, (now() AT TIME ZONE 'Europe/Stockholm')::date)
       ON CONFLICT (child_id, date) DO UPDATE SET child_id = EXCLUDED.child_id
       RETURNING id`,
      [child.body.id]
    );
    const logId = logRow.rows[0].id;

    const itemIds = [];
    for (let i = 0; i < CONCURRENT_RACE_RUNS; i++) {
      const ins = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
         VALUES ($1, $2, 'morgon', $3, 1, false) RETURNING id`,
        [logId, `Race item ${i}`, i]
      );
      itemIds.push(ins.rows[0].id);
    }

    let firstStarResponses = 0;
    for (let run = 0; run < CONCURRENT_RACE_RUNS; run++) {
      const itemId = itemIds[run];
      const [a, b] = await Promise.all([
        completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, itemId),
        completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, itemId),
      ]);
      assert.equal(a.status, 200, `run ${run}: ${a.text}`);
      assert.equal(b.status, 200, `run ${run}: ${b.text}`);
      assert.notEqual(a.status, 500);
      assert.notEqual(b.status, 500);

      const row = await db.query(
        'SELECT completed FROM daily_log_item WHERE id = $1',
        [itemId]
      );
      assert.equal(row.rows[0].completed, true, `run ${run}: single transition`);

      if (a.body.meta_milestones?.first_star_earned) firstStarResponses += 1;
      if (b.body.meta_milestones?.first_star_earned) firstStarResponses += 1;
    }

    assert.equal(firstStarResponses, 1, 'exactly one first_star_earned across all races');

    const stars = await sumCompletedStarsForChild(db, child.body.id);
    assert.equal(stars, CONCURRENT_RACE_RUNS);

    const act = await activationRow(db, familyId);
    assert.ok(act.first_completion_at);

    const retry = await completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, itemIds[0]);
    assert.equal(retry.status, 200);
    assert.equal(await sumCompletedStarsForChild(db, child.body.id), CONCURRENT_RACE_RUNS);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 F — two different activities concurrent: both complete, one first_completion', async (t) => {
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
    const familyId = await familyIdByEmail(db, session.email);
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'TwoAct', emoji: '⭐' });
    await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });

    const logRow = await db.query(
      `INSERT INTO daily_log (child_id, date)
       VALUES ($1, (now() AT TIME ZONE 'Europe/Stockholm')::date)
       ON CONFLICT (child_id, date) DO UPDATE SET child_id = EXCLUDED.child_id
       RETURNING id`,
      [child.body.id]
    );
    const logId = logRow.rows[0].id;
    const ins = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Akt A', 'morgon', 0, 1, false),
              ($1, 'Akt B', 'morgon', 1, 2, false)
       RETURNING id, star_value`,
      [logId]
    );

    const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
    const [c1, c2] = await Promise.all([
      completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, ins.rows[0].id),
      completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, ins.rows[1].id),
    ]);
    assert.equal(c1.status, 200);
    assert.equal(c2.status, 200);

    const stars = await sumCompletedStarsForChild(db, child.body.id);
    assert.equal(stars, 3);

    const completedCount = await db.query(
      `SELECT COUNT(*)::int AS n FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [child.body.id]
    );
    assert.equal(completedCount.rows[0].n, 2);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
