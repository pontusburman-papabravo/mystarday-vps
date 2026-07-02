import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'config/governance-registry.json');

function loadRegistry() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(raw);
}

function checkRequiredFiles(files, label) {
  const missing = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${label} missing required files:\n  - ${missing.join('\n  - ')}`);
  }
}

function checkRuleTests(registry) {
  const missingTests = [];
  for (const [ruleId, entry] of Object.entries(registry.rules || {})) {
    for (const testRel of entry.tests || []) {
      const abs = path.join(ROOT, testRel);
      if (!fs.existsSync(abs)) {
        missingTests.push(`${ruleId} → ${testRel}`);
      }
    }
  }
  if (missingTests.length > 0) {
    throw new Error(`Governance registry references missing tests:\n  - ${missingTests.join('\n  - ')}`);
  }
}

function main() {
  const registry = loadRegistry();
  checkRequiredFiles(registry.pos_required_files || [], 'POS');
  checkRequiredFiles(registry.cos_required_files || [], 'COS');
  checkRuleTests(registry);

  const constitution = fs.readFileSync(
    path.join(ROOT, 'product-operating-system/00_PROJECT_CONSTITUTION.md'),
    'utf8'
  );
  const ruleMatches = constitution.match(/^## \d+\./gm) || [];
  if (ruleMatches.length !== 6) {
    throw new Error(`POS Constitution must have exactly 6 rules, found ${ruleMatches.length}`);
  }

  console.log(`Governance check OK (${registry.pos_required_files.length} POS files, ${Object.keys(registry.rules).length} registered rules)`);
}

main();
