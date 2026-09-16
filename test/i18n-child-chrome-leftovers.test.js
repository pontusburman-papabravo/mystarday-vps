'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');
const ratchet = require('../scripts/lib/i18n-copy-ratchet');

loadLocales();

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const CHROME_JS = [
  'public/js/child-worlds-nav.js',
  'public/js/child-dashboard.js',
  'public/js/child-capabilities.js',
  'public/js/child-system-menu.js',
  'public/js/child-today-i18n-bootstrap.js',
];

const KEYS = [
  'child.scheduleChrome.pageTitle',
  'child.scheduleChrome.mySchedule',
  'child.scheduleChrome.logoutTitle',
  'child.scheduleChrome.wholeWeekTitle',
  'child.scheduleChrome.todayTasks',
  'child.scheduleChrome.goalTeaserAria',
  'child.scheduleChrome.goalTeaserLabel',
  'child.scheduleChrome.todayStarsLabel',
  'child.scheduleChrome.viewToggleTitle',
  'child.scheduleChrome.progressToday',
  'child.nav.home',
  'child.nav.schedule',
  'child.nav.more',
  'child.nav.family',
  'child.nav.ariaLabel',
  'child.nav.adult',
  'child.settings.switchProfile',
];

describe('child chrome leftovers runtime i18n', () => {
  it('child-dashboard.html chrome uses locale keys', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /data-i18n="child\.scheduleChrome\.pageTitle"/);
    assert.match(html, /data-i18n-title="child\.scheduleChrome\.pageTitle"/);
    assert.match(html, /data-i18n-title="child\.scheduleChrome\.viewToggleTitle"/);
    assert.match(html, /data-i18n-title="child\.scheduleChrome\.darkMode"/);
    assert.match(html, /data-i18n="child\.settings\.switchProfile"/);
    assert.match(html, /data-i18n="child\.scheduleChrome\.logout"/);
    assert.match(html, /data-i18n-title="child\.scheduleChrome\.logoutTitle"/);
    assert.match(html, /data-i18n-aria-label="child\.scheduleChrome\.goalTeaserAria"/);
    assert.match(html, /data-i18n="child\.scheduleChrome\.goalTeaserLabel"/);
    assert.match(html, /data-i18n="child\.scheduleChrome\.todayStarsLabel"/);
    assert.match(html, /data-i18n="child\.scheduleChrome\.todayTasks"/);
    assert.match(html, /data-i18n="child\.nav\.home"/);
    assert.match(html, /data-i18n="child\.nav\.schedule"/);
    assert.match(html, /data-i18n="child\.nav\.more"/);
    assert.match(html, /data-i18n="child\.nav\.family"/);
    assert.match(html, /data-i18n-aria-label="child\.nav\.ariaLabel"/);
    assert.doesNotMatch(html, /aria-label="Huvudnavigering"/);
    assert.doesNotMatch(html, /<title>Mitt Schema -/);
  });

  it('worlds nav aria uses cpt without Swedish fallback', () => {
    const js = read('public/js/child-worlds-nav.js');
    assert.match(js, /cpt\('nav\.ariaLabel'\)/);
    assert.doesNotMatch(js, /aria-label="Barnnavigering"/);
    assert.doesNotMatch(js, /: 'Barnnavigering'/);
  });

  it('header name fallback and system chrome use locale keys', () => {
    const dash = read('public/js/child-dashboard.js');
    const caps = read('public/js/child-capabilities.js');
    const menu = read('public/js/child-system-menu.js');
    assert.match(dash, /cpt\('scheduleChrome\.mySchedule'\)/);
    assert.doesNotMatch(dash, /me\.name \|\| 'Mitt schema'/);
    assert.match(caps, /labelKey: 'settings\.switchProfile'/);
    assert.doesNotMatch(caps, /label: 'Byt profil'/);
    assert.match(menu, /t\(action\.labelKey\)/);
    assert.match(menu, /t\('nav\.adult'\)/);
    assert.doesNotMatch(menu, /dailyUx \? 'Vuxen'/);
  });

  it('in-scope chrome JS files have zero ratchet hits', () => {
    const hits = ratchet.scanRepo().filter((h) => CHROME_JS.includes(h.path) || h.path === 'public/child-dashboard.html');
    assert.deepEqual(hits, [], hits.map((h) => `${h.path} ${h.rule}: ${h.snippet}`).join('\n'));
  });

  it('sv-SE and en-GB chrome keys have parity', () => {
    loadLocales();
    for (const key of KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.equal(t('sv-SE', 'child.nav.ariaLabel'), 'Barnnavigering');
    assert.equal(t('en-GB', 'child.nav.ariaLabel'), 'Child navigation');
    assert.equal(t('sv-SE', 'child.scheduleChrome.pageTitle'), 'Mitt Schema — Stjärndag');
    assert.match(t('en-GB', 'child.scheduleChrome.pageTitle'), /My Schedule/i);
    assert.equal(t('sv-SE', 'child.nav.family'), 'Familj');
    assert.equal(t('en-GB', 'child.nav.home'), 'Home');
  });
});
