#!/usr/bin/env node
'use strict';

/**
 * Fail if tracked QA/review credential literals appear in the repo tree.
 * Does not print matched secret values.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SCAN_DIRS = [
  '.cursor/rules',
  'docs',
  'scripts',
  'AGENTS.md',
  '.github',
];

const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'artifacts', 'ios', 'android']);

/** Pattern id only — no credential values in source. */
const BANNED = [
  { id: 'app_store_review_password_pattern', re: /AppReview20\d{2}!/ },
  { id: 'review_child_pin_doc_literal', re: /Child PIN[^\n]*`4455`/i },
  { id: 'founder_child_pin_doc_literal', re: /(?:Astrid|astrid921)[^\n]{0,120}PIN[^\n]*`1112`/i },
  { id: 'qa_mobil_smoke_password_literal', re: /SMOKE_PARENT_PASSWORD\s*=\s*["'][^"']{8,}["']/ },
  { id: 'pragma_allowlist_with_inline_secret', re: /pragma:\s*allowlist secret[^\n]*`[^[\]]{6,}`/i },
  { id: 'android_upload_keystore_password_literal', re: /MinStjarnadagUpload20\d{2}!/ },
  { id: 'password_table_cell_literal', re: /\|\s*Parent password\s*\|\s*`(?![A-Z][A-Z0-9_]*`)[^`]{5,}`\s*\|/i },
];
const EXT_OK = new Set([
  '.md', '.mdc', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.html', '.txt', '.py',
]);

function walk(rel, out) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    out.push(rel);
    return;
  }
  for (const name of fs.readdirSync(abs)) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    walk(path.join(rel, name), out);
  }
}

function shouldScan(file) {
  if (file === 'scripts/check-committed-credentials.cjs') return false;
  if (file.startsWith('test/credential-leak-guard')) return false;
  if (file === 'config/credential-leak-patterns.json') return false;
  const ext = path.extname(file);
  return EXT_OK.has(ext) || file === 'AGENTS.md';
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) walk(d, files);

  const hits = [];
  for (const rel of files) {
    if (rel.includes('check-committed-credentials')) continue;
    if (!shouldScan(rel)) continue;
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const rule of BANNED) {
      if (rule.id === 'pragma_allowlist_with_inline_secret' && !/\.(md|mdc)$/.test(rel)) {
        continue;
      }
      if (rule.re.test(text)) {
        hits.push({ file: rel, rule: rule.id });
      }
    }
  }

  if (hits.length) {
    console.error('[credential-guard] blocked committed credential literals:');
    for (const h of hits) {
      console.error(`  - ${h.file} (${h.rule})`);
    }
    process.exit(1);
  }
  console.log('[credential-guard] OK');
}

main();
