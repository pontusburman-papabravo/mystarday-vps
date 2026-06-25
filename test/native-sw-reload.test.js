'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('native WebView — service worker reload loop guard', () => {
  it('platform.js unregisters SW and sets WEBVIEW_SERVER_URL on native', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /earlyNativeServiceWorkerGuard/);
    assert.match(src, /WEBVIEW_SERVER_URL/);
    assert.match(src, /getRegistrations\(\)/);
    assert.match(src, /unregister\(\)/);
  });

  it('sw-register.js defers controllerchange until native detection settles', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/sw-register.js'), 'utf8');
    assert.match(src, /startWebServiceWorker/);
    assert.match(src, /isNativeShell\(\).*unregisterAllServiceWorkers/s);
    assert.match(src, /controllerchange/);
    assert.doesNotMatch(src, /nativeRechecks >= 20/);
    assert.match(src, /nativeRechecks >= 40/);
  });

  it('sw-register.js skips reload on controllerchange when native', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/sw-register.js'), 'utf8');
    assert.match(src, /isNativeShell\(\).*return/s);
  });

  it('deep-link-router.js init runs once per WebView session', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/deep-link-router.js'), 'utf8');
    assert.match(src, /__deepLinkRouterInited/);
  });

  it('platform-html injects early WEBVIEW_SERVER_URL hint before platform.js', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /WEBVIEW_SERVER_URL=location\.origin/);
    const hintIdx = src.indexOf('WEBVIEW_SERVER_URL=location.origin');
    const platformIdx = src.indexOf('/js/platform.js');
    assert.ok(hintIdx >= 0 && platformIdx > hintIdx);
  });
});
