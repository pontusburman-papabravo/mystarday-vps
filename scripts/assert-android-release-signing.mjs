#!/usr/bin/env node
/**
 * Fail-closed prerequisites for npm run android:aab (release).
 * Dev path: npm run android:aab:dev sets ANDROID_AAB_ALLOW_DEV_KEYSTORE=1.
 */
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SIGNING_DIR = path.join(ROOT, 'assets', 'play-store', 'signing');

export function resolveKeystorePath() {
  const fromEnv = process.env.ANDROID_KEYSTORE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
  const legacy = path.join(SIGNING_DIR, 'upload.keystore');
  if (fs.existsSync(legacy)) return legacy;
  return fromEnv ? path.resolve(fromEnv) : legacy;
}

function sha256Fingerprint(keystorePath, storePass, alias) {
  const out = execSync(
    `keytool -list -v -keystore "${keystorePath}" -alias ${alias} -storepass "${storePass}"`,
    { encoding: 'utf8' }
  );
  const m = out.match(/SHA256:\s*([0-9A-F:]+)/i);
  return m ? m[1].trim().toUpperCase() : null;
}

export function assertAndroidReleaseSigningPreconditions() {
  const allowDev =
    process.argv.includes('--allow-dev-keystore') ||
    process.env.ANDROID_AAB_ALLOW_DEV_KEYSTORE === '1';

  if (allowDev) {
    return {
      allowDevKeystore: true,
      keystorePath: resolveKeystorePath(),
      storePass: process.env.ANDROID_KEYSTORE_PASSWORD || `dev-${crypto.randomBytes(4).toString('hex')}`,
      keyPass: process.env.ANDROID_KEY_PASSWORD || process.env.ANDROID_KEYSTORE_PASSWORD,
      keyAlias: process.env.ANDROID_KEY_ALIAS || 'upload-dev',
    };
  }

  const keystorePath = resolveKeystorePath();
  if (!fs.existsSync(keystorePath)) {
    console.error('\n❌ Release AAB: keystore file missing (set ANDROID_KEYSTORE_PATH).\n');
    process.exit(1);
  }
  const storePass = process.env.ANDROID_KEYSTORE_PASSWORD;
  const keyAlias = process.env.ANDROID_KEY_ALIAS;
  if (!storePass || !keyAlias) {
    console.error('\n❌ Release AAB: ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_ALIAS required.\n');
    process.exit(1);
  }
  if (!process.env.GOOGLE_WEB_CLIENT_ID) {
    console.error('\n❌ Release AAB: GOOGLE_WEB_CLIENT_ID required.\n');
    process.exit(1);
  }
  const expectedFp = process.env.ANDROID_UPLOAD_CERT_SHA256;
  if (expectedFp) {
    const actual = sha256Fingerprint(keystorePath, storePass, keyAlias);
    const norm = (s) => s.replace(/\s/g, '').toUpperCase();
    if (!actual || norm(actual) !== norm(expectedFp)) {
      console.error('\n❌ Release AAB: keystore fingerprint mismatch.\n');
      process.exit(1);
    }
  }

  return {
    allowDevKeystore: false,
    keystorePath,
    storePass,
    keyPass: process.env.ANDROID_KEY_PASSWORD || storePass,
    keyAlias,
  };
}

if (process.argv[1] && process.argv[1].includes('assert-android-release-signing')) {
  assertAndroidReleaseSigningPreconditions();
}
