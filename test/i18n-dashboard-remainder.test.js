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

const KEYS = [
  'home.dash.heading',
  'home.dash.inviteTitle',
  'home.dash.shareSub',
  'home.dash.starTipsTitle',
  'home.dash.tourSkip',
  'home.helpPanel.title',
  'home.helpPanel.addActivityQ',
  'home.journeyAck.headline',
  'home.journeyCelebration.body',
  'home.activationAha.body',
  'nav.overview',
  'nav.libraryAdvanced',
  'schedule.modals.createActivity.title',
  'schedule.modals.recurrence.title',
  'schedule.modals.giveStars.pickerHint',
  'schedule.chrome.firstNameLabel',
  'schedule.views.specialDays',
];

describe('dashboard remainder runtime i18n', () => {
  it('dashboard.html leftover chrome uses locale keys', () => {
    const html = read('public/dashboard.html');
    assert.match(html, /data-i18n="home\.dash\.heading"/);
    assert.match(html, /data-i18n="home\.dash\.inviteTitle"/);
    assert.match(html, /data-i18n="home\.dash\.starTipsTitle"/);
    assert.match(html, /data-i18n="home\.helpPanel\.title"/);
    assert.match(html, /data-i18n="home\.helpPanel\.addActivityQ"/);
    assert.match(html, /data-i18n-html="home\.helpPanel\.addActivityA"/);
    assert.match(html, /data-i18n="schedule\.modals\.createActivity\.title"/);
    assert.match(html, /data-i18n="schedule\.modals\.recurrence\.title"/);
    assert.match(html, /data-i18n="nav\.overview"/);
    assert.match(html, /data-i18n="schedule\.views\.specialDays"/);
  });

  it('remainder keys resolve in sv-SE and en-GB', () => {
    for (const key of KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `missing sv ${key}`);
      assert.notEqual(en, key, `missing en ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.match(t('sv-SE', 'home.dash.heading'), /framsteg/);
    assert.match(t('en-GB', 'home.dash.heading'), /progress/i);
  });

  it('dashboard.html has zero copy-ratchet hits', () => {
    const hits = ratchet.scanRepo().filter((h) => h.path === 'public/dashboard.html');
    assert.deepEqual(hits, [], hits.slice(0, 12).map((h) => `${h.path} [${h.rule}] ${h.snippet}`).join('\n'));
  });
});
