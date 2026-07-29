'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const i18n = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

test('settings-avatar uses pt for profile picture copy', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-avatar.js'), 'utf8');
  assert.match(src, /settings\.avatar\.title/);
  assert.match(src, /parent-i18n-ready/);
  assert.doesNotMatch(src, /Profilbild/);
});

test('settings native account section has data-i18n hooks', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
  assert.match(html, /data-i18n="settings\.nativeAccount\.title"/);
  assert.match(html, /data-i18n="home\.handoff\.childLogin"/);
});

test('settings profile keys resolve in en-GB', () => {
  i18n.loadLocales();
  assert.equal(i18n.t('en-GB', 'settings.avatar.title'), 'Profile picture');
  assert.equal(i18n.t('en-GB', 'settings.nativeAccount.title'), 'Account');
  assert.equal(i18n.t('en-GB', 'settings.account.title'), 'Account & sign-in');
  assert.equal(i18n.t('en-GB', 'settings.parentPin.title'), 'PIN code');
});
