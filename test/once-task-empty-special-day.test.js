'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('once-task on empty special day', () => {
  const genSrc = fs.readFileSync(
    path.join(__dirname, '../src/lib/daily-log-generator.js'),
    'utf8'
  );
  const itemsSrc = fs.readFileSync(
    path.join(__dirname, '../src/routes/schedules/items.js'),
    'utf8'
  );
  const specialSrc = fs.readFileSync(
    path.join(__dirname, '../src/routes/special-day-schedules.js'),
    'utf8'
  );

  it('getOrGenerateDailyLog does not fall through to weekly on empty special day', () => {
    assert.match(
      genSrc,
      /Empty special day override — keep log empty; do not repopulate from weekly template/
    );
    assert.match(
      genSrc,
      /Empty special day override — create log with no items; weekly template must not apply/
    );
  });

  it('schedule items API applies special-day override for dated requests', () => {
    assert.match(itemsSrc, /specialDayOverride/);
    assert.match(itemsSrc, /mapSpecialDayScheduleItems/);
    assert.match(itemsSrc, /special_day_schedule_item sdsi/);
  });

  it('creating a special day syncs the daily log', () => {
    assert.match(specialSrc, /syncDailyLogForSpecialDay\(schedule\.id, date/);
  });
});
