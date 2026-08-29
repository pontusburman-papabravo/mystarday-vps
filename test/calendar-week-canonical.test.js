'use strict';

/**
 * Phase 4 — GET /api/children/:childId/calendar-week must reflect the canonical planning state
 * (resolveEffectiveSchedule()/resolveEffectiveScheduleRange()) for any date that does not yet
 * have a generated daily_log, closing the gap documented in Phase 3's "Duplicate-precedence
 * audit". See docs/schedule-canonical-architecture.md "Phase 4".
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginParent(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await loginRes.text();
  assert.equal(loginRes.status, 200, text);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: JSON.parse(text).csrfToken };
}

test('Phase 4 — calendar-week reflects canonical planning state before a daily_log exists', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createSchedulePeriod } = require('../src/lib/schedule-period');
  const tag = Date.now();
  const password = 'calendar-canonical-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(`INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Calendar canonical', 'Europe/Stockholm', true) RETURNING id`);
  const familyId = familyRes.rows[0].id;
  const email = `calendar-canonical-${tag}@example.com`;
  await db.query(`INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified) VALUES ($1, $2, $3, 'Parent', true, true)`, [email, passwordHash, familyId]);
  const childRes = await db.query(`INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`, [familyId, `barn-cal-${tag}`]);
  const childId = childRes.rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) SELECT id, $2, 'primary' FROM parent WHERE email = $1`, [email, childId]);

  async function seedActivity(name) {
    const res = await db.query(`INSERT INTO activity_template (family_id, name, icon, star_value, sort_order) VALUES ($1, $2, '⭐', 1, 0) RETURNING id`, [familyId, name]);
    return res.rows[0].id;
  }
  async function seedFamilyTemplate(items) {
    const tpl = await db.query(`INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id) VALUES ($1, 'Mall', 0, 0, NULL) RETURNING id`, [familyId]);
    for (const item of items) {
      await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, $3, $4)`, [tpl.rows[0].id, item.activityId, item.sortOrder || 0, item.section || 'morgon']);
    }
    return tpl.rows[0].id;
  }
  async function seedWeeklyDay(dow, items) {
    const sched = await db.query('INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2::smallint, $3::integer) RETURNING id', [childId, dow, dow]);
    let so = 0;
    for (const item of items) {
      await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, $3, $4)`, [sched.rows[0].id, item.activityId, so++, item.section || 'morgon']);
    }
  }

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = { 'Content-Type': 'application/json', Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken };

    async function fetchWeek(weekOffset) {
      const res = await fetch(`${baseUrl}/api/children/${childId}/calendar-week?weekOffset=${weekOffset}`, { headers });
      const body = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));
      return body;
    }

    // 1. weekly-only date
    const weeklyAct = await seedActivity('Frukost');
    await seedWeeklyDay(1, [{ activityId: weeklyAct, section: 'morgon' }]); // Monday

    // Compute which weekOffset covers a known future Monday far enough out to be uncontested,
    // but within calendar-week's ±52-week weekOffset bound.
    const targetMonday = '2026-11-09'; // a Monday, ~10 weeks out — no daily_log exists yet
    // Mirror calendar.js's own weekStart formula (this week's Monday + weekOffset*7 days) to
    // compute the exact weekOffset that lands on targetMonday, regardless of what day "today" is.
    const todayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const todayDow = todayUtc.getUTCDay(); // 0=Sun..6=Sat
    const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1;
    const thisWeekMonday = new Date(todayUtc);
    thisWeekMonday.setUTCDate(todayUtc.getUTCDate() - daysFromMonday);
    const weeksUntilTarget = Math.round((new Date(`${targetMonday}T00:00:00Z`) - thisWeekMonday) / (7 * 24 * 60 * 60 * 1000));

    let week = await fetchWeek(weeksUntilTarget);
    let day = week.days.find((d) => d.date === targetMonday);
    assert.ok(day, `expected ${targetMonday} in the returned week`);
    assert.equal(day.hasLog, false, 'no daily_log should exist yet for this future date');
    assert.deepEqual(day.activities.map((a) => a.id), [weeklyAct], '1: weekly-only date shows the weekly item with no log dependency');

    // 2. period merge
    const periodAct = await seedActivity('Simskola');
    const tplMerge = await seedFamilyTemplate([{ activityId: periodAct, section: 'kvall' }]);
    const periodDate = '2026-11-10'; // the Tuesday after targetMonday
    await createSchedulePeriod({ familyId, childId, name: 'Merge period', startDate: periodDate, endDate: periodDate, sourceType: 'family_template', sourceId: tplMerge, applyMode: 'merge' });
    const weeklyTue = await seedActivity('Skola');
    await seedWeeklyDay(2, [{ activityId: weeklyTue, section: 'morgon' }]);

    week = await fetchWeek(weeksUntilTarget);
    day = week.days.find((d) => d.date === periodDate);
    assert.deepEqual(day.activities.map((a) => a.id).sort(), [periodAct, weeklyTue].sort(), '2: period merge shows weekly + period items with no log dependency');
    // base_type is a day-level fact (per the locked Phase 3 response-shape contract — item-level
    // provenance was deliberately not introduced), so every item for this date is tagged with
    // the date's effective base_type, special_period, regardless of whether it originated from
    // weekly or the period.
    assert.ok(day.activities.every((a) => a.source === 'special_period'), '2: every item for a period-composed date is tagged source=special_period');

    // 3. period replace_sections
    const morningAct = await seedActivity('MorningA');
    const oldEveningAct = await seedActivity('OldEveningB');
    const newEveningAct = await seedActivity('NewEveningC');
    const weeklyRow = await db.query('INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 3::smallint, 3::integer) RETURNING id', [childId]);
    await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`, [weeklyRow.rows[0].id, morningAct]);
    await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 1, 'kvall')`, [weeklyRow.rows[0].id, oldEveningAct]);
    const tplSections = await seedFamilyTemplate([{ activityId: newEveningAct, section: 'kvall' }]);
    const sectionsDate = '2026-11-11'; // Wednesday
    await createSchedulePeriod({ familyId, childId, name: 'Sections period', startDate: sectionsDate, endDate: sectionsDate, sourceType: 'family_template', sourceId: tplSections, applyMode: 'replace_sections' });

    week = await fetchWeek(weeksUntilTarget);
    day = week.days.find((d) => d.date === sectionsDate);
    const sectionIds = day.activities.map((a) => a.id);
    assert.ok(sectionIds.includes(morningAct), '3: untouched morning section survives');
    assert.ok(sectionIds.includes(newEveningAct), '3: period-replaced evening item present');
    assert.ok(!sectionIds.includes(oldEveningAct), '3: old weekly evening item must never appear');

    // 4. period replace_day
    const weeklyThu = await seedActivity('WeeklyThu');
    await seedWeeklyDay(4, [{ activityId: weeklyThu }]);
    const dayAct = await seedActivity('ReplaceDayAct');
    const tplDay = await seedFamilyTemplate([{ activityId: dayAct }]);
    const replaceDayDate = '2026-11-12'; // Thursday
    await createSchedulePeriod({ familyId, childId, name: 'Day period', startDate: replaceDayDate, endDate: replaceDayDate, sourceType: 'family_template', sourceId: tplDay, applyMode: 'replace_day' });

    week = await fetchWeek(weeksUntilTarget);
    day = week.days.find((d) => d.date === replaceDayDate);
    assert.deepEqual(day.activities.map((a) => a.id), [dayAct], '4: replace_day shows only the period item, no weekly leakage');

    // 5. explicit Special Day over an active period
    const explicitAct = await seedActivity('ExplicitOverride');
    const weeklyFri = await seedActivity('WeeklyFri');
    await seedWeeklyDay(5, [{ activityId: weeklyFri }]);
    const periodOverriddenAct = await seedActivity('PeriodOverridden');
    const tplOverridden = await seedFamilyTemplate([{ activityId: periodOverriddenAct }]);
    const overrideDate = '2026-11-13'; // Friday
    await createSchedulePeriod({ familyId, childId, name: 'Overridden period', startDate: overrideDate, endDate: overrideDate, sourceType: 'family_template', sourceId: tplOverridden, applyMode: 'replace_day' });
    const sd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2) RETURNING id`, [childId, overrideDate]);
    await db.query(`INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'X', 'morgon', 0)`, [sd.rows[0].id, explicitAct]);

    week = await fetchWeek(weeksUntilTarget);
    day = week.days.find((d) => d.date === overrideDate);
    assert.deepEqual(day.activities.map((a) => a.id), [explicitAct], '5: explicit Special Day wins over the active period');
    assert.equal(day.isSpecialDay, true);
    assert.equal(day.isSpecialDayActive, true, 'a populated explicit Special Day is the ACTIVE planning source for this date');
    assert.ok(day.activities.every((a) => a.source === 'special_day'));

    // 6. empty explicit Special Day falls through
    const weeklySat = await seedActivity('WeeklySat');
    await seedWeeklyDay(6, [{ activityId: weeklySat }]); // Saturday
    const emptyDate = '2026-11-14'; // Saturday
    await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2)`, [childId, emptyDate]); // no items

    week = await fetchWeek(weeksUntilTarget);
    day = week.days.find((d) => d.date === emptyDate);
    assert.equal(day.isSpecialDay, true, 'the badge still reflects the row exists');
    assert.equal(day.isSpecialDayActive, false, 'an empty explicit Special Day must NOT be flagged as the active planning source — it fell through to weekly');
    assert.deepEqual(day.activities.map((a) => a.id), [weeklySat], '6: empty explicit Special Day falls through to weekly, not an empty day');

    // 7. date exclusion under a period
    const weeklySun = await seedActivity('WeeklySun');
    const periodSunAct = await seedActivity('PeriodSun');
    await seedWeeklyDay(0, [{ activityId: weeklySun }]); // Sunday
    const tplSun = await seedFamilyTemplate([{ activityId: periodSunAct }]);
    const exclusionDate = '2026-11-15'; // Sunday
    await createSchedulePeriod({ familyId, childId, name: 'Exclusion period', startDate: exclusionDate, endDate: exclusionDate, sourceType: 'family_template', sourceId: tplSun, applyMode: 'merge' });
    await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, $2, $3)`, [childId, exclusionDate, periodSunAct]);

    week = await fetchWeek(weeksUntilTarget);
    day = week.days.find((d) => d.date === exclusionDate);
    assert.deepEqual(day.activities.map((a) => a.id), [weeklySun], '7: excluded period item absent, weekly item remains');

    // 9. no daily-log dependency — confirmed by every assertion above (day.hasLog === false throughout).
    assert.equal(day.hasLog, false, '9: none of these dates required a daily_log to show the correct plan');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('Phase 4 — calendar-week: daily_log supplies execution overlay ONLY, never an alternate planning authority', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createSchedulePeriod } = require('../src/lib/schedule-period');
  const { getOrGenerateDailyLog } = require('../src/lib/daily-log-generator');
  const tag = Date.now();
  const password = 'calendar-overlay-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(`INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Calendar overlay', 'Europe/Stockholm', true) RETURNING id`);
  const familyId = familyRes.rows[0].id;
  const email = `calendar-overlay-${tag}@example.com`;
  await db.query(`INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified) VALUES ($1, $2, $3, 'Parent', true, true)`, [email, passwordHash, familyId]);
  const childRes = await db.query(`INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`, [familyId, `barn-ov-${tag}`]);
  const childId = childRes.rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) SELECT id, $2, 'primary' FROM parent WHERE email = $1`, [email, childId]);

  async function seedActivity(name) {
    const res = await db.query(`INSERT INTO activity_template (family_id, name, icon, star_value, sort_order) VALUES ($1, $2, '⭐', 1, 0) RETURNING id`, [familyId, name]);
    return res.rows[0].id;
  }
  async function seedFamilyTemplate(items) {
    const tpl = await db.query(`INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id) VALUES ($1, 'Mall', 0, 0, NULL) RETURNING id`, [familyId]);
    for (const item of items) {
      await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, $3, $4)`, [tpl.rows[0].id, item.activityId, item.sortOrder || 0, item.section || 'morgon']);
    }
    return tpl.rows[0].id;
  }
  async function seedWeeklyDay(dow, items) {
    const sched = await db.query('INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2::smallint, $3::integer) RETURNING id', [childId, dow, dow]);
    let so = 0;
    for (const item of items) {
      await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, $3, $4)`, [sched.rows[0].id, item.activityId, so++, item.section || 'morgon']);
    }
  }

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = { 'Content-Type': 'application/json', Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken };

    async function fetchWeek(weekOffset) {
      const res = await fetch(`${baseUrl}/api/children/${childId}/calendar-week?weekOffset=${weekOffset}`, { headers });
      const body = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));
      return body;
    }
    function weeksUntil(targetDateStr) {
      // Compute the Monday of the week CONTAINING targetDateStr (not the target date itself),
      // then divide by an exact 7-day increment from "this week's Monday" — avoids the rounding
      // bug where a non-Monday target (Fri/Sat/Sun) would round up into the following week.
      const todayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
      const todayDow = todayUtc.getUTCDay();
      const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1;
      const thisWeekMonday = new Date(todayUtc);
      thisWeekMonday.setUTCDate(todayUtc.getUTCDate() - daysFromMonday);

      const target = new Date(`${targetDateStr}T00:00:00Z`);
      const targetDow = target.getUTCDay();
      const targetDaysFromMonday = targetDow === 0 ? 6 : targetDow - 1;
      const targetWeekMonday = new Date(target);
      targetWeekMonday.setUTCDate(target.getUTCDate() - targetDaysFromMonday);

      return Math.round((targetWeekMonday - thisWeekMonday) / (7 * 24 * 60 * 60 * 1000));
    }

    // ── 2/3: completion overlay + stale log item never resurrects a removed weekly item ──
    const weeklyAct = await seedActivity('Frukost');
    const dateStr1 = '2027-02-01'; // a Monday
    await seedWeeklyDay(1, [{ activityId: weeklyAct, section: 'morgon' }]);
    const { log: log1 } = await getOrGenerateDailyLog(childId, dateStr1);
    await db.query(`UPDATE daily_log_item SET completed = true WHERE daily_log_id = $1 AND activity_template_id = $2`, [log1.id, weeklyAct]);

    let week = await fetchWeek(weeksUntil(dateStr1));
    let day = week.days.find((d) => d.date === dateStr1);
    assert.equal(day.hasLog, true);
    assert.deepEqual(day.activities.map((a) => a.id), [weeklyAct], '2: log exists — same canonical weekly item shown');
    assert.equal(day.activities[0].completed, true, '2: completion overlaid from the matching log item');

    // 3: weekly planning changes AFTER the log exists — Calendar must show the NEW plan, not the stale one.
    const newWeeklyAct = await seedActivity('NyttFrukost');
    await db.query(`DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = (SELECT weekly_schedule_id FROM weekly_schedule_item wsi JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id WHERE ws.child_id = $1 AND ws.day_of_week = 1 LIMIT 1)`, [childId]);
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       SELECT id, $2, 0, 'morgon' FROM weekly_schedule WHERE child_id = $1 AND day_of_week = 1`,
      [childId, newWeeklyAct]
    );
    week = await fetchWeek(weeksUntil(dateStr1));
    day = week.days.find((d) => d.date === dateStr1);
    assert.deepEqual(day.activities.map((a) => a.id), [newWeeklyAct], '3: Calendar shows the NEW canonical planning item');
    assert.ok(!day.activities.some((a) => a.id === weeklyAct), '3: the stale completed old item does not replace/appear alongside the new plan');

    // ── 5/6: period merge — completion overlay + weekly contribution changes after log exists ──
    const weeklyA = await seedActivity('A');
    const periodB = await seedActivity('B');
    await seedWeeklyDay(2, [{ activityId: weeklyA, section: 'morgon' }]); // Tuesday
    const tplMerge = await seedFamilyTemplate([{ activityId: periodB, section: 'kvall' }]);
    const dateStr2 = '2027-02-02';
    await createSchedulePeriod({ familyId, childId, name: 'P', startDate: dateStr2, endDate: dateStr2, sourceType: 'family_template', sourceId: tplMerge, applyMode: 'merge' });
    const { log: log2 } = await getOrGenerateDailyLog(childId, dateStr2);
    await db.query(`UPDATE daily_log_item SET completed = true WHERE daily_log_id = $1 AND activity_template_id = $2`, [log2.id, periodB]);

    week = await fetchWeek(weeksUntil(dateStr2));
    day = week.days.find((d) => d.date === dateStr2);
    assert.deepEqual(day.activities.map((a) => a.id).sort(), [periodB, weeklyA].sort(), '5: log exists — still A+B');
    const bItem = day.activities.find((a) => a.id === periodB);
    assert.equal(bItem.completed, true, '5: completion overlaid for the item with a matching log row');
    const aItem = day.activities.find((a) => a.id === weeklyA);
    assert.equal(aItem.completed, false, '5: A was included in the original generation (merge includes both), so its log row exists with completed=false (not yet done)');

    // 6: weekly contribution changes after the log exists.
    const weeklyAPrime = await seedActivity('APrime');
    await db.query(
      `UPDATE weekly_schedule_item SET activity_template_id = $1
       WHERE weekly_schedule_id = (SELECT id FROM weekly_schedule WHERE child_id = $2 AND day_of_week = 2 AND week_variant IS NULL LIMIT 1) AND activity_template_id = $3`,
      [weeklyAPrime, childId, weeklyA]
    );
    week = await fetchWeek(weeksUntil(dateStr2));
    day = week.days.find((d) => d.date === dateStr2);
    assert.deepEqual(day.activities.map((a) => a.id).sort(), [periodB, weeklyAPrime].sort(), "6: updated effective A' + B");

    // ── 7: replace_sections — stale log from previous state must not resurrect the replaced item ──
    const morningA = await seedActivity('MorningA');
    const oldEveningB = await seedActivity('OldEveningB');
    const newEveningC = await seedActivity('NewEveningC');
    const weeklyRow = await db.query('INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 3::smallint, 3::integer) RETURNING id', [childId]);
    await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`, [weeklyRow.rows[0].id, morningA]);
    await db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 1, 'kvall')`, [weeklyRow.rows[0].id, oldEveningB]);
    const dateStr3 = '2027-02-03'; // Wednesday
    // Generate the log while A+B (the old weekly state) is still effective.
    await getOrGenerateDailyLog(childId, dateStr3);
    // Now a replace_sections period supersedes the evening section.
    const tplSections = await seedFamilyTemplate([{ activityId: newEveningC, section: 'kvall' }]);
    await createSchedulePeriod({ familyId, childId, name: 'P2', startDate: dateStr3, endDate: dateStr3, sourceType: 'family_template', sourceId: tplSections, applyMode: 'replace_sections' });

    week = await fetchWeek(weeksUntil(dateStr3));
    day = week.days.find((d) => d.date === dateStr3);
    const idsWithStaleLog = day.activities.map((a) => a.id);
    assert.ok(idsWithStaleLog.includes(morningA), '7: A remains');
    assert.ok(idsWithStaleLog.includes(newEveningC), '7: C (period replacement) present');
    assert.ok(!idsWithStaleLog.includes(oldEveningB), '7: B must NOT reappear from the stale log');

    // ── 8: replace_day — stale log item from before the period must not leak ──
    const weeklyD = await seedActivity('D');
    await seedWeeklyDay(4, [{ activityId: weeklyD }]); // Thursday
    const dateStr4 = '2027-02-04';
    await getOrGenerateDailyLog(childId, dateStr4); // log generated while weekly D is still effective
    const periodOnly = await seedActivity('PeriodOnly');
    const tplDay = await seedFamilyTemplate([{ activityId: periodOnly }]);
    await createSchedulePeriod({ familyId, childId, name: 'P3', startDate: dateStr4, endDate: dateStr4, sourceType: 'family_template', sourceId: tplDay, applyMode: 'replace_day' });

    week = await fetchWeek(weeksUntil(dateStr4));
    day = week.days.find((d) => d.date === dateStr4);
    assert.deepEqual(day.activities.map((a) => a.id), [periodOnly], '8: only the period item — the stale D from the old log must not leak');

    // ── 9/10: explicit Special Day with a stale weekly log; completion overlay for X ──
    const staleWeeklyE = await seedActivity('E');
    await seedWeeklyDay(5, [{ activityId: staleWeeklyE }]); // Friday
    const dateStr5 = '2027-02-05';
    await getOrGenerateDailyLog(childId, dateStr5); // log generated with stale weekly E
    const explicitX = await seedActivity('X');
    const sd = await db.query(`INSERT INTO special_day_schedule (child_id, date) VALUES ($1, $2) RETURNING id`, [childId, dateStr5]);
    await db.query(`INSERT INTO special_day_schedule_item (special_day_schedule_id, activity_template_id, name, section, sort_order) VALUES ($1, $2, 'X', 'morgon', 0)`, [sd.rows[0].id, explicitX]);
    // Simulate an explicit-day log item for X with completion (as syncDailyLogForSpecialDay would produce).
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section, completed)
       VALUES ((SELECT id FROM daily_log WHERE child_id = $1 AND date = $2), $3, 'X', '⭐', 1, 0, 'morgon', true)
       ON CONFLICT (daily_log_id, activity_template_id) WHERE activity_template_id IS NOT NULL DO UPDATE SET completed = true`,
      [childId, dateStr5, explicitX]
    );

    week = await fetchWeek(weeksUntil(dateStr5));
    day = week.days.find((d) => d.date === dateStr5);
    assert.deepEqual(day.activities.map((a) => a.id), [explicitX], '9: explicit Special Day X shown, stale weekly E absent');
    assert.equal(day.activities[0].completed, true, '10: completion overlaid for X from the matching log item');

    // ── 13: canonical exclusion wins even if a stale log still contains the excluded item ──
    const weeklyF = await seedActivity('F');
    const periodG = await seedActivity('G');
    await seedWeeklyDay(6, [{ activityId: weeklyF }]); // Saturday
    const dateStr6 = '2027-02-06';
    const tplG = await seedFamilyTemplate([{ activityId: periodG }]);
    await createSchedulePeriod({ familyId, childId, name: 'P4', startDate: dateStr6, endDate: dateStr6, sourceType: 'family_template', sourceId: tplG, applyMode: 'merge' });
    await getOrGenerateDailyLog(childId, dateStr6); // log has F+G at this point
    await db.query(`INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id) VALUES ($1, $2, $3)`, [childId, dateStr6, periodG]);

    week = await fetchWeek(weeksUntil(dateStr6));
    day = week.days.find((d) => d.date === dateStr6);
    assert.deepEqual(day.activities.map((a) => a.id), [weeklyF], '13: excluded item G does not reappear from the stale log');

    // ── 16: no schedule + a stale non-once planning log item — must not be treated as current plan ──
    const staleAct = await seedActivity('StaleOnly');
    const dateStr7 = '2027-02-07'; // Sunday, no weekly row seeded
    const logResult = await db.query(`INSERT INTO daily_log (child_id, date, is_paused) VALUES ($1, $2, false) RETURNING id`, [childId, dateStr7]);
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section) VALUES ($1, $2, 'Stale', '⭐', 1, 0, 'morgon')`,
      [logResult.rows[0].id, staleAct]
    );
    week = await fetchWeek(weeksUntil(dateStr7));
    day = week.days.find((d) => d.date === dateStr7);
    assert.deepEqual(day.activities, [], '16: no canonical plan — the stale non-once log item must not be treated as the current plan');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('Phase 4 — calendar-week: once-tasks are an additive execution-only overlay, never affecting base_type', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { getOrGenerateDailyLog } = require('../src/lib/daily-log-generator');
  const tag = Date.now();
  const password = 'calendar-oncetask-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(`INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Calendar once-task', 'Europe/Stockholm', true) RETURNING id`);
  const familyId = familyRes.rows[0].id;
  const email = `calendar-oncetask-${tag}@example.com`;
  await db.query(`INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified) VALUES ($1, $2, $3, 'Parent', true, true)`, [email, passwordHash, familyId]);
  const childRes = await db.query(`INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`, [familyId, `barn-once-${tag}`]);
  const childId = childRes.rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) SELECT id, $2, 'primary' FROM parent WHERE email = $1`, [email, childId]);

  const weeklyAct = (await db.query(`INSERT INTO activity_template (family_id, name, icon, star_value, sort_order) VALUES ($1,'A','⭐',1,0) RETURNING id`, [familyId])).rows[0].id;
  const dateStr = '2027-02-08'; // a Monday
  await db.query('INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 1::smallint, 1::integer) RETURNING id', [childId])
    .then(async (r) => db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`, [r.rows[0].id, weeklyAct]));

  const { log } = await getOrGenerateDailyLog(childId, dateStr);
  await db.query(
    `INSERT INTO daily_log_item (daily_log_id, is_once_task, name, icon, star_value, sort_order, section, completed) VALUES ($1, true, 'Engångsaktivitet', '⭐', 1, 99, 'dag', true)`,
    [log.id]
  );

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = { 'Content-Type': 'application/json', Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken };
    const todayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const todayDow = todayUtc.getUTCDay();
    const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1;
    const thisWeekMonday = new Date(todayUtc);
    thisWeekMonday.setUTCDate(todayUtc.getUTCDate() - daysFromMonday);
    const weekOffset = Math.round((new Date(`${dateStr}T00:00:00Z`) - thisWeekMonday) / (7 * 24 * 60 * 60 * 1000));

    const res = await fetch(`${baseUrl}/api/children/${childId}/calendar-week?weekOffset=${weekOffset}`, { headers });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    const day = body.days.find((d) => d.date === dateStr);

    assert.equal(day.activities.length, 2, 'canonical A + the additive once-task');
    const canonical = day.activities.find((a) => a.source === 'template');
    const onceTask = day.activities.find((a) => a.source === 'once_task');
    assert.ok(canonical && canonical.id === weeklyAct, 'canonical A present, unaffected by the once-task');
    assert.ok(onceTask && onceTask.name === 'Engångsaktivitet' && onceTask.completed === true, 'once-task shown as an additive, completed item');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('Phase 4 — calendar-week custody A/B: correct home items shown with no log dependency', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'calendar-custody-pass-1';
  const passwordHash = await hashPassword(password);
  const familyRes = await db.query(`INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Calendar custody', 'Europe/Stockholm', true) RETURNING id`);
  const familyId = familyRes.rows[0].id;
  const email = `calendar-custody-${tag}@example.com`;
  await db.query(`INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified) VALUES ($1, $2, $3, 'Parent', true, true)`, [email, passwordHash, familyId]);
  const childRes = await db.query(`INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`, [familyId, `barn-cc-${tag}`]);
  const childId = childRes.rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) SELECT id, $2, 'primary' FROM parent WHERE email = $1`, [email, childId]);

  const homeA = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos mamma') RETURNING id`, [familyId]);
  const homeB = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos pappa') RETURNING id`, [familyId]);
  const anchorMonday = '2026-11-09';
  await db.query(
    `INSERT INTO custody_pattern (child_id, anchor_date, interval_weeks, week_a_home_id, week_b_home_id, pattern_type) VALUES ($1, $2, 2, $3, $4, 'alternate_weeks')`,
    [childId, anchorMonday, homeA.rows[0].id, homeB.rows[0].id]
  );

  const activityA = await db.query(`INSERT INTO activity_template (family_id, name, icon, star_value, sort_order) VALUES ($1,'HomeAAct','⭐',1,0) RETURNING id`, [familyId]);
  const activityB = await db.query(`INSERT INTO activity_template (family_id, name, icon, star_value, sort_order) VALUES ($1,'HomeBAct','⭐',1,0) RETURNING id`, [familyId]);
  await db.query(`INSERT INTO weekly_schedule (child_id, day_of_week, sort_order, custody_home_id, week_variant) VALUES ($1, 1::smallint, 1::integer, $2, 'a') RETURNING id`, [childId, homeA.rows[0].id])
    .then(async (r) => db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`, [r.rows[0].id, activityA.rows[0].id]));
  await db.query(`INSERT INTO weekly_schedule (child_id, day_of_week, sort_order, custody_home_id, week_variant) VALUES ($1, 1::smallint, 1::integer, $2, 'b') RETURNING id`, [childId, homeB.rows[0].id])
    .then(async (r) => db.query(`INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'morgon')`, [r.rows[0].id, activityB.rows[0].id]));

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = { 'Content-Type': 'application/json', Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken };

    const todayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const todayDow = todayUtc.getUTCDay();
    const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1;
    const thisWeekMonday = new Date(todayUtc);
    thisWeekMonday.setUTCDate(todayUtc.getUTCDate() - daysFromMonday);
    const weeksUntilAnchor = Math.round((new Date(`${anchorMonday}T00:00:00Z`) - thisWeekMonday) / (7 * 24 * 60 * 60 * 1000));

    const weekA = await (await fetch(`${baseUrl}/api/children/${childId}/calendar-week?weekOffset=${weeksUntilAnchor}`, { headers })).json();
    const dayA = weekA.days.find((d) => d.date === anchorMonday);
    assert.deepEqual(dayA.activities.map((a) => a.id), [activityA.rows[0].id], '8: anchor week (home A) shows home A activity with no log dependency');
    assert.equal(dayA.hasLog, false);

    const nextMonday = '2026-11-16';
    const weekB = await (await fetch(`${baseUrl}/api/children/${childId}/calendar-week?weekOffset=${weeksUntilAnchor + 1}`, { headers })).json();
    const dayB = weekB.days.find((d) => d.date === nextMonday);
    assert.deepEqual(dayB.activities.map((a) => a.id), [activityB.rows[0].id], '8: next week (home B) shows home B activity with no log dependency');
  } finally {
    await close();
    await db.cleanup();
  }
});
