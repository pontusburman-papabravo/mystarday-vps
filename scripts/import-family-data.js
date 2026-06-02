#!/usr/bin/env node
/**
 * Import families from export-family-data.js output into a target Postgres database.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/import-family-data.js --in ./export/stjarndag-2026-06-02
 *   DATABASE_URL=... node scripts/import-family-data.js --in ./export/... --family-id <uuid> --dry-run
 *
 * Prerequisites on target DB:
 *   - Schema up to date: npm run migrate
 *   - Empty DB or non-overlapping family UUIDs (uses ON CONFLICT DO NOTHING by default)
 *
 * Does NOT import R2 image files.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

/** Import order respects foreign keys (matches export-family-data.js). */
const IMPORT_ORDER = [
  { file: 'family.json', table: 'family', conflict: ['id'] },
  { file: 'parent.json', table: 'parent', conflict: ['id'] },
  { file: 'child.json', table: 'child', conflict: ['id'] },
  { file: 'category.json', table: 'category', conflict: ['id'] },
  { file: 'activity_template.json', table: 'activity_template', conflict: ['id'] },
  { file: 'activity_sub_step.json', table: 'activity_sub_step', conflict: ['id'] },
  { file: 'parent_child.json', table: 'parent_child', conflict: ['parent_id', 'child_id'] },
  { file: 'weekly_schedule.json', table: 'weekly_schedule', conflict: ['id'] },
  { file: 'weekly_schedule_item.json', table: 'weekly_schedule_item', conflict: ['id'] },
  { file: 'special_day_schedule.json', table: 'special_day_schedule', conflict: ['id'] },
  { file: 'special_day_schedule_item.json', table: 'special_day_schedule_item', conflict: ['id'] },
  { file: 'schedule_date_exclusion.json', table: 'schedule_date_exclusion', conflict: ['child_id', 'date', 'activity_template_id'] },
  { file: 'reward.json', table: 'reward', conflict: ['id'] },
  { file: 'child_reward_goal.json', table: 'child_reward_goal', conflict: ['id'] },
  { file: 'child_reward_goal_change_request.json', table: 'child_reward_goal_change_request', conflict: ['id'] },
  { file: 'daily_log.json', table: 'daily_log', conflict: ['id'] },
  { file: 'daily_log_item.json', table: 'daily_log_item', conflict: ['id'] },
  { file: 'rating.json', table: 'rating', conflict: ['id'] },
  { file: 'reward_redemption.json', table: 'reward_redemption', conflict: ['id'] },
  { file: 'manual_star_grant.json', table: 'manual_star_grant', conflict: ['id'] },
  { file: 'streak.json', table: 'streak', conflict: ['id'] },
  { file: 'parent_note.json', table: 'parent_note', conflict: ['id'], optional: true },
  { file: 'pedagog_notes.json', table: 'pedagog_notes', conflict: ['id'], optional: true },
  { file: 'child_observation.json', table: 'child_observation', conflict: ['id'], optional: true },
  { file: 'general_observations.json', table: 'general_observations', conflict: ['id'], optional: true },
  { file: 'family_subscriptions.json', table: 'family_subscriptions', conflict: ['family_id'], optional: true },
  { file: 'family_features.json', table: 'family_features', conflict: ['family_id', 'feature_slug'], optional: true },
  { file: 'family_invite.json', table: 'family_invite', conflict: ['id'] },
  { file: 'pedagog_invite.json', table: 'pedagog_invite', conflict: ['id'], optional: true },
  { file: 'professional_share_link.json', table: 'professional_share_link', conflict: ['id'], optional: true },
  { file: 'system_messages.json', table: 'system_messages', conflict: ['id'] },
  { file: 'notification_preference.json', table: 'notification_preference', conflict: ['parent_id'], optional: true },
  { file: 'email_subscriptions.json', table: 'email_subscriptions', conflict: ['id'], optional: true },
];

const ALLOWED_TABLES = new Set(IMPORT_ORDER.map((t) => t.table));

function parseArgs(argv) {
  const opts = { inDir: null, familyId: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Usage: node scripts/import-family-data.js --in <export-dir> [options]

Options:
  --in <dir>        Directory from export-family-data.js (contains families/)
  --family-id <id>  Import one family only
  --dry-run         Validate files and print counts without writing
  --help            Show help

Requires DATABASE_URL (target database).
`);
      process.exit(0);
    }
  }
  if (!opts.inDir) {
    console.error('ERROR: --in <export-dir> is required');
    process.exit(1);
  }
  return opts;
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

function readJsonFile(filePath, optional) {
  if (!fs.existsSync(filePath)) {
    if (optional) return [];
    throw new Error(`Missing file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`Expected array in ${filePath}`);
  return data;
}

async function insertRows(client, table, rows, conflictCols, dryRun) {
  if (!rows.length) return { inserted: 0, skipped: 0 };

  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`);

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

    try {
      const result = await client.query(sql, values);
      if (result.rowCount > 0) inserted++;
      else skipped++;
    } catch (err) {
      if (err.code === '42P01') return { inserted: 0, skipped: rows.length, tableMissing: true };
      throw new Error(`${table} insert failed: ${err.message}`);
    }
  }

  return { inserted, skipped };
}

async function importFamily(pool, familyDir, opts) {
  const familyId = path.basename(familyDir);
  const client = await pool.connect();

  try {
    if (!opts.dryRun) await client.query('BEGIN');

    const summary = {};

    for (const { file, table, conflict, optional } of IMPORT_ORDER) {
      const filePath = path.join(familyDir, file);
      let rows;
      try {
        rows = readJsonFile(filePath, optional);
      } catch (err) {
        if (optional) {
          summary[table] = { skipped_file: true };
          continue;
        }
        throw err;
      }

      const result = await insertRows(client, table, rows, conflict, opts.dryRun);
      if (result.tableMissing) {
        summary[table] = { table_missing: true };
        continue;
      }
      summary[table] = {
        rows: rows.length,
        inserted: result.inserted,
        conflicts_skipped: result.skipped,
      };
    }

    if (!opts.dryRun) await client.query('COMMIT');
    return { familyId, summary };
  } catch (err) {
    if (!opts.dryRun) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const familiesRoot = path.join(opts.inDir, 'families');
  if (!fs.existsSync(familiesRoot)) {
    console.error(`ERROR: ${familiesRoot} not found — use export output directory`);
    process.exit(1);
  }

  let familyIds = fs.readdirSync(familiesRoot).filter((name) => {
    const p = path.join(familiesRoot, name);
    return fs.statSync(p).isDirectory();
  });

  if (opts.familyId) {
    if (!familyIds.includes(opts.familyId)) {
      console.error(`Family directory not found: ${opts.familyId}`);
      process.exit(1);
    }
    familyIds = [opts.familyId];
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  console.log(`${opts.dryRun ? '[dry-run] ' : ''}Importing ${familyIds.length} familie(s) from ${opts.inDir}`);

  try {
    for (let i = 0; i < familyIds.length; i++) {
      const id = familyIds[i];
      process.stdout.write(`[${i + 1}/${familyIds.length}] ${id} ... `);
      const result = await importFamily(pool, path.join(familiesRoot, id), opts);
      const totalRows = Object.values(result.summary).reduce((n, s) => n + (s.rows || 0), 0);
      console.log(opts.dryRun ? `${totalRows} rows (dry-run)` : 'ok');
    }
    console.log('Done.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
