'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');
const ratchet = require('../scripts/lib/i18n-copy-ratchet');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const ASSIGN_KEYS = [
  'schedule.assign.pageTitle',
  'schedule.assign.heading',
  'schedule.assign.lead',
  'schedule.assign.pickerLead',
  'schedule.assign.emptyPickChild',
  'schedule.assign.emptyPickDay',
  'schedule.assign.replaceTitle',
  'schedule.assign.replaceBody',
  'schedule.assign.replaceConfirm',
  'schedule.assign.cancel',
  'schedule.assign.blankTitle',
  'schedule.assign.savedForDay',
  'schedule.assign.savedForPeriod',
  'schedule.assign.periodNeedsLibrary',
  'schedule.assign.genericError',
  'schedule.days.0',
  'schedule.daysShort.1',
  'time.today',
];

describe('assign-schedule runtime i18n', () => {
  it('page chrome uses locale keys', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /data-i18n="schedule\.assign\.pageTitle"/);
    assert.match(html, /data-i18n="schedule\.assign\.heading"/);
    assert.match(html, /data-i18n="schedule\.assign\.lead"/);
    assert.match(html, /data-i18n="schedule\.assign\.loadingChildren"/);
    assert.match(html, /data-i18n="schedule\.familyGrid\.childColumn"/);
    assert.match(html, /data-i18n="time\.today"/);
    assert.match(html, /data-i18n="nav\.weekSchedule"/);
    assert.doesNotMatch(html, /<title>Välj schema/);
  });

  it('picker and empty states use locale keys', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /data-i18n="schedule\.assign\.pickerLead"/);
    assert.match(html, /data-i18n="schedule\.assign\.emptyLibraryTitle"/);
    assert.match(html, /data-i18n="schedule\.assign\.goToLibrary"/);
    assert.match(html, /data-i18n="schedule\.assign\.blankTitle"/);
    assert.match(html, /data-i18n="schedule\.assign\.emptyPickChild"/);
    assert.match(html, /apt\('schedule\.assign\.emptyPickDay'\)/);
    assert.match(html, /apt\('schedule\.assign\.noChildren'\)/);
  });

  it('replace modal uses locale keys', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /data-i18n="schedule\.assign\.replaceTitle"/);
    assert.match(html, /data-i18n="schedule\.assign\.replaceBody"/);
    assert.match(html, /data-i18n="schedule\.assign\.replaceConfirm"/);
    assert.match(html, /data-i18n="schedule\.assign\.cancel"/);
    assert.match(html, /apt\('schedule\.assign\.replaceDayBody'/);
    assert.match(html, /apt\('schedule\.assign\.periodOverwrite'/);
  });

  it('weekdays come from schedule.days keys, not Swedish arrays', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /function dayName\(index\)/);
    assert.match(html, /apt\('schedule\.days\.' \+ index\)/);
    assert.match(html, /apt\('schedule\.daysShort\.' \+ index\)/);
    assert.doesNotMatch(html, /const DAYS = \['Söndag'/);
    assert.doesNotMatch(html, /const DAYS_SHORT = \['Sön'/);
    assert.doesNotMatch(html, /toLocaleDateString\('sv-SE'/);
  });

  it('runtime toasts use locale keys, not Swedish literals', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /apt\('schedule\.assign\.savedForDay'/);
    assert.match(html, /apt\('schedule\.assign\.savedForPeriod'/);
    assert.match(html, /apt\('schedule\.assign\.periodNeedsLibrary'\)/);
    assert.match(html, /apt\('schedule\.period\.endBeforeStart'\)/);
    assert.match(html, /apt\('schedule\.assign\.genericError'\)/);
    assert.doesNotMatch(html, /showToast\(`Schema sparat för/);
    assert.doesNotMatch(html, /showToast\('Något gick fel'/);
    assert.doesNotMatch(html, /showToast\('Välj ett schema från biblioteket/);
    assert.match(html, /apt\('schedule\.assign\.saveBtn'\)/);
    assert.match(html, /apt\('schedule\.assign\.saving'\)/);
  });

  it('sv-SE and en-GB assign-schedule keys have parity', () => {
    loadLocales();
    for (const key of ASSIGN_KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.equal(t('sv-SE', 'schedule.assign.heading'), 'Välj schema per dag');
    assert.match(t('en-GB', 'schedule.assign.heading'), /schedule per day/i);
    assert.equal(t('sv-SE', 'schedule.days.1'), 'Måndag');
    assert.equal(t('en-GB', 'schedule.days.1'), 'Monday');
  });

  it('assign-schedule.html has zero ratchet hits after localization', () => {
    const hits = ratchet.scanRepo().filter((h) => h.path === 'public/assign-schedule.html');
    assert.deepEqual(hits, [], hits.map((h) => `${h.rule}: ${h.snippet}`).join('\n'));
  });
});
