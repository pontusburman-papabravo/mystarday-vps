'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isCustodyHandoffEve } = require('../src/lib/custody-notify');

const ROOT = path.join(__dirname, '..');

describe('FEAT-1B boendeschema', () => {
  it('isCustodyHandoffEve detects variant change tomorrow', () => {
    const pattern = {
      anchor_date: '2026-06-01',
      interval_weeks: 2,
      week_a_home_id: 'a',
      week_b_home_id: 'b',
    };
    assert.equal(isCustodyHandoffEve(pattern, '2026-06-07'), true);
    assert.equal(isCustodyHandoffEve(pattern, '2026-06-04'), false);
  });

  it('daily-log-generator uses custody schedule resolve', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/daily-log-generator.js'), 'utf8');
    assert.match(src, /resolveWeeklyScheduleId/);
  });

  it('push-reminder filters by custody parent', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/push-reminder-scheduler.js'), 'utf8');
    assert.match(src, /getNotifyParentIdsForChildDate/);
    assert.match(src, /sendCustodyMorningReminders/);
  });

  it('custody handoff scheduler registered in server', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(src, /startCustodyHandoffScheduler/);
  });

  it('daily-log has print my days', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/daily-log.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'public/js/daily-log.js'), 'utf8');
    assert.match(html, /printMyDaysBtn/);
    assert.match(js, /printMyDaysWeek/);
    assert.match(js, /print_schema_exported/);
  });

  it('BC-11 print discoverability from planning and schedule', () => {
    const planning = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
    const schedule = fs.readFileSync(path.join(ROOT, 'public/schedule.html'), 'utf8');
    const printPage = fs.readFileSync(path.join(ROOT, 'public/print-schema.html'), 'utf8');
    const printJs = fs.readFileSync(path.join(ROOT, 'public/js/print-schema.js'), 'utf8');
    const core = fs.readFileSync(path.join(ROOT, 'public/js/print-schema-core.js'), 'utf8');
    assert.match(planning, /Skriv ut schema/);
    assert.match(planning, /\/print-schema/);
    assert.match(schedule, /schedulePrintLink/);
    assert.match(printPage, /1 vecka/);
    assert.match(printPage, /1 månad/);
    assert.match(printJs, /print_schema_exported/);
    assert.match(core, /PERIODS/);
    assert.match(core, /A4 landscape/);
  });
});
