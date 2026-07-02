#!/usr/bin/env node
/**
 * Validate World Production Contracts (WPC) machine-readable spec.
 * Run: npm run check:wpc
 * Exit 0 = all contracts present and schema-valid; 1 = failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SPEC_PATH = path.join(ROOT, 'docs/world/wpc.contracts.yaml');

const CATEGORY_KEYS = [
  'spatial',
  'interaction',
  'progression',
  'memory',
  'simulation',
  'pet',
  'audio',
  'animation',
  'art',
  'accessibility',
  'performance',
  'architecture',
  'ai',
];

const EXPECTED_IDS = [
  'SPC-001', 'SPC-002', 'SPC-003', 'SPC-004', 'SPC-005',
  'INC-001', 'INC-002', 'INC-003', 'INC-004', 'INC-005',
  'PRG-001', 'PRG-002', 'PRG-003', 'PRG-004', 'PRG-005',
  'MEM-001', 'MEM-002', 'MEM-003', 'MEM-004',
  'SIM-001', 'SIM-002', 'SIM-003', 'SIM-004',
  'PET-001', 'PET-002', 'PET-003', 'PET-004', 'PET-005',
  'AUD-001', 'AUD-002', 'AUD-003',
  'ANI-001', 'ANI-002', 'ANI-003', 'ANI-004',
  'ART-001', 'ART-002', 'ART-003', 'ART-004',
  'ACC-001', 'ACC-002', 'ACC-003',
  'PERF-001', 'PERF-002', 'PERF-003', 'PERF-004',
  'ARC-001', 'ARC-002', 'ARC-003', 'ARC-004', 'ARC-005',
  'AI-001', 'AI-002', 'AI-003', 'AI-004', 'AI-005',
];

const NUMERIC_FIELDS = new Set(['count', 'min_empty_space_percent', 'target_fps']);

function fail(msg) {
  console.error(`[check:wpc] ${msg}`);
  process.exitCode = 1;
}

function isBoolean(v) {
  return v === true || v === false;
}

function validateContractFields(contractId, fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    fail(`${contractId}: contract must be an object`);
    return;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    fail(`${contractId}: contract has no fields`);
    return;
  }
  for (const [key, value] of Object.entries(fields)) {
    if (NUMERIC_FIELDS.has(key)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        fail(`${contractId}.${key}: expected finite number, got ${JSON.stringify(value)}`);
      }
    } else if (!isBoolean(value)) {
      fail(`${contractId}.${key}: expected boolean, got ${JSON.stringify(value)}`);
    }
  }
}

function main() {
  if (!fs.existsSync(SPEC_PATH)) {
    fail(`missing spec: ${path.relative(ROOT, SPEC_PATH)}`);
    process.exit(process.exitCode || 1);
  }

  let doc;
  try {
    doc = yaml.load(fs.readFileSync(SPEC_PATH, 'utf8'));
  } catch (err) {
    fail(`YAML parse error: ${err.message}`);
    process.exit(1);
  }

  if (!doc || typeof doc !== 'object') {
    fail('root document must be an object');
    process.exit(1);
  }

  const wpc = doc.wpc;
  if (!wpc || typeof wpc !== 'object') {
    fail('missing top-level `wpc` key');
    process.exit(1);
  }

  if (wpc.version !== '1.0') {
    fail(`wpc.version must be "1.0", got ${JSON.stringify(wpc.version)}`);
  }
  if (wpc.status !== 'canonical') {
    fail(`wpc.status must be "canonical", got ${JSON.stringify(wpc.status)}`);
  }

  const foundIds = new Set();

  for (const category of CATEGORY_KEYS) {
    const block = wpc[category];
    if (!block || typeof block !== 'object' || Array.isArray(block)) {
      fail(`wpc.${category}: missing category object`);
      continue;
    }
    for (const [contractId, fields] of Object.entries(block)) {
      if (!/^[A-Z]{2,4}-\d{3}$/.test(contractId)) {
        fail(`wpc.${category}: invalid contract id "${contractId}"`);
      }
      foundIds.add(contractId);
      validateContractFields(contractId, fields);
    }
  }

  for (const id of EXPECTED_IDS) {
    if (!foundIds.has(id)) {
      fail(`missing contract: ${id}`);
    }
  }

  for (const id of foundIds) {
    if (!EXPECTED_IDS.includes(id)) {
      fail(`unexpected contract: ${id}`);
    }
  }

  const flatList = doc.contract_ids;
  if (!Array.isArray(flatList)) {
    fail('contract_ids must be an array');
  } else {
    const flatSet = new Set(flatList);
    if (flatSet.size !== flatList.length) {
      fail('contract_ids contains duplicates');
    }
    for (const id of EXPECTED_IDS) {
      if (!flatSet.has(id)) {
        fail(`contract_ids missing: ${id}`);
      }
    }
    for (const id of flatList) {
      if (!EXPECTED_IDS.includes(id)) {
        fail(`contract_ids unexpected entry: ${id}`);
      }
    }
    if (flatList.length !== EXPECTED_IDS.length) {
      fail(`contract_ids length ${flatList.length} !== expected ${EXPECTED_IDS.length}`);
    }
  }

  if (process.exitCode) {
    console.error(`[check:wpc] FAILED — ${EXPECTED_IDS.length} contracts expected`);
    process.exit(1);
  }

  console.log(`[check:wpc] OK — ${EXPECTED_IDS.length} contracts, ${CATEGORY_KEYS.length} categories`);
}

main();
