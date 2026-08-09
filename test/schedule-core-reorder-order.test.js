'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScheduleCore() {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/schedule-core.js'), 'utf8');
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.window.ScheduleCore;
}

describe('ScheduleCore.buildOrderedDailyIdsFromReorder', () => {
  const { buildOrderedDailyIdsFromReorder, SECTIONS } = loadScheduleCore();

  it('places engångsaktivitet in DOM order among weekly items', () => {
    const weeklyA = 'w-a';
    const weeklyB = 'w-b';
    const onceId = 'once-1';
    const tplA = 'tpl-a';
    const tplB = 'tpl-b';

    const scheduleItems = [
      { id: weeklyA, section: 'dag', activity_template_id: tplA, is_once_task: false },
      { id: onceId, section: 'dag', activity_template_id: null, is_once_task: true },
      { id: weeklyB, section: 'dag', activity_template_id: tplB, is_once_task: false },
    ];

    const logItems = [
      { id: 'log-a', section: 'dag', activity_template_id: tplA },
      { id: onceId, section: 'dag', activity_template_id: null, is_once_task: true },
      { id: 'log-b', section: 'dag', activity_template_id: tplB },
    ];

    const newOrder = [
      { id: weeklyA, sort_order: 0, section: 'dag' },
      { id: onceId, sort_order: 1, section: 'dag' },
      { id: weeklyB, sort_order: 2, section: 'dag' },
    ];

    const ordered = buildOrderedDailyIdsFromReorder(newOrder, scheduleItems, logItems);
    assert.equal(ordered.length, 3);
    assert.equal(String(ordered[0]), 'log-a');
    assert.equal(String(ordered[1]), 'once-1');
    assert.equal(String(ordered[2]), 'log-b');
  });
});
