#!/usr/bin/env node
/**
 * Prepare a clean Android native tree without Apple Sign In (iOS-only plugin).
 * Mirrors prepare-ios-native.mjs which strips Google Auth for iOS.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const APPLE_SIGN_IN_PKG = path.join(ROOT, 'node_modules', '@capacitor-community', 'apple-sign-in');

function rm(target, label) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`removed ${label}`);
  }
}

rm(APPLE_SIGN_IN_PKG, '@capacitor-community/apple-sign-in');
