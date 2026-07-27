'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t, compareLocaleStructures } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('schedule/planning i18n surfaces', () => {
  loadLocales();

  const modules = [
    'public/js/schedule-i18n.js',
    'public/js/schedule-core.js',
    'public/js/dashboard-activity-modal.js',
    'public/js/schedule-activity-modals.js',
    'public/js/dashboard-approvals.js',
    'public/js/schedule-views.js',
    'public/js/schedule-template-mode.js',
    'public/js/schedule-special-days.js',
    'public/js/schedule-period.js',
    'public/js/schedule-insert-fill.js',
  ];

  for (const file of modules) {
    it(`${file} avoids hardcoded Swedish UI copy`, () => {
      const src = read(file);
      assert.doesNotMatch(src, /\bEngångsaktivitet\b/);
      assert.doesNotMatch(src, /\bVälj minst ett barn\b/);
      assert.doesNotMatch(src, /\bLägg till aktivitet\b/);
      assert.doesNotMatch(src, /\bGe extra stjärnor\b/);
      assert.doesNotMatch(src, /\bNästa steg\b/);
      if (file.includes('schedule.js') === false) {
        assert.doesNotMatch(src, /pt\([^)]+,\s*['"][^'"]*[åäöÅÄÖ]/);
      }
    });
  }

  it('schedule en-GB exposes modal and validation keys', () => {
    assert.equal(t('en-GB', 'schedule.documentTitle', { brand: 'My Starday' }), 'Schedule — My Starday');
    assert.equal(t('en-GB', 'schedule.chrome.viewNormal'), '📋 Schedule');
    assert.equal(t('en-GB', 'schedule.modals.giveStars.title'), 'Give bonus stars');
    assert.equal(t('en-GB', 'schedule.validation.pickActivity'), 'Choose an activity');
    assert.equal(t('en-GB', 'schedule.days.1'), 'Monday');
    assert.equal(t('en-GB', 'schedule.sections.morgon'), 'Morning');
  });

  it('schedule.html loads schedule-i18n before activity modals', () => {
    const html = read('public/schedule.html');
    const i18nIdx = html.indexOf('schedule-i18n.js');
    const modIdx = html.indexOf('schedule-activity-modals.js');
    assert.ok(i18nIdx > 0 && modIdx > 0);
    assert.ok(i18nIdx < modIdx);
    assert.match(html, /data-i18n="schedule\.modals\.addActivity\.title"/);
  });

  it('dashboard.html loads schedule-i18n and giveStars data-i18n', () => {
    const html = read('public/dashboard.html');
    assert.match(html, /schedule-i18n\.js/);
    assert.match(html, /data-i18n="schedule\.modals\.giveStars\.title"/);
  });

  it('schedule fragment keys have full sv-SE / en-GB parity', () => {
    const { missingInEn, missingInSv } = compareLocaleStructures();
    const scheduleMissingEn = missingInEn.filter((k) => k.startsWith('schedule.'));
    const scheduleMissingSv = missingInSv.filter((k) => k.startsWith('schedule.'));
    assert.deepEqual(scheduleMissingEn, [], 'keys missing in schedule-en-GB.json');
    assert.deepEqual(scheduleMissingSv, [], 'keys missing in schedule-sv-SE.json');
  });

  it('schedule surfaces are covered by the STRICT hardcoded-Swedish audit tier', () => {
    const audit = read('scripts/audit-hardcoded-swedish.js');
    for (const file of [
      'config/i18n/schedule-en-GB.json',
      'public/js/schedule-i18n.js',
      'public/js/schedule.js',
      'public/js/schedule-dnd.js',
      'public/js/schedule-cal-nav.js',
      'public/schedule.html',
    ]) {
      assert.ok(audit.includes(`'${file}'`), `${file} should be in STRICT_FILES`);
    }
  });

  it('day plurals are locale keys, not Swedish string concatenation', () => {
    const dnd = read('public/js/schedule-dnd.js');
    assert.doesNotMatch(dnd, /\+ 'ar'/);
    assert.match(dnd, /schedule\.daysPlural\./);
    assert.equal(t('en-GB', 'schedule.daysPlural.1'), 'every Monday');
    assert.equal(t('sv-SE', 'schedule.daysPlural.1'), 'alla måndagar');
  });
});
