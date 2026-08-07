'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

describe('R4.5 iOS no-ATT release hardening', () => {
  it('npm package capacitor-plugin-app-tracking-transparency is absent', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.equal(deps['capacitor-plugin-app-tracking-transparency'], undefined);
    const lock = fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
    assert.doesNotMatch(lock, /capacitor-plugin-app-tracking-transparency/);
  });

  it('Capacitor iOS includePlugins excludes ATT plugin', () => {
    const ts = fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8');
    assert.doesNotMatch(ts, /capacitor-plugin-app-tracking-transparency/);
    const jsonPath = path.join(ROOT, 'ios/App/App/capacitor.config.json');
    if (fs.existsSync(jsonPath)) {
      const json = fs.readFileSync(jsonPath, 'utf8');
      assert.doesNotMatch(json, /AppTrackingTransparencyPlugin/);
      assert.doesNotMatch(json, /capacitor-plugin-app-tracking-transparency/);
    }
  });

  it('Podfile has no ATT pod after canonical patch assumptions', () => {
    const podfile = fs.readFileSync(path.join(ROOT, 'ios/App/Podfile'), 'utf8');
    assert.doesNotMatch(podfile, /CapacitorPluginAppTrackingTransparency/);
  });

  it('Info.plist has SKAdNetworkItems with required Meta identifiers', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/meta-skadnetwork.json'), 'utf8'));
    const required = cfg.identifiers.map((id) => String(id).trim().toLowerCase());
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<key>SKAdNetworkItems<\/key>/);
    for (const id of required) {
      assert.match(plist, new RegExp(id.replace(/\./g, '\\.')));
    }
  });

  it('verify-ios-no-att-meta-release passes (client token skipped in CI)', () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/verify-ios-no-att-meta-release.mjs'), '--skip-client-token'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    if (r.status !== 0) {
      throw new Error((r.stdout || '') + (r.stderr || ''));
    }
  });

  it('patch-ios-podfile strips ATT pod if cap sync reintroduces it', () => {
    const podfilePath = path.join(ROOT, 'ios/App/Podfile');
    const original = fs.readFileSync(podfilePath, 'utf8');
    const poisoned = original.replace(
      "pod 'CapacitorFacebookEvents'",
      "pod 'CapacitorPluginAppTrackingTransparency', :path => '../../node_modules/capacitor-plugin-app-tracking-transparency'\n  pod 'CapacitorFacebookEvents'"
    );
    fs.writeFileSync(podfilePath, poisoned);
    try {
      const patch = spawnSync(process.execPath, [path.join(ROOT, 'scripts/patch-ios-podfile.mjs')], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      assert.equal(patch.status, 0, patch.stderr || patch.stdout);
      const after = fs.readFileSync(podfilePath, 'utf8');
      assert.doesNotMatch(after, /CapacitorPluginAppTrackingTransparency/);
    } finally {
      fs.writeFileSync(podfilePath, original);
    }
  });
});
