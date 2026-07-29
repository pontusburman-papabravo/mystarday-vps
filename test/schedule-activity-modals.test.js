const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-activity-modals.js';
const HOST = 'public/js/schedule.js';
const HTML = 'public/schedule.html';

const WINDOW_FNS = [
  'loadTemplates',
  'openAddModal',
  'closeAddModal',
  'submitAddActivity',
  'openRecurrenceModal',
  'confirmRecurrenceMultiDay',
  'openCreateActivityModal',
  'submitCreateActivity',
  'openEditTemplateModal',
  'openEditItem',
  'submitEditItem',
  'removeItem',
  'resetRecurrenceModalTexts',
  'bindRecurrenceAddHandlers',
];

const EXTRACTED_FNS = [
  'loadTemplates',
  'openAddModal',
  'submitAddActivity',
  'openRecurrenceModal',
  'confirmRecurrenceMultiDay',
  'openCreateActivityModal',
  'openEditTemplateModal',
  'openEditItem',
  'removeItem',
  'bindRecurrenceAddHandlers',
];

describe('Fas 8 PR-S3 schedule-activity-modals.js', () => {
  it('is an IIFE exposing activity modal handlers on window', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m, `${MODULE} must be an IIFE`);
    for (const fn of WINDOW_FNS) {
      assert.match(src, new RegExp(`function ${fn}\\b`), `${MODULE} must define ${fn}`);
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${MODULE} must expose window.${fn}`);
    }
  });

  it('uses ScheduleCore and cal-nav helpers for recurrence date math', () => {
    const src = read(MODULE);
    assert.match(src, /window\.ScheduleCore/);
    assert.match(src, /window\.getWeekStart/);
    assert.match(src, /window\.getDayFromOffset/);
  });

  it('preserves add/recurrence/edit modal DOM contract', () => {
    const src = read(MODULE);
    assert.match(src, /getElementById\('addActivityModal'\)/);
    assert.match(src, /getElementById\('recurrenceModal'\)/);
    assert.match(src, /getElementById\('createActivityModal'\)/);
    assert.match(src, /getElementById\('editItemModal'\)/);
    assert.match(src, /getElementById\('editTemplateModal'\)/);
    assert.match(src, /recurrenceStep1/);
    assert.match(src, /recurrenceDayPicker/);
  });

  it('schedule.js no longer defines extracted activity modal functions', () => {
    const src = read(HOST);
    for (const fn of EXTRACTED_FNS) {
      assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `schedule.js must not define ${fn}`);
    }
    assert.match(src, /schedule-activity-modals\.js/);
  });

  it('schedule.js retains shared modal state declarations', () => {
    const src = read(HOST);
    assert.match(src, /let selectedTemplateId/);
    assert.match(src, /let addSectionOverride/);
    assert.match(src, /let _pendingRecurrenceTemplateId/);
    assert.match(src, /let allTemplates/);
    assert.match(src, /let editSectionVal/);
  });

  it('schedule.html loads activity-modals after schedule-core and before schedule.js', () => {
    const html = read(HTML);
    const coreIdx = html.indexOf('schedule-core.js');
    const modIdx = html.indexOf('schedule-activity-modals.js');
    const hostIdx = html.indexOf('schedule.js?v=');
    assert.ok(coreIdx !== -1 && modIdx !== -1 && hostIdx !== -1, 'expected script tags');
    assert.ok(coreIdx < modIdx, 'schedule-core before activity-modals');
    assert.ok(modIdx < hostIdx, 'activity-modals before schedule.js');
  });

  it('schedule.html preserves activity modal onclick contract', () => {
    const html = read(HTML);
    assert.match(html, /onclick="submitAddActivity\(\)"/);
    assert.match(html, /onclick="submitCreateActivity\(\)"/);
    assert.match(html, /onclick="confirmRecurrenceMultiDay\(\)"/);
    assert.match(html, /oninput="filterTemplates\(\)"/);
  });

  it('parent-magic-common styles addActivityModal time/date inputs for dark magic', () => {
    const css = read('public/css/parent-magic-common.css');
    assert.match(css, /#addActivityModal input\[type="time"]/);
    assert.match(css, /#addActivityModal #templateList \.text-navy/);
    assert.match(css, /color-scheme: dark/);
  });
});
