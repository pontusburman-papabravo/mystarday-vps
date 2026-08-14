#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const {
  backfillStandardLibrary,
  formatBackfillReport,
} = require('../src/lib/standard-library-backfill');

const HELP_TEXT = `Controlled canonical backfill for legacy default_* library rows.

Reads config/standard-library/v1.1-legacy-map.json and assigns canonical_id
to explicitly mapped legacy rows. TEACCH overlays are preserved without
canonical assignment. Ambiguous or conflicting mappings fail closed.

Options:
  --dry-run         Report proposed mappings only. No database writes (default).
  --apply           Apply explicit mappings in a single transaction.
  --map <path>      Optional legacy map path.
  --help, -h        Show this help.

Environment:
  DATABASE_URL                           Required.
  STANDARD_LIBRARY_BACKFILL_CONFIRM=1    Required for --apply against non-local DB.

Exit codes:
  0  Success (dry-run or apply completed)
  1  Blocked mappings / validation failure (no writes on --apply)
  2  Database / environment failure

Notes:
  - Never runs automatically during deploy.
  - Identity after backfill is canonical_id only; name matching is one-time here.
  - Does not touch family activity_template rows or default_reward rows.
`;

function parseArgs(argv) {
  const opts = { dryRun: true, apply: false, help: false, mapPath: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
    } else if (arg === '--map' && argv[i + 1]) {
      opts.mapPath = argv[++i];
    } else if (arg === '--help' || arg === '-h') opts.help = true;
    else {
      console.error(`Unknown option: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

function isLocalDatabaseUrl(url) {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

function requireApplyConfirmation(databaseUrl) {
  if (isLocalDatabaseUrl(databaseUrl)) return;
  if (process.env.STANDARD_LIBRARY_BACKFILL_CONFIRM === '1') return;
  console.error(
    '[backfill:standard-library] Refusing --apply on non-local DATABASE_URL without STANDARD_LIBRARY_BACKFILL_CONFIRM=1'
  );
  process.exit(2);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.error('[backfill:standard-library] DATABASE_URL is required');
    process.exit(2);
  }

  if (opts.apply) {
    requireApplyConfirmation(process.env.DATABASE_URL);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const result = await backfillStandardLibrary(client, {
      dryRun: opts.dryRun,
      mapPath: opts.mapPath || undefined,
    });

    const mode = result.dryRun ? 'DRY-RUN' : 'APPLY';
    if (!result.ok) {
      console.error(`[backfill:standard-library] ${mode} BLOCKED`);
      console.error(formatBackfillReport(result));
      for (const error of result.blockingErrors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    console.log(`[backfill:standard-library] ${mode} OK`);
    console.log(formatBackfillReport(result));
  } catch (err) {
    console.error(`[backfill:standard-library] Failed: ${err.message}`);
    process.exit(2);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
