'use strict';

/**
 * #587 — Fas E: årsbok i Min samling + year_story months.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const YEARBOOK_PATH = path.join(ROOT, 'public/js/child-samling-yearbook.js');
const PRESENT_PATH = path.join(ROOT, 'public/js/child-samling-present.js');
const TREASURE_PATH = path.join(ROOT, 'public/js/child-treasure-present.js');
const UNIVERSE_DB_PATH = path.join(ROOT, 'db/child-universe.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadYearbook() {
  const context = { window: {} };
  vm.runInNewContext(read(YEARBOOK_PATH), context);
  return context.window.ChildSamlingYearbook;
}

function loadPresent() {
  const memoryCtx = { window: {} };
  vm.runInNewContext(read(path.join(ROOT, 'public/js/child-samling-memory.js')), memoryCtx);
  const yearbookCtx = { window: {} };
  vm.runInNewContext(read(YEARBOOK_PATH), yearbookCtx);
  const context = {
    window: {
      escHtml: function (s) { return String(s == null ? '' : s); },
      ChildSamlingMemory: memoryCtx.window.ChildSamlingMemory,
      ChildSamlingYearbook: yearbookCtx.window.ChildSamlingYearbook,
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

describe('#587 Fas E — ChildSamlingYearbook helpers', () => {
  it('monthSpreads normalizes year_story months', () => {
    const yb = loadYearbook();
    const spreads = yb.monthSpreads({
      year: 2026,
      months: [
        { month: 6, stars: 12, active_days: 8 },
        { month: 7, stars: 3, active_days: 2 },
      ],
    });
    assert.equal(spreads.length, 2);
    assert.equal(spreads[0].month, 6);
    assert.equal(spreads[0].stars, 12);
    assert.equal(spreads[1].active_days, 2);
  });

  it('starLine caps visual stars at five', () => {
    const yb = loadYearbook();
    assert.equal(yb.starLine(0), '');
    assert.equal(yb.starLine(3), '★★★');
    assert.equal(yb.starLine(7), '★★★★★ +2');
  });

  it('spreadPhrase uses warm NPF copy without shame', () => {
    const yb = loadYearbook();
    assert.match(yb.spreadPhrase(0, 0), /växer/i);
    assert.match(yb.spreadPhrase(2, 5), /tog hand om dig/i);
    assert.match(yb.spreadPhrase(5, 10), /aktiv/i);
    assert.doesNotMatch(yb.spreadPhrase(0, 0), /misslyck|förlor|du har inga/i);
  });
});

describe('#587 Fas E — Min samling årsbok render', () => {
  it('shows yearbook pages when months have activity', () => {
    const present = loadPresent();
    const html = present.render({
      stats: { lifetime_stars: 20, streak: 3 },
      achievements: [],
      year_story: {
        year: 2026,
        months: [{ month: 7, stars: 15, active_days: 10 }],
      },
    }, { redemptions: [] });

    assert.match(html, /Min årsbok/);
    assert.match(html, /bsp-yearbook-book/);
    assert.match(html, /Juli/);
    assert.match(html, /Du var aktiv den här månaden/);
    assert.match(html, /10 dagar/);
    assert.doesNotMatch(html, /shop/i);
    assert.doesNotMatch(html, /ChildCollections/);
  });

  it('shows warm empty yearbook without shame copy', () => {
    const present = loadPresent();
    const html = present.render({
      stats: { lifetime_stars: 0, streak: 0 },
      achievements: [],
      year_story: { year: 2026, months: [{ month: 7, stars: 0, active_days: 0 }] },
    }, { redemptions: [] });

    assert.match(html, /Här kommer månadsuppslag/);
    assert.doesNotMatch(html, /du har inga/i);
  });
});

describe('#587 Fas E — Skattkammaren presentation layout', () => {
  it('treasure present uses unified hero and clean section layout', () => {
    const src = read(TREASURE_PATH);
    assert.match(src, /btp-hero/);
    assert.match(src, /btp-card-list/);
    assert.match(src, /btp-history-list/);
    assert.doesNotMatch(src, /btp-history-lid/);
    assert.doesNotMatch(src, /ChildCollections/);
  });
});

describe('#587 Fas E — getYearStory months query', () => {
  it('child-universe getYearStory returns months array', () => {
    const src = read(UNIVERSE_DB_PATH);
    assert.match(src, /months: months/);
    assert.match(src, /EXTRACT\(MONTH FROM dl\.date\)/);
    assert.match(src, /active_days/);
  });
});
