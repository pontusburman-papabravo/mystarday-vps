#!/usr/bin/env node
/**
 * One-shot: replace Tailwind CDN + inline tailwind.config with built stylesheet link.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const TW_LINK = '  <link rel="stylesheet" href="/css/tailwind.build.css?v=1">\n';
const CDN_RE = /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n?/g;
const CONFIG_RE = /<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*;?\s*<\/script>\n?/g;

function walkHtml(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkHtml(p));
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walkHtml(PUBLIC)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('cdn.tailwindcss.com')) continue;
  const before = html;
  html = html.replace(CDN_RE, TW_LINK);
  html = html.replace(CONFIG_RE, '');
  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
    console.log('migrated', path.relative(ROOT, file));
  }
}
console.log(`Done: ${changed} files`);
