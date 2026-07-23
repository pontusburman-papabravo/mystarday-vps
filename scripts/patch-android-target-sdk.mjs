#!/usr/bin/env node
/**
 * Patch android/variables.gradle to meet Google Play target API requirements.
 * Source of truth: assets/play-store/android-sdk.json
 *
 * Usage: node scripts/patch-android-target-sdk.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SDK_FILE = path.join(ROOT, 'assets', 'play-store', 'android-sdk.json');
const VARIABLES = path.join(ROOT, 'android', 'variables.gradle');

if (!fs.existsSync(SDK_FILE)) {
  console.error('[patch-android-target-sdk] Missing', SDK_FILE);
  process.exit(1);
}

const { compileSdkVersion, targetSdkVersion, minSdkVersion } = JSON.parse(
  fs.readFileSync(SDK_FILE, 'utf8')
);

for (const [key, val] of [
  ['compileSdkVersion', compileSdkVersion],
  ['targetSdkVersion', targetSdkVersion],
  ['minSdkVersion', minSdkVersion],
]) {
  if (!Number.isInteger(val) || val < 1) {
    console.error(`[patch-android-target-sdk] Invalid ${key}:`, val);
    process.exit(1);
  }
}

if (!fs.existsSync(VARIABLES)) {
  console.warn('[patch-android-target-sdk] android/variables.gradle missing — run cap:sync:android first');
  process.exit(0);
}

let gradle = fs.readFileSync(VARIABLES, 'utf8');
const before = gradle;

gradle = gradle.replace(/compileSdkVersion\s*=\s*\d+/, `compileSdkVersion = ${compileSdkVersion}`);
gradle = gradle.replace(/targetSdkVersion\s*=\s*\d+/, `targetSdkVersion = ${targetSdkVersion}`);
gradle = gradle.replace(/minSdkVersion\s*=\s*\d+/, `minSdkVersion = ${minSdkVersion}`);

if (gradle === before) {
  console.log(
    `[patch-android-target-sdk] Already at compileSdk ${compileSdkVersion}, targetSdk ${targetSdkVersion}`
  );
} else {
  fs.writeFileSync(VARIABLES, gradle);
  console.log(
    `[patch-android-target-sdk] Patched variables.gradle → compileSdk ${compileSdkVersion}, targetSdk ${targetSdkVersion}`
  );
}
