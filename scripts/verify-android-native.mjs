#!/usr/bin/env node
/**
 * Verify Android native patches are present before Play upload.
 *
 * When android/app/src/main/AndroidManifest.xml exists, App Links are checked
 * against the generated XML (not this script's source): autoVerify, host,
 * every APP_LINK_PATHS entry, and mandatory /open/child.
 * https://developer.android.com/training/app-links/verify-android-applinks
 */
import fs from 'fs';
import path from 'path';
import {
  APP_LINK_PATHS,
  OPEN_CHILD_PATH,
  verifyGeneratedAppLinks,
} from './lib/android-app-links.mjs';

const ROOT = process.cwd();
let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

function ok(msg) {
  console.log('OK:', msg);
}

const googleAuth = path.join(
  ROOT,
  'node_modules',
  '@codetrix-studio',
  'capacitor-google-auth',
  'android',
  'src',
  'main',
  'java',
  'com',
  'codetrixstudio',
  'capacitor',
  'GoogleAuth',
  'GoogleAuth.java'
);

if (!fs.existsSync(googleAuth)) {
  fail('GoogleAuth.java missing — run npm run cap:sync:android');
} else {
  const src = fs.readFileSync(googleAuth, 'utf8');
  if (!src.includes('Google Sign In not initialized')) {
    fail('GoogleAuth signIn null-guard missing — run patch-android-google-auth.mjs');
  } else {
    ok('GoogleAuth signIn guard');
  }
}

const capConfig = path.join(ROOT, 'capacitor.config.ts');
if (fs.existsSync(capConfig)) {
  const cfg = fs.readFileSync(capConfig, 'utf8');
  if (!cfg.includes('android:') || !cfg.includes('includePlugins')) {
    fail('capacitor.config.ts missing android.includePlugins');
  } else {
    ok('capacitor.config.ts android includePlugins');
  }
}

const platformCss = path.join(ROOT, 'public', 'css', 'platform-native.css');
if (fs.existsSync(platformCss)) {
  const css = fs.readFileSync(platformCss, 'utf8');
  if (!css.includes('is-native-android')) {
    fail('platform-native.css missing Android backdrop-filter guard');
  } else {
    ok('platform-native.css Android GPU guard');
  }
}

const platformJs = path.join(ROOT, 'public', 'js', 'platform.js');
if (fs.existsSync(platformJs)) {
  const js = fs.readFileSync(platformJs, 'utf8');
  if (!js.includes('Google Sign In är inte redo')) {
    fail('platform.js missing Google Sign In initialize guard');
  } else {
    ok('platform.js Google Sign In guard');
  }
}

const capSettings = path.join(ROOT, 'android', 'capacitor.settings.gradle');
if (fs.existsSync(capSettings)) {
  const settings = fs.readFileSync(capSettings, 'utf8');
  if (/apple-sign-in/i.test(settings)) {
    fail('apple-sign-in still in android/capacitor.settings.gradle — run prepare-android-native.mjs before sync');
  } else {
    ok('Apple Sign In excluded from Android Gradle project');
  }
}

const androidDir = path.join(ROOT, 'android');
const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(androidDir) && !fs.existsSync(manifestPath)) {
  fail('android/ exists but android/app/src/main/AndroidManifest.xml is missing');
} else if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const launchModeMatch = manifest.match(
    /<activity\s[^>]*android:name="\.MainActivity"[^>]*android:launchMode="([^"]+)"/
  );
  if (!launchModeMatch) {
    fail('MainActivity launchMode attribute not found in AndroidManifest.xml');
  } else if (!['standard', 'singleTop'].includes(launchModeMatch[1])) {
    fail(
      `MainActivity launchMode="${launchModeMatch[1]}" is incompatible with RevenueCat purchases ` +
        '(requires "standard" or "singleTop") — run patch-android-manifest.mjs'
    );
  } else {
    ok(`MainActivity launchMode is RevenueCat-compatible (${launchModeMatch[1]})`);
  }

  const appLinks = verifyGeneratedAppLinks(manifest);
  if (!appLinks.ok) {
    for (const err of appLinks.errors) {
      fail(err);
    }
  } else {
    ok(
      `MainActivity HTTPS App Links complete (autoVerify, host=${appLinks.host}, ` +
        `${APP_LINK_PATHS.length} paths including ${OPEN_CHILD_PATH})`
    );
  }
}

const mainActivityPatch = path.join(ROOT, 'scripts', 'patch-android-main-activity.mjs');
if (!fs.existsSync(mainActivityPatch)) {
  fail('scripts/patch-android-main-activity.mjs missing');
} else {
  const patchSrc = fs.readFileSync(mainActivityPatch, 'utf8');
  if (patchSrc.includes('BuildConfig')) {
    fail('patch-android-main-activity.mjs must not use BuildConfig — not available in Capacitor namespace');
  } else if (!patchSrc.includes('ApplicationInfo.FLAG_DEBUGGABLE')) {
    fail('patch-android-main-activity.mjs must gate WebView debugging on ApplicationInfo.FLAG_DEBUGGABLE');
  } else {
    ok('MainActivity WebView debugging DEBUG-only patch script');
  }
}

if (fs.existsSync(path.join(ROOT, 'android', 'app', 'build.gradle'))) {
  const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8');
  const nsMatch = gradle.match(/namespace\s+"([^"]+)"/);
  if (nsMatch) {
    const mainActivity = mainActivityPathFromNs(nsMatch[1]);
    if (fs.existsSync(mainActivity)) {
      const mainSrc = fs.readFileSync(mainActivity, 'utf8');
      if (mainSrc.includes('BuildConfig')) {
        fail('MainActivity.java must not use BuildConfig — run patch-android-main-activity.mjs');
      } else if (!mainSrc.includes('ApplicationInfo.FLAG_DEBUGGABLE')) {
        fail('MainActivity.java missing ApplicationInfo.FLAG_DEBUGGABLE guard — run patch-android-main-activity.mjs');
      } else if (
        /setWebContentsDebuggingEnabled\s*\(\s*true\s*\)/.test(mainSrc) &&
        !mainSrc.includes('getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE')
      ) {
        fail('MainActivity.java enables WebView debugging in release configuration');
      }
    }
  }
}

function mainActivityPathFromNs(namespace) {
  return path.join(ROOT, 'android', 'app', 'src', 'main', 'java', ...namespace.split('.'), 'MainActivity.java');
}

if (fs.existsSync(path.join(ROOT, 'android', 'variables.gradle'))) {
  const sdkCfg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'assets', 'play-store', 'android-sdk.json'), 'utf8')
  );
  const vars = fs.readFileSync(path.join(ROOT, 'android', 'variables.gradle'), 'utf8');
  const targetMatch = vars.match(/targetSdkVersion\s*=\s*(\d+)/);
  const compileMatch = vars.match(/compileSdkVersion\s*=\s*(\d+)/);
  if (!targetMatch || Number(targetMatch[1]) < sdkCfg.targetSdkVersion) {
    fail(`targetSdkVersion must be >= ${sdkCfg.targetSdkVersion} — run patch-android-target-sdk.mjs`);
  } else {
    ok(`targetSdkVersion ${targetMatch[1]}`);
  }
  if (!compileMatch || Number(compileMatch[1]) < sdkCfg.compileSdkVersion) {
    fail(`compileSdkVersion must be >= ${sdkCfg.compileSdkVersion}`);
  } else {
    ok(`compileSdkVersion ${compileMatch[1]}`);
  }
}

process.exit(failed ? 1 : 0);
