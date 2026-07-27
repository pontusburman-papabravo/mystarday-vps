'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { installChildI18nVm } = require('./helpers/child-i18n-vm');

const ROOT = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function loadPresent(locale) {
  const context = {
    window: {
      escHtml: function (s) { return String(s == null ? '' : s); },
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
  installChildI18nVm(context, locale || 'sv-SE');
  context.window.getChildDateLocale = function () {
    return locale === 'en-GB' ? 'en-GB' : 'sv-SE';
  };
  context.getChildDateLocale = context.window.getChildDateLocale;
  vm.runInNewContext(read('public/js/child-samling-memory.js'), context);
  vm.runInNewContext(read('public/js/child-samling-yearbook.js'), context);
  context.window.ChildSamlingMemory = context.window.ChildSamlingMemory;
  context.window.ChildSamlingYearbook = context.window.ChildSamlingYearbook;
  vm.runInNewContext(read('public/js/child-samling-present.js'), context);
  return context.window.ChildSamlingPresent;
}

describe('i18n child samling + rewards surfaces', () => {
  it('child locale bundles have matching samling yearbook + diploma keys', () => {
    const i18n = require('../src/lib/i18n');
    i18n.loadLocales();
    const keys = [
      'child.samling.opening',
      'child.samling.yearbookSpreadGrowing',
      'child.samling.yearbookDays_other',
      'child.samling.diplomaTryggStartTitle',
      'child.samling.collectionsEmptyHint',
      'child.rewards.goalPickerTitle',
      'child.rewards.goalPickerHint',
    ];
    for (const key of keys) {
      const sv = i18n.t('sv-SE', key);
      const en = i18n.t('en-GB', key);
      assert.notEqual(sv, key, `sv-SE missing ${key}`);
      assert.notEqual(en, key, `en-GB missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/, `${key} en-GB still Swedish: ${en}`);
    }
  });

  it('yearbook helpers render English month and spread copy', () => {
    const yearbookCtx = {
      window: {
        getChildDateLocale: () => 'en-GB',
        getChildUiLocale: () => 'en-GB',
      },
    };
    yearbookCtx.getChildDateLocale = yearbookCtx.window.getChildDateLocale;
    installChildI18nVm(yearbookCtx, 'en-GB');
    vm.runInNewContext(read('public/js/child-samling-yearbook.js'), yearbookCtx);
    const yb = yearbookCtx.window.ChildSamlingYearbook;
    assert.equal(yb.monthTitle(7), 'July');
    assert.match(yb.spreadPhrase(0, 0), /spread grows/i);
    assert.match(yb.spreadPhrase(5, 10), /active this month/i);
    assert.equal(yb.daysLabel(3), '3 days');
  });

  it('Min samling present renders English chrome when locale is en-GB', () => {
    const present = loadPresent('en-GB');
    const html = present.render({
      stats: { lifetime_stars: 20, streak: 3 },
      achievements: [],
      year_story: {
        year: 2026,
        months: [{ month: 7, stars: 15, active_days: 10 }],
      },
    }, { redemptions: [] });

    assert.match(html, /My collection/);
    assert.match(html, /July/);
    assert.match(html, /You were active this month/);
    assert.match(html, /10 days/);
    assert.doesNotMatch(html, /Min samling/);
    assert.doesNotMatch(html, /Juli/);
  });

  it('diplomas localize to English titles', () => {
    const memoryCtx = { window: {} };
    installChildI18nVm(memoryCtx, 'en-GB');
    vm.runInNewContext(read('public/js/child-samling-memory.js'), memoryCtx);
    const diplomas = memoryCtx.window.ChildSamlingMemory.earnedDiplomas(
      { stats: { lifetime_stars: 30, streak: 0 }, achievements: [{ id: 1 }] },
      []
    );
    assert.ok(diplomas.length >= 1);
    assert.match(diplomas[0].title, /Safe start/i);
    assert.doesNotMatch(diplomas[0].subtitle, /[åäöÅÄÖ]/);
  });

  it('treasure and rewards modules use locale-aware date helper', () => {
    const treasure = read('public/js/child-treasure-present.js');
    const rewards = read('public/js/child-dashboard-rewards.js');
    assert.match(treasure, /formatChildShortDate/);
    assert.match(rewards, /formatChildShortDate/);
    assert.doesNotMatch(treasure, /toLocaleDateString\(\s*'sv-SE'/);
    assert.doesNotMatch(rewards, /toLocaleDateString\(\s*'sv-SE'/);
  });

  it('child-dashboard collection and treasure loading use data-i18n', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /data-i18n="child\.samling\.opening"/);
    assert.match(html, /data-i18n="child\.rewards\.openTreasure"/);
    assert.match(html, /data-i18n="child\.rewards\.goalPickerTitle"/);
    assert.match(html, /data-i18n="child\.rewards\.goalPickerHint"/);
  });

  it('child-ui-text exposes shared date locale helpers', () => {
    const src = read('public/js/child-ui-text.js');
    assert.match(src, /getChildDateLocale/);
    assert.match(src, /formatChildShortDate/);
  });

  it('ensureBarnetsSamlingLive seeds live feature row (E2E helper)', async () => {
    const { setupTestDb } = require('./helpers/setup');
    const db = await setupTestDb({ truncate: true });
    if (db.skip) return;
    const { ensureBarnetsSamlingLive } = require('./e2e/helpers/i18n-flags');
    await ensureBarnetsSamlingLive(db.query);
    const row = await db.query(`SELECT status FROM features WHERE slug = 'barnets_samling'`);
    assert.equal(row.rows[0].status, 'live');
    await db.cleanup();
  });
});
