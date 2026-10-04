#!/usr/bin/env node
/**
 * Enable Play-required R8 release optimization (obfuscation + shrinking).
 * Patches android/app/build.gradle and merges proguard rules after cap sync.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const PROGUARD_APP = path.join(ROOT, 'android', 'app', 'proguard-rules.pro');
const PROGUARD_TEMPLATE = path.join(ROOT, 'scripts', 'android', 'proguard-capacitor-release.pro');
const GRADLE_PROPERTIES = path.join(ROOT, 'android', 'gradle.properties');
const MARKER = 'cap-release-proguard-rules-v1';
const R8_FULL_MODE = 'android.enableR8.fullMode=true';

function fail(msg) {
  console.error('[patch-android-release-optimization]', msg);
  process.exit(1);
}

if (!fs.existsSync(APP_GRADLE)) {
  fail('android/app/build.gradle missing — run cap:sync:android first');
}

let gradle = fs.readFileSync(APP_GRADLE, 'utf8');
const beforeGradle = gradle;

gradle = gradle.replace(/minifyEnabled\s+false/g, 'minifyEnabled true');

if (!/shrinkResources\s+true/.test(gradle)) {
  gradle = gradle.replace(/minifyEnabled\s+true/, 'minifyEnabled true\n            shrinkResources true');
}

gradle = gradle.replace(
  /getDefaultProguardFile\('proguard-android\.txt'\)/g,
  "getDefaultProguardFile('proguard-android-optimize.txt')"
);

if (!gradle.includes('androidx.activity:activity')) {
  const depNeedle = 'implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"';
  if (gradle.includes(depNeedle)) {
    gradle = gradle.replace(
      depNeedle,
      `${depNeedle}\n    implementation "androidx.activity:activity:$androidxActivityVersion"`
    );
  }
}

if (gradle !== beforeGradle) {
  fs.writeFileSync(APP_GRADLE, gradle);
  console.log('[patch-android-release-optimization] Patched android/app/build.gradle (R8 minify + shrink)');
} else {
  console.log('[patch-android-release-optimization] android/app/build.gradle already optimized');
}

if (!fs.existsSync(PROGUARD_TEMPLATE)) {
  fail(`Missing template ${PROGUARD_TEMPLATE}`);
}

let proguard = fs.existsSync(PROGUARD_APP) ? fs.readFileSync(PROGUARD_APP, 'utf8') : '';
if (!proguard.includes(MARKER)) {
  const template = fs.readFileSync(PROGUARD_TEMPLATE, 'utf8');
  proguard = `${proguard.trimEnd()}\n\n# ${MARKER}\n${template.trim()}\n`;
  fs.writeFileSync(PROGUARD_APP, proguard);
  console.log('[patch-android-release-optimization] Merged Capacitor/RevenueCat ProGuard rules');
} else {
  console.log('[patch-android-release-optimization] proguard-rules.pro already contains release rules');
}

if (fs.existsSync(GRADLE_PROPERTIES)) {
  let props = fs.readFileSync(GRADLE_PROPERTIES, 'utf8');
  if (!props.includes(R8_FULL_MODE)) {
    props = `${props.trimEnd()}\n${R8_FULL_MODE}\n`;
    fs.writeFileSync(GRADLE_PROPERTIES, props);
    console.log('[patch-android-release-optimization] Enabled R8 full mode in gradle.properties');
  }
}

if (!/minifyEnabled\s+true/.test(gradle)) {
  fail('release minifyEnabled is still false after patch');
}
