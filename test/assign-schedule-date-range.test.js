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

  it('library copy dialog supports period date range', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library-schema.js'), 'utf8');
    assert.match(src, /copySchedUsePeriod/);
    assert.match(src, /standard_schedule_id/);
    assert.match(src, /schedule_template_id/);
    assert.match(src, /apply-date-range/);
  });

  it('backend exposes apply-date-range with standard and family sources', () => {
    const bulk = fs.readFileSync(path.join(ROOT, 'src/routes/schedules/child-bulk.js'), 'utf8');
    const schemas = fs.readFileSync(path.join(ROOT, 'src/lib/schemas.js'), 'utf8');
    assert.match(bulk, /\/apply-date-range/);
    assert.match(bulk, /standard_schedule_id/);
    assert.match(bulk, /resolveStandardScheduleDateRangeItems/);
    assert.match(schemas, /standard_schedule_id/);
  });
});
