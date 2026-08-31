'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('E1+E3 Settings configuration vs Familj people', () => {
  it('settings people sections route to Familj and do not own invite forms', () => {
    const html = read('public/settings.html');
    assert.match(html, /data-settings-people="family"/);
    assert.match(html, /data-settings-people="pedagog"/);
    assert.match(html, /id="coParentInviteOpenBtn"/);
    assert.match(html, /href="\/family"/);
    assert.doesNotMatch(html, /id="pedagogInviteForm"/);
    assert.doesNotMatch(html, /id="pedagogEmail"/);
  });

  it('settings family form still owns configuration', () => {
    const html = read('public/settings.html');
    assert.match(html, /id="familyForm"/);
    assert.match(html, /id="familyName"/);
    assert.match(html, /id="prenumeration"/);
  });

  it('coparent settings boot does not open a modal from the Familj link', () => {
    const src = read('public/js/coparent-invite-ui.js');
    assert.match(src, /openBtn\.tagName === 'BUTTON'/);
    assert.match(src, /settingsPeopleEntryVisible|account_type !== 'educator'/);
  });

  it('family load failure still offers Familj entry and does not render invite forms', () => {
    const html = read('public/settings.html');
    assert.match(html, /revealSettingsPeopleEntry/);
    assert.doesNotMatch(html, /pedagog-child-check/);
    assert.doesNotMatch(html, /revoke-pedagog-btn/);
    const lib = require('../src/lib/family-people-access');
    assert.equal(lib.settingsPeopleEntryVisible({ accountType: 'educator' }), false);
    assert.equal(lib.settingsPeopleEntryVisible({ accountType: 'family' }), true);
    assert.equal(lib.settingsPeopleEntryVisible({ accountType: 'family', loadFailed: true }), true);
  });

  it('Familj points configuration back to Settings', () => {
    const html = read('public/family.html');
    assert.match(html, /data-family-config="settings"/);
    assert.match(html, /href="\/settings"/);
  });
});
