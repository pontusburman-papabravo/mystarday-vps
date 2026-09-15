'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Widget / PWA install / push-manager i18n', () => {
  loadLocales();

  const modules = [
    'public/js/pwa-install.js',
    'public/js/widget-install-prompt.js',
    'public/js/push-manager.js',
    'public/js/settings-widgets.js',
  ];

  for (const file of modules) {
    it(`${file} uses pt() — no hardcoded Swedish user copy`, () => {
      const src = read(file);
      assert.match(src, /function pt\(/);
      assert.doesNotMatch(src, /Installera appen för bästa/);
      assert.doesNotMatch(src, /Anslut widget/);
      assert.doesNotMatch(src, /Push stöds inte/);
      assert.doesNotMatch(src, /Notistillstånd nekades/);
      assert.doesNotMatch(src, /Kunde inte aktivera push-notiser/);
      assert.doesNotMatch(src, /Återanslut widget/);
      assert.doesNotMatch(src, /pt\([^)]+,\s*['"][^'"]*[åäöÅÄÖ]/);
    });
  }

  it('dashboard-sse passive push prompt uses home.pushPrompt keys', () => {
    const src = read('public/js/dashboard-sse.js');
    assert.match(src, /home\.pushPrompt\.title/);
    assert.match(src, /home\.pushPrompt\.enable/);
    assert.doesNotMatch(src, /Få push-notiser om barnen/);
  });

  it('settings push section references settings.push keys in inline script', () => {
    const html = read('public/settings.html');
    assert.match(html, /data-i18n="settings\.push\.title"/);
    assert.match(html, /pt\('settings\.push\.enabled'\)/);
    assert.match(html, /pt\('settings\.push\.permissionDenied'\)/);
  });

  const enPushErrors = [
    'unsupportedBrowser',
    'permissionDeniedApp',
    'pushPluginMissing',
    'platformMissing',
    'permissionDeniedBrowser',
    'permissionDenied',
    'subscriptionFailed',
    'enableFailed',
    'disableFailed',
    'iosNotInstalled',
  ];

  for (const key of enPushErrors) {
    it(`en-GB settings.push.errors.${key} is English`, () => {
      const value = t('en-GB', 'settings.push.errors.' + key);
      assert.ok(value && value.length > 3, key);
      assert.doesNotMatch(value, /[åäöÅÄÖ]/, value);
    });
  }

  it('en-GB home.pwa android/desktop guides are English', () => {
    assert.doesNotMatch(t('en-GB', 'home.pwa.androidTitle'), /[åäöÅÄÖ]/);
    assert.doesNotMatch(t('en-GB', 'home.pwa.androidChromeFallback'), /[åäöÅÄÖ]/);
    assert.doesNotMatch(t('en-GB', 'home.pwa.desktopLead'), /[åäöÅÄÖ]/);
    assert.doesNotMatch(t('en-GB', 'home.pwa.iosArrowHint'), /[åäöÅÄÖ]/);
  });

  it('en-GB widget prompt + settings copy is English', () => {
    assert.equal(t('en-GB', 'settings.widget.prompt.connect'), 'Connect widget');
    assert.equal(t('en-GB', 'settings.widget.settings.reconnectBtn'), 'Reconnect widget');
    assert.doesNotMatch(t('en-GB', 'settings.widget.settings.errors.reauthRequired'), /[åäöÅÄÖ]/);
  });

  it('sv-SE widget prompt stays Swedish', () => {
    assert.match(t('sv-SE', 'settings.widget.prompt.title'), /widget/i);
    assert.equal(t('sv-SE', 'settings.widget.prompt.connect'), 'Anslut widget');
  });
});
