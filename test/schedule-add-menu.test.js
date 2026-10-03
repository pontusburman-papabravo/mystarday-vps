'use strict';

/**
 * Phase 1B frontend — "+ Lägg till" primary Weekly Schedule action.
 * Source-pattern tests (matching the existing schedule-family-grid.test.js /
 * i18n-schedule-surfaces.test.js style — this repo does not run a full browser/jsdom
 * harness for schedule.js; manual verification screenshots cover interactive behaviour,
 * see the PR description). Full HTTP/backend coverage lives in
 * test/schedule-apply-routes.test.js and test/schedule-apply-phase1b.test.js.
 *
 * Rapid Entry also has an executable vm harness below so sequential apply / mutex
 * behaviour is proven, not only matched as source text.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-add-menu.js';
const CLIENT_MODULE = 'public/js/schedule-apply-client.js';
const HTML = 'public/schedule.html';
const SCHEDULE_JS = 'public/js/schedule.js';

function persistSlice(src) {
  const start = src.indexOf('async function persistActivitySnapshot');
  return src.slice(start, src.indexOf('const templateState'));
}

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
      'selectPendingCreate',
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

  it('Phase 1B custody hardening §3/§4: every submit path reads the active custody home and forwards it', () => {
    const src = read(MODULE);
    assert.match(src, /function activeCustodyHomeId/);
    assert.match(src, /ScheduleCustody\.getActiveHomeId\(\)/);

    // Each submit function computes custodyHomeId once and forwards it to BOTH the operation
    // fingerprint (so switching custody home never reuses a stale operation_id, §5) AND the
    // client call body (so the request actually targets that home, §4/§8-11).
    for (const [startMarker, endMarker] of [
      ['async function doSubmitTemplate', 'async function openCopyDay'],
    ]) {
      const body = src.slice(src.indexOf(startMarker), endMarker ? src.indexOf(endMarker) : undefined);
      assert.match(body, /const custodyHomeId = activeCustodyHomeId\(\)/, `${startMarker} must read activeCustodyHomeId()`);
      assert.match(body, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/, `${startMarker} fingerprint must include custodyHomeId`);
      assert.match(body, /custodyHomeId,?\s*\}\);/, `${startMarker} client call must forward custodyHomeId`);
    }

    const applyCallStart = src.indexOf('ScheduleApplyClient.applyActivity(currentChildId');
    const submitActivityBody = src.slice(src.lastIndexOf('const days = [...snapshot.days];', applyCallStart), applyCallStart + 450);
    assert.match(submitActivityBody, /const custodyHomeId = activeCustodyHomeId\(\)/);
    assert.match(submitActivityBody, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/);
    assert.match(submitActivityBody, /operationId, custodyHomeId/);

    const submitCopyDayBody = src.slice(src.indexOf('async function doSubmitCopyDay'), src.indexOf('setPending(\'samCopyDaySaveBtn\', false);'));
    assert.match(submitCopyDayBody, /const custodyHomeId = activeCustodyHomeId\(\)/);
    assert.match(submitCopyDayBody, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/);

    const submitSaveAsTemplateBody = src.slice(src.indexOf('async function submitSaveAsTemplate'), src.indexOf('async function openDay') > -1 ? src.indexOf('async function openDay') : undefined);
    assert.match(submitSaveAsTemplateBody, /const custodyHomeId = activeCustodyHomeId\(\)/);
    assert.match(submitSaveAsTemplateBody, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/);
  });

  it('Phase 1B custody hardening §4: HTTP client accepts custodyHomeId and only sends custody_home_id when truthy', () => {
    const src = read(CLIENT_MODULE);
    for (const fn of ['applyActivity', 'applyTemplate', 'copyDay', 'saveDayAsTemplate']) {
      const start = src.indexOf(`${fn}(childId`);
      assert.ok(start > -1, `${fn} must exist in the client`);
      const body = src.slice(start, start + 700);
      assert.match(body, /custodyHomeId/, `${fn} must accept custodyHomeId`);
      assert.match(body, /custodyHomeId \? \{ custody_home_id: custodyHomeId \} : \{\}/, `${fn} must only send custody_home_id when active`);
    }
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

  it('inline create: create row only for non-empty trimmed name without exact match', () => {
    const src = read(MODULE);
    assert.match(src, /function normalizeActivityName/);
    assert.match(src, /function activityNameKey/);
    assert.match(src, /function findExactActivityMatch/);
    assert.match(src, /function shouldShowCreateRow/);
    const showBody = src.slice(src.indexOf('function shouldShowCreateRow'), src.indexOf('function timeGroupFromSection'));
    assert.match(showBody, /normalizeActivityName\(query\)/);
    assert.match(showBody, /if \(!name\) return false/);
    assert.match(showBody, /findExactActivityMatch/);
    const picker = src.slice(src.indexOf('function renderActivityPicker'), src.indexOf('function renderActivityStep'));
    assert.match(picker, /shouldShowCreateRow\(activityState\.query/);
    assert.match(picker, /selectPendingCreate/);
    assert.match(picker, /libraryAutoSaveNote/);
    assert.doesNotMatch(picker, /template\.noneMine/);
    assert.match(picker, /activity\.noneFound/);
    assert.match(picker, /activity\.noneYet/);
  });

  it('inline create: new activity creates once at Save then applies', () => {
    const src = read(MODULE);
    const createFn = src.slice(src.indexOf('async function createFamilyActivity'), src.indexOf('function stagedNameFromSnapshot'));
    assert.match(createFn, /apiFetch\('\/api\/activities'/);
    assert.match(createFn, /method:\s*'POST'/);
    const submit = persistSlice(src);
    const createIdx = submit.indexOf('createFamilyActivity(');
    const applyIdx = submit.indexOf('ScheduleApplyClient.applyActivity');
    assert.ok(createIdx > -1 && applyIdx > createIdx, 'create runs before apply');
    assert.match(submit, /snapshot\.createdUnappliedId \|\| snapshot\.templateId/);
    assert.match(submit, /createFamilyActivity\(stagedName, snapshot\.section\)/);
    assert.match(submit, /if \(!created\.ok \|\| !created\.data\.id\)/);
    assert.match(submit, /createdUnappliedId = templateId/);
    assert.match(submit, /loadTemplates/);
    assert.match(submit, /loadScheduleForDay|afterSuccessfulMutation/);
    assert.doesNotMatch(submit, /\/api\/activities\/\$\{/);
  });

  it('inline create: existing exact match is reused with zero create requests', () => {
    const src = read(MODULE);
    const filterBody = src.slice(src.indexOf('function filterActivity'), src.indexOf('function selectActivity'));
    assert.match(filterBody, /findExactActivityMatch\(allTemplates, q\)/);
    assert.match(filterBody, /activityState\.templateId = match\.id/);
    const helpers = src.slice(src.indexOf('function findExactActivityMatch'), src.indexOf('function shouldShowCreateRow'));
    assert.match(helpers, /activityNameKey\(tpl\.name\) === key/);
    const submit = persistSlice(src);
    const createGuard = submit.slice(0, submit.indexOf('createFamilyActivity'));
    assert.match(createGuard, /snapshot\.createdUnappliedId \|\| snapshot\.templateId/);
    assert.match(createGuard, /findExactActivityMatch\(allTemplates, stagedName\)/);
    assert.match(createGuard, /await loadTemplates\(\)/);
    assert.match(createGuard, /if \(!templateId && shouldShowCreateRow\(stagedName/);
  });

  it('inline create: match is trim + case-insensitive; whitespace-only never creates', () => {
    const src = read(MODULE);
    const normalize = src.slice(src.indexOf('function normalizeActivityName'), src.indexOf('function activityNameKey'));
    assert.match(normalize, /\.trim\(\)/);
    const keyFn = src.slice(src.indexOf('function activityNameKey'), src.indexOf('function findExactActivityMatch'));
    assert.match(keyFn, /\.toLowerCase\(\)/);
    const showBody = src.slice(src.indexOf('function shouldShowCreateRow'), src.indexOf('function timeGroupFromSection'));
    assert.match(showBody, /if \(!name\) return false/);
    const submit = persistSlice(src);
    assert.match(submit, /shouldShowCreateRow\(stagedName, allTemplates\)/);
  });

  it('inline create: create failure does not apply; apply failure keeps id for retry', () => {
    const src = read(MODULE);
    const submit = persistSlice(src);
    const beforeApply = submit.slice(0, submit.indexOf('ScheduleApplyClient.applyActivity'));
    assert.match(beforeApply, /if \(!created\.ok \|\| !created\.data\.id\)/);
    assert.match(beforeApply, /return \{ ok: false \}/);
    assert.match(submit, /snapshot\.createdUnappliedId = templateId/);
    assert.match(submit, /activity\.applyFailed/);
    const afterFail = submit.slice(submit.indexOf('if (!ok)'), submit.indexOf('resetActivityForNextEntry()'));
    assert.match(afterFail, /return \{ ok: false \}/);
    assert.doesNotMatch(afterFail, /resetActivityForNextEntry\(\)/);
    assert.doesNotMatch(afterFail, /createdUnappliedId = null/);
    const createGuard = submit.slice(0, submit.indexOf('createFamilyActivity'));
    assert.match(createGuard, /createdUnappliedId/);
    assert.doesNotMatch(src, /DELETE \/api\/activities/);
  });

  it('inline create: existing add-activity path still applies selected templates', () => {
    const src = read(MODULE);
    assert.match(src, /function selectActivity\(id\)/);
    assert.match(src, /ScheduleApplyClient\.applyActivity\(currentChildId/);
    assert.match(src, /activity\.added/);
    const submit = persistSlice(src);
    assert.match(submit, /createdThisSave \? 'schedule\.addMenu\.activity\.createdAndAdded' : 'schedule\.addMenu\.activity\.added'/);
  });

  it('inline create: Copy Day path is unchanged and does not create activities', () => {
    const src = read(MODULE);
    const copyDay = src.slice(src.indexOf('function openCopyDay'), src.indexOf('function openSaveAsTemplate'));
    assert.ok(copyDay.length > 200, 'copy-day slice includes open + submit handlers');
    assert.match(copyDay, /ScheduleApplyClient\.copyDay/, 'copy day still applies via ScheduleApplyClient');
    assert.doesNotMatch(copyDay, /createFamilyActivity/, 'copy day does not create activities');
    assert.doesNotMatch(copyDay, /pendingNewName/, 'copy day does not use inline-create state');
    assert.match(src, /function openCopyDay/);
    assert.match(src, /function submitCopyDay/);
  });

  it('normal Save closes the Activity dialog; Lägg till en till keeps the next entry open', () => {
    const src = read(MODULE);
    assert.match(src, /function resetActivityForNextEntry/);
    assert.match(src, /function addAnother/);
    const helper = src.slice(src.indexOf('function resetActivityForNextEntry'), src.indexOf('async function openActivity'));
    assert.match(helper, /resetActivityCreateState\(\)/);
    assert.match(helper, /activityState\.query = ''/);
    assert.match(helper, /activityState\.days = days/);
    assert.match(helper, /activityState\.section = section/);
    assert.match(helper, /activityState\.startTime = startTime/);
    assert.match(helper, /activityState\.endTime = endTime/);
    assert.match(helper, /activityState\.dayKnown = dayKnown/);
    assert.match(helper, /activityState\.sectionKnown = sectionKnown/);
    assert.match(helper, /opTracker\.reset\(\)/);
    const drain = src.slice(src.indexOf('async function drainActivitySubmitQueue'), src.indexOf('function addAnother'));
    const stay = drain.slice(drain.indexOf('if (endStayOpen)'));
    const stayBranch = stay.slice(0, stay.indexOf('} else {'));
    assert.match(stayBranch, /resetActivityForNextEntry\(\)/);
    assert.match(stayBranch, /renderActivityStep\(\)/);
    assert.match(stayBranch, /await afterSuccessfulMutation\(\)/);
    assert.match(stayBranch, /startNextEntryFocusGuard\(\)/);
    assert.doesNotMatch(stayBranch, /closeAddMenu\(\)/);
    const closeBranch = stay.slice(stay.indexOf('} else {'), stay.indexOf('} finally'));
    assert.match(closeBranch, /closeAddMenu\(\)/);
    assert.match(closeBranch, /await afterSuccessfulMutation\(\)/);
    assert.doesNotMatch(closeBranch, /resetActivityForNextEntry\(\)/);
    const success = drain.slice(drain.indexOf('resetActivityForNextEntry()'));
    assert.match(success, /restoreSearchFocus\(\)/);
    assert.ok(
      success.lastIndexOf('setPending(\'samActivitySaveBtn\', false)') < success.lastIndexOf('restoreSearchFocus()'),
      'search focus must be restored after Save is re-enabled, not before the mutation path'
    );
    const persist = persistSlice(src);
    const createFail = persist.slice(0, persist.indexOf('ScheduleApplyClient.applyActivity'));
    assert.doesNotMatch(createFail, /resetActivityForNextEntry\(\)/);
  });

  it('rapid entry: overlapping Save queues a distinct next activity instead of dropping it', () => {
    const src = read(MODULE);
    assert.match(src, /let activitySubmitInFlight = false/);
    assert.match(src, /const activitySubmitQueue = \[\]/);
    const submit = persistSlice(src);
    assert.match(submit, /if \(activitySubmitInFlight\)/);
    assert.match(submit, /activitySubmitQueue\.push\(snapshot\)/);
    assert.match(submit, /isDuplicateSubmit\(snapshot\)/);
    assert.doesNotMatch(src, /if \(activitySubmitInFlight\) return;/);
    assert.doesNotMatch(submit, /setTimeout\(|debounce/);
  });

  it('rapid entry: two sequential saves reset opTracker so the second apply is a new command', () => {
    const src = read(MODULE);
    const helper = src.slice(src.indexOf('function resetActivityForNextEntry'), src.indexOf('async function openActivity'));
    assert.match(helper, /opTracker\.reset\(\)/);
    const submit = persistSlice(src);
    const resetIdx = submit.indexOf('resetActivityForNextEntry()');
    const applyIdx = submit.indexOf('ScheduleApplyClient.applyActivity');
    assert.ok(resetIdx > applyIdx, 'opTracker reset happens after a successful apply, not before');
    assert.doesNotMatch(submit.slice(submit.indexOf('if (!ok)'), resetIdx), /opTracker\.reset\(\)/);
  });

  it('rapid entry: Template and Copy Day still close on success', () => {
    const src = read(MODULE);
    const templateSuccess = src.slice(src.indexOf('async function doSubmitTemplate'), src.indexOf('function openCopyDay'));
    assert.match(templateSuccess, /closeAddMenu\(\)/);
    assert.doesNotMatch(templateSuccess, /resetActivityForNextEntry\(\)/);
    const copySuccess = src.slice(src.indexOf('async function doSubmitCopyDay'), src.indexOf('function openSaveAsTemplate'));
    assert.match(copySuccess, /closeAddMenu\(\)/);
    assert.doesNotMatch(copySuccess, /resetActivityForNextEntry\(\)/);
  });

  it('rapid entry: child switch closes the Activity modal instead of applying to the wrong child', () => {
    const src = read(MODULE);
    assert.match(src, /let activityContextChildId = null/);
    assert.match(src, /activityContextChildId = currentChildId/);
    assert.match(src, /function closeIfChildContextChanged/);
    assert.match(src, /function bindChildContextGuards/);
    assert.match(src, /window\.selectChild = wrappedSelectChild/);
    assert.match(src, /window\.backToChildrenList = wrappedBackToChildren/);
    const submit = persistSlice(src);
    assert.match(submit, /currentChildId !== activityContextChildId/);
    assert.match(submit, /activity\.childChanged/);
    const persist = src.slice(src.indexOf('async function persistActivitySnapshot'), src.indexOf('async function drainActivitySubmitQueue'));
    const applySlice = persist.slice(persist.lastIndexOf('if (!currentChildId || currentChildId !== activityContextChildId)'), persist.indexOf('ScheduleApplyClient.applyActivity'));
    assert.match(applySlice, /closeAddMenu\(\)/);
    assert.doesNotMatch(applySlice, /applyActivity\(/);
  });

  it('rapid entry: 375px Activity modal keeps a sticky Save footer and Escape still closes', () => {
    const src = read(MODULE);
    const html = read(HTML);
    assert.match(src, /sam-activity-shell/);
    assert.match(src, /sam-activity-scroll/);
    assert.match(src, /sam-activity-footer/);
    assert.match(src, /sam-activity-footer border-t border-lavender/);
    assert.match(src, /id="samActivitySaveBtn"/);
    assert.match(src, /id="samActivityQueueNote"/);
    const activityFooterStart = src.indexOf('sam-activity-footer border-t border-lavender');
    const activityFooter = src.slice(activityFooterStart, activityFooterStart + 900);
    assert.match(activityFooter, /text-navy/);
    assert.match(activityFooter, /schedule\.addMenu\.cancel/);
    assert.match(src, /aria-labelledby',\s*'scheduleAddMenuTitle'/);
    assert.match(src, /aria-live="polite"/);
    assert.match(html, /#scheduleAddMenuModal \.sam-activity-footer/);
    const footerCss = html.slice(html.indexOf('#scheduleAddMenuModal .sam-activity-footer'), html.indexOf('#scheduleAddMenuModal #samActivityError'));
    assert.match(footerCss, /position:\s*sticky/);
    assert.match(footerCss, /bottom:\s*0/);
    assert.doesNotMatch(footerCss, /background:\s*transparent/);
    assert.match(html, /#scheduleAddMenuModal #scheduleAddMenuPanel[\s\S]*max-height:\s*100%/);
    assert.match(read('public/css/app-layers.css'), /bottom:\s*var\(--overlay-keyboard-inset\)/);
    assert.match(html, /#scheduleAddMenuModal #samActivityError/);
    assert.match(html, /100dvh/);
    assert.match(src, /'Escape'/);
    assert.match(src, /ScheduleAddMenu\.close\(\)/);
  });

  it('hides iOS native type=time chrome and shows Starttid/Sluttid until a time is chosen', () => {
    const src = read(MODULE);
    const html = read(HTML);
    assert.match(src, /function renderTimeField/);
    assert.match(src, /function paintTimeField/);
    const helpers = src.slice(src.indexOf('function timeFieldIds'), src.indexOf('function restoreSearchFocus'));
    assert.match(helpers, /schedule\.chrome\.startTimePlaceholder/);
    assert.match(helpers, /schedule\.chrome\.endTimePlaceholder/);
    assert.match(helpers, /samActivityStartTime/);
    assert.match(helpers, /samActivityEndTime/);
    assert.match(helpers, /sam-time-field/);
    assert.match(helpers, /sam-time-value/);
    assert.match(helpers, /opacity-0/);
    assert.match(helpers, /aria-label=/);
    assert.doesNotMatch(helpers, /new Date\(|toTimeString|getHours/);
    const setTime = src.slice(src.indexOf('function setActivityTime'), src.indexOf('function toggleActivityDay'));
    assert.match(setTime, /paintTimeField\(which, val\)/);
    assert.doesNotMatch(setTime, /renderActivityStep\(\)/);
    const timeCss = html.slice(html.indexOf('#scheduleAddMenuModal .sam-time-field'), html.indexOf('#scheduleAddMenuModal .sr-only'));
    assert.match(timeCss, /opacity:\s*0/);
    assert.match(timeCss, /color:\s*transparent/);
    assert.match(timeCss, /-webkit-text-fill-color:\s*transparent/);
    assert.match(timeCss, /min-height:\s*44px/);
    assert.match(html, /schedule-add-menu\.js\?v=11/);
  });
});

function createClassList(el) {
  const set = new Set(String(el.className || '').split(/\s+/).filter(Boolean));
  const sync = () => { el.className = [...set].join(' '); };
  return {
    add(...names) { names.forEach((n) => set.add(n)); sync(); },
    remove(...names) { names.forEach((n) => set.delete(n)); sync(); },
    contains(name) { return set.has(name); },
    toggle(name, force) {
      if (force === true) set.add(name);
      else if (force === false) set.delete(name);
      else if (set.has(name)) set.delete(name);
      else set.add(name);
      sync();
    },
  };
}

function createRapidEntrySandbox(opts = {}) {
  const byId = new Map();
  const toasts = [];
  const activityPosts = [];
  const applyCalls = [];
  const copyDayCalls = [];
  const templateCalls = [];
  let uuidSeq = 0;
  let focusedId = null;
  const pendingApplies = [];

  function makeEl(tag, id) {
    const el = {
      tagName: String(tag).toUpperCase(),
      id: id || '',
      className: '',
      style: {},
      children: [],
      textContent: '',
      value: '',
      selectionStart: 0,
      attributes: {},
      _innerHTML: '',
      _disabled: false,
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === 'id') {
          this.id = String(value);
          byId.set(this.id, this);
        }
      },
      getAttribute(name) { return this.attributes[name]; },
      addEventListener() {},
      focus() { focusedId = this.id; },
      contains(node) {
        if (!node) return false;
        if (node === this) return true;
        return Boolean(this._innerHTML && node.id && this._innerHTML.includes(`id="${node.id}"`));
      },
      appendChild(child) {
        this.children.push(child);
        if (child.id) byId.set(child.id, child);
        return child;
      },
    };
    Object.defineProperty(el, 'disabled', {
      get() { return el._disabled; },
      set(value) {
        const wasDisabled = el._disabled;
        el._disabled = Boolean(value);
        if (wasDisabled && !el._disabled && el.id === 'samActivitySaveBtn') {
          el.focus();
        }
      },
    });
    Object.defineProperty(el, 'classList', { get() { return createClassList(el); } });
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._innerHTML; },
      set(html) {
        el._innerHTML = String(html);
        for (const match of String(html).matchAll(/id="([^"]+)"/g)) {
          const nextId = match[1];
          if (!byId.has(nextId)) byId.set(nextId, makeEl('div', nextId));
        }
        const search = byId.get('samActivitySearch');
        if (search) {
          const valueMatch = String(html).match(/id="samActivitySearch"[^>]*value="([^"]*)"/);
          search.value = valueMatch ? valueMatch[1] : '';
        }
      },
    });
    if (id) byId.set(id, el);
    return el;
  }

  const body = makeEl('body');
  body.appendChild(makeEl('div', 'scheduleContent'));
  const document = {
    body,
    getElementById: (id) => byId.get(id) || null,
    createElement: (tag) => makeEl(tag),
    addEventListener() {},
  };
  Object.defineProperty(document, 'activeElement', {
    get() { return (focusedId && byId.get(focusedId)) || body; },
  });

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    currentChildId: opts.childId || 'child-a',
    currentDay: opts.day == null ? 5 : opts.day,
    allTemplates: opts.templates || [{ id: 'tpl-middag', name: 'Middag', icon: '🍽️' }],
    loadTemplates: async () => {},
    loadScheduleForDay: async () => {
      sandbox.scheduleReloads += 1;
      const steal = document.getElementById('samActivitySaveBtn');
      if (steal) steal.focus();
      await Promise.resolve();
      if (typeof sandbox._focusGuardCb === 'function') sandbox._focusGuardCb();
    },
    MutationObserver: function MutationObserver(cb) {
      return {
        observe() { sandbox._focusGuardCb = cb; },
        disconnect() {
          if (sandbox._focusGuardCb === cb) sandbox._focusGuardCb = null;
        },
      };
    },
    scheduleReloads: 0,
    showToast(msg, isError) { toasts.push({ msg, isError: Boolean(isError) }); },
    pt(key, params) {
      if (!params) return key;
      return `${key}:${JSON.stringify(params)}`;
    },
    crypto: {
      randomUUID() {
        uuidSeq += 1;
        return `op-${uuidSeq}`;
      },
    },
    window: null,
    document,
    ScheduleCore: {
      SECTIONS: [
        { key: 'morgon', emoji: '🌅' },
        { key: 'dag', emoji: '☀️' },
        { key: 'kvall', emoji: '🌆' },
        { key: 'natt', emoji: '🌙' },
      ],
      sectionName: (key) => key,
      dayShort: (dow) => String(dow),
    },
  };
  sandbox.window = sandbox;
  sandbox.window.crypto = sandbox.crypto;
  sandbox.window.pt = sandbox.pt;
  sandbox.window.showToast = sandbox.showToast;
  sandbox.window.loadTemplates = sandbox.loadTemplates;
  sandbox.window.loadScheduleForDay = sandbox.loadScheduleForDay;

  sandbox.apiFetch = async (url, init = {}) => {
    if (url === '/api/activities' && init.method === 'POST') {
      activityPosts.push(JSON.parse(init.body));
      if (opts.createThrow) {
        throw new Error('network');
      }
      if (opts.createError) {
        return { ok: false, json: async () => ({ error: 'create-failed' }) };
      }
      const body = JSON.parse(init.body);
      const created = { id: `created-${activityPosts.length}`, name: body.name };
      sandbox.allTemplates = sandbox.allTemplates.concat([created]);
      return { ok: true, json: async () => created };
    }
    if (url === '/api/schedule-templates' || url === '/api/standard-library/schedules') {
      const list = url === '/api/schedule-templates'
        ? [{ id: 'fam-tpl-1', name: 'Kvällsmall', item_count: 3 }]
        : [];
      return { ok: true, json: async () => list };
    }
    throw new Error(`unexpected apiFetch ${init.method || 'GET'} ${url}`);
  };
  sandbox.window.apiFetch = sandbox.apiFetch;

  vm.runInNewContext(read(CLIENT_MODULE), sandbox, { filename: CLIENT_MODULE });

  sandbox.ScheduleApplyClient.applyActivity = async (childId, payload) => {
    const call = { childId, payload };
    applyCalls.push(call);
    if (opts.holdApply) {
      await new Promise((resolve) => { pendingApplies.push(resolve); });
    }
    if (opts.applyError && applyCalls.length <= (opts.applyErrorUntil || 1)) {
      return { ok: false, status: 500, data: { error: 'apply-failed' } };
    }
    return { ok: true, status: 200, data: { ok: true } };
  };
  sandbox.ScheduleApplyClient.copyDay = async (childId, payload) => {
    copyDayCalls.push({ childId, payload });
    return { ok: true, status: 200, data: { ok: true } };
  };
  sandbox.ScheduleApplyClient.applyTemplate = async (childId, payload) => {
    templateCalls.push({ childId, payload });
    return { ok: true, status: 200, data: { ok: true } };
  };
  sandbox.window.ScheduleApplyClient = sandbox.ScheduleApplyClient;

  vm.runInNewContext(read(MODULE), sandbox, { filename: MODULE });

  return {
    sandbox,
    toasts,
    activityPosts,
    applyCalls,
    copyDayCalls,
    templateCalls,
    pendingApplies,
    focused: () => focusedId,
    modalHidden: () => {
      const modal = document.getElementById('scheduleAddMenuModal');
      return !modal || modal.classList.contains('hidden');
    },
  };
}

describe('Rapid Entry — executable Activity submit', () => {
  it('shows Starttid/Sluttid on empty time fields and never paints a clock time', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu, document } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    const html = document.getElementById('scheduleAddMenuBody').innerHTML;
    assert.match(html, /sam-time-field/);
    assert.match(html, /id="samActivityStartTime"/);
    assert.match(html, /id="samActivityEndTime"/);
    assert.match(html, /aria-label="schedule\.chrome\.startTimePlaceholder"/);
    assert.match(html, /value=""/);
    assert.equal(document.getElementById('samActivityStartTimeValue').textContent, 'schedule.chrome.startTimePlaceholder');
    assert.equal(document.getElementById('samActivityEndTimeValue').textContent, 'schedule.chrome.endTimePlaceholder');
    assert.doesNotMatch(document.getElementById('samActivityStartTimeValue').textContent, /^\d{1,2}:\d{2}$/);
    assert.doesNotMatch(html, /value="\d{1,2}:\d{2}"/);

    ScheduleAddMenu.setActivityTime('start', '18:00');
    assert.equal(document.getElementById('samActivityStartTimeValue').textContent, '18:00');
    assert.equal(document.getElementById('samActivityEndTimeValue').textContent, 'schedule.chrome.endTimePlaceholder');
    assert.equal(document.getElementById('samActivitySearch').id, 'samActivitySearch');
  });

  it('normal Save closes the modal and refreshes the day list', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.setActivityTime('start', '18:00');
    ScheduleAddMenu.setActivityTime('end', '18:30');
    ScheduleAddMenu.selectActivity('tpl-middag');
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.activityPosts.length, 0);
    assert.equal(harness.applyCalls[0].payload.section, 'kvall');
    assert.deepEqual([...harness.applyCalls[0].payload.days], [5]);
    assert.equal(harness.applyCalls[0].payload.startTime, '18:00');
    assert.equal(harness.applyCalls[0].payload.endTime, '18:30');
    assert.equal(harness.modalHidden(), true);
    assert.equal(harness.sandbox.scheduleReloads, 1);
    assert.match(harness.toasts[0].msg, /activity\.added/);
    assert.equal(harness.toasts[0].isError, false);
  });

  it('a later add reopens from the day context instead of writing through a closed dialog', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.selectActivity('tpl-middag');
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.sandbox.scheduleReloads, 1, 'background schedule refresh must run');
    assert.equal(harness.modalHidden(), true);

    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.filterActivity('Läkemedel');
    ScheduleAddMenu.selectPendingCreate();
    await ScheduleAddMenu.submitActivity();
    assert.equal(harness.applyCalls.length, 2);
    assert.equal(harness.modalHidden(), true);
    assert.equal(harness.sandbox.scheduleReloads, 2);
  });

  it('creates a new activity once, applies once, and starts the next entry empty', async () => {
    const harness = createRapidEntrySandbox({ templates: [] });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.filterActivity('Läkemedel');
    ScheduleAddMenu.selectPendingCreate();
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.activityPosts[0].name, 'Läkemedel');
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.applyCalls[0].payload.activityTemplateId, 'created-1');
    assert.equal(harness.modalHidden(), true);
    assert.match(harness.toasts[0].msg, /createdAndAdded/);
  });

  it('resets opTracker so a second save of the same activity is a new apply, not a silent no-op', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.selectActivity('tpl-middag');
    await ScheduleAddMenu.addAnother();
    ScheduleAddMenu.selectActivity('tpl-middag');
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.applyCalls.length, 2);
    const firstOp = harness.applyCalls[0].payload.operationId;
    const secondOp = harness.applyCalls[1].payload.operationId;
    assert.equal(firstOp, 'op-1');
    assert.equal(secondOp, 'op-2');
    assert.notEqual(secondOp, firstOp);
  });

  it('coalesces a rapid double tap on Save — one create and one apply', async () => {
    const harness = createRapidEntrySandbox({ templates: [], holdApply: true });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.filterActivity('Pyjamas');
    ScheduleAddMenu.selectPendingCreate();

    const first = ScheduleAddMenu.submitActivity();
    for (let i = 0; i < 20 && harness.applyCalls.length === 0; i += 1) {
      await new Promise((resolve) => { setImmediate(resolve); });
    }
    const second = ScheduleAddMenu.submitActivity();
    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.sandbox.document.getElementById('samActivitySaveBtn').disabled, true);
    assert.match(harness.sandbox.document.getElementById('samActivitySaveBtn').textContent, /saving/i);

    harness.pendingApplies.forEach((release) => release());
    await first;
    await second;
    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.sandbox.document.getElementById('samActivitySaveBtn').disabled, false);
  });

  it('preserves typed state and skips apply when create fails', async () => {
    const harness = createRapidEntrySandbox({ templates: [], createError: true });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.filterActivity('Kroppssmörjning');
    ScheduleAddMenu.selectPendingCreate();
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 0);
    assert.equal(harness.modalHidden(), false);
    assert.equal(harness.sandbox.document.getElementById('samActivitySearch').value, 'Kroppssmörjning');
    assert.match(harness.sandbox.document.getElementById('samActivityError').textContent, /create-failed|createFailed/);
    assert.equal(harness.toasts.length, 0);
  });

  it('keeps the created id after apply failure and reuses it on retry', async () => {
    const harness = createRapidEntrySandbox({ templates: [], applyError: true, applyErrorUntil: 1 });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.filterActivity('Borsta tänderna');
    ScheduleAddMenu.selectPendingCreate();
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.modalHidden(), false);
    assert.equal(harness.sandbox.document.getElementById('samActivitySearch').value, 'Borsta tänderna');
    assert.equal(harness.toasts.length, 0);

    await ScheduleAddMenu.submitActivity();
    assert.equal(harness.activityPosts.length, 1, 'retry must not create a second template');
    assert.equal(harness.applyCalls.length, 2);
    assert.equal(harness.applyCalls[1].payload.activityTemplateId, 'created-1');
    assert.equal(harness.applyCalls[0].payload.operationId, harness.applyCalls[1].payload.operationId,
      'failed apply keeps the same operation id for idempotent retry');
    assert.equal(harness.modalHidden(), true);
    assert.match(harness.toasts[0].msg, /activity\.added/);
  });

  it('does not apply to a different child if context changed while the modal stayed open', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'kvall');
    ScheduleAddMenu.selectActivity('tpl-middag');
    harness.sandbox.currentChildId = 'child-b';
    await ScheduleAddMenu.submitActivity();

    assert.equal(harness.applyCalls.length, 0);
    assert.equal(harness.modalHidden(), true);
    assert.equal(harness.toasts[0].isError, true);
    assert.match(harness.toasts[0].msg, /childChanged/);
  });

  it('Copy Day still closes on success and does not use rapid-entry reset', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openCopyDay();
    harness.sandbox.ScheduleAddMenu.setCopyDaySource(5);
    harness.sandbox.ScheduleAddMenu.toggleCopyDayTarget(1);
    await ScheduleAddMenu.submitCopyDay();
    assert.equal(harness.copyDayCalls.length, 1);
    assert.equal(harness.modalHidden(), true);
    assert.equal(harness.activityPosts.length, 0);
  });

  it('Template still closes on success and does not stay in rapid-entry mode', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openTemplate();
    ScheduleAddMenu.selectTemplateItem('fam-tpl-1');
    await ScheduleAddMenu.submitTemplate();
    assert.equal(harness.templateCalls.length, 1);
    assert.equal(harness.modalHidden(), true);
    assert.equal(harness.activityPosts.length, 0);
    assert.equal(harness.applyCalls.length, 0);
  });

  it('Escape still closes the open Activity modal', async () => {
    const harness = createRapidEntrySandbox();
    await harness.sandbox.ScheduleAddMenu.openActivityForDay(5, 'kvall');
    assert.equal(harness.modalHidden(), false);
    harness.sandbox.ScheduleAddMenu.close();
    assert.equal(harness.modalHidden(), true);
  });
});

async function pumpHeldApplies(harness) {
  for (let i = 0; i < 80; i += 1) {
    harness.pendingApplies.splice(0).forEach((release) => release());
    await new Promise((resolve) => { setImmediate(resolve); });
  }
}

async function submitNamedCreate(ScheduleAddMenu, name) {
  ScheduleAddMenu.filterActivity(name);
  ScheduleAddMenu.selectPendingCreate();
  return ScheduleAddMenu.submitActivity();
}

describe('Rapid Entry — overlapping Save contract', () => {
  it('queues a second distinct Save before the first response returns', async () => {
    const harness = createRapidEntrySandbox({ templates: [], holdApply: true });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    const first = submitNamedCreate(ScheduleAddMenu, 'Vakna');
    for (let i = 0; i < 20 && harness.applyCalls.length === 0; i += 1) {
      await new Promise((resolve) => { setImmediate(resolve); });
    }
    assert.equal(harness.sandbox.document.getElementById('samActivitySaveBtn').disabled, true);

    const second = submitNamedCreate(ScheduleAddMenu, 'Äta frukost');
    assert.equal(harness.activityPosts.length, 1, 'second Save is queued, not dropped');
    assert.equal(harness.applyCalls.length, 1);
    const note = harness.sandbox.document.getElementById('samActivityQueueNote');
    assert.equal(note.classList.contains('hidden'), false);
    assert.match(note.textContent, /queued/);

    const pump = pumpHeldApplies(harness);
    await Promise.all([first, second, pump]);
    assert.equal(harness.activityPosts.length, 2);
    assert.equal(harness.applyCalls.length, 2);
    assert.deepEqual(harness.activityPosts.map((row) => row.name), ['Vakna', 'Äta frukost']);
    assert.notEqual(harness.applyCalls[0].payload.activityTemplateId, harness.applyCalls[1].payload.activityTemplateId);
    assert.equal(harness.sandbox.document.getElementById('samActivitySaveBtn').disabled, false);
    assert.equal(harness.modalHidden(), true);
  });

  it('lands six sequential overlapping activities exactly once', async () => {
    const names = ['Vakna', 'Gå på toaletten', 'Klä på sig', 'Äta frukost', 'Borsta tänderna', 'Packa väskan'];
    const harness = createRapidEntrySandbox({ templates: [] });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    const pending = names.map((name) => submitNamedCreate(ScheduleAddMenu, name));
    await Promise.all(pending);
    assert.equal(harness.activityPosts.length, 6);
    assert.equal(harness.applyCalls.length, 6);
    assert.deepEqual(harness.activityPosts.map((row) => row.name), names);
    assert.equal(new Set(harness.applyCalls.map((c) => c.payload.activityTemplateId)).size, 6);
  });

  it('lands eight sequential overlapping morning activities exactly once', async () => {
    const names = [
      'Vakna', 'Gå på toaletten', 'Klä på sig', 'Äta frukost',
      'Borsta tänderna', 'Packa väskan', 'Ta medicin', 'Gå hemifrån',
    ];
    const harness = createRapidEntrySandbox({ templates: [] });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    const pending = names.map((name) => submitNamedCreate(ScheduleAddMenu, name));
    await Promise.all(pending);
    assert.equal(harness.activityPosts.length, 8, 'zero duplicate activity_templates');
    assert.equal(harness.applyCalls.length, 8, 'zero duplicate schedule rows');
    assert.deepEqual(harness.activityPosts.map((row) => row.name), names);
    assert.equal(new Set(harness.applyCalls.map((c) => c.payload.activityTemplateId)).size, 8);
    assert.equal(harness.modalHidden(), true);
  });

  it('reuses a seed-name template after refreshing an empty catalog — no duplicate create', async () => {
    const harness = createRapidEntrySandbox({ templates: [] });
    let loads = 0;
    harness.sandbox.loadTemplates = async () => {
      loads += 1;
      if (loads >= 2) {
        harness.sandbox.allTemplates = [{ id: 'tpl-brush', name: 'Borsta tänderna' }];
      }
    };
    harness.sandbox.window.loadTemplates = harness.sandbox.loadTemplates;
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    await submitNamedCreate(ScheduleAddMenu, 'Borsta tänderna');
    assert.equal(loads >= 2, true);
    assert.equal(harness.activityPosts.length, 0, 'zero duplicate activity_templates');
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.applyCalls[0].payload.activityTemplateId, 'tpl-brush');
  });

  it('reuses an existing template with zero create requests', async () => {
    const harness = createRapidEntrySandbox();
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    ScheduleAddMenu.selectActivity('tpl-middag');
    await ScheduleAddMenu.submitActivity();
    assert.equal(harness.activityPosts.length, 0);
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.applyCalls[0].payload.activityTemplateId, 'tpl-middag');
  });

  it('retries attach after create succeeded and apply failed — no duplicate template', async () => {
    const harness = createRapidEntrySandbox({ templates: [], applyError: true, applyErrorUntil: 1 });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    await submitNamedCreate(ScheduleAddMenu, 'Packa väskan');
    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.sandbox.document.getElementById('samActivitySearch').value, 'Packa väskan');
    await ScheduleAddMenu.submitActivity();
    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 2);
    assert.equal(harness.applyCalls[1].payload.activityTemplateId, 'created-1');
  });

  it('API failure before template creation does not apply and is not a silent drop', async () => {
    const harness = createRapidEntrySandbox({ templates: [], createThrow: true });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    await submitNamedCreate(ScheduleAddMenu, 'Ta medicin');
    assert.equal(harness.activityPosts.length, 1);
    assert.equal(harness.applyCalls.length, 0);
    assert.equal(harness.modalHidden(), false);
    assert.match(harness.sandbox.document.getElementById('samActivityError').textContent, /createFailed/);
    assert.equal(harness.sandbox.document.getElementById('samActivitySaveBtn').disabled, false);
  });

  it('Save disabled state is visible while an Activity save is in flight', async () => {
    const harness = createRapidEntrySandbox({ holdApply: true });
    const { ScheduleAddMenu } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(1, 'morgon');
    ScheduleAddMenu.selectActivity('tpl-middag');
    const pending = ScheduleAddMenu.submitActivity();
    for (let i = 0; i < 20 && harness.applyCalls.length === 0; i += 1) {
      await new Promise((resolve) => { setImmediate(resolve); });
    }
    const btn = harness.sandbox.document.getElementById('samActivitySaveBtn');
    assert.equal(btn.disabled, true);
    assert.equal(btn.getAttribute('aria-busy'), 'true');
    assert.match(btn.textContent, /saving/i);
    harness.pendingApplies.forEach((release) => release());
    await pending;
    assert.equal(btn.disabled, false);
    assert.equal(harness.modalHidden(), true);
  });
});

describe('Mobile day list — context-aware Activity add', () => {
  function withDayNames(harness) {
    harness.sandbox.ScheduleCore.dayName = (dow) => ({ 5: 'Fredag', 1: 'Måndag' }[dow] || String(dow));
    harness.sandbox.ScheduleCore.sectionName = (key) => ({ morgon: 'Morgon', kvall: 'Kväll', dag: 'Dag' }[key] || key);
    return harness;
  }

  it('openActivityForDay Friday/morning already knows the day and section', async () => {
    const harness = withDayNames(createRapidEntrySandbox());
    await harness.sandbox.ScheduleAddMenu.openActivityForDay(5, 'morgon');
    const html = harness.sandbox.document.getElementById('scheduleAddMenuBody').innerHTML;
    assert.match(html, /Fredag/);
    assert.match(html, /Morgon/);
    assert.match(html, /id="samActivityContext"/);
    assert.match(html, /id="samActivityChangeContext"/);
    assert.match(html, /changeDaySection/);
    assert.doesNotMatch(html, /weekdaysAll/);
    assert.doesNotMatch(html, /id="samActivityDayPicker"/);
    assert.doesNotMatch(html, /id="samActivitySectionPicker"/);
    assert.match(html, /<details/);
    assert.match(html, /sam-time-field/);
    const scrollAt = html.indexOf('sam-activity-scroll');
    const footerAt = html.indexOf('id="samActivityFooter"');
    assert.ok(scrollAt > -1 && footerAt > scrollAt, 'Save footer lives in the activity scroll');
  });

  it('Ändra dag/del shows Alla dagar, Vardagar, Helg and sections with one selected state', async () => {
    const harness = withDayNames(createRapidEntrySandbox());
    const { ScheduleAddMenu, document } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'morgon');
    ScheduleAddMenu.editActivityContext();
    let html = document.getElementById('scheduleAddMenuBody').innerHTML;
    assert.match(html, /weekdaysAll/);
    assert.match(html, /weekdaysWeekday/);
    assert.match(html, /weekdaysWeekend/);
    assert.match(html, /aria-pressed="false"/);
    ScheduleAddMenu.toggleActivityDay(null, 'all');
    html = document.getElementById('scheduleAddMenuBody').innerHTML;
    assert.match(html, /aria-pressed="true"[^>]*schedule-choice-selected/);
    assert.match(html, /weekdaysAll/);
    assert.doesNotMatch(html, /bg-navy text-white border-navy/);
    ScheduleAddMenu.selectActivitySection('kvall');
    html = document.getElementById('scheduleAddMenuBody').innerHTML;
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /schedule-choice-selected/);
    assert.match(html, /Kväll/);
  });

  it('Lägg till en till keeps Friday morning and leaves the dialog open', async () => {
    const harness = withDayNames(createRapidEntrySandbox());
    const { ScheduleAddMenu, document } = harness.sandbox;
    await ScheduleAddMenu.openActivityForDay(5, 'morgon');
    ScheduleAddMenu.selectActivity('tpl-middag');
    await ScheduleAddMenu.addAnother();
    assert.equal(harness.applyCalls.length, 1);
    assert.equal(harness.applyCalls[0].payload.section, 'morgon');
    assert.deepEqual([...harness.applyCalls[0].payload.days], [5]);
    assert.equal(harness.modalHidden(), false);
    assert.equal(harness.sandbox.scheduleReloads, 1);
    const html = document.getElementById('scheduleAddMenuBody').innerHTML;
    assert.match(html, /Fredag/);
    assert.match(html, /Morgon/);
    assert.doesNotMatch(html, /weekdaysAll/);
    assert.equal(document.getElementById('samActivitySearch').value, '');
  });
});
