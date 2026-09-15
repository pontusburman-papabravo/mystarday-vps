'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const SETUP_SRC = path.join(ROOT, 'public/js/child-profile-setup.js');
const SWEDISH_RE = /[åäöÅÄÖ]/;

function readSetup() {
  return fs.readFileSync(SETUP_SRC, 'utf8');
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('child-profile-setup i18n', () => {
  loadLocales();

  it('uses fpt() wrapper delegating to family.childProfile keys', () => {
    const src = readSetup();
    assert.match(src, /function fpt\(key, params\)/);
    assert.match(src, /window\.pt\('family\.' \+ key/);
    assert.match(src, /childProfile\.setup\./);
  });

  it('has no hardcoded Swedish user-visible strings in JS copy', () => {
    const src = stripComments(readSetup());
    const banned = [
      'Laddar…',
      'Bild sparad!',
      'Kunde inte spara bild',
      'Profilbilden togs bort',
      'Klassisk vy',
      'Ny vy',
      'Kunde inte spara',
      'Sparat',
      'NU / NÄSTA / SEDAN aktiverat',
      'Fri avbockning',
      'Vibration påslagen',
      'Vibration avstängd',
      'Veckodagsöversikt för',
      'Redigera veckoschema',
      'Öppna veckoschema',
      'Barnets namn',
      'Spara profil',
      'Barnvy & rutiner',
      'Födelsedag',
    ];
    for (const phrase of banned) {
      assert.doesNotMatch(src, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('schema summary uses dayLabels() not DAY_LABELS constant', () => {
    const src = readSetup();
    assert.match(src, /function dayLabels\(\)/);
    assert.match(src, /const labels = dayLabels\(\)/);
    assert.doesNotMatch(src, /DAY_LABELS/);
  });

  it('family.childProfile.setup keys exist in sv-SE and en-GB', () => {
    const keys = [
      'family.childProfile.setup.identity.birthdayLabel',
      'family.childProfile.setup.photo.saved',
      'family.childProfile.setup.view.classicToast',
      'family.childProfile.setup.toggles.nnl.on',
      'family.childProfile.setup.toggles.haptics.off',
      'family.childProfile.setup.schema.weekOverview',
      'family.childProfile.setup.schema.editSchedule',
    ];
    for (const key of keys) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.ok(sv && sv.length > 1, key + ' sv-SE');
      assert.ok(en && en.length > 1, key + ' en-GB');
      assert.doesNotMatch(en, SWEDISH_RE, key);
    }
  });

  it('en-GB setup copy is natural British English', () => {
    assert.equal(t('en-GB', 'family.childProfile.setup.identity.birthdayLabel'), 'Date of birth');
    assert.equal(t('en-GB', 'family.childProfile.setup.view.classicToast'), 'Classic view');
    assert.equal(
      t('en-GB', 'family.childProfile.setup.toggles.nnl.off'),
      'Free check-off — your child chooses for themselves'
    );
    assert.match(
      t('en-GB', 'family.childProfile.setup.schema.weekOverview', { name: 'Emma' }),
      /Emma/
    );
  });

  it('sv-SE setup copy is semantically unchanged', () => {
    assert.equal(t('sv-SE', 'family.childProfile.setup.identity.birthdayLabel'), 'Födelsedag');
    assert.equal(t('sv-SE', 'family.childProfile.setup.photo.saved'), 'Bild sparad!');
    assert.equal(t('sv-SE', 'family.childProfile.setup.toggles.nnl.on'), 'NU / NÄSTA / SEDAN aktiverat');
  });
});
