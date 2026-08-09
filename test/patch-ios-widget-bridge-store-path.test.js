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
  it('rewrites wrong ../../plugins WidgetBridgeStore path to ../../../plugins', () => {
    const original = fs.readFileSync(PBX, 'utf8');
    const wrong =
      'path = ../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
    const right =
      'path = ../../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift';
    assert.ok(fs.existsSync(SWIFT));
    if (!original.includes(wrong) && original.includes(right)) {
      const poisoned = original.replace(right, wrong);
      fs.writeFileSync(PBX, poisoned);
      try {
        const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
        assert.equal(r.status, 0, r.stderr || r.stdout);
        assert.match(fs.readFileSync(PBX, 'utf8'), new RegExp(right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      } finally {
        fs.writeFileSync(PBX, original);
      }
      return;
    }
    assert.match(original, new RegExp(right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
