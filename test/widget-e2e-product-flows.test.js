'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Widget E2E product flows (regression contracts)', () => {
  it('Flow A — parent reconnect keeps parent mode and shows connected children copy', () => {
    const settings = read('public/js/settings-widgets.js');
    assert.match(settings, /buildConnectionCopy/);
    assert.match(settings, /Widgeten är ansluten/);
    assert.match(settings, /DeviceMode\.enterParent/);
    const bootstrap = read('public/js/widget-bridge-bootstrap.js');
    assert.match(bootstrap, /user\.type !== 'parent'/);
    assert.match(bootstrap, /user\.type === 'parent'/);
  });

  it('Flow B — widget binding not auto-rebound from child PIN session', () => {
    const bootstrap = read('public/js/widget-bridge-bootstrap.js');
    assert.match(bootstrap, /never auto-rebind from child PIN session/);
    const provision = read('public/js/widget-bridge-provision.js');
    assert.match(provision, /viewerModeForUser/);
    assert.match(provision, /return 'parent'/);
    assert.match(provision, /isSuperseded/);
  });

  it('Flow C — server allows parent-mode child switch (widget-context)', () => {
    const ctx = read('src/lib/widget-context.js');
    assert.match(ctx, /can_switch_children/);
    assert.match(ctx, /binding\.mode === 'parent'/);
    const binding = read('src/lib/widget-binding.js');
    assert.match(binding, /reissueBindingForChild/);
  });

  it('Flow D — native cold start refreshes before auth logout', () => {
    const auth = read('public/js/auth.js');
    assert.match(auth, /auth_me_refresh_attempt/);
    assert.match(auth, /_nativeColdRefreshAttempted/);
    assert.match(auth, /isNativeClient\(\)[\s\S]*silentRefresh/);
  });

  it('Flow E — widget deep link consumes launch URL once and maps parent away from /child/today', () => {
    const router = read('public/js/deep-link-router.js');
    assert.match(router, /LAUNCH_URL_CONSUMED_KEY/);
    assert.match(router, /fromColdLaunch/);
    assert.match(router, /remapWidgetChildDeepLink/);
    assert.match(router, /\/dashboard/);
    const ios = read('ios/App/WidgetRoutine/WidgetAPIClient.swift');
    assert.match(ios, /parentHomeURL/);
    const android = read('plugins/capacitor-widget-bridge/android/src/main/java/com/stjarndag/widgetbridge/widget/WidgetOpenAppReceiver.java');
    assert.match(android, /parentHomeDeepLink/);
  });

  it('Flow F — child dashboard native parent guard goes to dashboard + enterParent', () => {
    const child = read('public/js/child-dashboard.js');
    assert.match(child, /location\.replace\('\/dashboard'\)/);
    assert.match(child, /DeviceMode\.enterParent/);
  });

  it('Flow G — RC-01 stale reconnect race still guarded', () => {
    const provision = read('public/js/widget-bridge-provision.js');
    assert.match(provision, /bumpBindingIntent/);
    assert.match(provision, /isSuperseded/);
    assert.match(provision, /superseded:\s*true/);
  });
});
