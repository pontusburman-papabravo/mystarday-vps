'use strict';

/**
 * #620 — Fas B regression: Min samling gate on/off.
 * Verifierar shell + glas + trofévägg + streak + trygg copy när gate ON,
 * och att legacy/Idag/Skattkammaren inte påverkas.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PRESENT_PATH = path.join(ROOT, 'public/js/child-samling-present.js');
const VIEW_PATH = path.join(ROOT, 'public/js/child-samling-view.js');
const WORLDS_PATH = path.join(ROOT, 'public/js/child-worlds.js');
const DASH_PATH = path.join(ROOT, 'public/js/child-dashboard.js');
const TODAY_PATH = path.join(ROOT, 'public/js/child-today-focus.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

  function loadChildSamlingPresent() {
  const memoryCtx = { window: {} };
  vm.runInNewContext(read(path.join(ROOT, 'public/js/child-samling-memory.js')), memoryCtx);
  const yearbookCtx = { window: {} };
  vm.runInNewContext(read(path.join(ROOT, 'public/js/child-samling-yearbook.js')), yearbookCtx);
  const context = {
    window: {
      escHtml: function (s) {
        return String(s == null ? '' : s);
      },
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
          get: function () {
            return el._text;
          },
        });
        return el;
      },
    },
  };
  vm.runInNewContext(read(PRESENT_PATH), context);
  return context.window.ChildSamlingPresent;
}

function emptyUniverse() {
  return {
    stats: { lifetime_stars: 0, streak: 0 },
    achievements: [],
  };
}

function populatedUniverse() {
  return {
    stats: { lifetime_stars: 42, streak: 5 },
    achievements: [
      {
        name: 'Första stjärnan',
        emoji: '⭐',
        description: 'Du fick din första stjärna',
        unlocked_at: '2026-06-01T08:00:00.000Z',
      },
    ],
  };
}

describe('#620 Fas B — Min samling render (gate ON presentation)', () => {
  it('empty universe shows shell + warm tomstatusar for glas, vägg, streak', () => {
    const present = loadChildSamlingPresent();
    const html = present.render(emptyUniverse(), { redemptions: [] });

    assert.match(html, /bsp-page/);
    assert.match(html, /Min samling/);
    assert.match(html, /Titta vad du har samlat/);
    assert.match(html, /bsp-hero-panel/);
    assert.match(html, /bsp-glass-jar--hero/);
    assert.match(html, /Trofévägg/);
    assert.match(html, /Dagar i rad/);
    assert.match(html, /bsp-glass-jar--empty/);
    assert.match(html, /Ditt stjärnglas fylls när du samlar stjärnor/);
    assert.match(html, /Här kommer dina medaljer att synas/);
    assert.match(html, /Här växer din kedja när du är aktiv/);
    assert.doesNotMatch(html, /du har inga/i);
    assert.doesNotMatch(html, /ChildCollections/);
    assert.doesNotMatch(html, /star_cost/);
    assert.doesNotMatch(html, /bsp-glass-total[^<]*0 stjärnor/);
  });

  it('populated universe shows glas, trofévägg and streak chain', () => {
    const present = loadChildSamlingPresent();
    const html = present.render(populatedUniverse(), { redemptions: [] });

    assert.match(html, /Totalt har du tjänat 42 stjärnor/);
    assert.match(html, /bsp-glass-fill/);
    assert.doesNotMatch(html, /bsp-glass-jar--empty/);
    assert.match(html, /bsp-trophy-card/);
    assert.match(html, /Första stjärnan/);
    assert.match(html, /Du har varit aktiv 5 dagar i rad/);
    assert.match(html, /bsp-streak-chain/);
    assert.doesNotMatch(html, /ChildCollections/);
  });

  it('gold streak styling at 30+ days without shame copy', () => {
    const present = loadChildSamlingPresent();
    const html = present.render({
      stats: { lifetime_stars: 100, streak: 35 },
      achievements: [],
    }, { redemptions: [] });

    assert.match(html, /bsp-streak--gold/);
    assert.match(html, /Din kedja lyser guld/);
    assert.doesNotMatch(html, /bruten/i);
    assert.doesNotMatch(html, /förlor/i);
    assert.doesNotMatch(html, /misslyck/i);
  });

  it('bindInteractions toggles persistent trophy selection', () => {
    const present = loadChildSamlingPresent();
    const clicked = [];
    const attrs = [];
    let cardClick;
    const card = {
      classList: {
        add: function (c) { clicked.push('trophy:add:' + c); },
        remove: function (c) { clicked.push('trophy:remove:' + c); },
        contains: function (c) { return c === 'is-selected' && clicked.includes('trophy:add:is-selected'); },
      },
      setAttribute: function (k, v) { attrs.push(k + ':' + v); },
      addEventListener: function (evt, fn) {
        assert.equal(evt, 'click');
        cardClick = fn;
      },
    };
    const root = {
      querySelectorAll: function (sel) {
        if (sel === '.bsp-trophy-card') return [card];
        if (sel === '.bsp-trophy-card.is-selected') return [];
        if (sel === '.bsp-memory-card') return [];
        assert.fail('unexpected selector: ' + sel);
      },
      addEventListener: function () {},
      contains: function () { return true; },
    };
    const context = {
      window: { escHtml: function (s) { return String(s == null ? '' : s); } },
      document: root,
    };
    vm.runInNewContext(read(PRESENT_PATH), context);
    context.window.ChildSamlingPresent.bindInteractions(root);
    cardClick({ stopPropagation: function () {} });
    assert.ok(clicked.includes('trophy:add:is-selected'));
    assert.ok(attrs.includes('aria-expanded:true'));
  });
});

describe('#620 Fas B — gate wiring and legacy isolation', () => {
  it('child-samling-view mounts ChildSamlingPresent and loads redemptions read-only', () => {
    const src = read(VIEW_PATH);
    assert.match(src, /ChildSamlingPresent\.render/);
    assert.match(src, /ChildSamlingPresent\.bindInteractions/);
    assert.match(src, /ChildUniverse\.load/);
    assert.match(src, /\/api\/me\/rewards/);
    assert.doesNotMatch(src, /\/redeem/);
    assert.doesNotMatch(src, /starBalance/);
    assert.doesNotMatch(src, /ChildCollections/);
  });

  it('gate OFF keeps LEGACY_WORLDS with Min värld and no forced collection tab', () => {
    const src = read(WORLDS_PATH);
    const legacy = src.slice(src.indexOf('LEGACY_WORLDS'), src.indexOf('SAMLING_WORLDS'));
    const samling = src.slice(src.indexOf('SAMLING_WORLDS'), src.indexOf('LEGACY_HASH'));
    assert.match(legacy, /Min värld/);
    assert.match(legacy, /id: 'world'/);
    assert.doesNotMatch(legacy, /id: 'collection'/);
    assert.match(samling, /id: 'collection'/);
    assert.match(samling, /Min samling/);
    assert.match(src, /return _barnetsSamling \? SAMLING_WORLDS : LEGACY_WORLDS/);
  });

  it('child-dashboard refreshes Min samling only on collection tab', () => {
    const src = read(DASH_PATH);
    assert.match(src, /isCollection && window\.ChildSamlingView\) ChildSamlingView\.refresh\(\)/);
    const todaySrc = read(TODAY_PATH);
    assert.doesNotMatch(todaySrc, /ChildSamlingView/);
    assert.doesNotMatch(todaySrc, /collectionView/);
  });

  it('Idag (child-today-focus) has no barnets_samling or Min samling coupling', () => {
    const src = read(TODAY_PATH);
    assert.doesNotMatch(src, /barnets_samling/);
    assert.doesNotMatch(src, /ChildSamling/);
    assert.doesNotMatch(src, /collectionView/);
    assert.doesNotMatch(src, /ChildCollections/);
  });

  it('child-samling CSS scopes presentation under data-barnets-samling gate', () => {
    const css = read(path.join(ROOT, 'public/css/child-samling.css'));
    assert.match(css, /\[data-barnets-samling="on"\]/);
    assert.match(css, /\.bsp-glass-jar--empty/);
    assert.match(css, /\.bsp-glass-count/);
    assert.match(css, /\.bsp-memory-card/);
    assert.match(css, /\.bsp-shelf-stage/);
    assert.match(css, /\.bsp-diploma-card/);
    assert.match(css, /\.bsp-yearbook-page/);
    assert.match(css, /scroll-snap-type/);
    let depth = 0;
    for (const ch of css) {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      assert.ok(depth >= 0, 'unbalanced closing brace in child-samling.css');
    }
    assert.equal(depth, 0, 'unclosed brace block in child-samling.css');
  });
});

describe('#586 Fas D — Min samling minneskort, hylla, diplom', () => {
  it('gate ON render includes Fas B + D sections without shop copy', () => {
    const present = loadChildSamlingPresent();
    const html = present.render(populatedUniverse(), {
      redemptions: [{
        reward_name: 'Filmkväll',
        reward_icon: '🎬',
        star_cost: 20,
        status: 'approved',
        created_at: '2026-06-15T12:00:00.000Z',
      }],
    });
    assert.match(html, /bsp-hero-panel/);
    assert.match(html, /bsp-glass-jar--hero/);
    assert.match(html, /Trofévägg/);
    assert.match(html, /Dagar i rad/);
    assert.match(html, /Mina minneskort/);
    assert.match(html, /Min belöningshylla/);
    assert.match(html, /Diplom/);
    assert.match(html, /Filmkväll/);
    assert.doesNotMatch(html, /star_cost/);
    assert.doesNotMatch(html, /starBalance/);
    assert.doesNotMatch(html, /ChildCollections/);
    assert.doesNotMatch(html, /\bshop\b/i);
    assert.doesNotMatch(html, /\bköp/i);
  });

  it('memory module maps star_cost to stars_saved without exposing shop field in present', () => {
    const memCtx = { window: {} };
    vm.runInNewContext(read(path.join(ROOT, 'public/js/child-samling-memory.js')), memCtx);
    const rows = memCtx.window.ChildSamlingMemory.rewardMemories([
      { reward_name: 'Glass', star_cost: 15, status: 'approved', created_at: '2026-07-01T10:00:00.000Z' },
    ]);
    assert.equal(rows[0].stars_saved, 15);
    assert.equal(rows[0].star_cost, undefined);
    const presentSrc = read(PRESENT_PATH);
    assert.doesNotMatch(presentSrc, /star_cost/);
  });
});
