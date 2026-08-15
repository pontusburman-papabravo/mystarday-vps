'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const SETTINGS_HTML = fs.readFileSync(
  path.join(__dirname, '../public/settings.html'),
  'utf8'
);

describe('settings logout early bind', () => {
  it('binds critical account actions before first settings API await', () => {
    assert.match(SETTINGS_HTML, /function bindCriticalAccountActions\(/);
    assert.match(SETTINGS_HTML, /criticalAccountActionsBound/);
    assert.match(SETTINGS_HTML, /closest\(\s*['"]#logoutBtn/);
    const domIdx = SETTINGS_HTML.indexOf("document.addEventListener('DOMContentLoaded'");
    const block = SETTINGS_HTML.slice(domIdx, domIdx + 1200);
    assert.match(SETTINGS_HTML, /bindCriticalAccountActions\(\);\s*\n\s*function showNativeAccountActions/);
    const sessionPos = block.indexOf('SettingsPageBootstrap.validateSession');
    assert.ok(sessionPos > 0, 'settings session validation must follow early bind');
  });

  it('loads notification prefs in allSettled without redirecting on failure', () => {
    assert.match(SETTINGS_HTML, /Promise\.allSettled/);
    assert.match(SETTINGS_HTML, /notifications load failed/);
    assert.doesNotMatch(
      SETTINGS_HTML,
      /Settings init failed[\s\S]{0,200}window\.location\.href = '\/login'/
    );
  });
});
