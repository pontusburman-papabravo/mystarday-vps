#!/usr/bin/env node
/**
 * Wire Meta App Events into the generated Android Capacitor project.
 * Run after `npx cap sync android`.
 *
 * Env:
 *   META_CLIENT_TOKEN or FACEBOOK_CLIENT_TOKEN
 *   META_APP_ID (default 27941105858861495)
 *
 * Automatic IAP purchase logging must stay OFF in Meta App Dashboard.
 */
import fs from 'fs';
import path from 'path';

const META_APP_ID = process.env.META_APP_ID || '27941105858861495';
const META_CLIENT_TOKEN =
  process.env.META_CLIENT_TOKEN || process.env.FACEBOOK_CLIENT_TOKEN || '';

const stringsPath = path.join(
  process.cwd(),
  'android/app/src/main/res/values/strings.xml'
);
const manifestPath = path.join(
  process.cwd(),
  'android/app/src/main/AndroidManifest.xml'
);

function upsertString(content, name, value) {
  const re = new RegExp(`<string name="${name}">[^<]*</string>`);
  const line = `    <string name="${name}">${value}</string>`;
  if (re.test(content)) {
    return content.replace(re, line);
  }
  const closing = content.lastIndexOf('</resources>');
  if (closing === -1) throw new Error('Could not find </resources> in strings.xml');
  return content.slice(0, closing) + line + '\n' + content.slice(closing);
}

function ensureMetaData(content, name, valueExpr) {
  const marker = `android:name="${name}"`;
  if (content.includes(marker)) {
    const re = new RegExp(
      `<meta-data\\s+android:name="${name}"\\s+android:value="[^"]*"\\s*/>`
    );
    return content.replace(
      re,
      `<meta-data android:name="${name}" android:value="${valueExpr}" />`
    );
  }
  const appOpen = content.indexOf('<application');
  if (appOpen === -1) throw new Error('No <application> in AndroidManifest.xml');
  const insertAt = content.indexOf('>', appOpen) + 1;
  const block =
    `\n        <meta-data android:name="${name}" android:value="${valueExpr}" />`;
  return content.slice(0, insertAt) + block + content.slice(insertAt);
}

if (!fs.existsSync(stringsPath) || !fs.existsSync(manifestPath)) {
  console.error('Android project not found. Run: npm run cap:sync:android');
  process.exit(1);
}

let strings = fs.readFileSync(stringsPath, 'utf8');
const stringsBefore = strings;
strings = upsertString(strings, 'facebook_app_id', META_APP_ID);
strings = upsertString(strings, 'fb_login_protocol_scheme', `fb${META_APP_ID}`);
if (META_CLIENT_TOKEN) {
  strings = upsertString(strings, 'facebook_client_token', META_CLIENT_TOKEN);
} else {
  console.warn(
    '[patch-android-facebook-sdk] META_CLIENT_TOKEN not set — facebook_client_token not written.'
  );
}
if (strings !== stringsBefore) {
  fs.writeFileSync(stringsPath, strings);
  console.log('Patched android strings.xml with Meta App Events values');
} else {
  console.log('android strings.xml Meta values already up to date');
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
const manifestBefore = manifest;
manifest = ensureMetaData(manifest, 'com.facebook.sdk.ApplicationId', '@string/facebook_app_id');
if (META_CLIENT_TOKEN || manifest.includes('facebook_client_token')) {
  manifest = ensureMetaData(
    manifest,
    'com.facebook.sdk.ClientToken',
    '@string/facebook_client_token'
  );
}
manifest = ensureMetaData(manifest, 'com.facebook.sdk.AutoInitEnabled', 'true');
// Install + app open via auto-log. Keep Meta Dashboard IAP auto-log OFF.
manifest = ensureMetaData(manifest, 'com.facebook.sdk.AutoLogAppEventsEnabled', 'true');
manifest = ensureMetaData(manifest, 'com.facebook.sdk.AdvertiserIDCollectionEnabled', 'false');

if (manifest !== manifestBefore) {
  fs.writeFileSync(manifestPath, manifest);
  console.log('Patched AndroidManifest.xml with Meta App Events meta-data');
} else {
  console.log('AndroidManifest.xml Meta meta-data already up to date');
}
