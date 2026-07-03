'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('schedule delete all days', () => {
  it('items.js exposes DELETE /:itemId/all-days', () => {
    const src = read('src/routes/schedules/items.js');
    assert.match(src, /router\.delete\('\/:itemId\/all-days'/);
    assert.match(src, /activity_template_id = \$2/);
    assert.match(src, /schedule_date_exclusion/);
  });

  it('schedule modals call deleteAllDays endpoint', () => {
    const scheduleSrc = read('public/js/schedule-activity-modals.js');
    const dashSrc = read('public/js/dashboard-activity-modal.js');
    assert.match(scheduleSrc, /\/all-days/);
    assert.match(scheduleSrc, /deleteAllDays/);
    assert.match(dashSrc, /\/all-days/);
    assert.match(dashSrc, /deleteAllDays/);
  });

  it('recurrence modal has hidden all-days button in HTML', () => {
    const scheduleHtml = read('public/schedule.html');
    const dashHtml = read('public/dashboard.html');
    assert.match(scheduleHtml, /id="recurrenceAllDaysBtn"/);
    assert.match(dashHtml, /id="recurrenceAllDaysBtn"/);
  });
});
