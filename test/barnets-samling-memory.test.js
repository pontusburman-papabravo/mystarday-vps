'use strict';

/**
 * #586 — Fas D: minneskort, hylla, diplom i Min samling.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const MEMORY_PATH = path.join(ROOT, 'public/js/child-samling-memory.js');
const PRESENT_PATH = path.join(ROOT, 'public/js/child-samling-present.js');
const VIEW_PATH = path.join(ROOT, 'public/js/child-samling-view.js');

const FORBIDDEN = [
  /\bshop\b/i,
  /\bköp\b/i,
  /\bloot\b/i,
  /\bclaim\b/i,
  /misslyck/i,
  /förlor/i,
  /du har inga/i,
  /skynda/i,
  /starBalance/,
  /requestRedeem/,
  /ChildCollections/,
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadMemory() {
  const context = { window: {} };
  vm.runInNewContext(read(MEMORY_PATH), context);
  return context.window.ChildSamlingMemory;
}

function loadPresent() {
  const context = {
    window: {
      escHtml: function (s) { return String(s == null ? '' : s); },
      ChildSamlingMemory: loadMemory(),
    },
    document: {
      createElement: function () {
        const el = { _text: '', innerHTML: '' };
        Object.defineProperty(el, 'textContent', {
          set: function (v) {
            el._text = String(v == null ? '' : v);
            el.innerHTML = el._text;
          },
          get: function () { return el._text; },
        });
        return el;
      },
    },
  };
  vm.runInNewContext(read(PRESENT_PATH), context);
  return context.window.ChildSamlingPresent;
}

function universe(overrides) {
  return Object.assign({
    stats: { lifetime_stars: 30, streak: 8 },
    achievements: [{ name: 'Första', emoji: '⭐', unlocked_at: '2026-06-01T08:00:00.000Z' }],
  }, overrides || {});
}

describe('#586 Fas D — ChildSamlingMemory helpers', () => {
  it('rewardMemories filters approved/auto only, newest first', () => {
    const mem = loadMemory();
    const rows = mem.rewardMemories([
      { reward_name: 'A', status: 'pending', created_at: '2026-07-03T10:00:00.000Z' },
      { reward_name: 'B', status: 'approved', created_at: '2026-07-01T10:00:00.000Z' },
      { reward_name: 'C', status: 'auto', created_at: '2026-07-02T10:00:00.000Z' },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].reward_name, 'C');
    assert.equal(rows[1].reward_name, 'B');
    assert.equal(rows[0].stars_saved, 0);
  });

  it('earnedDiplomas uses universe + memories without spendable saldo', () => {
    const mem = loadMemory();
    const redemptions = [
      { status: 'approved', created_at: '2026-07-01T10:00:00.000Z' },
    ];
    const memories = mem.rewardMemories(redemptions);
    const earned = mem.earnedDiplomas(universe(), memories);
    const titles = earned.map(function (d) { return d.title; });
    assert.ok(titles.includes('Trygg start'));
    assert.ok(titles.includes('Jag klarade det'));
    assert.ok(titles.includes('Stjärnsamlare'));
    assert.ok(titles.includes('Rutinhjälte'));
    assert.ok(!titles.includes('Superstjärna'));
  });
});

describe('#586 Fas D — Min samling render with memories', () => {
  it('shows memory cards, shelf and diplomas when data exists', () => {
    const present = loadPresent();
    const html = present.render(universe(), {
      redemptions: [{
        reward_name: 'Filmkväll',
        reward_icon: '🎬',
        star_cost: 20,
        status: 'approved',
        created_at: '2026-06-15T12:00:00.000Z',
      }],
    });
    assert.match(html, /Mina minneskort/);
    assert.match(html, /Min belöningshylla/);
    assert.match(html, /Diplom/);
    assert.match(html, /Filmkväll/);
    assert.match(html, /Sparad som minne/);
    assert.match(html, /Det här klarade du/);
    assert.match(html, /⭐ 20/);
    assert.match(html, /bsp-shelf-board/);
    assert.match(html, /bsp-hero-panel/);
    assert.match(html, /Trofévägg/);
    assert.doesNotMatch(html, /starBalance/);
  });

  it('shows warm empty states when no completed rewards', () => {
    const present = loadPresent();
    const html = present.render(universe({ stats: { lifetime_stars: 0, streak: 0 }, achievements: [] }), {
      redemptions: [],
    });
    assert.match(html, /Här kommer minnen från belöningar du har sparat ihop till/);
    assert.match(html, /Hylla växer fram när du sparat ihop till något/);
    assert.match(html, /Här kommer diplom när du samlat fina minnen/);
    assert.doesNotMatch(html, /du har inga/i);
  });

  it('present source avoids shop/redeem/spendable patterns', () => {
    const src = read(PRESENT_PATH) + read(MEMORY_PATH);
    FORBIDDEN.forEach(function (pattern) {
      assert.doesNotMatch(src, pattern, 'forbidden: ' + pattern);
    });
  });
});

describe('#586 Fas D — view loads redemptions read-only', () => {
  it('child-samling-view fetches rewards redemptions without redeem calls', () => {
    const src = read(VIEW_PATH);
    assert.match(src, /\/api\/me\/rewards/);
    assert.match(src, /redemptions/);
    assert.match(src, /Promise\.all/);
    assert.doesNotMatch(src, /\/redeem/);
    assert.doesNotMatch(src, /starBalance/);
    assert.doesNotMatch(src, /ChildCollections/);
  });

  it('child-dashboard.html includes memory module before present', () => {
    const html = read(path.join(ROOT, 'public/child-dashboard.html'));
    const memIdx = html.indexOf('child-samling-memory.js');
    const presIdx = html.indexOf('child-samling-present.js');
    assert.ok(memIdx >= 0 && presIdx > memIdx);
  });
});
