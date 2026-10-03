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

  it('drag-copy hint is demoted — not an always-visible toolbar/day-header chrome control', () => {
    const html = read('public/schedule.html');
    const barStart = html.indexOf('id="viewModeBar"');
    const barEnd = html.indexOf('id="fillWeekBtn"');
    const bar = html.slice(barStart, barEnd);
    assert.doesNotMatch(bar, /drag-copy-hint/, 'the view-mode toolbar must not show an always-visible drag-copy hint');
    const scheduleJs = read('public/js/schedule.js');
    const renderSlice = scheduleJs.slice(scheduleJs.indexOf('function renderSchedule'), scheduleJs.indexOf('function renderSchedule') + 1200);
    assert.doesNotMatch(renderSlice, /dragCopyHint/, 'the day editor header must not repeat the drag-copy hint — day-tab selector hint is enough');
    assert.match(html, /schedule\.chrome\.daySelectorHint/, 'contextual day-tab drag hint remains on the day selector only');
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

describe('Phase 4 — Planering hub IA matches the locked three-choice model', () => {
  it('primary choices are Veckan and Aktiviteter; calendar is not a peer card', () => {
    const src = read('public/js/planning-hub.js');
    const primary = src.slice(src.indexOf('const PRIMARY_CHOICES'), src.indexOf('const MER_LINKS'));
    assert.match(primary, /\/schedule/);
    assert.match(primary, /\/library/);
    assert.doesNotMatch(primary, /\/calendar/);
  });

  it('Boendeschema is conditional — only added to Mer when custody is active', () => {
    const src = read('public/js/planning-hub.js');
    assert.match(src, /if \(custodyActive\) more\.push\(CUSTODY_LINK\)/);
    const primary = src.slice(src.indexOf('const PRIMARY_CHOICES'), src.indexOf('const MER_LINKS'));
    assert.doesNotMatch(primary, /custody/i);
  });

  it('no "Fyll vecka" entry point on the Planering hub', () => {
    const src = read('public/js/planning-hub.js');
    assert.doesNotMatch(src, /fillWeek|fyll.?vecka/i);
  });

  it('Tilldela schema and PDF live in Mer, not in the primary choices', () => {
    const src = read('public/js/planning-hub.js');
    const mer = src.slice(src.indexOf('const MER_LINKS'), src.indexOf('const CUSTODY_LINK'));
    assert.match(mer, /assignSchedule/);
    assert.match(mer, /printSchema/);
    const primary = src.slice(src.indexOf('const PRIMARY_CHOICES'), src.indexOf('const MER_LINKS'));
    assert.doesNotMatch(primary, /assignSchedule/);
    assert.doesNotMatch(primary, /printSchema/);
  });

  it('Daglig logg is not a Planering card', () => {
    const src = read('public/js/planning-hub.js');
    assert.doesNotMatch(src, /dailyLog/);
    assert.doesNotMatch(src, /\/daily-log/);
  });
});
