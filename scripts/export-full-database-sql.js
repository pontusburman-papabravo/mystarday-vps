#!/usr/bin/env node
/**
 * Export entire public PostgreSQL schema + data as SQL.
 *
 * Requires DATABASE_URL (Render Shell, Polsia env, or local).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run export:database:sql
 *   DATABASE_URL=... node scripts/export-full-database-sql.js --out ./export/full.sql
 *   DATABASE_URL=... node scripts/export-full-database-sql.js --no-schema
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { streamFullDatabaseExport } = require('../src/lib/full-database-export-sql');

function parseArgs(argv) {
  const opts = {
    out: path.join(
      process.cwd(),
      'export',
      `stjarndag-full-export-${new Date().toISOString().slice(0, 10)}.sql`
    ),
    includeSchema: true,
    redactSensitive: true,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (argv[i] === '--no-schema') opts.includeSchema = false;
    else if (argv[i] === '--include-secrets') opts.redactSensitive = false;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Export full database as SQL (all public tables).

Options:
  --out <file.sql>     Output path (default: export/stjarndag-full-export-YYYY-MM-DD.sql)
  --no-schema          Skip pg_dump schema section (data only)
  --include-secrets    Do not redact password_hash, token_hash, native_token

Requires DATABASE_URL.

Admin UI (when deployed with MIGRATION_EXPORT_ENABLED=true):
  GET /api/admin/export/sql
`);
      process.exit(0);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  const chunks = [];

  try {
    console.log('Exporting full database to SQL...');
    const result = await streamFullDatabaseExport(
      client,
      (text) => {
        chunks.push(text);
        return Promise.resolve();
      },
      {
        includeSchema: opts.includeSchema,
        redactSensitive: opts.redactSensitive,
        onTableDone: (table, stat) => {
          const rows = stat.rows ?? 0;
          const err = stat.error ? ` ERROR: ${stat.error}` : '';
          console.log(`  ${table}: ${rows} rows${err}`);
        },
      }
    );

    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, chunks.join(''));
    const stat = fs.statSync(opts.out);
    console.log(`\nWrote ${opts.out} (${stat.size} bytes, ${result.tables} tables)`);
    console.log(`Import: psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f "${opts.out}"`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Full database SQL export failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
