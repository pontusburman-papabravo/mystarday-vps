'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('daily-log sync preserves is_once_task rows', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../src/lib/daily-log-generator.js'),
    'utf8'
  );

  it('syncDailyLogWithSchedule and syncDailyLogForSpecialDay SELECT is_once_task', () => {
    const syncSelects = [...src.matchAll(
      /SELECT id, activity_template_id, is_once_task, name, icon, start_time, end_time,\s+star_value, completed, sort_order, section\s+FROM daily_log_item/g
    )];
    assert.equal(
      syncSelects.length,
      2,
      'both sync helpers must load is_once_task so engångsaktiviteter are not deleted'
    );
  });

  it('sync UPDATE loops skip is_once_task rows', () => {
    const skipCount = (src.match(/if \(di\.is_once_task\) continue;/g) || []).length;
    assert.ok(skipCount >= 2, 'UPDATE loops must skip engångsaktiviteter');
  });
});
