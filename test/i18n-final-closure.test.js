'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');
const ratchet = require('../scripts/lib/i18n-copy-ratchet');
const classification = require('../scripts/lib/i18n-runtime-classification');

loadLocales();

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const PEDAGOG_KEYS = [
  'family.pedagog.note.heading',
  'family.pedagog.note.saved',
  'family.pedagog.note.selectChild',
  'family.pedagog.note.ateWell',
  'family.pedagog.overview.heading',
  'family.pedagog.overview.openForm',
  'family.errors.fetchChildrenFailed',
  'family.errors.childIdDateRequired',
  'auth.errors.userNotFound',
  'reports.errors.notFound',
];

const ZERO_HIT_HTML = classification.loadInventory().zeroHitHtml;

describe('i18n final closure', () => {
  it('every remaining copy-ratchet hit is classified A/B/C/D with a reason', () => {
    const hits = ratchet.scanRepo();
    const cfg = classification.loadClassification();
    assert.equal(cfg.version, 1);
    const result = classification.classifyHits(hits, cfg);
    assert.deepEqual(
      result.unclassified,
      [],
      result.unclassified.slice(0, 12).map((h) => `${h.path} [${h.rule}] ${h.snippet}`).join('\n')
    );
    assert.equal(result.classified.length, hits.length);
    for (const cls of ['A', 'B', 'C', 'D']) {
      assert.ok(Number.isInteger(result.byClass[cls]));
    }
  });

  it('i18n-ignore comments require a reason', () => {
    const src = read('scripts/lib/i18n-copy-ratchet.js');
    assert.match(src, /parseI18nIgnore/);
    assert.equal(ratchet.parseI18nIgnore('showToast("x"); // i18n-ignore: debug overlay'), 'debug overlay');
    assert.equal(ratchet.parseI18nIgnore('// i18n-ignore: admin-only operator toast'), 'admin-only operator toast');
    assert.equal(ratchet.parseI18nIgnore('// i18n-ignore:'), null);
    assert.equal(ratchet.parseI18nIgnore('showToast("x");'), null);
  });

  it('closed product HTML scopes stay at zero copy-ratchet hits', () => {
    const hits = ratchet.scanRepo();
    for (const rel of ZERO_HIT_HTML) {
      const leftover = hits.filter((h) => h.path === rel);
      assert.deepEqual(leftover, [], leftover.slice(0, 8).map((h) => `${h.path} [${h.rule}] ${h.snippet}`).join('\n'));
    }
  });

  it('pedagog-note and pedagog-oversikt boot locale keys', () => {
    const note = read('public/pedagog-note.html');
    const overview = read('public/pedagog-oversikt.html');
    assert.match(note, /\/js\/i18n\.js/);
    assert.match(note, /data-i18n="family\.pedagog\.note\.heading"/);
    assert.match(note, /pt\('family\.pedagog\.note\.saved'\)/);
    assert.match(overview, /\/js\/i18n\.js/);
    assert.match(overview, /data-i18n="family\.pedagog\.overview\.heading"/);
    assert.match(overview, /family\.pedagog\.overview\.openForm/);
    assert.match(read('src/routes/pedagog-notes.js'), /sendApiError\(res, 400, 'CHILD_ID_DATE_REQUIRED'\)/);
    assert.doesNotMatch(read('src/routes/pedagog-notes.js'), /error: 'Kunde inte hämta barn'/);
  });

  it('pedagog and API remainder keys exist in sv-SE and en-GB', () => {
    for (const key of PEDAGOG_KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `missing sv ${key}`);
      assert.notEqual(en, key, `missing en ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.match(t('sv-SE', 'family.pedagog.note.heading'), /Dagformulär/);
    assert.match(t('en-GB', 'family.pedagog.note.heading'), /Daily form/i);
  });

  it('runtime inventory lists closed scopes and remaining product HTML', () => {
    const inventory = classification.loadInventory();
    assert.ok(inventory.zeroHitHtml.includes('public/pedagog-note.html'));
    assert.ok(inventory.productRuntimeHtml.includes('public/child-wizard.html'));
    for (const rel of inventory.zeroHitHtml) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
    for (const rel of inventory.productRuntimeHtml) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
  });

  it('excluded Class B/C paths have documented reasons in the ratchet', () => {
    const src = read('scripts/lib/i18n-copy-ratchet.js');
    assert.match(src, /Class B: admin-only survey authoring/);
    assert.match(src, /Class B: admin support session chrome/);
    assert.match(src, /Class C: marketing landing share sheet/);
    assert.match(src, /Class B: static \/V2\.0 design mockup/);
  });
});
