'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  injectPlatformHtml,
  bumpNativeRuntimeAssetVersions,
  MAGIC_VERSION,
} = require('../src/middleware/platform-html');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P1 native WebView cache bust — MAGIC_VERSION', () => {
  const platformSrc = read('src/middleware/platform-html.js');

  it('bumps MAGIC_VERSION for native WebView cache bust', () => {
    assert.equal(MAGIC_VERSION, '30');
    assert.match(platformSrc, /MAGIC_VERSION = '30'/);
    assert.doesNotMatch(platformSrc, /MAGIC_VERSION = '29'/);
  });

  it('rewrites #1066 runtime assets to MAGIC_VERSION on serve', () => {
    assert.match(platformSrc, /bumpNativeRuntimeAssetVersions/);
    assert.match(platformSrc, /parent-magic-page-hubs\.js\?v=/);
    assert.match(platformSrc, /settings-native-nav\.js\?v=/);
    assert.match(platformSrc, /app-entry-orchestrator\.js\?v=/);
    assert.match(platformSrc, /parent-nav-header\.js\?v=/);
    assert.match(platformSrc, /journey-context-client\.js\?v=/);
    assert.match(platformSrc, /child-profile-picker\.js\?v=/);
  });
});

describe('P1 native WebView cache bust — settings served path', () => {
  it('emits v=30 for hubs/icon-system and removes stale settings-native-nav v=2.18.0', () => {
    const settingsHtml = read('public/settings.html');
    const served = injectPlatformHtml(settingsHtml, '/settings', {});

    assert.match(served, /\/js\/parent-magic-page-hubs\.js\?v=30/);
    assert.match(served, /\/js\/icon-system\.js\?v=30/);
    assert.match(served, /\/js\/settings-native-nav\.js\?v=30/);
    assert.match(served, /\/js\/parent-nav-header\.js\?v=30/);
    assert.match(served, /\/js\/app-entry-orchestrator\.js\?v=30/);

    assert.doesNotMatch(served, /parent-magic-page-hubs\.js\?v=29/);
    assert.doesNotMatch(served, /icon-system\.js\?v=29/);
    assert.doesNotMatch(served, /settings-native-nav\.js\?v=2\.18\.0/);
    assert.doesNotMatch(served, /parent-magic-page-hubs\.js\?v=1\.1\.1/);
    assert.doesNotMatch(served, /icon-system\.js\?v=1"/);
  });
});

describe('P1 native WebView cache bust — profile picker path', () => {
  it('rewrites child-profile-picker and app-entry-orchestrator URLs', () => {
    const pickerHtml = read('public/child-profile-picker.html');
    const served = injectPlatformHtml(pickerHtml, '/child/profile-picker', {});

    assert.match(served, /\/js\/child-profile-picker\.js\?v=30/);
    assert.match(served, /\/js\/app-entry-orchestrator\.js\?v=30/);
    assert.doesNotMatch(served, /child-profile-picker\.js\?v=1\.4\.0/);
    assert.doesNotMatch(served, /app-entry-orchestrator\.js\?v=1\.0\.0/);
  });
});

describe('P1 native WebView cache bust — bump helper', () => {
  it('bumps only targeted runtime assets without touching unrelated scripts', () => {
    const input =
      '<script src="/js/icon-system.js?v=1"></script>' +
      '<script src="/js/parent-magic-page-hubs.js?v=1.1.1"></script>' +
      '<script src="/js/settings-native-nav.js?v=2.18.0"></script>' +
      '<script src="/js/auth.js?v=2.18.0"></script>';
    const out = bumpNativeRuntimeAssetVersions(input);

    assert.match(out, /icon-system\.js\?v=30/);
    assert.match(out, /parent-magic-page-hubs\.js\?v=30/);
    assert.match(out, /settings-native-nav\.js\?v=30/);
    assert.match(out, /auth\.js\?v=2\.18\.0/);
  });
});
