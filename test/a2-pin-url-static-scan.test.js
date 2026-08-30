'use strict';

/**
 * A2 — shipped public JS/HTML must not construct PIN-bearing URLs.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['public/js', 'public'];
const SKIP_DIR = new Set(['node_modules', 'vendor']);
const EXT = new Set(['.js', '.html']);

const FORBIDDEN = [
  /\?pin=/i,
  /&pin=/i,
  /searchParams\.set\(\s*['"]pin['"]/i,
  /URLSearchParams[^;]{0,80}\.set\(\s*['"]pin['"]/i,
  /location\.href\s*=\s*`[^`]*\$\{[^}]*pin/i,
];

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (path.relative(path.join(ROOT, 'public'), full).startsWith('..')) continue;
      walk(full, out);
    } else if (EXT.has(path.extname(name))) {
      out.push(full);
    }
  }
}

test('shipped JS/HTML do not construct PIN-in-URL', () => {
  const files = [];
  for (const rel of SCAN_DIRS) {
    walk(path.join(ROOT, rel), files);
  }
  const unique = [...new Set(files)].filter((file) => {
    const rel = path.relative(ROOT, file);
    return !rel.startsWith('public/admin') && !rel.includes('.test.');
  });

  const hits = [];
  for (const file of unique) {
    const src = fs.readFileSync(file, 'utf8');
    for (const re of FORBIDDEN) {
      if (re.test(src)) {
        hits.push(`${path.relative(ROOT, file)} matches ${re}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});
