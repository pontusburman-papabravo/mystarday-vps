#!/usr/bin/env node
'use strict';

/**
 * Run a command with validated TEST_DATABASE_URL mapped to child DATABASE_URL.
 * Refuses prod / VPS localhost prod identities before spawning. <!-- pragma: allowlist secret -->
 *
 *   node scripts/run-with-validated-test-db.mjs npm run test:gate
 */

const { spawnSync } = require('child_process');
const { buildDestructiveTestChildEnv, REFUSED_CODE } = require('./lib/test-database-safety.cjs');

const args = process.argv.slice(2);
if (!args.length) {
  console.error(`Usage: node scripts/run-with-validated-test-db.mjs <command...>`);
  process.exit(1);
}

let env;
try {
  env = buildDestructiveTestChildEnv(process.env);
} catch (err) {
  console.error(`[test-database-safety] ${err.code || REFUSED_CODE}: ${err.message}`);
  process.exit(1);
}

const result = spawnSync(args[0], args.slice(1), {
  stdio: 'inherit',
  env,
  shell: false,
});

process.exit(result.status ?? 1);
