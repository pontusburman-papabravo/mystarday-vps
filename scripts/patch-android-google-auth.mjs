#!/usr/bin/env node
/**
 * Patch GoogleAuth.java after cap sync — prevent native NPE when signIn() runs
 * before initialize() (Play review / misconfigured build).
 *
 * Usage: node scripts/patch-android-google-auth.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const GOOGLE_AUTH_JAVA = path.join(
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

const SIGN_IN_GUARD = `    if (googleSignInClient == null) {
      call.reject("Google Sign In not initialized — call initialize() first.");
      return;
    }
`;

const INIT_GUARD = `    if (clientId == null || clientId.isEmpty()) {
      call.reject("Missing Google client ID — set GOOGLE_WEB_CLIENT_ID and re-run cap:sync:android.");
      return;
    }
`;

function patch(content) {
  let updated = content;
  let changed = false;

  if (!updated.includes('Google Sign In not initialized')) {
    const signInMarker = '  public void signIn(PluginCall call) {\n    Intent signInIntent';
    if (!updated.includes(signInMarker)) {
      throw new Error('Could not find signIn() in GoogleAuth.java — plugin version mismatch?');
    }
    updated = updated.replace(
      signInMarker,
      `  public void signIn(PluginCall call) {\n${SIGN_IN_GUARD}    Intent signInIntent`
    );
    changed = true;
    console.log('Added signIn null-guard');
  } else {
    console.log('signIn null-guard already present');
  }

  if (!updated.includes('Missing Google client ID')) {
    const initMarker = '    loadSignInClient(clientId, forceCodeForRefreshToken, scopeArray);';
    if (!updated.includes(initMarker)) {
      throw new Error('Could not find initialize() body in GoogleAuth.java');
    }
    updated = updated.replace(initMarker, `${INIT_GUARD}    ${initMarker.trim()}`);
    changed = true;
    console.log('Added initialize clientId guard');
  } else {
    console.log('initialize clientId guard already present');
  }

  return { content: updated, changed };
}

if (!fs.existsSync(GOOGLE_AUTH_JAVA)) {
  console.error('Not found:', GOOGLE_AUTH_JAVA);
  console.error('Run: npm install && npm run cap:sync:android');
  process.exit(1);
}

const before = fs.readFileSync(GOOGLE_AUTH_JAVA, 'utf8');
const result = patch(before);

if (result.changed) {
  fs.writeFileSync(GOOGLE_AUTH_JAVA, result.content);
  console.log('Patched GoogleAuth.java');
} else {
  console.log('GoogleAuth.java already patched.');
}
