'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function loadPrintSchemaCore() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/print-schema-core.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.runInNewContext(src, sandbox);
  return sandbox.window.PrintSchemaCore;
}

describe('print-schema-core (custody-independent)', () => {
  it('flattenWeekDays includes all days when custody absent', () => {
    const core = loadPrintSchemaCore();
    const weeks = [{
      days: [
        { date: '2026-07-06', dayOfWeek: 1, activities: [{ name: 'Frukost', section: 'morgon' }] },
        { date: '2026-07-07', dayOfWeek: 2, activities: [] },
      ],
    }];
    const days = core.flattenWeekDays(weeks, false);
    assert.equal(days.length, 2);
    assert.equal(days[0].skipContent, false);
    assert.equal(days[0].activities.length, 1);
    assert.equal(days[0].custody, null);
  });

  it('flattenWeekDays with myDaysOnly skips only explicit non-my custody days', () => {
    const core = loadPrintSchemaCore();
    const weeks = [{
      days: [
        { date: '2026-07-06', dayOfWeek: 1, activities: [{ name: 'A' }], custody: { isMyDay: true, label: 'Mamma' } },
        { date: '2026-07-07', dayOfWeek: 2, activities: [{ name: 'B' }], custody: { isMyDay: false, label: 'Pappa' } },
        { date: '2026-07-08', dayOfWeek: 3, activities: [{ name: 'C' }] },
      ],
    }];
    const allDays = core.flattenWeekDays(weeks, false);
    assert.equal(allDays.length, 3);
    assert.equal(allDays.filter(function (d) { return d.skipContent; }).length, 0);

    const myDays = core.flattenWeekDays(weeks, true);
    assert.equal(myDays.length, 3);
    assert.equal(myDays[1].skipContent, true);
    assert.equal(myDays[2].skipContent, false);
  });

  it('buildPrintHtml renders schema without custody metadata', () => {
    const core = loadPrintSchemaCore();
    const child = { id: 'c1', name: 'Ella', emoji: '🌟' };
    const monday = core.mondayOf(new Date('2026-07-08T12:00:00'));
    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const d = core.addDays(monday, i);
      days.push({
        date: core.fmtSvDate(d),
        dateObj: d,
        activities: i === 0 ? [{ name: 'Tandborstning', section: 'morgon', icon: '🪥' }] : [],
        custody: null,
        skipContent: false,
      });
    }
    const doc = core.buildPrintHtml({
      child: child,
      days: days,
      periodKey: '1w',
      myDaysOnly: false,
      mode: 'print',
    });
    assert.match(doc.body, /Ella — Schema/);
    assert.match(doc.body, /Tandborstning/);
    assert.match(doc.styles, /A4 landscape/);
  });
});
