#!/usr/bin/env node
/**
 * Import global-library.json (default_* tables) into Postgres.
 *
 * Usage:
 *   npm run migrate
 *   DATABASE_URL=... npm run import:library -- --in ./Backup/stjarndag-harvest-2026-06-02
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { buildGlobalLibraryBundles, ensureStandardLibraryAccess, isLocalMigrationDb } = require('../src/lib/global-library-import');

const IMPORT_TABLE_ORDER = [
  'default_activity_template',
  'default_reward',
  'default_schedule',
  'default_schedule_item',
];

function parseArgs(argv) {
  const opts = { inDir: null, file: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--file' && argv[i + 1]) opts.file = path.resolve(argv[++i]);
    else if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Import global standard library into Postgres.

Options:
  --in <dir>       Directory containing global-library.json (harvest output)
  --file <path>    Direct path to global-library.json
  --dry-run        Print counts only

Env:
  DATABASE_URL     Target database (required)
`);
      process.exit(0);
    }
  }
  return opts;
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

async function insertRows(client, table, rows, conflictCols, dryRun) {
  if (!rows.length) return { inserted: 0, skipped: 0 };

  const columns = Object.keys(rows[0]);
  const colList = columns.map(quoteIdent).join(', ');
  const conflictList = conflictCols.map(quoteIdent).join(', ');
  const onConflict = `ON CONFLICT (${conflictList}) DO NOTHING`;

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const values = columns.map((c) => row[c] ?? null);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders}) ${onConflict}`;

    if (dryRun) {
      inserted++;
      continue;
    }

    const result = await client.query(sql, values);
    if (result.rowCount > 0) inserted++;
    else skipped++;
  }

  return { inserted, skipped };
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const libraryPath =
    opts.file ||
    (opts.inDir ? path.join(opts.inDir, 'global-library.json') : null);

  if (!libraryPath || !fs.existsSync(libraryPath)) {
    console.error('ERROR: global-library.json not found — run npm run harvest:library against prod first');
    console.error('  Or: psql import of default_* tables from admin SQL export');
    process.exit(1);
  }

  const raw = fs.readFileSync(libraryPath, 'utf8');
  const data = JSON.parse(raw);
  const { bundles, meta } = buildGlobalLibraryBundles(data);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  const summary = {};

  try {
    if (!opts.dryRun) await client.query('BEGIN');

    for (const table of IMPORT_TABLE_ORDER) {
      const bundle = bundles.find((b) => b.table === table);
      if (!bundle || !bundle.rows.length) {
        summary[table] = { rows: 0, inserted: 0, conflicts_skipped: 0 };
        continue;
      }
      const result = await insertRows(client, table, bundle.rows, bundle.conflict, opts.dryRun);
      summary[table] = {
        rows: bundle.rows.length,
        inserted: result.inserted,
        conflicts_skipped: result.skipped,
      };
    }

    if (!opts.dryRun && isLocalMigrationDb()) {
      await ensureStandardLibraryAccess(client);
    }

    if (!opts.dryRun) await client.query('COMMIT');

    console.log(`${opts.dryRun ? 'Dry-run' : 'Importerade'} standardbibliotek från ${libraryPath}\n`);
    for (const [table, stat] of Object.entries(summary)) {
      if (stat.rows > 0) {
        console.log(`  ${table}: ${stat.inserted}/${stat.rows} inserts`);
      }
    }
    console.log(
      `\nTotalt: ${meta.activities} aktiviteter, ${meta.rewards} belöningar, ${meta.schedules} scheman, ${meta.scheduleItems} schema-rader`
    );
  } catch (err) {
    if (!opts.dryRun) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Import library failed:', err.message);
  process.exit(1);
});
