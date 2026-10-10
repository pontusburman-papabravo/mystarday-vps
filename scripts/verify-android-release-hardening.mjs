#!/usr/bin/env node
/**
 * R4.5 Android release gates: DEBUG-only WebView debugging, no Advertising ID collection.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let failed = false;

function fail(msg) {
  console.error(`[verify-android-release-hardening] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify-android-release-hardening] OK: ${msg}`);
}

const DEBUG_GUARD = 'ApplicationInfo.FLAG_DEBUGGABLE';

const patchMain = path.join(ROOT, 'scripts', 'patch-android-main-activity.mjs');
const patchSrc = fs.readFileSync(patchMain, 'utf8');
if (patchSrc.includes('BuildConfig')) {
  fail('patch-android-main-activity.mjs must not use BuildConfig — not available in Capacitor namespace');
} else if (!patchSrc.includes('EdgeToEdge.enable(this)')) {
  fail('patch-android-main-activity.mjs must enable edge-to-edge via EdgeToEdge.enable');
} else if (!patchSrc.includes(DEBUG_GUARD)) {
  fail('patch-android-main-activity.mjs must gate WebView debugging on ApplicationInfo.FLAG_DEBUGGABLE');
} else if (
  patchSrc.includes('setWebContentsDebuggingEnabled(true);') &&
  !patchSrc.includes('getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE')
) {
  fail('patch-android-main-activity.mjs enables WebView debugging unconditionally');
} else {
  ok('MainActivity patch is DEBUG-only');
}

const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  const gradle = fs.readFileSync(gradlePath, 'utf8');
  if (!/minifyEnabled\s+true/.test(gradle)) {
    fail('android/app/build.gradle must set minifyEnabled true — run patch-android-release-optimization.mjs');
  } else if (!/shrinkResources\s+true/.test(gradle)) {
    fail('android/app/build.gradle must set shrinkResources true — run patch-android-release-optimization.mjs');
  } else if (!gradle.includes("proguard-android-optimize.txt")) {
    fail('android/app/build.gradle must use proguard-android-optimize.txt');
  } else {
    ok('Release build uses R8 minify + shrink + optimize ProGuard');
  }
  const proguardPath = path.join(ROOT, 'android', 'app', 'proguard-rules.pro');
  if (fs.existsSync(proguardPath)) {
    const rules = fs.readFileSync(proguardPath, 'utf8');
    if (!rules.includes('cap-release-proguard-rules-v1')) {
      fail('proguard-rules.pro missing cap release rules — run patch-android-release-optimization.mjs');
    } else {
      ok('ProGuard rules include Capacitor/RevenueCat keeps');
    }
  }
  const nsMatch = gradle.match(/namespace\s+"([^"]+)"/);
  if (nsMatch) {
    const main = path.join(
      ROOT,
      'android',
      'app',
      'src',
      'main',
      'java',
      ...nsMatch[1].split('.'),
      'MainActivity.java'
    );
    if (fs.existsSync(main)) {
      const mainSrc = fs.readFileSync(main, 'utf8');
      if (mainSrc.includes('BuildConfig')) {
        fail('MainActivity.java must not use BuildConfig — run cap:sync:android');
      } else if (!mainSrc.includes('EdgeToEdge.enable(this)')) {
        fail('MainActivity.java must call EdgeToEdge.enable — run patch-android-main-activity.mjs');
      } else if (!mainSrc.includes(DEBUG_GUARD)) {
        fail('MainActivity.java missing ApplicationInfo.FLAG_DEBUGGABLE guard — run cap:sync:android');
      } else if (
        /setWebContentsDebuggingEnabled\s*\(\s*true\s*\)/.test(mainSrc) &&
        !mainSrc.includes('getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE')
      ) {
        fail('MainActivity.java enables WebView debugging outside DEBUG guard');
      } else {
        ok('Generated MainActivity gates WebView debugging');
      }
    }
  }
}

const patchedMeta = path.join(ROOT, 'scripts', 'android', 'FacebookEventsPlugin.java.patched');
const metaSrc = fs.readFileSync(patchedMeta, 'utf8');
if (/setAdvertiserIDCollectionEnabled\s*\(\s*marketing\s*\)/.test(metaSrc)) {
  fail('FacebookEventsPlugin.java.patched must not tie Advertising ID to marketing consent');
}
if (!metaSrc.includes('setAdvertiserIDCollectionEnabled(false)')) {
  fail('FacebookEventsPlugin.java.patched must force Advertiser ID collection off');
} else {
  ok('Meta Android patch keeps Advertising ID collection off');
}

const pluginJava = path.join(
  ROOT,
  'node_modules',
  'capacitor-facebook-events',
  'android',
  'src',
  'main',
  'java',
  'com',
  'dabchy',
  'plugins',
  'facebookevents',
  'FacebookEventsPlugin.java'
);
if (fs.existsSync(pluginJava)) {
  const live = fs.readFileSync(pluginJava, 'utf8');
  if (/setAdvertiserIDCollectionEnabled\s*\(\s*marketing\s*\)/.test(live)) {
    fail('node_modules FacebookEventsPlugin still ties Advertising ID to marketing — run privacy patch');
  } else {
    ok('Installed FacebookEventsPlugin matches no-Advertising-ID policy');
  }
}

const gs = path.join(ROOT, 'android', 'app', 'google-services.json');
ok(`google-services.json ${fs.existsSync(gs) ? 'PRESENT' : 'MISSING (supply via release secrets)'}`);

if (failed) {
  process.exit(1);
}
console.log('[verify-android-release-hardening] All gates passed.');
process.exit(0);
