'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateChildTodaySessionPass,
  hasEnglishChildTodaySurfaceCopy,
} = require('../scripts/ops/founder-smoke-browser-child.cjs');
const {
  findSwedishChildTodayLeaks,
  hasSwedishChildTodayCoreLeakInText,
  CHILD_TODAY_READY_ATTR,
} = require('../scripts/ops/founder-smoke-browser-child-today-visible.cjs');

const baseMe = {
  type: 'child',
  username: 'astrid921',
  child_ui_locale: 'en-GB',
  english_child_experience_enabled: true,
};

function evalEnGb(overrides) {
  return evaluateChildTodaySessionPass({
    pathname: '/child/today',
    me: baseMe,
    expectedUsername: 'astrid921',
    expectedChildUiLocale: 'en-GB',
    childTodayI18nReady: true,
    htmlLang: 'en-GB',
    ...overrides,
  });
}

describe('founder smoke child today visible contract', () => {
  it('en-GB FAIL when visible Nu/Nästa in main with selector evidence', () => {
    const main = 'Mission\n⚡ NU\n▶ Nästa';
    const leaks = findSwedishChildTodayLeaks(main, 'main');
    assert.ok(leaks.length >= 2);
    const r = evalEnGb({ mainText: main, navText: 'Treasure Chest' });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'swedish_leak_on_child_today');
    assert.ok(r.swedish_leaks.length > 0);
  });

  it('en-GB FAIL when visible Skattkammaren in nav', () => {
    const r = evalEnGb({
      mainText: 'Mission\nNow\nNext',
      navText: 'Idag\nSkattkammaren',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'swedish_leak_on_child_today');
  });

  it('hidden Swedish legacy copy in full body does not fail when main/nav are English', () => {
    const r = evalEnGb({
      mainText: "Today's mission\nNow\nNext",
      navText: 'Today\nTreasure Chest',
      todayBodyText: "Today's mission\nSkattkammaren\nHidden nu",
    });
    assert.equal(r.pass, true);
  });

  it('Swedish words outside canonical regions are ignored when main/nav English', () => {
    const r = evalEnGb({
      mainText: 'Mission\nNow',
      navText: 'My world',
      todayBodyText: 'Idag\nNästa\nnu minute menu',
    });
    assert.equal(r.pass, true);
  });

  it('en-GB PASS with English main and English nav', () => {
    const r = evalEnGb({
      mainText: "Today's mission\nNow\nNext",
      navText: 'Today\nTreasure Chest',
    });
    assert.equal(r.pass, true);
  });

  it('en-GB FAIL with English nav only', () => {
    const r = evalEnGb({
      mainText: 'Hej',
      navText: 'Treasure Chest',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'missing_english_today_main_copy');
  });

  it('en-GB FAIL with English main only', () => {
    const r = evalEnGb({
      mainText: 'Mission\nNow\nNext',
      navText: 'Hem\nSchema',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'missing_english_today_nav_copy');
  });

  it('child flag OFF sv-SE PASS with Swedish NNL main copy', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'sv-SE' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'sv-SE',
      mainText: 'Nu: Klä på sig',
      navText: 'Skattkammaren',
    });
    assert.equal(r.pass, true);
  });

  it('child flag OFF sv-SE PASS with Swedish surface', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'sv-SE' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'sv-SE',
      mainText: 'Idag',
      navText: 'Morgon',
    });
    assert.equal(r.pass, true);
  });

  it('en-GB FAIL when childTodayI18nReady is not true', () => {
    const r = evalEnGb({
      childTodayI18nReady: false,
      mainText: 'Mission\nNow',
      navText: 'Treasure Chest',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'child_today_i18n_not_ready');
  });

  it('hasEnglishChildTodaySurfaceCopy requires both main and nav markers', () => {
    assert.equal(hasEnglishChildTodaySurfaceCopy('Mission\nNow', 'Treasure Chest'), true);
    assert.equal(hasEnglishChildTodaySurfaceCopy('Mission\nNow', 'Hem'), false);
  });

  it('exports canonical ready dataset key', () => {
    assert.equal(CHILD_TODAY_READY_ATTR, 'childTodayI18nReady');
  });

  it('hasSwedishChildTodayCoreLeakInText detects skattkammaren', () => {
    assert.equal(hasSwedishChildTodayCoreLeakInText('Treasure Chest'), false);
    assert.equal(hasSwedishChildTodayCoreLeakInText('Skattkammaren'), true);
  });
});
