'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('calendar custody (Phase 4.3, revised Phase 4 canonical-integration pass)', () => {
  it('calendar-week still uses the custody schedule engine for its own UI metadata (home label/color/banner)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    assert.match(src, /resolveCustodyDateSync/);
    assert.match(src, /loadCustodyContext/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
    assert.doesNotMatch(src, /getHomeForDate/);
  });

  it('Phase 4 — calendar-week no longer independently re-decides special-day-vs-weekly-vs-period precedence; it delegates to the canonical resolver', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    // The old direct weekly_schedule/weekly_schedule_item query + custody_home_id/week_variant
    // template-grouping + templateActivitiesForDay() lookup (Phase 3's documented duplicate-
    // precedence gap — no Special Period awareness) has been removed entirely.
    assert.doesNotMatch(src, /function templateActivitiesForDay/, 'templateActivitiesForDay() must be fully removed, not left as dead code');
    assert.doesNotMatch(src, /templatesByVariant|templatesByHome/, 'the old template-grouping maps must be fully removed');
    assert.doesNotMatch(src, /FROM weekly_schedule ws/, 'calendar.js must not run its own direct weekly_schedule query for activity selection');
    assert.doesNotMatch(src, /weekVariantForHomeId/, 'the custody_home_id → week_variant → legacy fallback now lives exclusively inside resolveWeeklyScheduleId(), not duplicated here');
    // The canonical resolver is now the sole source of activities for a date with no generated log.
    assert.match(src, /resolveEffectiveScheduleRange/);
    assert.match(src, /require\(['"]\.\.\/lib\/effective-schedule['"]\)/);
  });

  it('resolveEffectiveScheduleRange() is a thin wrapper that delegates to resolveEffectiveSchedule() — no second precedence implementation', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/effective-schedule.js'), 'utf8');
    const fnMatch = src.match(/async function resolveEffectiveScheduleRange[\s\S]*?^}/m);
    assert.ok(fnMatch, 'resolveEffectiveScheduleRange not found');
    assert.match(fnMatch[0], /await resolveEffectiveSchedule\(/, 'the range helper must call resolveEffectiveSchedule() per date, not reimplement composition');
    assert.doesNotMatch(fnMatch[0], /composePeriodWithWeekly|loadWeeklyItems|loadPeriodForDate|loadSpecialDayItems/, 'the range helper must not call the resolver\'s internal primitives directly — only the public resolveEffectiveSchedule()');
  });

  it('custody UI metadata (calendarDayCustodyPayload) is preserved and computed independently of activity item selection', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    assert.match(src, /function calendarDayCustodyPayload/);
    assert.match(src, /legacyWeekVariant/);
  });
});
