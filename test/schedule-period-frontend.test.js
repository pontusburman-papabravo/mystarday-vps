'use strict';

/**
 * Phase 2 — first-class Specialperiod UI (public/js/schedule-period.js +
 * public/js/schedule-special-days.js + public/schedule.html). Source-pattern
 * characterization test, same style as test/schedule-add-menu.test.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MODULE = 'public/js/schedule-period.js';
const SPECIAL_DAYS_MODULE = 'public/js/schedule-special-days.js';
const HTML = 'public/schedule.html';

describe('Phase 2 — Specialperiod UI (list/create/edit/delete by period id)', () => {
  it('1: the calendar view renders a period list mount, populated after every render', () => {
    const specialDaysSrc = read(SPECIAL_DAYS_MODULE);
    assert.match(specialDaysSrc, /id="schedulePeriodsListMount"/);
    assert.match(specialDaysSrc, /renderSchedulePeriodsList/);
  });

  it('2: "+ Ny specialperiod" entry point opens the canonical modal in create mode', () => {
    const specialDaysSrc = read(SPECIAL_DAYS_MODULE);
    assert.match(specialDaysSrc, /onclick="openSchedulePeriodModal\(\)"/);
  });

  it('3: create submits to the canonical POST /schedule-periods endpoint with an operation_id', () => {
    const src = read(MODULE);
    const fnBody = src.slice(src.indexOf('async function submitSchedulePeriod'), src.indexOf('async function submitSchedulePeriod') + 2200);
    assert.match(fnBody, /\/schedule-periods`/);
    assert.match(fnBody, /const method = editingPeriodId \? 'PATCH' : 'POST'/);
    assert.match(fnBody, /ScheduleApplyClient\.newOperationId\(\)/);
    assert.doesNotMatch(fnBody, /apply-date-range/);
  });

  it('4/5: edit loads the period fresh by id (GET) and PATCHes by the same id — never re-derives it from re-entered dates', () => {
    const src = read(MODULE);
    const openFnBody = src.slice(src.indexOf('async function openSchedulePeriodModal'), src.indexOf('function closeSchedulePeriodModal'));
    assert.match(openFnBody, /GET|apiFetch\(`\/api\/children\/\$\{currentChildId\}\/schedule-periods\/\$\{editingPeriodId\}`\)/);
    assert.doesNotMatch(openFnBody, /start_date === |\.find\(\(p\) => p\.start_date/, 'must never look up an existing period by matching re-entered dates');

    const submitFnBody = src.slice(src.indexOf('async function submitSchedulePeriod'), src.indexOf('async function submitSchedulePeriod') + 2200);
    assert.match(submitFnBody, /schedule-periods\/\$\{editingPeriodId\}/);
  });

  it('6: delete operates on editingPeriodId directly, never on a date-range guess', () => {
    const src = read(MODULE);
    const fnBody = src.slice(src.indexOf('function confirmDeleteSchedulePeriod'), src.indexOf('function confirmDeleteSchedulePeriod') + 900);
    assert.match(fnBody, /schedule-periods\/\$\{periodId\}/);
    assert.match(fnBody, /method:\s*'DELETE'/);
  });

  it('7: delete requires an explicit confirmation (reuses the shared Ta bort/Avbryt confirm modal, never a bare browser confirm())', () => {
    const src = read(MODULE);
    const fnBody = src.slice(src.indexOf('function confirmDeleteSchedulePeriod'), src.indexOf('function confirmDeleteSchedulePeriod') + 900);
    assert.match(fnBody, /window\.openConfirmModal/);
    assert.doesNotMatch(fnBody, /\bconfirm\(/, 'must not use the generic browser confirm() dialog');
  });

  it('8: no requirement to re-enter dates to locate an existing period — edit/delete both key off editingPeriodId only', () => {
    const src = read(MODULE);
    assert.match(src, /let editingPeriodId = null/);
    assert.doesNotMatch(src, /periods\.find\(\(p\) => p\.start_date === start && p\.end_date === end\)/, 'the old date-matching fallback lookup must be fully removed');
  });

  it('9/10: template source picker offers both "Mina scheman" (family templates) and "Färdiga scheman" (standard library)', () => {
    const src = read(MODULE);
    assert.match(src, /schedule\.period\.mySchedules/);
    assert.match(src, /schedule\.period\.readyMade/);
    assert.match(src, /standardSchedules/);
    assert.match(src, /familyTemplates/);
  });

  it('11/12/13: apply-mode picker exposes exactly the three canonical modes with Swedish-facing labels, never the backend words', () => {
    const html = read(HTML);
    assert.match(html, /data-period-mode="merge"/);
    assert.match(html, /data-period-mode="replace_sections"/);
    assert.match(html, /data-period-mode="replace_day"/);
    assert.match(html, /schedule\.period\.modeMerge"/);
    assert.match(html, /schedule\.period\.modeReplaceSections"/);
    assert.match(html, /schedule\.period\.modeReplaceDay"/);
    // Never expose the raw backend mode names as visible copy (only as data attributes/JS values).
    const visibleTextOnly = html.replace(/data-period-mode="[^"]*"/g, '').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(visibleTextOnly, />merge</);
    assert.doesNotMatch(visibleTextOnly, />replace_sections</);
    assert.doesNotMatch(visibleTextOnly, />replace_day</);
  });

  it('14: each apply mode has an always-visible explanatory hint (destructive effect of replace_day is never hidden behind a generic Save)', () => {
    const html = read(HTML);
    assert.match(html, /schedule\.period\.modeMergeHint/);
    assert.match(html, /schedule\.period\.modeReplaceSectionsHint/);
    assert.match(html, /schedule\.period\.modeReplaceDayHint/);
  });

  it('default apply mode is merge, not the legacy destructive replace_day', () => {
    const src = read(MODULE);
    assert.match(src, /let currentMode = 'merge'/);
  });

  it('17: every mode-picker control and list action meets the >=44px touch target', () => {
    const html = read(HTML);
    const modalBlock = html.slice(html.indexOf('id="schedulePeriodModal"'), html.indexOf('<!-- Service Worker'));
    const touchTargetCount = (modalBlock.match(/min-h-\[44px\]/g) || []).length;
    assert.ok(touchTargetCount >= 4, `expected >=4 min-h-[44px] controls in the period modal, found ${touchTargetCount}`);
  });

  it('18: no interaction in the period flow requires drag-and-drop', () => {
    const src = read(MODULE);
    assert.doesNotMatch(src, /draggable=|dragstart|ondrop/);
  });

  it('legacy apply-date-range is documented as retained for other callers, and this module never calls it', () => {
    const src = read(MODULE);
    assert.match(src, /apply-date-range route is retained/);
    const codeOnly = src.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
    assert.doesNotMatch(codeOnly, /\/apply-date-range/, 'no actual code (outside doc comments) may call the legacy route');
  });
});
