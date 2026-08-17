'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { registerAndLogin, onboardingChildRaw, onboardingScheduleRaw, seedSchoolWeekdaySchedules } = require('./helpers/golden-path-fas6.js');

test('POST /api/onboarding/schedule enables NU/NÄSTA defaults when child UX still factory-off', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'NnlBarn', emoji: '🌟' });
    assert.equal(child.status, 201);
    const childId = child.body.id;

    const before = await db.query(
      'SELECT show_now_next, require_sequential_completion FROM child WHERE id = $1',
      [childId]
    );
    assert.equal(before.rows[0].show_now_next, false);
    assert.equal(before.rows[0].require_sequential_completion, false);

    const sched = await onboardingScheduleRaw(http.baseUrl, session, {
      child_id: childId,
      template_group: 'skola',
    });
    assert.equal(sched.status, 200, sched.text);

    const after = await db.query(
      'SELECT show_now_next, require_sequential_completion, activity_timers_enabled FROM child WHERE id = $1',
      [childId]
    );
    assert.equal(after.rows[0].show_now_next, true);
    assert.equal(after.rows[0].require_sequential_completion, true);
    assert.equal(after.rows[0].activity_timers_enabled, false);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
