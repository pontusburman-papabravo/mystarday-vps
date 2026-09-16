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

const SATELLITE_JS = [
  'public/js/dashboard-special-days.js',
  'public/js/dashboard-copy-modals.js',
  'public/js/dashboard-dnd.js',
  'public/js/dashboard-views.js',
  'public/js/home-bump-time.js',
  'public/js/pending-approvals.js',
  'public/js/skeleton.js',
  'public/js/activation-program-banner.js',
];

const KEYS = [
  'schedule.specialDays.saved',
  'schedule.specialDays.deleteConfirm',
  'schedule.specialDays.pickActivity',
  'schedule.copy.deleted',
  'schedule.copy.selectDay',
  'schedule.validation.networkError',
  'schedule.dnd.savedToday',
  'schedule.dnd.noDate',
  'schedule.toasts.timeChangeError',
  'schedule.views.alreadyAtChild',
  'home.timeAdjust.failed',
  'home.timeAdjust.undone',
  'home.approvals.goalApproved',
  'home.approvals.updateFailed',
  'home.loading.couldNotLoad',
  'home.activationProgram.exitConfirm',
  'schedule.validation.generic',
  'schedule.actions.dragReorder',
  'schedule.daysShort.1',
  'home.status.retry',
];

describe('dashboard/home satellite runtime i18n', () => {
  it('special-day modal and toasts use locale keys', () => {
    const html = read('public/dashboard.html');
    const js = read('public/js/dashboard-special-days.js');
    assert.match(html, /data-i18n="schedule\.specialDays\.modalFallbackTitle"/);
    assert.match(html, /data-i18n="schedule\.specialDays\.noteLabel"/);
    assert.match(html, /data-i18n="schedule\.specialDays\.deleteBtn"/);
    assert.match(js, /spt\('schedule\.specialDays\.saved'\)/);
    assert.match(js, /spt\('schedule\.specialDays\.deleteConfirm'\)/);
    assert.match(js, /spt\('schedule\.specialDays\.pickActivity'\)/);
    assert.doesNotMatch(js, /showToast\('Specialdag sparad!'\)/);
    assert.doesNotMatch(js, /confirm\('Ta bort specialdagen\?/);
    assert.doesNotMatch(js, /toLocaleDateString\('sv-SE'/);
    assert.doesNotMatch(js, / akt\./);
  });

  it('copy and confirm modals use locale keys', () => {
    const html = read('public/dashboard.html');
    const js = read('public/js/dashboard-copy-modals.js');
    assert.match(html, /data-i18n="schedule\.copy\.copyDayTitle"/);
    assert.match(html, /data-i18n="schedule\.copy\.copyChildTitle"/);
    assert.match(html, /data-i18n="schedule\.chrome\.confirmTitle"/);
    assert.match(js, /spt\('schedule\.copy\.deleted'\)/);
    assert.match(js, /spt\('schedule\.copy\.selectDay'\)/);
    assert.match(js, /spt\('schedule\.validation\.networkError'\)/);
    assert.doesNotMatch(js, /showToast\('Schemat har tagits bort'\)/);
    assert.doesNotMatch(js, /showToast\('Välj minst en dag'/);
    assert.doesNotMatch(js, /showToast\('Nätverksfel\. Försök igen\.'/);
  });

  it('DnD feedback uses locale keys', () => {
    const html = read('public/dashboard.html');
    const js = read('public/js/dashboard-dnd.js');
    assert.match(html, /data-i18n="schedule\.chrome\.dayDragCopyTitle"/);
    assert.match(js, /spt\('schedule\.dnd\.savedToday'\)/);
    assert.match(js, /spt\('schedule\.dnd\.noDate'\)/);
    assert.match(js, /spt\('schedule\.dnd\.savedAll'/);
    assert.doesNotMatch(js, /showToast\('Ordning sparad bara för idag/);
    assert.doesNotMatch(js, /showToast\('Kunde inte bestämma datum'/);
    assert.doesNotMatch(js, /toLowerCase\(\) \+ 'ar'/);
  });

  it('dashboard-views feedback uses locale keys', () => {
    const js = read('public/js/dashboard-views.js');
    assert.match(js, /spt\('schedule\.toasts\.timeChangeError'\)/);
    assert.match(js, /spt\('schedule\.views\.alreadyAtChild'\)/);
    assert.match(js, /spt\('schedule\.views\.sourceMissing'\)/);
    assert.doesNotMatch(js, /showToast\('Fel vid tidsändring'/);
    assert.doesNotMatch(js, /showToast\('Aktiviteten är redan hos detta barn'\)/);
    assert.doesNotMatch(js, /showToast\('Källschema saknas'/);
  });

  it('bump-time uses locale keys', () => {
    const js = read('public/js/home-bump-time.js');
    assert.match(js, /pt\('home\.timeAdjust\.heading'\)/);
    assert.match(js, /pt\('home\.timeAdjust\.failed'\)/);
    assert.match(js, /pt\('home\.timeAdjust\.undone'\)/);
    assert.doesNotMatch(js, /showToast\('Kunde inte justera tid'/);
    assert.doesNotMatch(js, /showToast\('Ångrat'\)/);
  });

  it('pending approvals use locale keys', () => {
    const js = read('public/js/pending-approvals.js');
    assert.match(js, /pt\('home\.approvals\.goalApproved'\)/);
    assert.match(js, /pt\('home\.approvals\.loadError'\)/);
    assert.match(js, /pt\('home\.approvals\.updateFailed'\)/);
    assert.doesNotMatch(js, /showToast\(type === 'goal' \? '🎯 Målbyte godkänt!'/);
    assert.doesNotMatch(js, /throw new Error\('Kunde inte ladda förfrågningar'\)/);
  });

  it('skeleton generic copy uses locale keys', () => {
    const js = read('public/js/skeleton.js');
    assert.match(js, /tr\('scheduleChrome\.errorTitle'\)/);
    assert.match(js, /pt\('home\.loading\.couldNotLoad'\)/);
    assert.match(js, /pt\('home\.loading\.reloadPage'\)/);
    assert.doesNotMatch(js, /\|\| 'Hmm, något gick fel\.'/);
    assert.doesNotMatch(js, /Kunde inte ladda\./);
    assert.doesNotMatch(js, /Ladda om sidan/);
  });

  it('activation confirm uses a locale key', () => {
    const js = read('public/js/activation-program-banner.js');
    assert.match(js, /pt\('home\.activationProgram\.exitConfirm'\)/);
    assert.match(js, /pt\('home\.activationProgram\.reflectionPlaceholder'\)/);
    assert.doesNotMatch(js, /confirm\('Vill du avsluta 7-dagarsprogrammet\?'\)/);
    assert.doesNotMatch(js, /placeholder="Valfritt: berätta mer/);
  });

  it('dashboard.js known fallback uses locale key', () => {
    const js = read('public/js/dashboard.js');
    assert.match(js, /hpt\('schedule\.validation\.generic'\)/);
    assert.match(js, /hpt\('home\.loading\.initFailed'\)/);
    assert.match(js, /hpt\('schedule\.actions\.dragReorder'\)/);
    assert.doesNotMatch(js, /data\.error \|\| 'Fel uppstod'/);
    assert.doesNotMatch(js, /aria-label="Dra för att ändra ordning"/);
  });

  it('in-scope satellite JS files have zero ratchet hits', () => {
    const hits = ratchet.scanRepo().filter((h) => SATELLITE_JS.includes(h.path));
    assert.deepEqual(hits, [], hits.map((h) => `${h.path} ${h.rule}: ${h.snippet}`).join('\n'));
  });

  it('sv-SE and en-GB satellite keys have parity', () => {
    loadLocales();
    for (const key of KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.equal(t('sv-SE', 'schedule.specialDays.saved'), 'Specialdag sparad!');
    assert.match(t('en-GB', 'schedule.specialDays.saved'), /Special day saved/i);
    assert.equal(t('sv-SE', 'home.activationProgram.exitConfirm'), 'Vill du avsluta 7-dagarsprogrammet?');
    assert.equal(t('sv-SE', 'home.approvals.goalApproved'), '🎯 Målbyte godkänt!');
  });
});
