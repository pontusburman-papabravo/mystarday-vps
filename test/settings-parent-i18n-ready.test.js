'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const i18n = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

describe('settings parent i18n ready signal', () => {
  it('bootSettingsParentI18n sets data-parent-i18n-ready only after DOM checks', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-parent-i18n.js'), 'utf8');
    assert.match(src, /dataset\[READY_ATTR\]\s*=\s*'true'/);
    assert.match(src, /isSettingsDomReadyForLocale/);
    assert.match(src, /clearParentI18nReady/);
    assert.match(src, /await initParentAppI18n/);
  });

  it('settings.html exposes settings root and awaits bootSettingsParentI18n', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /data-settings-root="true"/);
    assert.match(html, /await bootSettingsParentI18n\(me\)/);
  });

  it('en-GB settings title and save keys resolve for ready probe', () => {
    i18n.loadLocales();
    assert.equal(i18n.t('en-GB', 'settings.title'), 'Settings');
    assert.equal(i18n.t('en-GB', 'settings.family.title'), 'Family settings');
    assert.equal(i18n.t('en-GB', 'settings.family.save'), 'Save family settings');
  });

  it('sv-SE settings title and save keys remain Swedish', () => {
    i18n.loadLocales();
    assert.equal(i18n.t('sv-SE', 'settings.title'), 'Inställningar');
    assert.match(i18n.t('sv-SE', 'settings.family.save'), /familjeinställningar/i);
  });
});
