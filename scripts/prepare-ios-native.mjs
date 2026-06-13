#!/usr/bin/env node
/**
 * Prepare a clean iOS native tree without Google Sign-In (Android-only plugin).
 * Prevents ITMS-91061 from GoogleSignIn 6.x lacking Apple privacy manifests.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const GOOGLE_AUTH_PKG = path.join(ROOT, 'node_modules', '@codetrix-studio', 'capacitor-google-auth');
const PODS_DIR = path.join(ROOT, 'ios', 'App', 'Pods');
const PODFILE_LOCK = path.join(ROOT, 'ios', 'App', 'Podfile.lock');

function rm(target, label) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`removed ${label}`);
  }
}

rm(GOOGLE_AUTH_PKG, '@codetrix-studio/capacitor-google-auth');
rm(PODS_DIR, 'ios/App/Pods');
rm(PODFILE_LOCK, 'ios/App/Podfile.lock');
