'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('FEAT-1C schedule custody UI', () => {
  it('child-crud filters schedules by week_variant', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/schedules/child-crud.js'), 'utf8');
    assert.match(src, /week_variant/);
    assert.match(src, /resolveCustodyVariantFilter/);
    assert.match(src, /custody_home_id/);
  });

  it('CreateScheduleSchema accepts week_variant', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/schemas.js'), 'utf8');
    assert.match(src, /week_variant: z\.enum\(\['a', 'b'\]\)/);
  });

  it('schedule-custody.js module exists and is wired', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/schedule-custody.js')));
    const html = fs.readFileSync(path.join(ROOT, 'public/schedule.html'), 'utf8');
    assert.match(html, /schedule-custody\.js/);
    const schedule = fs.readFileSync(path.join(ROOT, 'public/js/schedule.js'), 'utf8');
    assert.match(schedule, /ScheduleCustody/);
  });
});
