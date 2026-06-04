#!/usr/bin/env node
/**
 * Import completion/star history from gdpr-export.zip into daily_log_item.
 *
 * Requires prior import:harvest (daily_log rows + children + activities).
 *
 * Usage:
 *   npm run import:gdpr-history -- \
 *     --zip ./Backup/stjarndag-harvest-2026-06-02/families/<uuid>/gdpr-export.zip
 *
 *   npm run import:gdpr-history -- \
 *     --in ./Backup/stjarndag-harvest-2026-06-02 --family-id <uuid>
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');
const { buildGdprHistoryBundles } = require('../src/lib/gdpr-history-import');

function parseArgs(argv) {
  const opts = { zip: null, inDir: null, familyId: null, dryRun: false, replace: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--zip' && argv[i + 1]) opts.zip = path.resolve(argv[++i]);
    else if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--replace') opts.replace = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Import star/completion history from GDPR export ZIP.

Options:
  --zip <path>         Path to gdpr-export.zip
  --in <dir> --family-id <uuid>   Resolve zip under families/<uuid>/
  --replace            Delete existing daily_log_item rows for imported logs first
  --dry-run            Count rows only

Env:
  DATABASE_URL         Target database (required)
`);
      process.exit(0);
    }
  }
  if (!opts.zip && opts.inDir && opts.familyId) {
    opts.zip = path.join(opts.inDir, 'families', opts.familyId, 'gdpr-export.zip');
  }
  if (!opts.zip) {
    console.error('ERROR: --zip or (--in + --family-id) required');
    process.exit(1);
  }
  return opts;
}

function readZipEntry(zipPath, entryName) {
  try {
    return execFileSync('unzip', ['-p', zipPath, entryName], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
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

async function loadFamilyContext(client, familyId) {
  const { rows: parents } = await client.query(
    `SELECT id, family_role FROM parent WHERE family_id = $1 ORDER BY CASE family_role WHEN 'primary' THEN 0 ELSE 1 END`,
    [familyId]
  );
  const primaryParentId = parents[0]?.id || null;

  const { rows: children } = await client.query(
    `SELECT id, name FROM child WHERE family_id = $1`,
    [familyId]
  );
  const childByName = new Map(children.map((c) => [c.name.toLowerCase(), c.id]));

  const { rows: activities } = await client.query(
    `SELECT id, name, icon FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  const activityByName = new Map(activities.map((a) => [a.name.toLowerCase(), a.id]));
  const activityIconByName = new Map(activities.map((a) => [a.name.toLowerCase(), a.icon || '⭐']));

  const childIds = children.map((c) => c.id);
  const { rows: logs } = await client.query(
    `SELECT id, child_id, date::text AS date FROM daily_log WHERE child_id = ANY($1::uuid[])`,
    [childIds]
  );
  const logByChildDate = new Map(logs.map((l) => [`${l.child_id}:${l.date}`, l.id]));

  return { primaryParentId, childByName, activityByName, activityIconByName, logByChildDate, childIds };
}

async function ensureDailyLogs(client, childByName, existingLogs, activitiesCsv, dryRun) {
  const { parseCsv } = require('../src/lib/gdpr-history-import');
  const rows = parseCsv(activitiesCsv);
  const needed = new Set();
  for (const row of rows) {
    const childId = childByName.get(row.barn?.trim().toLowerCase());
    const date = String(row.datum || '').slice(0, 10);
    if (childId && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      needed.add(`${childId}:${date}`);
    }
  }

  let created = 0;
  for (const key of needed) {
    if (existingLogs.has(key)) continue;
    const [childId, date] = key.split(':');
    if (dryRun) {
      existingLogs.set(key, 'dry-run-log-id');
      created++;
      continue;
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO daily_log (id, child_id, date, is_paused) VALUES ($1, $2, $3, false)
       ON CONFLICT (child_id, date) DO NOTHING`,
      [id, childId, date]
    );
    const { rows } = await client.query(
      `SELECT id FROM daily_log WHERE child_id = $1 AND date = $2`,
      [childId, date]
    );
    if (rows[0]) {
      existingLogs.set(key, rows[0].id);
      created++;
    }
  }
  return created;
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  if (!fs.existsSync(opts.zip)) {
    console.error(`ERROR: ZIP not found: ${opts.zip}`);
    console.error('  Kör migration:harvest (med GDPR) mot prod, eller migration:harvest:gdpr');
    process.exit(1);
  }

  const activitiesCsv = readZipEntry(opts.zip, '07_aktiviteter.csv');
  const manualCsv = readZipEntry(opts.zip, '09_manuella_stjarnor.csv');
  if (!activitiesCsv) {
    console.error('ERROR: 07_aktiviteter.csv saknas i ZIP');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    let familyId = opts.familyId;
    if (!familyId) {
      const prof = readZipEntry(opts.zip, '01_profil.csv');
      if (prof) {
        const { parseCsv } = require('../src/lib/gdpr-history-import');
        const rows = parseCsv(prof);
        const email = rows[0]?.e_post?.trim().toLowerCase();
        if (email) {
          const { rows: pRows } = await client.query(
            `SELECT family_id FROM parent WHERE LOWER(email) = $1 LIMIT 1`,
            [email]
          );
          familyId = pRows[0]?.family_id;
        }
      }
    }
    if (!familyId) {
      throw new Error('Kunde inte hitta family_id — ange --family-id');
    }

    const ctx = await loadFamilyContext(client, familyId);
    const logsCreated = await ensureDailyLogs(
      client,
      ctx.childByName,
      ctx.logByChildDate,
      activitiesCsv,
      opts.dryRun
    );

    const { bundles, warnings, meta } = buildGdprHistoryBundles(
      {
        childByName: ctx.childByName,
        activityByName: ctx.activityByName,
        activityIconByName: ctx.activityIconByName,
        logByChildDate: ctx.logByChildDate,
        primaryParentId: ctx.primaryParentId,
      },
      { activities: activitiesCsv, manualStars: manualCsv || '' }
    );

    if (!opts.dryRun) await client.query('BEGIN');

    if (opts.replace && meta.items > 0) {
      const logIds = [...new Set(bundles.find((b) => b.table === 'daily_log_item').rows.map((r) => r.daily_log_id))];
      if (!opts.dryRun && logIds.length) {
        await client.query(`DELETE FROM daily_log_item WHERE daily_log_id = ANY($1::uuid[])`, [logIds]);
      }
      console.log(`replace: ${logIds.length} daily_log(s) cleared`);
    }

    const summary = {};
    for (const bundle of bundles) {
      if (!bundle.rows.length) {
        summary[bundle.table] = { rows: 0, inserted: 0 };
        continue;
      }
      const result = await insertRows(client, bundle.table, bundle.rows, bundle.conflict, opts.dryRun);
      summary[bundle.table] = { rows: bundle.rows.length, inserted: result.inserted, skipped: result.skipped };
    }

    if (!opts.dryRun) await client.query('COMMIT');

    console.log(`${opts.dryRun ? 'Dry-run' : 'Importerade'} historik från ${opts.zip}\n`);
    if (logsCreated) console.log(`  daily_log skapade: ${logsCreated}`);
    for (const [table, stat] of Object.entries(summary)) {
      if (stat.rows > 0) {
        console.log(`  ${table}: ${stat.inserted}/${stat.rows} inserts`);
      }
    }
    console.log(`\nTotalt: ${meta.items} aktivitetsrader, ${meta.manualStars} manuella stjärnor`);
    for (const w of warnings.slice(0, 10)) console.log(`  ⚠ ${w}`);
    if (warnings.length > 10) console.log(`  ⚠ ... och ${warnings.length - 10} till`);
  } catch (err) {
    if (!opts.dryRun) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Import GDPR history failed:', err.message);
  process.exit(1);
});
