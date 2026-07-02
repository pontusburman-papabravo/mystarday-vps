#!/usr/bin/env node
/**
 * Fas 9 — build Tailwind CSS + sync CACHE_NAME from config/cache-version.json.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionPath = path.join(ROOT, 'config/cache-version.json');
const swPath = path.join(ROOT, 'public/sw.js');
const outCss = path.join(ROOT, 'public/css/tailwind.build.css');

const { cacheName, tailwindBuild } = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

console.log('→ tailwind build');
execSync(
  `npx tailwindcss -i public/css/tw-input.css -o public/css/tailwind.build.css --minify`,
  { cwd: ROOT, stdio: 'inherit' },
);

const header = `/* Tailwind build v${tailwindBuild} — ${cacheName} — do not edit; run npm run css:build */\n`;
const headerRe = /^\/\* Tailwind build v\d+ — [^\n]* — do not edit; run npm run css:build \*\/\n/;
const css = fs.readFileSync(outCss, 'utf8').replace(headerRe, '');
fs.writeFileSync(outCss, header + css);

let sw = fs.readFileSync(swPath, 'utf8');
const cacheRe = /const CACHE_NAME = 'stjarndag-v\d+'/;
if (!cacheRe.test(sw)) {
  console.error('sw.js CACHE_NAME pattern not found');
  process.exit(1);
}
sw = sw.replace(cacheRe, `const CACHE_NAME = '${cacheName}'`);
if (!sw.includes(`// ${cacheName}:`)) {
  const insertAt = sw.indexOf('// v311:');
  const line = `// ${cacheName}: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)\n`;
  if (insertAt !== -1) {
    sw = sw.slice(0, insertAt) + line + sw.slice(insertAt);
  }
}
fs.writeFileSync(swPath, sw);

const stat = fs.statSync(outCss);
console.log(`✓ ${outCss} (${Math.round(stat.size / 1024)} KB), CACHE_NAME=${cacheName}`);
