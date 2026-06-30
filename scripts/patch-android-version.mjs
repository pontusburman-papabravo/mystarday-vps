#!/usr/bin/env node
/**
 * Apply versionCode/versionName from assets/play-store/android-version.json
 * into android/app/build.gradle after `npx cap sync android`.
 *
 * Usage: node scripts/patch-android-version.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const VERSION_FILE = path.join(ROOT, 'assets/play-store/android-version.json');
const GRADLE_FILE = path.join(ROOT, 'android/app/build.gradle');

if (!fs.existsSync(GRADLE_FILE)) {
  console.error('Not found:', GRADLE_FILE);
  console.error('Run: npm run cap:sync:android');
  process.exit(1);
}

if (!fs.existsSync(VERSION_FILE)) {
  console.error('Not found:', VERSION_FILE);
  process.exit(1);
}

const { versionCode, versionName } = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error('android-version.json: versionCode must be a positive integer');
}
if (!versionName || typeof versionName !== 'string') {
  throw new Error('android-version.json: versionName must be a non-empty string');
}

let gradle = fs.readFileSync(GRADLE_FILE, 'utf8');
const before = gradle;

if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+"[^"]*"/.test(gradle)) {
  throw new Error('Could not find versionCode/versionName in build.gradle');
}

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

if (gradle === before) {
  console.log(`android/app/build.gradle already at versionCode ${versionCode}, versionName "${versionName}"`);
} else {
  fs.writeFileSync(GRADLE_FILE, gradle);
  console.log(`Patched android/app/build.gradle → versionCode ${versionCode}, versionName "${versionName}"`);
}
