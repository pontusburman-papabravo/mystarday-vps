#!/usr/bin/env node
/**
 * Inject Google Sign In server_client_id into android strings.xml.
 * Reads GOOGLE_WEB_CLIENT_ID from env (or .env via dotenv if present).
 *
 * Usage: GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com node scripts/patch-android-strings.mjs
 */
import fs from 'fs';
import path from 'path';

const stringsPath = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'res',
  'values',
  'strings.xml'
);

const clientId = process.env.GOOGLE_WEB_CLIENT_ID || '';

function patchStrings(content) {
  if (!clientId) {
    console.warn('GOOGLE_WEB_CLIENT_ID not set — skipping server_client_id injection.');
    console.warn('Set it in Render/Polsia and re-run before release build.');
    return { content, changed: false };
  }

  if (content.includes('name="server_client_id"')) {
    const updated = content.replace(
      /<string name="server_client_id">[^<]*<\/string>/,
      `<string name="server_client_id">${clientId}</string>`
    );
    return { content: updated, changed: updated !== content };
  }

  const closing = content.lastIndexOf('</resources>');
  if (closing === -1) {
    throw new Error('Could not find </resources> in strings.xml');
  }

  const insert = `    <string name="server_client_id">${clientId}</string>\n`;
  const updated = content.slice(0, closing) + insert + content.slice(closing);
  return { content: updated, changed: true };
}

if (!fs.existsSync(stringsPath)) {
  console.error('Not found:', stringsPath);
  console.error('Run: npx cap add android && npm run cap:sync:android');
  process.exit(1);
}

const before = fs.readFileSync(stringsPath, 'utf8');
const result = patchStrings(before);

if (!result.changed) {
  if (clientId) console.log('strings.xml server_client_id already up to date.');
} else {
  fs.writeFileSync(stringsPath, result.content);
  console.log('Patched strings.xml with server_client_id');
}
