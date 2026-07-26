'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');

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
    assert.equal(t('en-GB', 'schedule.modals.giveStars.title'), 'Give extra stars');
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
});
