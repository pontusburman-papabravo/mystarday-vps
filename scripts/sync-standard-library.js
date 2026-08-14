#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const {
  syncStandardLibrary,
  formatSyncSummary,
} = require('../src/lib/standard-library-sync');

const HELP_TEXT = `Sync canonical standard library manifest into default_* tables.

Reads config/standard-library/v1.1.json, validates the manifest, computes a
canonical_id-based diff, and optionally writes to Postgres.

Options:
  --dry-run         Validate + diff only. No database writes.
  --manifest <path> Optional manifest path (default: config/standard-library/v1.1.json).
  --help, -h        Show this help.

Environment:
  DATABASE_URL  Required for actual sync or dry-run diff against the database.

Exit codes:
  0  Success (valid manifest; dry-run or sync completed)
  1  Manifest validation failure (no database writes)
  2  Database / sync failure

Notes:
  - Sync is NOT run automatically during deploy or npm run build.
  - Canonical rows are matched by canonical_id (never display name).
  - PR1 foundation only: no mass deprecation/backfill of legacy rows.
`;

function parseArgs(argv) {
  const opts = { dryRun: false, help: false, manifestPath: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--manifest' && argv[i + 1]) {
      opts.manifestPath = argv[++i];
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.error('[sync:standard-library] DATABASE_URL is required');
    process.exit(2);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const result = await syncStandardLibrary(client, {
      dryRun: opts.dryRun,
      manifestPath: opts.manifestPath || undefined,
    });
    if (!result.ok) {
      console.error('[sync:standard-library] Manifest validation failed:');
      for (const error of result.validationErrors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    const mode = result.dryRun ? 'DRY-RUN' : 'SYNC';
    console.log(`[sync:standard-library] ${mode} OK`);
    console.log(formatSyncSummary(result.summary));
  } catch (err) {
    console.error(`[sync:standard-library] Sync failed: ${err.message}`);
    process.exit(2);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
