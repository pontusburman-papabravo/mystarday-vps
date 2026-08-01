'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FLAG_KEYS } = require('../src/lib/activation-flags');

const TWO_ITEM_RACE_RUNS = 20;

test(`Fas6 F — concurrent two different items (${TWO_ITEM_RACE_RUNS} runs): one first_completion milestone`, async (t) => {
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
    onboardingScheduleRaw,
    childLoginRaw,
    completeItemRaw,
    seedSchoolWeekdaySchedules,
    familyIdByEmail,
    activationRow,
    sumCompletedStarsForChild,
    countChildFirstCompletionMilestones,
    waitForChildFirstCompletionMilestone,
    enableJourneyIngest,
    countAnalyticsEvent,
  } = require('./helpers/golden-path-fas6.js');

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    for (let run = 0; run < TWO_ITEM_RACE_RUNS; run++) {
      await seedSchoolWeekdaySchedules(db);
      await enableJourneyIngest(db);
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await familyIdByEmail(db, session.email);
      const child = await onboardingChildRaw(http.baseUrl, session, { name: `Race2-${run}`, emoji: '⭐' });
      await onboardingScheduleRaw(http.baseUrl, session, { child_id: child.body.id, template_group: 'helg' });

      const logRow = await db.query(
        `INSERT INTO daily_log (child_id, date)
         VALUES ($1, (now() AT TIME ZONE 'Europe/Stockholm')::date)
         ON CONFLICT (child_id, date) DO UPDATE SET child_id = EXCLUDED.child_id
         RETURNING id`,
        [child.body.id]
      );
      const ins = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
         VALUES ($1, 'A', 'morgon', 0, 1, false),
                ($1, 'B', 'morgon', 1, 2, false)
         RETURNING id`,
        [logRow.rows[0].id]
      );

      const cl = await childLoginRaw(http.baseUrl, { username: child.body.username, pin: child.body.pin });
      const [c1, c2] = await Promise.all([
        completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, ins.rows[0].id),
        completeItemRaw(http.baseUrl, cl.cookies, cl.csrfToken, ins.rows[1].id),
      ]);
      assert.equal(c1.status, 200, `run ${run}`);
      assert.equal(c2.status, 200, `run ${run}`);

      let firstStarResponses = 0;
      if (c1.body.meta_milestones?.first_star_earned) firstStarResponses += 1;
      if (c2.body.meta_milestones?.first_star_earned) firstStarResponses += 1;
      assert.equal(firstStarResponses, 1, `run ${run}: one first_star_earned response`);

      const stars = await sumCompletedStarsForChild(db, child.body.id);
      assert.equal(stars, 3, `run ${run}`);

      const act = await activationRow(db, familyId);
      assert.ok(act.first_completion_at, `run ${run}: first_completion_at`);

      const milestones = await waitForChildFirstCompletionMilestone(db, familyId, child.body.id);
      assert.equal(milestones, 1, `run ${run}: one child_first_completion milestone`);

      const analyticsN = await countAnalyticsEvent(db, familyId, 'first_completion_recorded');
      assert.equal(analyticsN, 1, `run ${run}: one first_completion_recorded event`);

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await db.truncate();
          break;
        } catch (err) {
          if (err.code !== '40P01' || attempt === 4) throw err;
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
        }
      }
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
