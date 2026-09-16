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

const SETTINGS_KEYS = [
  'settings.pageTitle',
  'settings.notifications.title',
  'settings.reminders.title',
  'settings.familyName.label',
  'settings.familyName.autoFromParent',
  'settings.deleteAccount.button',
  'settings.deleteAccount.confirmToken',
  'settings.deleteAccount.typeConfirmError',
  'settings.consent.title',
  'settings.consent.intro',
  'settings.subscription.activate',
  'settings.subscription.restoreSuccess',
  'settings.subscription.grandfatheredTitle',
  'settings.theme.darkMode',
  'settings.loadError.retry',
  'settings.support.copied',
  'schedule.daysShort.1',
  'today.shell.backToHome',
];

describe('settings remainder runtime i18n', () => {
  it('settings.html chrome uses locale keys', () => {
    const html = read('public/settings.html');
    assert.match(html, /data-i18n="settings\.pageTitle"/);
    assert.match(html, /data-i18n-title="settings\.pageTitle"/);
    assert.match(html, /data-i18n="settings\.notifications\.title"/);
    assert.match(html, /data-i18n="settings\.reminders\.title"/);
    assert.match(html, /data-i18n="settings\.familyName\.label"/);
    assert.match(html, /data-i18n="settings\.deleteAccount\.title"/);
    assert.match(html, /data-i18n="settings\.consent\.title"/);
    assert.match(html, /data-i18n="settings\.theme\.title"/);
    assert.match(html, /data-i18n="settings\.support\.copy"/);
    assert.doesNotMatch(html, /<title>Inställningar -/);
  });

  it('typed delete confirm stays RADERA', () => {
    const html = read('public/settings.html');
    assert.match(html, /const DELETE_CONFIRM_TOKEN = 'RADERA'/);
    assert.match(html, /confirmText !== DELETE_CONFIRM_TOKEN/);
    assert.match(html, /spt\('settings\.deleteAccount\.typeConfirmError'/);
    assert.equal(t('sv-SE', 'settings.deleteAccount.confirmToken'), 'RADERA');
    assert.equal(t('en-GB', 'settings.deleteAccount.confirmToken'), 'RADERA');
  });

  it('reminder weekdays come from schedule.daysShort, not Swedish arrays', () => {
    const html = read('public/settings.html');
    assert.match(html, /function dayShort\(idx\)/);
    assert.match(html, /spt\('schedule\.daysShort\.' \+ idx\)/);
    assert.doesNotMatch(html, /const DAY_LABELS = \['S'/);
    assert.doesNotMatch(html, /const DAY_NAMES {2}= \['Sön'/);
  });

  it('subscription JS looks up settings.subscription keys, not isEn ternaries', () => {
    const src = read('public/js/settings-subscription.js');
    assert.match(src, /settings\.subscription\.activate/);
    assert.match(src, /settings\.subscription\.restoreSuccess/);
    assert.match(src, /settings\.subscription\.grandfatheredTitle/);
    assert.match(src, /notify\(spt\('settings\.subscription\.restoreSuccess'\)/);
    assert.doesNotMatch(src, /const isEn = /);
    assert.doesNotMatch(src, /Aktivera Premium/);
    assert.doesNotMatch(src, /Köpet är återställt\. Premium är aktivt\./);
  });

  it('consent, bootstrap, support and native-nav use locale keys', () => {
    const consent = read('public/js/app-consent.js');
    const boot = read('public/js/settings-page-bootstrap.js');
    const support = read('public/js/support-diagnostics.js');
    const nav = read('public/js/settings-native-nav.js');
    assert.match(consent, /settings\.consent\.intro/);
    assert.match(consent, /settings\.consent\.save/);
    assert.doesNotMatch(consent, /Samtycke & Integritet/);
    assert.match(boot, /settings\.loadError\.title/);
    assert.doesNotMatch(boot, /Familjeinställningar kunde inte laddas/);
    assert.match(support, /settings\.support\.copied/);
    assert.doesNotMatch(support, /Kopierat — klistra in/);
    assert.match(nav, /today\.shell\.backToHome/);
    assert.doesNotMatch(nav, /← Till Hem/);
  });

  it('sv-SE and en-GB settings remainder keys have parity', () => {
    loadLocales();
    for (const key of SETTINGS_KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.equal(t('sv-SE', 'settings.notifications.title'), 'Notis-inställningar');
    assert.match(t('en-GB', 'settings.notifications.title'), /Notification/i);
    assert.equal(t('sv-SE', 'settings.deleteAccount.confirmToken'), 'RADERA');
    assert.equal(t('en-GB', 'schedule.daysShort.1'), 'Mon');
  });

  it('settings.html has zero ratchet hits after localization', () => {
    const hits = ratchet.scanRepo().filter((h) => h.path === 'public/settings.html');
    assert.deepEqual(hits, [], hits.map((h) => `${h.rule}: ${h.snippet}`).join('\n'));
  });
});
