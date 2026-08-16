'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  registerAndLogin,
  onboardingChildRaw,
  onboardingScheduleRaw,
  seedSchoolWeekdaySchedules,
  countChildrenInFamily,
  countWeeklySchedules,
  familyIdByEmail,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 C — concurrent onboarding/child same name: at most one child', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdByEmail(db, session.email);
    const payload = { name: 'ConcurrentBarn', emoji: '🌟' };

    const [r1, r2] = await Promise.all([
      onboardingChildRaw(http.baseUrl, session, payload),
      onboardingChildRaw(http.baseUrl, session, payload),
    ]);

    const okStatuses = new Set([201, 200, 409]);
    assert.ok(okStatuses.has(r1.status), r1.text);
    assert.ok(okStatuses.has(r2.status), r2.text);
    assert.notEqual(r1.status === 201 && r2.status === 201, true);

    const childCount = await countChildrenInFamily(db, familyId);
    assert.equal(childCount, 1, 'must not create duplicate children');

    const success = r1.status === 201 || r1.status === 200 ? r1 : r2;
    if (success.status === 201 || success.status === 200) {
      assert.ok(success.body?.id);
      assert.ok(success.body?.username);
    }

    const pinRows = await db.query(
      `SELECT COUNT(*)::int AS n FROM child WHERE family_id = $1 AND LOWER(name) = LOWER($2)`,
      [familyId, 'ConcurrentBarn']
    );
    assert.equal(pinRows.rows[0].n, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 D — parallel schedule save: single weekly row per day, stable retry', async (t) => {
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
    const child = await onboardingChildRaw(http.baseUrl, session, { name: 'SchemaBarn', emoji: '⭐' });
    assert.equal(child.status, 201);
    const childId = child.body.id;

    const body = { child_id: childId, template_group: 'forskola' };
    const [s1, s2] = await Promise.all([
      onboardingScheduleRaw(http.baseUrl, session, body),
      onboardingScheduleRaw(http.baseUrl, session, body),
    ]);
    assert.equal(s1.status, 200, s1.text);
    assert.equal(s2.status, 200, s2.text);

    const schedCount = await countWeeklySchedules(db, childId);
    assert.equal(schedCount, 5, 'forskola seeds Mon–Fri only');

    const retry = await onboardingScheduleRaw(http.baseUrl, session, body);
    assert.equal(retry.status, 200);

    const schedAfter = await countWeeklySchedules(db, childId);
    assert.equal(schedAfter, 5);

    const itemsPerDay = await db.query(
      `SELECT day_of_week, COUNT(wsi.id)::int AS n
       FROM weekly_schedule ws
       JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
       WHERE ws.child_id = $1
       GROUP BY day_of_week ORDER BY day_of_week`,
      [childId]
    );
    for (const row of itemsPerDay.rows) {
      assert.ok(row.n > 0, `day ${row.day_of_week} should have schedule items`);
    }
    const itemCounts = itemsPerDay.rows.map((r) => r.n);
    assert.ok(
      itemCounts.every((n) => n === itemCounts[0]),
      'parallel save must not produce inconsistent item counts per weekday'
    );

    const familyId = await familyIdByEmail(db, session.email);
    const act = await db.query(
      'SELECT schema_saved_at FROM family_activation_state WHERE family_id = $1',
      [familyId]
    );
    assert.ok(act.rows[0]?.schema_saved_at);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
