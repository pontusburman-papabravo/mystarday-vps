#!/usr/bin/env node
/**
 * Export all family-scoped data as SQL INSERT statements (UUIDs preserved).
 *
 * Requires DATABASE_URL (Render Shell, Polsia env, or local).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run export:families:sql
 *   DATABASE_URL=... node scripts/export-family-data-sql.js --out ./export/families.sql
 *   DATABASE_URL=... node scripts/export-family-data-sql.js --family-id <uuid>
 *
 * Full database (all tables, schema + data as SQL):
 *   npm run export:database:sql
 *   Or admin: GET /api/admin/export/sql (MIGRATION_EXPORT_ENABLED=true)
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const {
  buildFamilyExportBundle,
  listFamiliesForExport,
} = require('../src/lib/family-export');
const {
  buildFamilySqlSection,
  buildSqlFileHeader,
  buildSqlFileFooter,
} = require('../src/lib/family-export-sql');

function parseArgs(argv) {
  const opts = {
    out: path.join(process.cwd(), 'export', `stjarndag-families-${new Date().toISOString().slice(0, 10)}.sql`),
    familyId: null,
    splitPerFamily: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--split') opts.splitPerFamily = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Export family data as SQL INSERTs (ON CONFLICT DO NOTHING).

Options:
  --out <file.sql>   Output file (default: export/stjarndag-families-YYYY-MM-DD.sql)
  --family-id <id>   Single family only
  --split            One .sql file per family in a directory (--out becomes dir)

Requires DATABASE_URL.

Full DB dump:
  pg_dump "$DATABASE_URL" --format=custom --file=stjarndag-full.dump
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
    console.error('Tip: copy from Render/Polsia environment, or use Render Shell.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const query = (sql, params) => pool.query(sql, params);

  try {
    const families = await listFamiliesForExport(query, opts.familyId);
    console.log(`Exporting ${families.length} familie(s) to SQL`);

    if (opts.splitPerFamily) {
      const dir = opts.out.endsWith('.sql')
        ? opts.out.replace(/\.sql$/, '-sql')
        : opts.out;
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i < families.length; i++) {
        const f = families[i];
        process.stdout.write(`[${i + 1}/${families.length}] ${f.name || f.id} ... `);
        const { files } = await buildFamilyExportBundle(query, f.id);
        const sql =
          buildSqlFileHeader(1) +
          buildFamilySqlSection(files, { familyId: f.id, familyName: f.name }) +
          buildSqlFileFooter();
        const filePath = path.join(dir, `${f.id}.sql`);
        fs.writeFileSync(filePath, sql);
        console.log(filePath);
      }
      console.log(`Done. Directory: ${dir}`);
      return;
    }

    const parts = [buildSqlFileHeader(families.length)];
    for (let i = 0; i < families.length; i++) {
      const f = families[i];
      process.stdout.write(`[${i + 1}/${families.length}] ${f.name || f.id} ... `);
      const { files } = await buildFamilyExportBundle(query, f.id);
      parts.push(buildFamilySqlSection(files, { familyId: f.id, familyName: f.name }));
      console.log('ok');
    }
    parts.push(buildSqlFileFooter());

    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, parts.join('\n'));
    const stat = fs.statSync(opts.out);
    console.log(`\nWrote ${opts.out} (${stat.size} bytes)`);
    console.log(`Import: psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f "${opts.out}"`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('SQL export failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
