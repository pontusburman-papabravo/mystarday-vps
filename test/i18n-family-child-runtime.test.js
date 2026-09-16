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

const MODAL_KEYS = [
  'family.childProfile.deleteChildTitle',
  'family.childProfile.deleteChildMessage',
  'family.childProfile.deleteChildCancel',
  'family.childProfile.deleteChildConfirm',
  'family.childProfile.deleteChildDefaultName',
  'family.childProfile.deleteChildFailed',
  'family.childProfile.deleteChildSuccess',
  'family.childProfile.manualStarsTitle',
  'family.childProfile.manualStarsReasonPlaceholder',
  'family.childProfile.manualStarsCancel',
  'family.childProfile.manualStarsSubmit',
  'family.childProfile.manualStarsReasonRequired',
  'family.childProfile.manualStarsFailed',
  'family.childProfile.manualStarsSuccess',
];

describe('family-child runtime i18n', () => {
  it('delete-child modal uses family.childProfile locale keys', () => {
    const html = read('public/family-child.html');
    assert.match(html, /id="deleteChildTargetMessage"[^>]*data-i18n="family\.childProfile\.deleteChildMessage"/);
    assert.match(html, /id="deleteChildCancelBtn"[\s\S]*?data-i18n="family\.childProfile\.deleteChildCancel"/);
    assert.match(html, /id="deleteChildConfirmBtn"[\s\S]*?data-i18n="family\.childProfile\.deleteChildConfirm"/);
    assert.match(html, /id="deleteChildModalTitle"/);
    assert.doesNotMatch(html, /id="deleteChildModalTitle"[^>]*data-i18n=/);
  });

  it('manual-stars modal uses family.childProfile locale keys', () => {
    const html = read('public/family-child.html');
    assert.match(html, /id="manualStarModalTitle"[^>]*data-i18n="family\.childProfile\.manualStarsTitle"/);
    assert.match(html, /data-i18n-placeholder="family\.childProfile\.manualStarsReasonPlaceholder"/);
    assert.match(html, /id="manualStarCancel"[^>]*data-i18n="family\.childProfile\.manualStarsCancel"/);
    assert.match(html, /id="manualStarSubmit"[^>]*data-i18n="family\.childProfile\.manualStarsSubmit"/);
  });

  it('migrated family-child surfaces keep no bare Swedish literals', () => {
    const html = read('public/family-child.html');
    assert.match(html, /data-i18n="family\.childProfile\.pageTitle"/);
    assert.doesNotMatch(html, /<title>Barnprofil/);
    assert.match(html, /data-i18n="nav\.avatar\.logout"/);
    assert.match(html, /data-i18n="family\.childProfile\.loadingProfile"/);
  });

  it('sv-SE and en-GB child-profile modal keys have parity', () => {
    loadLocales();
    for (const key of MODAL_KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.equal(
      t('sv-SE', 'family.childProfile.deleteChildMessage'),
      'Alla aktiviteter, scheman och belöningshistorik för detta barn raderas permanent.'
    );
    assert.match(t('en-GB', 'family.childProfile.deleteChildMessage'), /permanently deleted/i);
    assert.equal(t('sv-SE', 'family.childProfile.manualStarsTitle'), 'Ge extra stjärnor');
    assert.match(t('en-GB', 'family.childProfile.manualStarsTitle'), /bonus stars/i);
  });

  it('child-profile.js uses family resolver keys, not Swedish fallbacks', () => {
    const src = read('public/js/child-profile.js');
    assert.match(src, /function pt\(key, params\)/);
    assert.match(src, /window\.pt\('family\.' \+ key/);
    assert.match(src, /pt\('childProfile\.deleteChildMessage'\)/);
    assert.match(src, /pt\('childProfile\.deleteChildCancel'\)/);
    assert.match(src, /pt\('childProfile\.deleteChildConfirm'\)/);
    assert.match(src, /pt\('childProfile\.deleteChildTitle'/);
    assert.match(src, /pt\('childProfile\.manualStarsTitle'\)/);
    assert.match(src, /pt\('childProfile\.manualStarsReasonPlaceholder'\)/);
    assert.match(src, /pt\('childProfile\.manualStarsCancel'\)/);
    assert.match(src, /pt\('childProfile\.manualStarsSubmit'\)/);
    assert.doesNotMatch(src, /Alla aktiviteter, scheman och belöningshistorik/);
    assert.doesNotMatch(src, /Ge extra stjärnor/);
    assert.doesNotMatch(src, /Varför\? \(syns för barnet\)/);
    assert.doesNotMatch(src, /pt\([^)]+,\s*'[^']*[åäöÅÄÖ]/);
    assert.doesNotMatch(src, /\|\|\s*'Avbryt'/);
    assert.doesNotMatch(src, /\|\|\s*'Ta bort'/);
  });

  it('family-child.html has zero ratchet hits after modal wiring', () => {
    const hits = ratchet.scanRepo().filter((h) => h.path === 'public/family-child.html');
    assert.deepEqual(hits, [], hits.map((h) => `${h.rule}: ${h.snippet}`).join('\n'));
  });
});
