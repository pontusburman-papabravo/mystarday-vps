#!/usr/bin/env node
/**
 * Add App Group for widget bridge + extension (R4.5c).
 * Run after cap sync ios (also wired into cap:sync:ios).
 */
import fs from 'fs';
import path from 'path';

const APP_GROUP = 'group.stjarndag.widget';
const entitlementsPath = path.join(process.cwd(), 'ios', 'App', 'App', 'App.entitlements');

if (!fs.existsSync(entitlementsPath)) {
  console.log('[widget-bridge] App.entitlements missing — skip app group patch.');
  process.exit(0);
}

let xml = fs.readFileSync(entitlementsPath, 'utf8');
const groupBlock = `\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${APP_GROUP}</string>
\t</array>`;

if (xml.includes('com.apple.security.application-groups')) {
  if (xml.includes(APP_GROUP)) {
    console.log('[widget-bridge] App group already present in entitlements.');
  } else {
    console.warn('[widget-bridge] application-groups exists but missing', APP_GROUP, '— add manually in Xcode.');
    process.exit(1);
  }
} else {
  xml = xml.replace('</dict>', `${groupBlock}\n</dict>`);
  fs.writeFileSync(entitlementsPath, xml);
  console.log('[widget-bridge] Added App Group to App.entitlements:', APP_GROUP);
}
