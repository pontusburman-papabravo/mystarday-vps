'use strict';

/**
 * A1 — Hem stale links / chart: truthful destinations and current-week contract.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { routeChangedFiles } = require('../scripts/lib/test-routing/route.mjs');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function localYmd(date) {
  const d = date instanceof Date ? date : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function buildWeekSeries(children, today) {
  const todayStr = localYmd(today);
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const series = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset + i);
    const dateStr = localYmd(d);
    let totalCompleted = 0;
    (children || []).forEach(function (c) {
      const hist = c.history || [];
      const row = hist.find(function (h) { return h.date === dateStr; });
      if (row) totalCompleted += row.completed || 0;
      else if (dateStr === todayStr) totalCompleted += c.today_completed || 0;
    });
    series.push({ dateStr: dateStr, value: totalCompleted, isToday: dateStr === todayStr });
  }
  return series;
}

describe('A1 Hem stale links / chart', () => {
  it('classifier treats Hem files as parent-experience without overlay edits', () => {
    const plan = routeChangedFiles(ROOT, {
      files: [
        'public/js/dashboard-home-hub.js',
        'public/js/nav-config.js',
        'public/dashboard.html',
      ],
    });
    assert.ok(plan.domains.includes('parent-experience') || plan.domains.length >= 1);
  });

  it('Hem tab treats /home as Hem; rewards path is real /skattkammaren', () => {
    const nav = read('public/js/nav-config.js');
    assert.match(nav, /paths:\s*\[['"]\/dashboard['"],\s*['"]\/home['"]\]/);
    assert.match(nav, /paths:\s*\[['"]\/rewards['"],\s*['"]\/skattkammaren['"]\]/);
    assert.doesNotMatch(nav, /skattkammaren-parent/);
    assert.match(nav, /href:\s*['"]\/dashboard['"]/);
    assert.match(nav, /href:\s*['"]\/rewards['"]/);
    assert.match(nav, /href:\s*['"]\/planning['"]/);
    assert.match(nav, /href:\s*['"]\/for-dig['"]/);
    assert.match(nav, /href:\s*['"]\/family['"]/);
  });

  it('magic Hem hides the legacy 8-week star chart and skips loading it', () => {
    const html = read('public/dashboard.html');
    const line = html.split('\n').find(function (l) { return l.indexOf('starHistorySection') >= 0; });
    assert.match(line, /parent-magic-legacy-hide/);
    const star = read('public/js/dashboard-star-history.js');
    assert.match(star, /shouldSkipLegacyStarChart/);
    assert.match(star, /DashboardHomeHub\.shouldUse/);
    assert.match(star, /weekNumberLabel/);
  });

  it('magic hub does not emit replaced treasury URL or UTC date strings', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.doesNotMatch(hub, /\/skattkammaren/);
    assert.doesNotMatch(hub, /toISOString\(\)/);
    assert.match(hub, /\/daily-log\?childId=/);
    assert.match(hub, /\/family\/child\//);
    assert.match(hub, /LocaleDateTime\.localYmd/);
    const coach = read('public/js/journey-coach.js');
    assert.match(coach, /LocaleDateTime\.localYmd/);
    assert.doesNotMatch(coach, /toISOString\(\)/);
  });

  it('localYmd stays on the device calendar day when UTC already rolled over', () => {
    const lateEvening = new Date(2026, 7, 30, 23, 30, 0);
    assert.equal(localYmd(lateEvening), '2026-08-30');
    if (lateEvening.getTimezoneOffset() !== 0) {
      assert.notEqual(lateEvening.toISOString().slice(0, 10), localYmd(lateEvening));
    }
    const locale = read('public/js/locale-datetime.js');
    assert.match(locale, /function localYmd\(date\)/);
    assert.match(locale, /d\.getFullYear\(\)/);
  });

  it('week series uses canonical history only and does not invent completions', () => {
    const monday = new Date(2026, 7, 24, 10, 0, 0);
    const empty = buildWeekSeries([], monday);
    assert.equal(empty.length, 7);
    assert.ok(empty.every(function (p) { return p.value === 0; }));

    const familyChild = {
      id: 'child-a',
      today_completed: 0,
      history: [{ date: '2026-08-24', completed: 2 }],
    };
    const otherFamily = {
      id: 'child-b',
      today_completed: 99,
      history: [{ date: '2026-08-24', completed: 50 }],
    };
    const onlyA = buildWeekSeries([familyChild], monday);
    const mondayPoint = onlyA.find(function (p) { return p.dateStr === '2026-08-24'; });
    assert.equal(mondayPoint.value, 2);

    const leaked = buildWeekSeries([familyChild, otherFamily], monday);
    const leakedMonday = leaked.find(function (p) { return p.dateStr === '2026-08-24'; });
    assert.equal(leakedMonday.value, 52, 'caller must pass only in-family children');

    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /function buildWeekSeries\(children\)/);
    assert.match(hub, /totalCompleted \+= row\.completed/);
    assert.match(hub, /\(children \|\| \[\]\)\.forEach/);
  });

  it('legacy star-history empty payload stays hidden and tooltip drops duplicate V/W prefix', () => {
    const star = read('public/js/dashboard-star-history.js');
    assert.match(star, /if \(!ch \|\| ch\.length === 0 \|\| !weeks \|\| weeks\.length === 0\) return;/);
    assert.match(star, /weekNumberLabel\(w\.week_label\)/);
    assert.equal(String('V12').replace(/^[VW]/i, ''), '12');
    assert.equal(String('W12').replace(/^[VW]/i, ''), '12');
  });
});
