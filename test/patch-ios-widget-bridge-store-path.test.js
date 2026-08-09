'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-widget-bridge-store-path.mjs');
const SWIFT = path.join(
  ROOT,
  'plugins',
  'capacitor-widget-bridge',
  'ios',
  'Plugin',
  'WidgetBridgeStore.swift'
);

describe('patch-ios-widget-bridge-store-path', () => {
  it('normalizes any WidgetBridgeStore PBX path to ../../../plugins', () => {
    const original = fs.readFileSync(PBX, 'utf8');
    const right =
      'path = ../../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
    const wrong =
      'path = ../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
    assert.ok(fs.existsSync(SWIFT));
    const poisoned = original.includes(wrong)
      ? original
      : original.replace(right, wrong);
    assert.ok(poisoned.includes(wrong), 'need wrong path fixture');
    fs.writeFileSync(PBX, poisoned);
    try {
      const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr || r.stdout);
      assert.match(fs.readFileSync(PBX, 'utf8'), new RegExp(right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } finally {
      fs.writeFileSync(PBX, original);
    }
  });
});
