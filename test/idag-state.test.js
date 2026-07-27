'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FOCUS_SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-today-focus.js'), 'utf8');

function loadIdagState() {
  const context = {
    window: {
      cpt: function (key, params) {
        const map = {
          'today.enjoyFreeDay': 'Njut av ledig dagen',
          'today.allDoneToday': 'Allt klart idag!',
          'today.checkOffToContinue': 'Bocka av för att fortsätta',
        };
        if (key === 'today.laterPrefix' && params && params.name) {
          return 'Senare: ' + params.name;
        }
        if (key === 'today.progressDone' && params) {
          return params.completed + ' av ' + params.total + ' klara';
        }
        return map[key] || '';
      },
    },
    document: { getElementById: function () { return null; } },
    console,
  };
  context.window.ctf = context.window.cpt;
  vm.runInNewContext(FOCUS_SRC, {
    window: context.window,
    document: context.document,
    cpt: context.window.cpt,
    console,
  });
  return {
    resolveIdagState: context.window.resolveIdagState,
    IDAG_STATES: context.window.IDAG_STATES,
  };
}

function item(id, name, opts) {
  opts = opts || {};
  return {
    id: id,
    name: name,
    completed: !!opts.completed,
    star_value: opts.star_value != null ? opts.star_value : 1,
    sort_order: opts.sort_order != null ? opts.sort_order : 0,
    _nnl_status: opts._nnl_status,
  };
}

describe('resolveIdagState — exclusive state machine', () => {
  const { resolveIdagState, IDAG_STATES } = loadIdagState();

  it('No tasks — empty day', () => {
    const state = resolveIdagState({ items: [], total: 0, completed: 0 }, { isToday: true });
    assert.equal(state.state, IDAG_STATES.NO_TASKS);
    assert.equal(state.primaryAction, null);
  });

  it('All done — celebration state, no primary', () => {
    const state = resolveIdagState({
      items: [item('a', 'Frukost', { completed: true })],
      total: 1,
      completed: 1,
    }, { isToday: true });
    assert.equal(state.state, IDAG_STATES.ALL_DONE);
    assert.equal(state.primaryAction, null);
    assert.match(state.nextStepLabel, /klart|done/i);
  });

  it('Active — primary complete on now item', () => {
    const state = resolveIdagState({
      items: [
        item('a', 'Borsta tänder', { completed: true }),
        item('b', 'Frukost', { star_value: 2 }),
        item('c', 'Packa väska'),
      ],
      total: 3,
      completed: 1,
    }, { isToday: true });
    assert.equal(state.state, IDAG_STATES.ACTIVE);
    assert.equal(state.primaryAction.type, 'complete');
    assert.equal(state.primaryAction.itemId, 'b');
    assert.equal(state.starsOnNow, 2);
    assert.match(state.progressLabel, /1 av 3/);
    assert.match(state.nextStepLabel, /Packa/);
  });

  it('Active — respects backend now_next_filtered tags', () => {
    const state = resolveIdagState({
      items: [
        item('a', 'Frukost', { completed: true, _nnl_status: 'done' }),
        item('b', 'Läxa', { _nnl_status: 'now', star_value: 3 }),
      ],
      total: 2,
      completed: 1,
      now_next_filtered: true,
    }, { isToday: true });
    assert.equal(state.nowItem.id, 'b');
    assert.equal(state.starsOnNow, 3);
  });

  it('All done — only when no incomplete work remains (counters cannot override)', () => {
    const state = resolveIdagState({
      items: [item('a', 'Frukost'), item('b', 'Läxa', { completed: true })],
      total: 2,
      completed: 2,
    }, { isToday: true });
    assert.equal(state.state, IDAG_STATES.ACTIVE);
    assert.equal(state.nowItem.id, 'a');
    assert.equal(state.primaryAction.itemId, 'a');
  });

  it('not today — no primary complete action', () => {
    const state = resolveIdagState({
      items: [item('a', 'Frukost')],
      total: 1,
      completed: 0,
    }, { isToday: false });
    assert.equal(state.primaryAction, null);
  });
});
