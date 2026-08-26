'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PATCH = path.join(ROOT, 'scripts', 'patch-android-manifest.mjs');

const FIXTURE_MANIFEST = (launchMode) => `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name">
        <activity
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="${launchMode}"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`;

function makeFixtureProject(launchMode) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'android-manifest-fixture-'));
  const manifestDir = path.join(projectRoot, 'android', 'app', 'src', 'main');
  fs.mkdirSync(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, 'AndroidManifest.xml');
  fs.writeFileSync(manifestPath, FIXTURE_MANIFEST(launchMode));
  return { projectRoot, manifestPath };
}

function runPatch(cwd) {
  const r = spawnSync(process.execPath, [PATCH], { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error((r.stdout || '') + (r.stderr || ''));
  }
  return r.stdout;
}

const fixtures = [];

describe('patch-android-manifest — RevenueCat launchMode requirement', () => {
  after(() => {
    for (const { projectRoot } of fixtures) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('rewrites Capacitor default "singleTask" to "singleTop" (RevenueCat requires standard or singleTop)', () => {
    const fixture = makeFixtureProject('singleTask');
    fixtures.push(fixture);
    const stdout = runPatch(fixture.projectRoot);
    assert.match(stdout, /launchMode changed from "singleTask" to "singleTop"/);
    const updated = fs.readFileSync(fixture.manifestPath, 'utf8');
    assert.match(updated, /android:launchMode="singleTop"/);
    assert.doesNotMatch(updated, /android:launchMode="singleTask"/);
  });

  it('leaves "standard" launchMode untouched (already RevenueCat-compatible)', () => {
    const fixture = makeFixtureProject('standard');
    fixtures.push(fixture);
    const stdout = runPatch(fixture.projectRoot);
    assert.match(stdout, /already RevenueCat-compatible \(standard\)/);
    const updated = fs.readFileSync(fixture.manifestPath, 'utf8');
    assert.match(updated, /android:launchMode="standard"/);
  });

  it('leaves "singleTop" launchMode untouched (already RevenueCat-compatible)', () => {
    const fixture = makeFixtureProject('singleTop');
    fixtures.push(fixture);
    const stdout = runPatch(fixture.projectRoot);
    assert.match(stdout, /already RevenueCat-compatible \(singleTop\)/);
  });

  it('is idempotent — running twice yields the same singleTop result', () => {
    const fixture = makeFixtureProject('singleTask');
    fixtures.push(fixture);
    runPatch(fixture.projectRoot);
    const stdout2 = runPatch(fixture.projectRoot);
    assert.match(stdout2, /already RevenueCat-compatible \(singleTop\)/);
    const updated = fs.readFileSync(fixture.manifestPath, 'utf8');
    const matches = updated.match(/android:launchMode="/g) || [];
    assert.equal(matches.length, 1, 'launchMode attribute must not be duplicated');
  });

  it('never rewrites to "singleTask" or "singleInstance" (RevenueCat-incompatible modes)', () => {
    const patchSrc = fs.readFileSync(PATCH, 'utf8');
    assert.doesNotMatch(patchSrc, /launchMode.*singleTask.*singleTop\$3|singleInstance/i);
    assert.match(patchSrc, /REVENUECAT_COMPATIBLE_LAUNCH_MODES/);
    assert.match(patchSrc, /new Set\(\['standard', 'singleTop'\]\)/);
  });
});

describe('verify-android-native — MainActivity launchMode gate', () => {
  it('fails closed when launchMode is singleTask', () => {
    const fixture = makeFixtureProject('singleTask');
    fixtures.push(fixture);
    const verify = path.join(ROOT, 'scripts', 'verify-android-native.mjs');
    const r = spawnSync(process.execPath, [verify], { cwd: fixture.projectRoot, encoding: 'utf8' });
    assert.match(r.stdout + r.stderr, /launchMode="singleTask" is incompatible with RevenueCat/);
    assert.notEqual(r.status, 0);
  });

  it('passes when launchMode is singleTop', () => {
    const fixture = makeFixtureProject('singleTop');
    fixtures.push(fixture);
    const verify = path.join(ROOT, 'scripts', 'verify-android-native.mjs');
    const r = spawnSync(process.execPath, [verify], { cwd: fixture.projectRoot, encoding: 'utf8' });
    assert.match(r.stdout, /MainActivity launchMode is RevenueCat-compatible \(singleTop\)/);
  });

  after(() => {
    for (const { projectRoot } of fixtures) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
