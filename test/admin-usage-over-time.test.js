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
  CSV_BOM,
  CSV_SEPARATOR,
  buildUsageOverTimeCsv,
  usageCsvFilename,
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

describe('usage-over-time CSV export', () => {
  const weekday = weekdayFromIsoRows([
    { iso_dow: 1, completions: 10, families: 4 },
    { iso_dow: 7, completions: 2, families: 1 },
  ]);
  const sample = {
    period: { days: 90, from: '2026-06-20', to: '2026-09-17', timezone: 'Europe/Stockholm' },
    headline: 'Mån har flest avbockningar (10).',
    definitions: DEFINITIONS,
    totals: {
      product_families: 367,
      completions: 12,
      families_active: 5,
      children_active: 6,
      peak_daily_families: 3,
      children: 403,
      children_with_week: 387,
      children_with_items: 380,
    },
    daily: [
      { day: '2026-09-16', completions: 7, families: 3, children: 4 },
    ],
    weekday,
    sections: [{ section: 'morgon', label: 'Morgon', completions: 8, families: 3 }],
    custom: {
      user_templates: 238,
      families_with_user: 35,
      library_templates: 3024,
      families_with_library: 115,
      unknown_templates: 6428,
      families_with_unknown: 265,
      templates_total: 9690,
      families_with_any_template: 367,
    },
    template_sources: sourceBucketsFromCounts({ user: 238, library: 3024, unknown: 6428 }),
    completion_sources: {
      ...sourceBucketsFromCounts({ user: 116, library: 270, unknown: 1339 }),
      families: { user: 20, library: 40, unknown: 80 },
    },
    top_activities: [{ name: 'Borsta tänderna; kväll', completions: 110, families: 40 }],
    schedule_weekdays: scheduleWeekdaysFromRows([{ day_of_week: 1, items: 20, children: 8 }]),
    named_templates: [{ name: 'Skoldag', schedule_rows: 12, families: 4, children: 5 }],
    rewards: { redemptions: 16, families: 4, children: 3 },
    special_days: { count: 289, children: 26 },
  };

  it('writes Excel-friendly Swedish CSV from the same payload as the tab', () => {
    const csv = buildUsageOverTimeCsv(sample);
    assert.equal(csv.charCodeAt(0), CSV_BOM.charCodeAt(0));
    assert.match(csv, new RegExp(`^${CSV_BOM}"tabell"${CSV_SEPARATOR}"nyckel"`));
    assert.match(csv, /"dag";"2026-09-16";"2026-09-16";"7";"3";"4";"";"/);
    assert.match(csv, /"veckodag";"1";"Mån";"10";"4"/);
    assert.match(csv, /"aktivitet";"Borsta tänderna; kväll";"Borsta tänderna; kväll";"110";"40"/);
    assert.match(csv, /"aktivitetskalla";"user".*"238";"35"/);
    assert.match(csv, /"beloning";"redemptions";"Belöningar hämtade";"16";"4";"3"/);
    assert.match(csv, /"definition";"customActivities";"Egna aktiviteter"/);
    assert.match(csv, /Europe\/Stockholm/);
    assert.doesNotMatch(csv, /analytics_events/);
    assert.equal(usageCsvFilename(sample), 'anvandning-over-tid-90d-2026-09-17.csv');
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

  it('exposes a dedicated admin route and CSV download', () => {
    assert.match(route, /\/analytics\/usage-over-time/);
    assert.match(route, /\/analytics\/usage-over-time\.csv/);
    assert.match(route, /getUsageOverTime/);
    assert.match(route, /buildUsageOverTimeCsv/);
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
    assert.match(ui, /Ladda ner CSV/);
    assert.match(ui, /usage-over-time\.csv\?days=/);
    assert.match(html, /admin-usage-over-time\.js/);
    assert.doesNotMatch(ui, /Trusted-device/);
    assert.doesNotMatch(ui, /Ghost Families/);
    assert.ok(DEFINITIONS.customActivities.includes('user'));
  });
});
