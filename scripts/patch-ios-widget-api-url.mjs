#!/usr/bin/env node
/**
 * Patch WidgetRoutine Info.plist API base URL + App Group on main entitlements (R4.5d).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const infoPlist = path.join(ROOT, 'ios', 'App', 'WidgetRoutine', 'Info.plist');
const appEntitlements = path.join(ROOT, 'ios', 'App', 'App', 'App.entitlements');
const APP_GROUP = 'group.stjarndag.widget';
const PLACEHOLDER = '__WIDGET_API_BASE_URL__';

function readServerUrl() {
  const fromEnv = process.env.WIDGET_API_BASE_URL || '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const capPath = path.join(ROOT, 'capacitor.config.ts');
  if (!fs.existsSync(capPath)) return '';
  const src = fs.readFileSync(capPath, 'utf8');
  const matches = src.match(/url:\s*'([^']+)'/g) || [];
  for (const m of matches) {
    const inner = m.match(/url:\s*'([^']+)'/);
    const url = inner?.[1] || '';
    if (url.includes('localhost')) continue;
    if (url.startsWith('http')) return url.replace(/\/$/, '');
  }
  return '';
}

function patchEntitlements(filePath) {
  if (!fs.existsSync(filePath)) return;
  let xml = fs.readFileSync(filePath, 'utf8');
  const groupBlock = `\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${APP_GROUP}</string>
\t</array>`;
  const keychainBlock = `\t<key>keychain-access-groups</key>
\t<array>
\t\t<string>$(AppIdentifierPrefix)${APP_GROUP}</string>
\t</array>`;
  if (!xml.includes('com.apple.security.application-groups')) {
    xml = xml.replace('</dict>', `${groupBlock}\n</dict>`);
  }
  if (!xml.includes('keychain-access-groups')) {
    xml = xml.replace('</dict>', `${keychainBlock}\n</dict>`);
  }
  fs.writeFileSync(filePath, xml);
}

if (fs.existsSync(infoPlist)) {
  const base = readServerUrl();
  let xml = fs.readFileSync(infoPlist, 'utf8');
  if (base) {
    xml = xml.replace(
      new RegExp(`<string>${PLACEHOLDER}</string>`),
      `<string>${base.replace(/&/g, '&amp;')}</string>`
    );
    fs.writeFileSync(infoPlist, xml);
    console.log('[widget-api] Patched WidgetRoutine Info.plist base URL');
  } else {
    console.warn('[widget-api] No base URL resolved — keeping placeholder');
  }
}

patchEntitlements(appEntitlements);
console.log('[widget-api] App entitlements app group/keychain OK');
