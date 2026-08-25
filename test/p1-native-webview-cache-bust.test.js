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

  const V = MAGIC_VERSION;

  it('bumps MAGIC_VERSION for native WebView cache bust', () => {
    assert.ok(/^\d+$/.test(V), 'MAGIC_VERSION is a numeric string');
    assert.match(platformSrc, new RegExp("MAGIC_VERSION = '" + V + "'"));
  });

  it('rewrites #1066 runtime assets to MAGIC_VERSION on serve', () => {
    assert.match(platformSrc, /bumpNativeRuntimeAssetVersions/);
    assert.match(platformSrc, /parent-magic-page-hubs\.js\?v=/);
    assert.match(platformSrc, /settings-native-nav\.js\?v=/);
    assert.match(platformSrc, /app-entry-orchestrator\.js\?v=/);
    assert.match(platformSrc, /adult-privilege\.js\?v=/);
    assert.match(platformSrc, /parent-nav-header\.js\?v=/);
    assert.match(platformSrc, /journey-context-client\.js\?v=/);
    assert.match(platformSrc, /child-profile-picker\.js\?v=/);
  });
});

describe('P1 native WebView cache bust — settings served path', () => {
  const V = MAGIC_VERSION;
  it('emits MAGIC_VERSION for hubs/icon-system and removes stale settings-native-nav v=2.18.0', () => {
    const settingsHtml = read('public/settings.html');
    const served = injectPlatformHtml(settingsHtml, '/settings', {});

    assert.match(served, new RegExp('/js/parent-magic-page-hubs\\.js\\?v=' + V));
    assert.match(served, new RegExp('/js/icon-system\\.js\\?v=' + V));
    assert.match(served, new RegExp('/js/settings-native-nav\\.js\\?v=' + V));
    assert.match(served, new RegExp('/js/parent-nav-header\\.js\\?v=' + V));
    assert.match(served, new RegExp('/js/app-entry-orchestrator\\.js\\?v=' + V));

    assert.doesNotMatch(served, /settings-native-nav\.js\?v=2\.18\.0/);
    assert.doesNotMatch(served, /parent-magic-page-hubs\.js\?v=1\.1\.1/);
    assert.doesNotMatch(served, /icon-system\.js\?v=1"/);
  });
});

describe('P1 native WebView cache bust — profile picker path', () => {
  const V = MAGIC_VERSION;
  it('rewrites child-profile-picker, app-entry-orchestrator and adult-privilege URLs', () => {
    const pickerHtml = read('public/child-profile-picker.html');
    const served = injectPlatformHtml(pickerHtml, '/child/profile-picker', {});

    assert.match(served, new RegExp('/js/child-profile-picker\\.js\\?v=' + V));
    assert.match(served, new RegExp('/js/app-entry-orchestrator\\.js\\?v=' + V));
    assert.match(served, new RegExp('/js/adult-privilege\\.js\\?v=' + V));
    assert.doesNotMatch(served, /child-profile-picker\.js\?v=1\.4\.0/);
    assert.doesNotMatch(served, /app-entry-orchestrator\.js\?v=1\.0\.0/);
    assert.doesNotMatch(served, /adult-privilege\.js\?v=1\.2\.1/);
    // The regex must not touch the sibling -lease-policy / -lifecycle scripts.
    assert.match(served, /adult-privilege-lease-policy\.js\?v=/);
    assert.match(served, /adult-privilege-lifecycle\.js\?v=/);
  });
});

describe('P1 native WebView cache bust — bump helper', () => {
  const V = MAGIC_VERSION;
  it('bumps only targeted runtime assets without touching unrelated scripts', () => {
    const input =
      '<script src="/js/icon-system.js?v=1"></script>' +
      '<script src="/js/parent-magic-page-hubs.js?v=1.1.1"></script>' +
      '<script src="/js/settings-native-nav.js?v=2.18.0"></script>' +
      '<script src="/js/adult-privilege.js?v=1.2.1"></script>' +
      '<script src="/js/adult-privilege-lease-policy.js?v=abc"></script>' +
      '<script src="/js/auth.js?v=2.18.0"></script>';
    const out = bumpNativeRuntimeAssetVersions(input);

    assert.match(out, new RegExp('icon-system\\.js\\?v=' + V));
    assert.match(out, new RegExp('parent-magic-page-hubs\\.js\\?v=' + V));
    assert.match(out, new RegExp('settings-native-nav\\.js\\?v=' + V));
    assert.match(out, new RegExp('adult-privilege\\.js\\?v=' + V));
    // Unrelated / sibling scripts are untouched.
    assert.match(out, /auth\.js\?v=2\.18\.0/);
    assert.match(out, /adult-privilege-lease-policy\.js\?v=abc/);
  });
});
