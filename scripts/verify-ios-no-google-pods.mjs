#!/usr/bin/env node
/**
 * Fail CI / local builds if Google Sign-In pods are present on iOS.
 * Google Auth is Android-only; old GoogleSignIn SDK lacks Apple privacy manifests (ITMS-91061).
 */
import fs from 'fs';
import path from 'path';

const podfilePath = path.join(process.cwd(), 'ios', 'App', 'Podfile');
const podsDir = path.join(process.cwd(), 'ios', 'App', 'Pods');

const BLOCKED = [
  'CodetrixStudioCapacitorGoogleAuth',
  'GoogleSignIn',
  'GTMAppAuth',
  'GTMSessionFetcher',
];

let failed = false;

if (fs.existsSync(podfilePath)) {
  const podfile = fs.readFileSync(podfilePath, 'utf8');
  for (const name of BLOCKED) {
    if (podfile.includes(name)) {
      console.error(`❌ Podfile references ${name} — remove Google Auth from iOS`);
      failed = true;
    }
  }
}

if (fs.existsSync(podsDir)) {
  for (const name of BLOCKED) {
    const podPath = path.join(podsDir, name);
    if (fs.existsSync(podPath)) {
      console.error(`❌ ios/App/Pods/${name} exists — run: rm -rf ios/App/Pods ios/App/Podfile.lock && npm run cap:sync:ios`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('✅ iOS Pods OK — no Google Sign-In SDK');
