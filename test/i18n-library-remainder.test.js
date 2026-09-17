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

const FILES = ['public/library.html', 'public/activities.html'];

const KEYS = [
  'library.page.heading',
  'library.page.lead',
  'library.page.tipsTitle',
  'library.page.tabSchedule',
  'library.page.childrenSchedulesTitle',
  'library.page.editSchedule',
  'library.page.groupedByTime',
  'library.page.treasuryLead',
  'library.page.starBalance',
  'library.page.noRewardsYet',
  'library.page.openingTreasure',
  'library.page.readyDaySchedules',
  'library.page.goalsTitle',
  'library.page.addReward',
  'library.page.addActivity',
  'library.page.addCategory',
  'library.page.activitiesTitle',
  'library.rewards.nameLabel',
  'library.rewards.starCostLabel',
  'library.rewards.requiresApproval',
  'library.rewards.visibleFor',
  'library.images.cropTitle',
  'library.images.cropDragHint',
  'library.sevenQuestions.title',
  'library.substeps.timerHint',
  'library.substeps.addTitle',
  'library.errors.saveOrder',
  'library.errors.deleteActivity',
  'library.actions.saving',
  'library.empty.noSubsteps',
];

describe('library remainder runtime i18n', () => {
  it('library.html leftover chrome uses locale keys', () => {
    const html = read('public/library.html');
    assert.match(html, /data-i18n="library\.page\.heading"/);
    assert.match(html, /data-i18n="library\.page\.tipsTitle"/);
    assert.match(html, /data-i18n="library\.page\.tabSchedule"/);
    assert.match(html, /data-i18n="library\.page\.childrenSchedulesTitle"/);
    assert.match(html, /data-i18n="library\.page\.treasuryLead"/);
    assert.match(html, /data-i18n="library\.page\.goalsTitle"/);
    assert.match(html, /data-i18n="library\.rewards\.nameLabel"/);
    assert.match(html, /data-i18n="library\.images\.cropTitle"/);
    assert.match(html, /data-i18n="library\.sevenQuestions\.title"/);
    assert.match(html, /data-i18n="library\.substeps\.addTitle"/);
    assert.doesNotMatch(html, /<summary class="warm-tips-summary">💡 Tips för biblioteket/);
  });

  it('activities.html leftover chrome and JS use locale keys', () => {
    const html = read('public/activities.html');
    assert.match(html, /data-i18n-title="library\.page\.activitiesTitle"/);
    assert.match(html, /data-i18n="library\.page\.addActivity"/);
    assert.match(html, /data-i18n="library\.page\.addCategory"/);
    assert.match(html, /data-i18n="nav\.primary\.family"/);
    assert.match(html, /data-i18n="library\.actions\.save"/);
    assert.match(html, /lpt\('library\.errors\.saveOrder'\)/);
    assert.match(html, /lpt\('library\.actions\.saving'\)/);
    assert.match(html, /actError\(data, 'library\.errors\.deleteActivity'\)/);
    assert.doesNotMatch(html, /showToast\('Kunde inte spara ordningen'/);
    assert.doesNotMatch(html, /btn\.textContent = 'Sparar…'/);
    assert.doesNotMatch(html, /data\.error \|\| 'Kunde inte ta bort aktiviteten'/);
  });

  it('new library remainder keys exist in sv-SE and en-GB', () => {
    for (const key of KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.match(t('sv-SE', 'library.page.heading'), /Aktiviteter/);
    assert.match(t('en-GB', 'library.page.heading'), /Activities/i);
  });

  it('library and activities pages have no remaining copy-ratchet hits', () => {
    const hits = ratchet.scanRepo().filter((h) => FILES.includes(h.path));
    assert.deepEqual(hits, [], hits.slice(0, 12).map((h) => `${h.path} [${h.rule}] ${h.snippet}`).join('\n'));
  });
});
