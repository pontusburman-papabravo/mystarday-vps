'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIDGET_JAVA = path.join(
  ROOT,
  'plugins/capacitor-widget-bridge/android/src/main/java/com/stjarndag/widgetbridge/widget'
);

const REQUIRED = [
  'RoutineWidgetProvider.java',
  'WidgetCompleteReceiver.java',
  'WidgetOpenAppReceiver.java',
  'WidgetApiClient.java',
  'WidgetRenderer.java',
  'WidgetRefreshHelper.java',
  'WidgetChildSwitchHelper.java',
  'WidgetChildSwitchReceiver.java',
  'WidgetInstanceStore.java',
];

test('R4.5e Android widget Java sources present in plugin module', () => {
  for (const file of REQUIRED) {
    assert.ok(fs.existsSync(path.join(WIDGET_JAVA, file)), file);
  }
});

test('patch-android-widget.mjs patches plugin strings', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-widget.mjs'), 'utf8');
  assert.match(src, /capacitor-widget-bridge/);
  assert.match(src, /widget_api_base_url/);
});

test('cap:sync:android invokes patch-android-widget', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['cap:sync:android'], /patch-android-widget\.mjs/);
});

test('WidgetCompleteReceiver uses idempotency and secure POST', () => {
  const src = fs.readFileSync(path.join(WIDGET_JAVA, 'WidgetCompleteReceiver.java'), 'utf8');
  assert.match(src, /complete-action/);
  assert.match(src, /EXTRA_IDEMPOTENCY_KEY/);
  assert.match(src, /goAsync/);
});

test('WidgetOpenAppReceiver opens child today without completion deep link', () => {
  const src = fs.readFileSync(path.join(WIDGET_JAVA, 'WidgetOpenAppReceiver.java'), 'utf8');
  assert.match(src, /childTodayDeepLink/);
  assert.doesNotMatch(src, /complete-action/);
});

test('WidgetOpenAppReceiver always reuses the existing MainActivity task (no duplicate instance)', () => {
  const src = fs.readFileSync(path.join(WIDGET_JAVA, 'WidgetOpenAppReceiver.java'), 'utf8');
  // FLAG_ACTIVITY_NEW_TASK alone already reuses the existing task via
  // taskAffinity matching, independent of MainActivity's launchMode
  // (singleTask vs singleTop — see scripts/patch-android-manifest.mjs).
  // CLEAR_TOP is a defensive addition so a widget tap can never surface a
  // second stacked instance of the app.
  const launchCalls = src.match(/\.addFlags\(Intent\.FLAG_ACTIVITY_NEW_TASK[^)]*\)/g) || [];
  assert.ok(launchCalls.length >= 2, 'expected both the primary launch and the fallback launcher intent to set flags');
  for (const call of launchCalls) {
    assert.match(call, /FLAG_ACTIVITY_CLEAR_TOP/);
  }
});

test('verify-widget-bridge-native checks Android widget layout', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/verify-widget-bridge-native.mjs'), 'utf8');
  assert.match(src, /RoutineWidgetProvider/);
});

test('WidgetChildSwitchReceiver calls safe switch + refresh', () => {
  const src = fs.readFileSync(path.join(WIDGET_JAVA, 'WidgetChildSwitchReceiver.java'), 'utf8');
  assert.match(src, /WidgetChildSwitchHelper/);
  assert.match(src, /refreshSingleWidget/);
});

test('WidgetRenderer binds family child switcher', () => {
  const src = fs.readFileSync(path.join(WIDGET_JAVA, 'WidgetRenderer.java'), 'utf8');
  assert.match(src, /widget_child_switcher/);
  assert.match(src, /isCompleteBlocked/);
});

test('WidgetBindingScope stores per-installation bindings', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/android/src/main/java/com/stjarndag/widgetbridge/WidgetBindingScope.java'),
    'utf8'
  );
  assert.match(src, /binding_/);
  assert.match(src, /clearScope/);
});

test('RoutineWidgetConfigureActivity exists', () => {
  assert.ok(fs.existsSync(path.join(WIDGET_JAVA, 'RoutineWidgetConfigureActivity.java')));
});
