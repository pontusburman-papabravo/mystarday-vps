#!/usr/bin/env node
/**
 * Ensure Firebase / google-services is wired when android/app/google-services.json exists.
 * Required for @capacitor/push-notifications on Android (FCM).
 *
 * Without this file, PushNotifications.register() crashes:
 *   IllegalStateException: Default FirebaseApp is not initialized
 *
 * Usage: node scripts/patch-android-google-services.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, 'android', 'app', 'google-services.json');
const PROJECT_GRADLE = path.join(ROOT, 'android', 'build.gradle');
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');

const GOOGLE_SERVICES_CLASSPATH =
  "classpath 'com.google.gms:google-services:4.4.2'";

function fail(msg) {
  console.error('[patch-android-google-services]', msg);
  process.exit(1);
}

function readExpectedAppId() {
  if (process.env.ANDROID_PACKAGE_NAME) {
    return process.env.ANDROID_PACKAGE_NAME;
  }
  const capPath = path.join(ROOT, 'capacitor.config.ts');
  if (!fs.existsSync(capPath)) return '';
  const m = fs.readFileSync(capPath, 'utf8').match(/appId:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}

if (!fs.existsSync(path.join(ROOT, 'android'))) {
  console.warn('[patch-android-google-services] android/ missing — run cap:sync:android first');
  process.exit(0);
}

if (!fs.existsSync(JSON_PATH)) {
  console.warn(
    '[patch-android-google-services] WARN: android/app/google-services.json missing.\n' +
      '  Push notifications will crash on Android until you add it from Firebase Console.\n' +
      '  See docs/google-play-checklist.md § Steg 2.'
  );
  process.exit(0);
}

try {
  const cfg = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const pkg = cfg?.client?.[0]?.client_info?.android_client_info?.package_name;
  const expectedPkg = readExpectedAppId();
  if (pkg && expectedPkg && pkg !== expectedPkg) {
    fail('google-services.json package_name does not match Capacitor appId');
  }
  console.log('[patch-android-google-services] OK: google-services.json present');
} catch (err) {
  fail(`google-services.json is invalid JSON: ${err.message}`);
}

if (!fs.existsSync(PROJECT_GRADLE)) {
  fail('android/build.gradle not found');
}
if (!fs.existsSync(APP_GRADLE)) {
  fail('android/app/build.gradle not found');
}

let projectGradle = fs.readFileSync(PROJECT_GRADLE, 'utf8');
const projectBefore = projectGradle;
if (!projectGradle.includes('com.google.gms:google-services')) {
  if (projectGradle.includes('dependencies {')) {
    projectGradle = projectGradle.replace(
      /dependencies\s*\{/,
      `dependencies {\n        ${GOOGLE_SERVICES_CLASSPATH}`
    );
  } else {
    fail('Could not find dependencies {} in android/build.gradle');
  }
}
if (projectGradle !== projectBefore) {
  fs.writeFileSync(PROJECT_GRADLE, projectGradle);
  console.log('[patch-android-google-services] Added google-services classpath to android/build.gradle');
}

let appGradle = fs.readFileSync(APP_GRADLE, 'utf8');
const appBefore = appGradle;
if (!appGradle.includes('com.google.gms.google-services')) {
  appGradle = appGradle.trimEnd() + "\n\napply plugin: 'com.google.gms.google-services'\n";
}
if (appGradle !== appBefore) {
  fs.writeFileSync(APP_GRADLE, appGradle);
  console.log('[patch-android-google-services] Applied google-services plugin in android/app/build.gradle');
}

console.log('[patch-android-google-services] Firebase Gradle wiring OK');
