const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('assign-schedule date range', () => {
  it('assign-schedule UI has period checkbox and date inputs', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/assign-schedule.html'), 'utf8');
    assert.match(html, /id="usePeriodRange"/);
    assert.match(html, /id="periodStartDate"/);
    assert.match(html, /id="periodEndDate"/);
    assert.match(html, /apply-date-range/);
    assert.match(html, /Begränsa till period/);
  });

  it('backend exposes apply-date-range on child schedules router', () => {
    const bulk = fs.readFileSync(path.join(ROOT, 'src/routes/schedules/child-bulk.js'), 'utf8');
    const schemas = fs.readFileSync(path.join(ROOT, 'src/lib/schemas.js'), 'utf8');
    assert.match(bulk, /\/apply-date-range/);
    assert.match(bulk, /ApplyDateRangeSchema/);
    assert.match(bulk, /special_day_schedule/);
    assert.match(schemas, /ApplyDateRangeSchema/);
  });
});
