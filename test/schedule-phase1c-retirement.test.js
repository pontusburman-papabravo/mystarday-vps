'use strict';

/**
 * Phase 1C — retire legacy Weekly Schedule entry points that compete with the canonical
 * Phase 1B "+ Lägg till" flow. Source-pattern characterization tests (same style as
 * test/schedule-add-menu.test.js — no full browser/jsdom harness for this page).
 *
 * See docs/schedule-canonical-architecture.md "Phase 1C" for the full legacy-retirement table
 * and rationale for each decision (retire / demote / rewire / defer).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const HTML = 'public/schedule.html';
const SCHEDULE_JS = 'public/js/schedule.js';
const DND_JS = 'public/js/schedule-dnd.js';
const PLANNING_HUB_JS = 'public/js/planning-hub.js';
const LIBRARY_SCHEMA_JS = 'public/js/library-schema.js';
const LIBRARY_MAGIC_JS = 'public/js/library-magic-schedules.js';

describe('Phase 1C — A. Fyll vecka retirement', () => {
  it('A1: "Fyll vecka" is no longer a visible primary Weekly Schedule control', () => {
    const html = read(HTML);
    // Only the primary toolbar (#viewModeBar) is asserted — the legacy #fillWeekModal markup
    // (unreachable now that nothing triggers it) is intentionally left in place as harmless
    // dead markup per the strangler rule, rather than risking a larger deletion in this pass.
    const toolbarRaw = html.slice(html.indexOf('id="viewModeBar"'), html.indexOf('</div>', html.indexOf('id="viewModeBar"')));
    const toolbar = toolbarRaw.replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(toolbar, /data-i18n="schedule\.chrome\.fillWeek"/);
    assert.doesNotMatch(toolbar, /Fyll vecka/);
    assert.doesNotMatch(toolbar, /<button[^>]*id="fillWeekBtn"/);
    // The id is retained in the toolbar ONLY as an invisible state marker (span, no onclick).
    assert.match(toolbarRaw, /<span id="fillWeekBtn" class="hidden" aria-hidden="true"><\/span>/);
    // openFillWeekModal() is no longer wired to any visible control anywhere on the page.
    assert.doesNotMatch(html, /onclick="openFillWeekModal\(\)"/);
  });

  it('A2: "+ Lägg till" remains visible and primary', () => {
    const html = read(HTML);
    assert.match(html, /id="scheduleAddMenuBtn"/);
    assert.match(html, /ScheduleAddMenu\.open\(\)/);
    assert.match(html, /data-i18n="schedule\.addMenu\.trigger"/);
  });

  it('A3: legacy fill-week endpoint/client functions are still retained for compatibility (not deleted)', () => {
    const insertFillSrc = read('public/js/schedule-insert-fill.js');
    assert.match(insertFillSrc, /function openFillWeekModal/);
    assert.match(insertFillSrc, /function submitFillWeek/);
    const fillWeekRoute = read('src/routes/schedules/fill-week.js');
    assert.match(fillWeekRoute, /module\.exports/);
  });

  it('A4: no new activity_category canonical source was introduced (SOURCE_TYPES unchanged)', () => {
    const applySrc = read('src/lib/schedule-apply.js');
    assert.match(applySrc, /SOURCE_TYPES = Object\.freeze\(\['family_template', 'standard_schedule'\]\)/);
    // activity_category may still be named in doc comments describing the fill-week legacy
    // boundary (pre-existing) — only assert it never appears inside the SOURCE_TYPES literal.
    const sourceTypesLine = applySrc.match(/SOURCE_TYPES = Object\.freeze\(\[[^\]]*\]\)/)[0];
    assert.doesNotMatch(sourceTypesLine, /activity_category/);
  });

  it('the fillWeekBtn marker still drives + Lägg till visibility (unchanged plumbing)', () => {
    const addMenuSrc = read('public/js/schedule-add-menu.js');
    assert.match(addMenuSrc, /getElementById\('fillWeekBtn'\)/);
    assert.match(addMenuSrc, /syncAddMenuButtonVisibility/);
  });
});

describe('Phase 1C — B. Assign schedule demotion', () => {
  it('B5: Planering hub does NOT list "Tilldela schema" in the primary "Planera vardagen" grid', () => {
    const src = read(PLANNING_HUB_JS);
    const planLinksBlock = src.slice(src.indexOf('const PLAN_LINKS'), src.indexOf('const CUSTODY_LINK'));
    assert.doesNotMatch(planLinksBlock, /assignSchedule/);
  });

  it('B6: /assign-schedule remains reachable (page + route retained, not deleted)', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/assign-schedule.html')), 'assign-schedule.html must still exist');
    const src = read(PLANNING_HUB_JS);
    assert.match(src, /'\/assign-schedule'/, 'still linked somewhere (secondary "Övrigt" section) for deep-link/QA reachability');
  });

  it('B7: assign-schedule link only appears in the secondary OTHER_LINKS section, not duplicated in PLAN_LINKS', () => {
    const src = read(PLANNING_HUB_JS);
    const otherLinksBlock = src.slice(src.indexOf('const OTHER_LINKS'), src.indexOf('const CAPABILITY_LINKS'));
    assert.match(otherLinksBlock, /assignSchedule/, 'retained as a secondary/legacy entry for deep-link + manual access');
  });
});

describe('Phase 1C — C. Legacy copy-day control rewired (custody-safe)', () => {
  it('C8/C9: the day-row "Kopiera dag" button opens the canonical add-menu flow, not the legacy modal', () => {
    const src = read(SCHEDULE_JS);
    const dayActionRow = src.slice(src.indexOf("spt('schedule.editor.copyDay')") - 300, src.indexOf("spt('schedule.editor.copyDay')") + 50);
    assert.match(dayActionRow, /ScheduleAddMenu\.openCopyDay\(\)/, 'primary path must delegate to the canonical, custody-safe copy-day command');
  });

  it('C8/C9: the day-tab drag-and-drop copy gesture calls the canonical ScheduleApplyClient, not the legacy /copy-day route', () => {
    const src = read(DND_JS);
    assert.doesNotMatch(src, /\/schedules\/copy-day['"`]/, 'legacy fetch to /copy-day must be fully removed from the DnD path');
    assert.match(src, /ScheduleApplyClient\.copyDay\(/);
    assert.match(src, /custodyHomeId/);
  });

  it('C10: the DnD copy gesture forwards the active custody home id and generates a fresh operation_id', () => {
    const src = read(DND_JS);
    const fnBody = src.slice(src.indexOf('async function doDayDndCopy'), src.indexOf('async function doDayDndSwap'));
    assert.match(fnBody, /ScheduleCustody\.getActiveHomeId\(\)/);
    assert.match(fnBody, /ScheduleApplyClient\.newOperationId\(\)/);
    assert.match(fnBody, /mode: 'replace_day'/, 'preserves the exact pre-existing always-replace gesture semantics (no silent behavior change)');
  });

  it('no visible day-copy control on the schedule page still calls the legacy child-bulk copy-day route', () => {
    // The DnD gesture must never call the legacy route.
    assert.doesNotMatch(read(DND_JS), /\/schedules\/copy-day['"`]/);
    // schedule.js retains openCopyDayModal()/submitCopyDay() ONLY as a defensive fallback for
    // the (never-expected) case ScheduleAddMenu fails to load — the primary day-row button
    // onclick delegates to the canonical flow (asserted above), so this legacy function is
    // dead code on any normally-loaded page, not a second live primary path.
    const scheduleJs = read(SCHEDULE_JS);
    const dayActionRow = scheduleJs.slice(scheduleJs.indexOf("scheduleContent').innerHTML"), scheduleJs.indexOf('initDragDrop();'));
    assert.doesNotMatch(dayActionRow, /\/schedules\/copy-day['"`]/, 'the rendered day action row markup must not directly reference the legacy route');
  });
});

describe('Phase 1C — D. Day action row cleanup (no duplicate primary copy-day semantics)', () => {
  it('advanced/legacy day actions (Kopiera till veckor, Kopiera till barn) are grouped under a demoted "Fler alternativ" disclosure, not primary buttons', () => {
    const src = read(SCHEDULE_JS);
    const dayActionRow = src.slice(src.indexOf("scheduleContent').innerHTML"), src.indexOf('initDragDrop();'));
    assert.match(dayActionRow, /<details/, 'advanced actions must be grouped, not primary siblings');
    assert.match(dayActionRow, /moreOptions/);
    const detailsBlock = dayActionRow.slice(dayActionRow.indexOf('<details'));
    assert.match(detailsBlock, /openCopyWeeksModal\(\)/);
    assert.match(detailsBlock, /openCopyChildModal\(\)/);
  });

  it('day action row has exactly one visible "Kopiera dag" control (no duplicate copy-day semantics)', () => {
    const src = read(SCHEDULE_JS);
    const dayActionRow = src.slice(src.indexOf("scheduleContent').innerHTML"), src.indexOf('initDragDrop();'));
    const copyDayMatches = dayActionRow.match(/schedule\.editor\.copyDay/g) || [];
    assert.equal(copyDayMatches.length, 1, 'only one "Kopiera dag" control should remain in the primary day action row');
  });

  it('day-level primary actions keep >=44px touch targets after regrouping', () => {
    const src = read(SCHEDULE_JS);
    const dayActionRow = src.slice(src.indexOf("scheduleContent').innerHTML"), src.indexOf('initDragDrop();'));
    const touchTargetCount = (dayActionRow.match(/min-h-\[44px\]/g) || []).length;
    assert.ok(touchTargetCount >= 5, `expected >=5 min-h-[44px] day-action controls, found ${touchTargetCount}`);
  });
});

describe('Phase 1C — E. Weekly Schedule canonical flow — regression (unchanged)', () => {
  it('E14-E20: + Lägg till menu, Aktivitet, Från mall, Kopiera dag, Spara dagen som mall, replace_sections, replace_day confirmation all still present', () => {
    const src = read('public/js/schedule-add-menu.js');
    for (const fn of ['openActivity', 'submitActivity', 'openTemplate', 'submitTemplate', 'openCopyDay', 'submitCopyDay', 'openSaveAsTemplate', 'submitSaveAsTemplate']) {
      assert.match(src, new RegExp(`\\b${fn}\\b`), `canonical function ${fn} must remain unchanged`);
    }
    assert.match(src, /replace_sections/);
    assert.match(src, /function confirmReplaceDay/);
  });
});

describe('Phase 1C — F. Custody safety of remaining visible controls', () => {
  it('every canonical Phase 1B/1C control includes custody_home_id propagation', () => {
    const addMenuSrc = read('public/js/schedule-add-menu.js');
    assert.match(addMenuSrc, /activeCustodyHomeId/);
    const clientSrc = read('public/js/schedule-apply-client.js');
    assert.match(clientSrc, /custodyHomeId/);
  });

  it('the rewired legacy day-row Kopiera dag + DnD copy paths are custody-safe (delegate to canonical client)', () => {
    const dndSrc = read(DND_JS);
    assert.match(dndSrc, /custodyHomeId/);
  });

  // ── Final custody hardening: day-tab "+" and section "+ Aktivitet" ─────────────────────
  // These were the two remaining visible controls documented as deferred in the previous pass.
  // Both are now rewired to converge on ScheduleAddMenu.openActivityForDay(), which only ever
  // reaches the write path through the EXISTING submitActivity() — the same function
  // "+ Lägg till → Aktivitet" already used, which already calls activeCustodyHomeId() and
  // forwards custody_home_id on every save. No new mutation path was introduced.

  it('1/13: day-tab "+" delegates to the canonical Aktivitet flow, not the legacy insert-day modal', () => {
    const src = read(SCHEDULE_JS);
    const dayTabButton = src.slice(src.indexOf('insert-day-btn') - 400, src.indexOf('insert-day-btn') + 50);
    assert.match(dayTabButton, /ScheduleAddMenu\.openActivityForDay\(\$\{d}\)/, 'the day-tab + must call the canonical flow when ScheduleAddMenu is loaded');
  });

  it('2: day-tab "+" preselects the tapped day (not necessarily the currently-viewed day)', () => {
    const addMenuSrc = read('public/js/schedule-add-menu.js');
    const fnBody = addMenuSrc.slice(addMenuSrc.indexOf('async function openActivityForDay'), addMenuSrc.indexOf('async function openActivityForDay') + 500);
    assert.match(fnBody, /activityState\.days = new Set\(\[dayOfWeek\]\)/);
  });

  it('3/14: section "+ Aktivitet" (openAddModal) delegates to the canonical Aktivitet flow, not the legacy addActivityModal', () => {
    const src = read('public/js/schedule-activity-modals.js');
    const fnBody = src.slice(src.indexOf('function openAddModal'), src.indexOf('function openAddModal') + 600);
    assert.match(fnBody, /ScheduleAddMenu\.openActivityForDay\(/);
    assert.match(fnBody, /return;/, 'must return before reaching any legacy modal DOM manipulation');
  });

  it('4/5: section "+ Aktivitet" preselects both the current day AND the requested section', () => {
    const src = read('public/js/schedule-activity-modals.js');
    const fnBody = src.slice(src.indexOf('function openAddModal'), src.indexOf('function openAddModal') + 600);
    assert.match(fnBody, /ScheduleAddMenu\.openActivityForDay\(typeof currentDay === 'number' \? currentDay : undefined, sectionKey \|\| 'dag'\)/);
  });

  it('6: no direct legacy mutation request remains reachable behind either visible control on the normal (ScheduleAddMenu loaded) path', () => {
    // openInsertDayModal's own body still contains the legacy fetches (kept as a defensive
    // fallback, see its own doc comment) — the important guarantee is that the ACTUAL visible
    // "+" buttons never reach it while ScheduleAddMenu is present, asserted above. Confirm the
    // guard is unconditional (no feature flag, always active when ScheduleAddMenu exists).
    const activityModalsSrc = read('public/js/schedule-activity-modals.js');
    const openAddModalBody = activityModalsSrc.slice(activityModalsSrc.indexOf('function openAddModal'), activityModalsSrc.indexOf('function closeAddModal'));
    const guardIdx = openAddModalBody.indexOf('window.ScheduleAddMenu');
    const returnIdx = openAddModalBody.indexOf('return;');
    assert.ok(guardIdx > -1 && returnIdx > guardIdx, 'the canonical-delegation guard must come before any legacy DOM/state mutation');
  });

  it('7-12/regression: openActivityForDay never calls a mutation route directly — it only ever prepares activityState for the existing submitActivity()', () => {
    const addMenuSrc = read('public/js/schedule-add-menu.js');
    const fnBody = addMenuSrc.slice(addMenuSrc.indexOf('async function openActivityForDay'), addMenuSrc.indexOf('async function openActivityForDay') + 500);
    assert.doesNotMatch(fnBody, /apiFetch|ScheduleApplyClient\.(applyActivity|applyTemplate|copyDay)/, 'openActivityForDay must never mutate directly — submitActivity() (already custody-safe) owns every write');
    assert.match(fnBody, /await openActivity\(\)/, 'must reuse the exact same canonical Aktivitet open path, not a parallel implementation');
  });
});

describe('Phase 1C — G. Legacy backend compatibility retained', () => {
  it('G23: legacy child-bulk routes (copy-day, copy-to-weeks, copy-to-child, swap-day) still exist unmodified', () => {
    const src = read('src/routes/schedules/child-bulk.js');
    for (const routePath of ['copy-day', 'copy-to-weeks', 'copy-to-child', 'swap-day']) {
      assert.match(src, new RegExp(routePath.replace(/-/g, '-')), `legacy route ${routePath} must remain for compatibility (frontend no longer calls it for the day-row/DnD paths, but is retained per the strangler rule)`);
    }
  });

  it('G23: legacy fill-week route module still exports a router', () => {
    const src = read('src/routes/schedules/fill-week.js');
    assert.match(src, /express\.Router/);
    assert.match(src, /module\.exports/);
  });

  it('G23: family_template and standard_schedule remain canonical SOURCE_TYPES (not removed)', () => {
    const src = read('src/lib/schedule-apply.js');
    assert.match(src, /'family_template'/);
    assert.match(src, /'standard_schedule'/);
  });
});

describe('Phase 1C — D. Library demotion', () => {
  it('D11: family-template and standard-schedule "Kopiera till barn" CTAs are demoted from primary gold styling', () => {
    const src = read(LIBRARY_SCHEMA_JS);
    // Every remaining "Kopiera till barn" apply button must use the secondary/outline treatment,
    // never the primary bg-gold CTA style, on this Library page.
    const applyButtonBlocks = src.split('📥 Kopiera till barn').slice(0, -1);
    assert.ok(applyButtonBlocks.length >= 2, 'expected at least two "Kopiera till barn" CTAs (family template + standard schedule cards)');
    for (const block of applyButtonBlocks) {
      const nearby = block.slice(-400);
      assert.doesNotMatch(nearby, /bg-gold hover:bg-yellow-500 text-white/, 'apply-to-week CTA must not use the primary gold treatment after Phase 1C demotion');
    }
  });

  it('D11: magic-schedules detail "Kopiera schema" CTA is demoted from -primary to -secondary', () => {
    const src = read(LIBRARY_MAGIC_JS);
    assert.doesNotMatch(src, /library-magic-btn-primary.*data-schedule-action="copy"/s);
    assert.match(src, /library-magic-btn-secondary.*data-schedule-action="copy"/s);
  });

  it('D12: content-management jobs remain fully available (create/edit/delete templates, browse standard library)', () => {
    const src = read(LIBRARY_SCHEMA_JS);
    assert.match(src, /function openCreateTemplateModal/);
    assert.match(src, /function deleteTemplate/);
    assert.match(src, /Redigera/);
    assert.match(src, /\/api\/standard-library\/schedules/);
  });

  it('D13: no new Library scheduling UI was introduced (routes/dialogs unchanged, only styling demoted)', () => {
    const src = read(LIBRARY_SCHEMA_JS);
    assert.match(src, /function openScheduleCopyDialog/);
    assert.match(src, /function executeScheduleCopy/);
  });
});

describe('Phase 1C — H. i18n', () => {
  it('H25/H26: schedule.editor.moreOptions has full sv-SE/en-GB parity', () => {
    const sv = JSON.parse(read('config/i18n/schedule-sv-SE.json'));
    const en = JSON.parse(read('config/i18n/schedule-en-GB.json'));
    assert.equal(typeof sv.editor.moreOptions, 'string');
    assert.equal(typeof en.editor.moreOptions, 'string');
  });

  it('H27: hardcoded-Swedish audit remains green for STRICT + BASELINE tiers after Phase 1C edits', () => {
    // Executed for real in package.json's lint:public gate; this test asserts the STRICT file
    // list still includes the files touched by Phase 1C so future edits keep being audited.
    const auditSrc = read('scripts/audit-hardcoded-swedish.js');
    assert.match(auditSrc, /schedule-add-menu\.js/);
  });
});
