'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PATCH = path.join(ROOT, 'scripts', 'patch-android-manifest.mjs');
const VERIFY = path.join(ROOT, 'scripts', 'verify-android-native.mjs');
const TEST_HOST = 'applinks.test.host';

const fixtures = [];

function countPathPrefix(xml, prefix) {
  const re = new RegExp(`android:pathPrefix="${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
  return (xml.match(re) || []).length;
}

function dataLine(prefix) {
  return `                <data android:scheme="https" android:host="${TEST_HOST}" android:pathPrefix="${prefix}" />`;
}

function staleAppLinkFilter(paths) {
  return `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
${paths.map(dataLine).join('\n')}
            </intent-filter>`;
}

function fixtureManifest({ includeAppLinks = false, paths = [], launchMode = 'singleTop' } = {}) {
  return `<?xml version="1.0" encoding="utf-8"?>
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
            </intent-filter>${includeAppLinks ? staleAppLinkFilter(paths) : ''}
        </activity>
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`;
}

function makeFixture(opts) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'android-app-links-'));
  const manifestDir = path.join(projectRoot, 'android', 'app', 'src', 'main');
  fs.mkdirSync(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, 'AndroidManifest.xml');
  fs.writeFileSync(manifestPath, fixtureManifest(opts));
  const fixture = { projectRoot, manifestPath };
  fixtures.push(fixture);
  return fixture;
}

function runNode(script, cwd) {
  return spawnSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ANDROID_APP_LINK_HOST: TEST_HOST },
  });
}

function runPatch(cwd) {
  const r = runNode(PATCH, cwd);
  if (r.status !== 0) {
    throw new Error((r.stdout || '') + (r.stderr || ''));
  }
  return r.stdout;
}

function assertNoDuplicateRequiredPaths(xml, requiredPaths) {
  for (const prefix of requiredPaths) {
    assert.equal(countPathPrefix(xml, prefix), 1, `expected exactly one ${prefix}`);
  }
}

describe('patch-android-manifest — App Links structural idempotency', () => {
  after(() => {
    for (const { projectRoot } of fixtures) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('A: stale autoVerify filter missing /open/child gains only that path', async () => {
    const { APP_LINK_PATHS, OPEN_CHILD_PATH } = await import('../scripts/lib/android-app-links.mjs');
    const stalePaths = APP_LINK_PATHS.filter((p) => p !== OPEN_CHILD_PATH);
    const fixture = makeFixture({ includeAppLinks: true, paths: stalePaths });

    runPatch(fixture.projectRoot);
    const updated = fs.readFileSync(fixture.manifestPath, 'utf8');

    assert.equal(countPathPrefix(updated, OPEN_CHILD_PATH), 1);
    for (const prefix of stalePaths) {
      assert.equal(countPathPrefix(updated, prefix), 1, `legacy path ${prefix} must remain`);
    }
    assertNoDuplicateRequiredPaths(updated, APP_LINK_PATHS);
    assert.match(updated, /android:autoVerify="true"/);
    assert.match(updated, new RegExp(`android:host="${TEST_HOST}"`));
  });

  it('B: complete filter stays semantically unchanged across two patch runs', async () => {
    const { APP_LINK_PATHS, OPEN_CHILD_PATH } = await import('../scripts/lib/android-app-links.mjs');
    const fixture = makeFixture({ includeAppLinks: true, paths: [...APP_LINK_PATHS] });

    runPatch(fixture.projectRoot);
    const afterFirst = fs.readFileSync(fixture.manifestPath, 'utf8');
    const stdout2 = runPatch(fixture.projectRoot);
    const afterSecond = fs.readFileSync(fixture.manifestPath, 'utf8');

    assert.equal(afterSecond, afterFirst);
    assert.match(stdout2, /App Links intent-filter already complete/);
    assert.match(stdout2, new RegExp(OPEN_CHILD_PATH.replace('/', '\\/')));
    assertNoDuplicateRequiredPaths(afterSecond, APP_LINK_PATHS);
  });

  it('C: missing App Link filter is created complete (autoVerify, host, all paths)', async () => {
    const { APP_LINK_PATHS, OPEN_CHILD_PATH } = await import('../scripts/lib/android-app-links.mjs');
    const fixture = makeFixture({ includeAppLinks: false });

    runPatch(fixture.projectRoot);
    const updated = fs.readFileSync(fixture.manifestPath, 'utf8');

    assert.match(updated, /<intent-filter android:autoVerify="true">/);
    assert.match(updated, /android.intent.action.VIEW/);
    assert.match(updated, /android.intent.category.BROWSABLE/);
    assert.match(updated, new RegExp(`android:scheme="https"[^>]*android:host="${TEST_HOST}"`));
    assertNoDuplicateRequiredPaths(updated, APP_LINK_PATHS);
    assert.equal(countPathPrefix(updated, OPEN_CHILD_PATH), 1);
  });

  it('D: verifier fails when generated manifest is missing /open/child', async () => {
    const { APP_LINK_PATHS, OPEN_CHILD_PATH } = await import('../scripts/lib/android-app-links.mjs');
    const stalePaths = APP_LINK_PATHS.filter((p) => p !== OPEN_CHILD_PATH);
    const fixture = makeFixture({ includeAppLinks: true, paths: stalePaths });

    const r = runNode(VERIFY, fixture.projectRoot);
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    assert.notEqual(r.status, 0);
    assert.match(out, /missing mandatory path \/open\/child/);
    assert.doesNotMatch(fs.readFileSync(fixture.manifestPath, 'utf8'), /pathPrefix="\/open\/child"/);
  });
});
