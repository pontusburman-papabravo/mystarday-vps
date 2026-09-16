'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  clampDays,
  sharePct,
  classifyTemplateSource,
  fillDailySeries,
  weekdayFromIsoRows,
  sectionsFromRows,
  scheduleWeekdaysFromRows,
  sourceBucketsFromCounts,
  buildUsageHeadline,
  DEFINITIONS,
} = require('../src/lib/admin-usage-over-time');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('usage-over-time number helpers', () => {
  it('clamps day range to 7–90', () => {
    assert.equal(clampDays('90'), 90);
    assert.equal(clampDays(3), 7);
    assert.equal(clampDays(400), 90);
    assert.equal(clampDays('nope'), 90);
  });

  it('fills missing calendar days with zeros', () => {
    const series = fillDailySeries(
      [{ day: '2026-09-02', completions: 8, families: 3, children: 2 }],
      '2026-09-01',
      '2026-09-03'
    );
    assert.equal(series.length, 3);
    assert.deepEqual(series[0], { day: '2026-09-01', completions: 0, families: 0, children: 0 });
    assert.equal(series[1].completions, 8);
    assert.equal(series[2].day, '2026-09-03');
  });

  it('puts Monday first and Sunday last from ISODOW', () => {
    const weekday = weekdayFromIsoRows([
      { iso_dow: 1, completions: 10, families: 4 },
      { iso_dow: 7, completions: 2, families: 1 },
    ]);
    assert.equal(weekday.days[0].label, 'Mån');
    assert.equal(weekday.days[6].label, 'Sön');
    assert.equal(weekday.peak.label, 'Mån');
    assert.equal(weekday.weekday_share, 83.3);
    assert.equal(weekday.weekend_share, 16.7);
  });

  it('classifies activity sources without mixing buckets', () => {
    assert.equal(classifyTemplateSource('user'), 'user');
    assert.equal(classifyTemplateSource('admin'), 'library');
    assert.equal(classifyTemplateSource(''), 'unknown');
    assert.equal(classifyTemplateSource(null), 'unknown');
    const buckets = sourceBucketsFromCounts({ user: 10, library: 30, unknown: 60 });
    assert.equal(buckets.total, 100);
    assert.equal(buckets.user_share, 10);
    assert.equal(sharePct(1, 0), 0);
  });

  it('keeps schedule weekdays in Monday-first display order', () => {
    const days = scheduleWeekdaysFromRows([
      { day_of_week: 0, items: 10, children: 4 },
      { day_of_week: 1, items: 20, children: 8 },
    ]);
    assert.equal(days[0].label, 'Mån');
    assert.equal(days[0].items, 20);
    assert.equal(days[6].label, 'Sön');
    assert.equal(days[6].items, 10);
  });

  it('orders morning before evening even when SQL omits a section', () => {
    const sections = sectionsFromRows([{ section: 'kvall', completions: 4, families: 2 }]);
    assert.equal(sections[0].label, 'Morgon');
    assert.equal(sections[0].completions, 0);
    assert.equal(sections[2].label, 'Kväll');
    assert.equal(sections[2].completions, 4);
  });

  it('writes a Swedish headline from the same numbers as the charts', () => {
    const weekday = weekdayFromIsoRows([
      { iso_dow: 2, completions: 12, families: 5 },
      { iso_dow: 6, completions: 3, families: 2 },
    ]);
    const headline = buildUsageHeadline({
      weekday,
      custom: { families_with_user: 35, families_with_any_template: 367 },
      periodDays: 90,
    });
    assert.match(headline, /Tis har flest avbockningar \(12\)/);
    assert.match(headline, /35 av 367 familjer/);
    assert.doesNotMatch(headline, /KPI/);
  });
});

describe('usage-over-time SQL stays on completions and product families', () => {
  const src = read('db/usage-over-time.js');
  const route = read('src/routes/admin/analytics.js');

  it('excludes archived and admin families', () => {
    assert.match(src, /archived_at IS NULL/);
    assert.match(src, /p\.is_admin = true/);
  });

  it('uses Swedish completion dates and ISO weekdays, not event logs', () => {
    assert.match(src, /Europe\/Stockholm/);
    assert.match(src, /EXTRACT\(ISODOW FROM/);
    assert.match(src, /completed_date/);
    assert.match(src, /dli\.completed = true/);
    assert.doesNotMatch(src, /FROM analytics_events/);
    assert.doesNotMatch(src, /EXTRACT\(DOW FROM/);
  });

  it('counts own activities as source user', () => {
    assert.match(src, /source, ''\) = 'user'/);
    assert.match(src, /source, ''\) = 'admin'/);
  });

  it('exposes a dedicated admin route', () => {
    assert.match(route, /\/analytics\/usage-over-time/);
    assert.match(route, /getUsageOverTime/);
  });
});

describe('Så används appen copy', () => {
  it('adds a readable tab and does not reuse login KPIs', () => {
    const analytics = read('public/admin/admin-analytics.js');
    const ui = read('public/admin/admin-usage-over-time.js');
    const html = read('public/admin/index.html');
    assert.match(analytics, /data-tab="how-used">Så används appen</);
    assert.match(analytics, /howUsedRoot/);
    assert.match(ui, /Avbockningar dag för dag/);
    assert.match(ui, /Egna aktiviteter eller biblioteket/);
    assert.match(ui, /Namngivna scheman/);
    assert.match(ui, /usage-over-time\?days=/);
    assert.match(html, /admin-usage-over-time\.js/);
    assert.doesNotMatch(ui, /Trusted-device/);
    assert.doesNotMatch(ui, /Ghost Families/);
    assert.ok(DEFINITIONS.customActivities.includes('user'));
  });
});
