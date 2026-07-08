#!/usr/bin/env node
/**
 * @deprecated Use scripts/cleanup-qa-test-families.js (covers ACT-1 + all ephemeral QA accounts).
 */
'use strict';

console.warn('[cleanup] delete-act1-test-families.js is deprecated — use cleanup-qa-test-families.js');

const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync(
  process.execPath,
  [path.join(__dirname, 'cleanup-qa-test-families.js'), ...process.argv.slice(2)],
  { stdio: 'inherit' }
);
process.exit(result.status ?? 1);
