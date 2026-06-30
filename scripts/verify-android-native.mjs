#!/usr/bin/env node
/**
 * Verify Android native patches are present before Play upload.
 */
import fs from 'fs';
import path from 'path';

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

process.exit(failed ? 1 : 0);
