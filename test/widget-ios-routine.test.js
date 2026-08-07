'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIDGET_DIR = path.join(ROOT, 'ios/App/WidgetRoutine');

test('R4.5d iOS widget Swift sources present', () => {
  const files = [
    'WidgetRoutineBundle.swift',
    'WidgetAPIClient.swift',
    'WidgetIntents.swift',
    'WidgetEntryBuilder.swift',
    'NextRoutineWidget.swift',
  ];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(WIDGET_DIR, f)), f);
  }
});

test('R4.5f SwitchChildIntent + switch-child API on iOS', () => {
  const intents = fs.readFileSync(path.join(WIDGET_DIR, 'WidgetIntents.swift'), 'utf8');
  assert.match(intents, /SwitchChildIntent/);
  const api = fs.readFileSync(path.join(WIDGET_DIR, 'WidgetAPIClient.swift'), 'utf8');
  assert.match(api, /switchChild/);
  const store = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift'),
    'utf8'
  );
  assert.match(store, /allowedChildrenJson/);
});

test('CompleteNextActivityIntent uses idempotency', () => {
  const src = fs.readFileSync(path.join(WIDGET_DIR, 'WidgetIntents.swift'), 'utf8');
  assert.match(src, /CompleteNextActivityIntent/);
  assert.match(src, /idempotencyKey/);
  assert.match(src, /completeAction/);
});

test('cap:sync:ios runs widget extension patches', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['cap:sync:ios'], /patch-ios-widget-extension\.mjs/);
  assert.match(pkg.scripts['cap:sync:ios'], /patch-ios-widget-api-url\.mjs/);
});

test('WidgetBridgeStore exposes widget extension API', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift'),
    'utf8'
  );
  assert.match(src, /func bindingToken/);
  assert.match(src, /func setFeedback/);
});
