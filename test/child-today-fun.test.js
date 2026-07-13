'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadChildTodayFun(gateOn) {
  const script = read('public/js/child-today-fun.js');
  const win = {
    ChildWorlds: gateOn ? { isBarnetsSamlingEnabled: function () { return true; } } : {},
    document: {
      documentElement: {
        getAttribute: function (name) {
          return name === 'data-barnets-samling' && gateOn ? 'on' : null;
        },
      },
    },
  };
  vm.runInNewContext(script, { window: win, document: win.document }, { filename: 'child-today-fun.js' });
  return win;
}

describe('child-today-fun — playful Idag helpers', () => {
  it('renders star trail for modest task counts', () => {
    const win = loadChildTodayFun(true);
    const html = win.ChildTodayFun.renderProgressTrail(3, 5);
    assert.match(html, /ctf-progress-trail/);
    assert.match(html, /3 av 5 klara/);
    assert.equal((html.match(/ctf-progress-star--done/g) || []).length, 3);
  });

  it('renders compact bar for long task lists', () => {
    const win = loadChildTodayFun(true);
    const html = win.ChildTodayFun.renderProgressTrail(8, 15);
    assert.match(html, /ctf-progress-trail--bar/);
    assert.match(html, /width:53%/);
  });

  it('maps evening hour to kvall dagdel key', () => {
    const win = loadChildTodayFun(true);
    const key = win.ChildTodayFun.currentDagdelKey(new Date(2026, 6, 12, 19, 30));
    assert.equal(key, 'kvall');
  });

  it('focus bar uses fun greeting only when gate ON', () => {
    const focusSrc = read('public/js/child-today-focus.js');
    assert.match(focusSrc, /ChildTodayFun/);
    assert.match(focusSrc, /ctf-bar--fun/);
    const funCss = read('public/css/child-today-fun.css');
    assert.match(funCss, /dagdel-section--current/);
  });

  it('applyTimeQuestTags marks past incomplete as hidden past bucket', () => {
    const script = read('public/js/child-today-fun.js');
    const items = [
      { id: 'a', name: 'Morgon', completed: false },
      { id: 'b', name: 'Nu', completed: false },
      { id: 'c', name: 'Nästa', completed: false },
    ];
    const win = {
      ChildWorlds: { isBarnetsSamlingEnabled: function () { return true; } },
      classifyActivities: function () {
        return {
          now: [items[1]],
          next: [items[2]],
          laterFuture: [],
          laterPast: [items[0]],
        };
      },
      getCurrentTimeHHMM: function () { return '20:00'; },
      document: {
        documentElement: {
          getAttribute: function () { return 'on'; },
          classList: { contains: function () { return true; } },
        },
      },
    };
    vm.runInNewContext(script, { window: win, document: win.document }, { filename: 'child-today-fun.js' });
    const tagged = win.ChildTodayFun.applyTimeQuestTags(items);
    assert.equal(tagged.find(function (i) { return i.id === 'a'; })._nnl_status, 'past');
    assert.equal(tagged.find(function (i) { return i.id === 'b'; })._nnl_status, 'now');
    assert.equal(tagged.find(function (i) { return i.id === 'c'; })._nnl_status, 'next');
  });
});
