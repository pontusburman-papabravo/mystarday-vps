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

const FORM_KEYS = [
  'family.shell.familyName',
  'family.shell.moreSettings',
  'family.shell.addChildTitle',
  'family.shell.addAdultTitle',
  'family.form.saveChanges',
  'family.form.chooseEmoji',
  'family.form.childLoginHint',
  'family.invites.emailLead',
  'family.pedagog.loadError',
];

describe('family remainder i18n', () => {
  it('family.html leftover chrome uses data-i18n keys, not bare Swedish', () => {
    const src = read('public/family.html');
    assert.match(src, /data-i18n="nav\.overview"/);
    assert.match(src, /data-i18n="nav\.primary\.forYou"/);
    assert.match(src, /data-i18n="nav\.familySettings"/);
    assert.match(src, /data-i18n="family\.shell\.familyName"/);
    assert.match(src, /data-i18n="family\.form\.saveChanges"/);
    assert.match(src, /data-i18n="family\.giveStars\.submit"/);
    assert.match(src, /data-i18n="family\.shell\.addAdultTitle"/);
    assert.doesNotMatch(src, /<title>Familj -/);
  });

  it('family hub/chest/invite JS lookup family keys, not hardcoded Swedish', () => {
    const hub = read('public/js/family-hub.js');
    const chest = read('public/js/family-chest-setting.js');
    const invite = read('public/js/coparent-invite-ui.js');
    assert.match(hub, /family\.pedagog\.loadError/);
    assert.doesNotMatch(hub, /Kunde inte ladda pedagogsamarbete/);
    assert.match(chest, /family\.toasts\.saving/);
    assert.doesNotMatch(chest, /Sparar\.\.\./);
    assert.match(invite, /family\.form\.close/);
    assert.match(invite, /family\.errors\.memberAlreadyExists/);
    assert.doesNotMatch(invite, /aria-label="Stäng"/);
    assert.doesNotMatch(invite, /Något gick fel\. Försök igen/);
  });

  it('new family remainder keys exist in sv-SE and en-GB', () => {
    loadLocales();
    for (const key of FORM_KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.doesNotMatch(en, /[åäöÅÄÖ]/);
    }
    assert.match(t('sv-SE', 'family.shell.title'), /Familj/);
    assert.match(t('en-GB', 'family.shell.title'), /Family/i);
  });
});
