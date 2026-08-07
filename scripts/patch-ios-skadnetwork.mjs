#!/usr/bin/env node
/**
 * Merge Meta-required SKAdNetwork identifiers into ios/App/App/Info.plist.
 * Run after patch-ios-info-plist.mjs / patch-ios-facebook-sdk.mjs on every cap:sync:ios.
 *
 * Source of truth: config/meta-skadnetwork.json (Meta official SKAdNetwork doc URL inside).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INFO_PLIST = path.join(ROOT, 'ios', 'App', 'App', 'Info.plist');
const CONFIG_PATH = path.join(ROOT, 'config', 'meta-skadnetwork.json');

function loadRequiredIds() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const ids = raw.identifiers;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('config/meta-skadnetwork.json must list at least one identifier');
  }
  const normalized = ids.map((id) => String(id).trim().toLowerCase());
  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) {
    throw new Error('config/meta-skadnetwork.json contains duplicate identifiers');
  }
  return unique;
}

function parseExistingSkadIds(content) {
  const ids = [];
  const block = content.match(/<key>SKAdNetworkItems<\/key>\s*<array>([\s\S]*?)<\/array>/);
  if (!block) return ids;
  const re = /<key>SKAdNetworkIdentifier<\/key>\s*<string>([^<]+)<\/string>/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    ids.push(m[1].trim().toLowerCase());
  }
  return ids;
}

function buildSkadNetworkBlock(allIds) {
  const dicts = allIds
    .map(
      (id) =>
        `\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>${id}</string>\n\t\t</dict>`
    )
    .join('\n');
  return `\t<key>SKAdNetworkItems</key>\n\t<array>\n${dicts}\n\t</array>`;
}

function patchInfoPlist(requiredIds) {
  if (!fs.existsSync(INFO_PLIST)) {
    throw new Error(`Info.plist missing — run cap:sync:ios first (${INFO_PLIST})`);
  }
  let content = fs.readFileSync(INFO_PLIST, 'utf8');
  const before = content;
  const existing = parseExistingSkadIds(content);
  const merged = [...new Set([...existing, ...requiredIds])].sort();
  const block = buildSkadNetworkBlock(merged);
  const skadRe = /\t<key>SKAdNetworkItems<\/key>\s*<array>[\s\S]*?<\/array>/;
  if (skadRe.test(content)) {
    content = content.replace(skadRe, block);
  } else {
    const closingDict = content.lastIndexOf('</dict>');
    if (closingDict === -1) throw new Error('Could not find </dict> in Info.plist');
    content = content.slice(0, closingDict) + block + '\n' + content.slice(closingDict);
  }
  if (content !== before) {
    fs.writeFileSync(INFO_PLIST, content);
    console.log(`[patch-ios-skadnetwork] SKAdNetworkItems updated (${merged.length} identifiers).`);
  } else {
    console.log('[patch-ios-skadnetwork] SKAdNetworkItems already up to date.');
  }
}

const required = loadRequiredIds();
patchInfoPlist(required);
