'use strict';

/**
 * Phase 4 — Weekly Schedule chrome classification + Library CTA hierarchy + Planering hub IA.
 * Source-pattern characterization tests (same style as test/schedule-add-menu.test.js — this
 * repo does not run a full browser/jsdom harness for these pages). See
 * docs/schedule-canonical-architecture.md "Phase 4" for the classification table these tests
 * lock in place.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Phase 4 — Weekly Schedule chrome (advanced views under disclosure)', () => {
  it('18: exactly one obvious primary add action ("+ Lägg till"), unchanged from Phase 1B', () => {
    const html = read('public/schedule.html');
    const matches = html.match(/id="scheduleAddMenuBtn"/g) || [];
    assert.equal(matches.length, 1, 'exactly one + Lägg till trigger button');
  });

  it('19: Listläge/Tidsvy/Jämför barn/Specialdagar/Skapa PDF are tucked under a "Visa ▾" disclosure, not always-visible pills', () => {
    const html = read('public/schedule.html');
    const barStart = html.indexOf('id="viewModeBar"');
    const barEnd = html.indexOf('</div>', html.indexOf('id="fillWeekBtn"'));
    const bar = html.slice(barStart, barEnd);

    assert.match(bar, /data-i18n="schedule\.chrome\.showMoreViews"/, 'a "Visa ▾" disclosure trigger must exist in the view mode bar');
    const detailsMatch = bar.match(/<details[\s\S]*?<\/details>/);
    assert.ok(detailsMatch, 'the advanced views must be wrapped in a <details> disclosure');
    const disclosure = detailsMatch[0];
    for (const id of ['btnListView', 'btnTimelineView', 'btnSbsView', 'btnSpecialDaysView', 'schedulePrintLink']) {
      assert.match(disclosure, new RegExp(`id="${id}"`), `${id} must be inside the disclosure, not inline in the primary toolbar`);
    }
    // The primary "Schema" view button must remain OUTSIDE the disclosure (always visible).
    const beforeDisclosure = bar.slice(0, bar.indexOf('<details'));
    assert.match(beforeDisclosure, /id="btnNormalView"/, 'the default Schema view stays inline/primary');
  });

  it('20: no duplicate primary schedule-mutation entry — "+ Lägg till" remains the sole canonical entry point', () => {
    const html = read('public/schedule.html');
    // "Fyll vecka" stays an invisible state marker (Phase 1C), not a second visible add action.
    const fillWeekMatch = html.match(/<span id="fillWeekBtn"[^>]*>/);
    assert.ok(fillWeekMatch, 'fillWeekBtn marker must still exist');
    assert.match(fillWeekMatch[0], /class="hidden"/, 'fillWeekBtn must remain a hidden state marker, never a second visible mutation entry');
  });

  it('Kalender links to Weekly Schedule\'s Specialdagar tab as an explicit secondary bridge for create/edit/delete (Calendar itself is read-only)', () => {
    const html = read('public/calendar.html');
    assert.match(html, /id="calendarManageSpecialDaysLink"/);
    assert.match(html, /href="\/schedule\?view=special-days"/);
    const src = read('public/js/calendar-page.js');
    assert.match(src, /function updateManageSpecialDaysLink/);
    assert.match(src, /view=special-days/);
  });

  it('the disclosure reuses the existing overflow <details>/<summary> pattern (min-h-[44px] touch targets, no new component)', () => {
    const html = read('public/schedule.html');
    const detailsMatch = html.match(/<details class="relative">\s*<summary class="view-btn[\s\S]*?<\/details>/);
    assert.ok(detailsMatch, 'expected a <details class="relative"> wrapping a view-btn styled <summary>');
    const touchTargets = (detailsMatch[0].match(/min-h-\[44px\]/g) || []).length;
    assert.ok(touchTargets >= 5, `expected at least 5 min-h-[44px] controls (trigger + 4 view buttons) inside the disclosure, found ${touchTargets}`);
  });
});

describe('Phase 4 — Library CTA hierarchy (schedule-mutation actions stay visually secondary)', () => {
  it('standard-library schedule application ("Kopiera till barn") is a secondary outline CTA, matching the Phase 1C family-template demotion', () => {
    const src = read('public/js/library-standard.js');
    const fnBody = src.slice(src.indexOf('openScheduleCopyDialog(\'${s.id}\''), src.indexOf('openScheduleCopyDialog(\'${s.id}\'') + 300);
    assert.doesNotMatch(fnBody, /bg-gold/, 'the standard-schedule "apply to child" button must not be a primary gold CTA');
    assert.match(fnBody, /bg-white border-2 border-lavender/, 'it must use the same secondary/outline style as the demoted family-template CTA');
  });

  it('family-template schedule application remains the Phase 1C secondary/outline CTA (regression)', () => {
    const src = read('public/js/library-schema.js');
    assert.match(src, /openCopyFamilyTemplateDialog[\s\S]{0,120}bg-white border-2 border-lavender/);
  });

  it('activity-level content actions (adding a standard activity to the family library) remain primary gold — they are content management, not schedule mutation', () => {
    const src = read('public/js/library-standard.js');
    assert.match(src, /copyStandardActivity[\s\S]{0,50}/);
    const singleCopyMatch = src.match(/onclick="copyStandardActivity\('\$\{a\.id\}', this\)"[\s\S]{0,150}/);
    assert.ok(singleCopyMatch, 'expected the per-activity copy button');
    assert.match(singleCopyMatch[0], /bg-gold/, 'adding a standard activity into the family library is content management and may stay primary gold');
  });
});

describe('Phase 4 — Planering hub IA matches the locked model', () => {
  it('10/11: Veckoschema and Kalender are grouped under the "Planera vardagen" (plan) section', () => {
    const src = read('public/js/planning-hub.js');
    const planLinksMatch = src.match(/const PLAN_LINKS = \[[\s\S]*?\];/);
    assert.ok(planLinksMatch);
    assert.match(planLinksMatch[0], /weekSchedule/);
    assert.match(planLinksMatch[0], /calendar/);
  });

  it('12: Bibliotek (content) is grouped under a distinct "Bygg innehåll" (content) section, not mixed with plan links', () => {
    const src = read('public/js/planning-hub.js');
    const contentLinksMatch = src.match(/const CONTENT_LINKS = \[[\s\S]*?\];/);
    assert.ok(contentLinksMatch);
    assert.match(contentLinksMatch[0], /library/);
    const planLinksMatch = src.match(/const PLAN_LINKS = \[[\s\S]*?\];/);
    assert.doesNotMatch(planLinksMatch[0], /library/, 'Bibliotek must not appear in the plan section');
  });

  it('13: Boendeschema is conditional — only added to the plan section when custody is active for the family', () => {
    const src = read('public/js/planning-hub.js');
    assert.match(src, /if \(custodyActive\) planLinks\.push\(CUSTODY_LINK\)/);
    const planLinksMatch = src.match(/const PLAN_LINKS = \[[\s\S]*?\];/);
    assert.doesNotMatch(planLinksMatch[0], /custody/i, 'Boendeschema must not be unconditionally in PLAN_LINKS — it is appended only when custodyActive');
  });

  it('14: no "Fyll vecka" entry point on the Planering hub', () => {
    const src = read('public/js/planning-hub.js');
    assert.doesNotMatch(src, /fillWeek|fyll.?vecka/i);
  });

  it('15: "Tilldela schema" (assign-schedule) is demoted into "Övrigt" (other), not the primary plan section', () => {
    const src = read('public/js/planning-hub.js');
    const otherLinksMatch = src.match(/const OTHER_LINKS = \[[\s\S]*?\];/);
    assert.ok(otherLinksMatch);
    assert.match(otherLinksMatch[0], /assignSchedule/);
    const planLinksMatch = src.match(/const PLAN_LINKS = \[[\s\S]*?\];/);
    assert.doesNotMatch(planLinksMatch[0], /assignSchedule/, '"Tilldela schema" must not be in the primary plan section');
  });

  it('16: Daglig logg (Daily Log) is not a primary Planering entry — it lives in "Övrigt"', () => {
    const src = read('public/js/planning-hub.js');
    const otherLinksMatch = src.match(/const OTHER_LINKS = \[[\s\S]*?\];/);
    assert.match(otherLinksMatch[0], /dailyLog/);
    const planLinksMatch = src.match(/const PLAN_LINKS = \[[\s\S]*?\];/);
    const contentLinksMatch = src.match(/const CONTENT_LINKS = \[[\s\S]*?\];/);
    assert.doesNotMatch(planLinksMatch[0], /dailyLog/);
    assert.doesNotMatch(contentLinksMatch[0], /dailyLog/);
  });

  it('17: PDF export ("Skapa PDF — schema") is not a primary Planering entry — it lives in "Övrigt"', () => {
    const src = read('public/js/planning-hub.js');
    const otherLinksMatch = src.match(/const OTHER_LINKS = \[[\s\S]*?\];/);
    assert.match(otherLinksMatch[0], /printSchema/);
    const planLinksMatch = src.match(/const PLAN_LINKS = \[[\s\S]*?\];/);
    assert.doesNotMatch(planLinksMatch[0], /printSchema/);
  });

  it('the hub never exposes more than the two locked top-level sections plus the conditional custody/other groups (no new top-level choices)', () => {
    const src = read('public/js/planning-hub.js');
    const sectionCalls = src.match(/sectionHtml\(pt\('planning\.sections\.\w+'\)/g) || [];
    const sectionKeys = sectionCalls.map((s) => s.match(/planning\.sections\.(\w+)/)[1]);
    assert.deepEqual(sectionKeys.sort(), ['buildContent', 'other', 'planWeek'].sort(), 'exactly the three expected sections — no new top-level IA groups introduced');
  });
});
