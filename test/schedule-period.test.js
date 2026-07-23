const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('schedule lovperiod UI', () => {
  it('schedule page loads period module and modal', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/schedule.html'), 'utf8');
    assert.match(html, /schedule-period\.js/);
    assert.match(html, /id="schedulePeriodModal"/);
    assert.match(html, /id="schedulePeriodStart"/);
    assert.match(html, /id="schedulePeriodEnd"/);
    assert.match(html, /Lovperiod/);
  });

  it('special-days view promotes lovperiod entry point', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-special-days.js'), 'utf8');
    assert.match(src, /openSchedulePeriodModal/);
    assert.match(src, /Lägg till lovperiod/);
  });

  it('schedule-period.js calls apply-date-range with standard or family source', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-period.js'), 'utf8');
    assert.match(src, /apply-date-range/);
    assert.match(src, /standard_schedule_id/);
    assert.match(src, /schedule_template_id/);
    assert.match(src, /standard-library\/schedules/);
  });
});
