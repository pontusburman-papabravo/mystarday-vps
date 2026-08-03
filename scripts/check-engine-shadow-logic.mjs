#!/usr/bin/env node
/**
 * CI guard: detect shadow logic outside core-engine.
 * Run: node scripts/check-engine-shadow-logic.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENGINE_ROOT = path.join(ROOT, 'src/core-engine');

const SCAN_DIRS = [
  path.join(ROOT, 'src/routes'),
  path.join(ROOT, 'src/lib'),
  path.join(ROOT, 'public/js'),
];

const ALLOWLIST = new Set([
  path.join(ROOT, 'src/lib/activation-advisor.js'),
  path.join(ROOT, 'src/lib/activation-p0.js'),
  path.join(ROOT, 'src/lib/activation-nudge-scheduler.js'),
  path.join(ROOT, 'src/lib/push-reminder-scheduler.js'),
  path.join(ROOT, 'src/lib/win-back-scheduler.js'),
  path.join(ROOT, 'db/family-activation-state.js'),
  path.join(ROOT, 'src/routes/family/first-success.js'),
  path.join(ROOT, 'src/lib/activation/canonical-next-action.js'),
  path.join(ROOT, 'src/lib/engine-trace-queue.js'),
]);

const FORBIDDEN_PATTERNS = [
  { id: 'collectFamilyFacts_outside_engine', re: /collectFamilyFacts\s*\(/ },
  { id: 'product_engine_bypass_evaluate', re: /ProductEngine\.evaluate/ },
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'core-engine') continue;
      walk(full, acc);
    } else if (/\.(js|mjs)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const violations = [];
  const files = SCAN_DIRS.flatMap((d) => walk(d));

  for (const file of files) {
    if (file.startsWith(ENGINE_ROOT) || ALLOWLIST.has(path.resolve(file))) continue;
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const { id, re } of FORBIDDEN_PATTERNS) {
      if (re.test(src)) violations.push({ file: rel, rule: id });
    }
  }

  if (violations.length) {
    console.error('Engine shadow-logic guard FAILED:\n');
    for (const v of violations) {
      console.error(`  [${v.rule}] ${v.file}`);
    }
    console.error('\nProduct decisions must go through src/core-engine/.');
    process.exit(1);
  }

  console.log('Engine shadow-logic guard OK');
}

main();
