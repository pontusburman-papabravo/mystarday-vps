'use strict';

/**
 * Phase 1B frontend — "+ Lägg till" primary Weekly Schedule action.
 * Source-pattern tests (matching the existing schedule-family-grid.test.js /
 * i18n-schedule-surfaces.test.js style — this repo does not run a full browser/jsdom
 * harness for schedule.js; manual verification screenshots cover interactive behaviour,
 * see the PR description). Full HTTP/backend coverage lives in
 * test/schedule-apply-routes.test.js and test/schedule-apply-phase1b.test.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-add-menu.js';
const CLIENT_MODULE = 'public/js/schedule-apply-client.js';
const HTML = 'public/schedule.html';
const SCHEDULE_JS = 'public/js/schedule.js';

describe('Phase 1B — "+ Lägg till" primary menu', () => {
  it('A1/A3: schedule.html has exactly one new primary "+ Lägg till" button (no competing duplicate)', () => {
    const html = read(HTML);
    const matches = html.match(/id="scheduleAddMenuBtn"/g) || [];
    assert.equal(matches.length, 1, 'exactly one + Lägg till trigger button');
    assert.match(html, /ScheduleAddMenu\.open\(\)/);
    assert.match(html, /data-i18n="schedule\.addMenu\.trigger"/);
  });

  it('A2: schedule-add-menu.js opens all three primary options from one entry menu', () => {
    const src = read(MODULE);
    assert.match(src, /function openAddMenu/);
    assert.match(src, /ScheduleAddMenu\.openActivity\(\)/);
    assert.match(src, /ScheduleAddMenu\.openTemplate\(\)/);
    assert.match(src, /ScheduleAddMenu\.openCopyDay\(\)/);
  });

  it('is an IIFE exposing window.ScheduleAddMenu with the documented public API', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m);
    for (const fn of [
      'open', 'openMenu', 'close', 'openActivity', 'submitActivity', 'openTemplate',
      'submitTemplate', 'openCopyDay', 'submitCopyDay', 'openSaveAsTemplate', 'submitSaveAsTemplate',
    ]) {
      assert.match(src, new RegExp(`\\b${fn}\\b`), `ScheduleAddMenu API must include ${fn}`);
    }
    assert.match(src, /window\.ScheduleAddMenu\s*=/);
  });

  it('script load order: apply-client and add-menu load after schedule.js/schedule-views.js', () => {
    const html = read(HTML);
    const idx = (needle) => html.indexOf(needle);
    const scheduleJsIdx = idx('/js/schedule.js?');
    const viewsIdx = idx('/js/schedule-views.js?');
    const clientIdx = idx('/js/schedule-apply-client.js?');
    const addMenuIdx = idx('/js/schedule-add-menu.js?');
    assert.ok(scheduleJsIdx > -1 && viewsIdx > -1 && clientIdx > -1 && addMenuIdx > -1, 'all four scripts must be present');
    assert.ok(clientIdx > scheduleJsIdx && clientIdx > viewsIdx, 'schedule-apply-client.js loads after schedule.js/schedule-views.js');
    assert.ok(addMenuIdx > clientIdx, 'schedule-add-menu.js loads after schedule-apply-client.js');
  });

  it('B7/C14/D21: default mode for every canonical command is merge, never replace_day', () => {
    const src = read(MODULE);
    // Module-level flow state defaults
    assert.match(src, /mode:\s*'merge'\s*\}/); // templateState / copyDayState default
    // Explicit call-sites into the backend never hardcode replace_day as a default
    assert.doesNotMatch(src, /mode:\s*'replace_day'\s*,?\s*\/\/\s*default/i);
  });

  it('C17/D22/§7: replace_day always routes through the destructive confirmation before mutating', () => {
    const src = read(MODULE);
    assert.match(src, /function confirmReplaceDay/);
    // Template + copy-day submit paths must check for replace_day and call the confirmation
    // BEFORE the actual mutating call (doSubmitTemplate / doSubmitCopyDay).
    const submitTemplateBody = src.slice(src.indexOf('async function submitTemplate'), src.indexOf('async function doSubmitTemplate'));
    assert.match(submitTemplateBody, /mode === 'replace_day'/);
    assert.match(submitTemplateBody, /confirmReplaceDay\(/);
    const submitCopyDayBody = src.slice(src.indexOf('async function submitCopyDay'), src.indexOf('async function doSubmitCopyDay'));
    assert.match(submitCopyDayBody, /mode === 'replace_day'/);
    assert.match(submitCopyDayBody, /confirmReplaceDay\(/);
  });

  it('§7: destructive confirmation never uses a generic "OK" label and always offers explicit Ersätt/Avbryt', () => {
    const src = read(MODULE);
    assert.doesNotMatch(src, />OK</);
    assert.match(src, /confirmReplaceDay\.confirmBtn/);
    assert.match(src, /confirmReplaceDay\.cancelBtn/);
  });

  it('B8/C/D §12/§1B.9: operation_id is generated via ScheduleApplyClient and sent on every canonical call', () => {
    const src = read(MODULE);
    assert.match(src, /ScheduleApplyClient\.createOperationTracker\(\)/);
    assert.match(src, /opTracker\.forCommand\(/g);
    assert.match(src, /applyActivity\(currentChildId,\s*\{[^}]*operationId/s);
    assert.match(src, /applyTemplate\(currentChildId,\s*\{[^}]*operationId/s);
    assert.match(src, /copyDay\(currentChildId,\s*\{[^}]*operationId/s);
    assert.match(src, /saveDayAsTemplate\(currentChildId,\s*\{[^}]*operationId/s);
  });

  it('schedule-apply-client.js: operation tracker only regenerates the id when the command fingerprint changes', () => {
    const src = read(CLIENT_MODULE);
    assert.match(src, /function createOperationTracker/);
    assert.match(src, /serialized !== lastFingerprint/);
  });

  it('E24/E27: "Spara dagen som mall" is added to the EXISTING day action row (no second competing day menu)', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /ScheduleAddMenu\.openSaveAsTemplate\(\)/);
    // Existing legacy day-action buttons remain (strangler §1B.13/§20 — not removed).
    assert.match(src, /openCopyDayModal\(\)/);
    assert.match(src, /confirmDeleteSchedule\(\)/);
  });

  it('F26/F29: critical controls use an explicit >=44px effective touch target class', () => {
    const src = read(MODULE);
    assert.match(src, /const TOUCH_BTN = 'min-h-\[44px\] min-w-\[44px\]'/, 'a single shared >=44x44px touch-target class must be defined');
    const usageCount = (src.match(/\$\{TOUCH_BTN\}/g) || []).length;
    assert.ok(usageCount > 15, `expected TOUCH_BTN applied broadly across interactive controls, found ${usageCount} uses`);
  });

  it('F30: no interaction in the new flow requires drag-and-drop', () => {
    const src = read(MODULE);
    assert.doesNotMatch(src, /draggable=|dragstart|ondrop/);
  });

  it('F32: selected weekday/mode state is conveyed via text/icon, not colour alone', () => {
    const src = read(MODULE);
    assert.match(src, /aria-pressed/); // weekday chip selection state
    assert.match(src, /aria-checked/); // mode selector selection state
    assert.match(src, /active \? '✓ ' : ''/); // explicit checkmark glyph, not just a colour swap
  });

  it('§17: ESC closes the modal, dialog role + aria-modal are set', () => {
    const src = read(MODULE);
    assert.match(src, /'Escape'/);
    assert.match(src, /role',\s*'dialog'/);
    assert.match(src, /aria-modal',\s*'true'/);
  });

  it('§1B.20/§1B.21 decision records are documented in the module header', () => {
    const src = read(MODULE);
    assert.match(src, /Multi-child decision/);
    assert.match(src, /applyScheduleSourceToTargets/);
  });

  it('H36-38: legacy fill-week / assign-schedule / apply-date-range surfaces are untouched', () => {
    const html = read(HTML);
    assert.match(html, /openFillWeekModal\(\)/, 'legacy Fyll vecka trigger still present');
    assert.match(html, /id="fillWeekBtn"/);
    assert.ok(fs.existsSync(path.join(ROOT, 'public/assign-schedule.html')), 'assign-schedule.html must still exist');
  });

  it('no hardcoded Swedish/English literal user copy — every label goes through pt()/i18n keys', () => {
    const src = read(MODULE);
    // Only inspect non-comment code lines — doc comments legitimately name the Swedish
    // product concepts (matches the repo's own audit-hardcoded-swedish.js convention of
    // exempting `//` and `/** */` lines). Real user-visible copy must only appear as an
    // i18n key lookup (t('schedule.addMenu....')), asserted for full sv-SE/en-GB parity by
    // test/i18n-schedule-surfaces.test.js "schedule fragment keys have full sv-SE / en-GB parity".
    const codeLines = src.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    const codeOnly = codeLines.join('\n');
    for (const literal of ['Lägg till aktivitet', 'Ersätt hela dagen', 'Spara dagen som mall']) {
      assert.doesNotMatch(codeOnly, new RegExp(literal), `"${literal}" must be an i18n key, not a hardcoded literal in code`);
    }
  });
});
