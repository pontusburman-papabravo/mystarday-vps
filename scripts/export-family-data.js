#!/usr/bin/env node
/**
 * Full family data export for platform migration (filesystem).
 * See scripts/migration-export-cli.js for admin HTTP export without DATABASE_URL locally.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const archiver = require('archiver');
const {
  buildFamilyExportBundle,
  listFamiliesForExport,
} = require('../src/lib/family-export');

function parseArgs(argv) {
  const opts = {
    out: path.join(process.cwd(), 'export', `stjarndag-${new Date().toISOString().slice(0, 10)}`),
    familyId: null,
    zip: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--zip') opts.zip = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Usage: node scripts/export-family-data.js [--out dir] [--family-id uuid] [--zip]
Requires DATABASE_URL.`);
      process.exit(0);
    }
  }
  return opts;
}

async function exportFamilyToDir(query, familyId, familyDir) {
  fs.mkdirSync(familyDir, { recursive: true });
  const { manifest, files } = await buildFamilyExportBundle(query, familyId);
  for (const [file, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(familyDir, file), JSON.stringify(data, null, 2));
  }
  fs.writeFileSync(path.join(familyDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function zipDirectory(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const query = (sql, params) => pool.query(sql, params);

  try {
    const families = await listFamiliesForExport(query, opts.familyId);
    fs.mkdirSync(opts.out, { recursive: true });
    const familiesRoot = path.join(opts.out, 'families');
    fs.mkdirSync(familiesRoot, { recursive: true });

    console.log(`Exporting ${families.length} familie(s) to ${opts.out}`);
    const index = {
      exported_at: new Date().toISOString(),
      family_count: families.length,
      format_version: 1,
      families: [],
    };

    for (let i = 0; i < families.length; i++) {
      const f = families[i];
      process.stdout.write(`[${i + 1}/${families.length}] ${f.name || f.id} ... `);
      const manifest = await exportFamilyToDir(query, f.id, path.join(familiesRoot, f.id));
      index.families.push({
        id: f.id,
        name: f.name,
        table_row_counts: Object.fromEntries(
          Object.entries(manifest.tables).map(([k, v]) => [k, v.row_count])
        ),
      });
      console.log('ok');
    }

    fs.writeFileSync(path.join(opts.out, 'index.json'), JSON.stringify(index, null, 2));
    if (opts.zip) {
      const zipPath = `${opts.out}.zip`;
      const bytes = await zipDirectory(opts.out, zipPath);
      console.log(`ZIP: ${zipPath} (${bytes} bytes)`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
