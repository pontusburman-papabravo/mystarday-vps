#!/usr/bin/env node
/**
 * Import families from migration-harvest-cli output (harvest.json) into Postgres.
 *
 * Usage:
 *   npm run migrate
 *   DATABASE_URL=postgres://... HARVEST_IMPORT_PASSWORD='TempPass123!' \\
 *     npm run import:harvest -- --in ./export/harvest-2026-06-02
 *
 * Prerequisites:
 *   - Target schema: npm run migrate
 *   - harvest.json per family under families/<uuid>/
 *
 * Limitations (see docs/MIGRATION_IMPORT.md):
 *   - All parents get HARVEST_IMPORT_PASSWORD (must reset after import)
 *   - Child PINs not in harvest — set again in app
 *   - daily_log_item / completions not in harvest API
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { buildHarvestImportBundles } = require('../src/lib/harvest-import');
const { countHistoryInHarvest, remapDailyLogItemRows } = require('../src/lib/harvest-history');
const { getOrGenerateDailyLog, getLocalDateStr } = require('../src/lib/daily-log-generator');

const IMPORT_TABLE_ORDER = [
  'family',
  'parent',
  'child',
  'category',
  'activity_template',
  'activity_sub_step',
  'parent_child',
  'weekly_schedule',
  'weekly_schedule_item',
  'special_day_schedule',
  'special_day_schedule_item',
  'reward',
  'child_reward_goal',
  'daily_log',
  'daily_log_item',
  'manual_star_grant',
  'reward_redemption',
  'streak',
  'child_observation',
  'general_observations',
  'family_subscriptions',
  'notification_preference',
  'system_messages',
];

async function deleteFamilyChildSchedules(client, familyId) {
  await client.query(
    `DELETE FROM weekly_schedule_item
     WHERE weekly_schedule_id IN (
       SELECT ws.id FROM weekly_schedule ws
       JOIN child c ON c.id = ws.child_id
       WHERE c.family_id = $1
     )`,
    [familyId]
  );
  const { rowCount } = await client.query(
    `DELETE FROM weekly_schedule
     WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
  return rowCount;
}

async function deleteFamilyRedemptions(client, familyId) {
  const { rowCount } = await client.query(
    `DELETE FROM reward_redemption
     WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)
        OR reward_id IN (SELECT id FROM reward WHERE family_id = $1)`,
    [familyId]
  );
  return rowCount;
}

function parseArgs(argv) {
  const opts = {
    inDir: null,
    familyId: null,
    dryRun: false,
    replaceSchedules: false,
    replaceRedemptions: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--replace-schedules') opts.replaceSchedules = true;
    else if (argv[i] === '--replace-redemptions') opts.replaceRedemptions = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Import api-harvest-v1 bundles into Postgres.

Options:
  --in <dir>         Harvest output (contains families/<uuid>/harvest.json)
  --family-id <id>   Import one family only
  --dry-run          Print row counts, no writes
  --replace-schedules    Delete child weekly_schedule(+items) before import
  --replace-redemptions  Delete reward_redemption for family before import

Env:
  DATABASE_URL              Target database (required)
  HARVEST_IMPORT_PASSWORD   Temp password for all imported parents
`);
      process.exit(0);
    }
  }
  if (!opts.inDir) {
    console.error('ERROR: --in <harvest-dir> is required');
    process.exit(1);
  }
  return opts;
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

function buildOnConflictClause(table, conflictCols, upsert) {
  const conflictList = conflictCols.map(quoteIdent).join(', ');
  if (!conflictCols.length) return 'ON CONFLICT DO NOTHING';
  if (!upsert) return `ON CONFLICT (${conflictList}) DO NOTHING`;

  if (table === 'streak') {
    return `ON CONFLICT (${conflictList}) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      cycle_day = EXCLUDED.cycle_day,
      last_active_date = EXCLUDED.last_active_date`;
  }

  return `ON CONFLICT (${conflictList}) DO NOTHING`;
}

async function insertRows(client, table, rows, conflictCols, dryRun, upsert = false) {
  if (!rows.length) return { inserted: 0, skipped: 0, upserted: 0 };

  const columns = Object.keys(rows[0]);
  const colList = columns.map(quoteIdent).join(', ');
  const onConflict = buildOnConflictClause(table, conflictCols, upsert);

  let inserted = 0;
  let skipped = 0;
  let upserted = 0;

  for (const row of rows) {
    const values = columns.map((c) => row[c] ?? null);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders}) ${onConflict}`;

    if (dryRun) {
      if (upsert) upserted++;
      else inserted++;
      continue;
    }

    try {
      const result = await client.query(sql, values);
      if (result.rowCount > 0) {
        if (upsert) upserted++;
        else inserted++;
      } else skipped++;
    } catch (err) {
      if (err.code === '42P01') return { inserted: 0, skipped: rows.length, tableMissing: true };
      throw new Error(`${table} insert failed: ${err.message}`);
    }
  }

  return { inserted, skipped, upserted };
}

async function syncTodayDailyLogs(pool, childRows) {
  const lines = [];
  for (const child of childRows) {
    const tzRes = await pool.query('SELECT timezone FROM child WHERE id = $1', [child.id]);
    const tz = tzRes.rows[0]?.timezone || 'Europe/Stockholm';
    const today = getLocalDateStr(new Date(), tz);
    try {
      const { items } = await getOrGenerateDailyLog(child.id, today);
      lines.push(`daily_log ${child.name || child.id} (${today}): ${items.length} aktivitet(er) idag`);
    } catch (err) {
      lines.push(`daily_log sync misslyckades för ${child.name || child.id}: ${err.message}`);
    }
  }
  return lines;
}

async function importHarvestFile(pool, harvestPath, opts) {
  const raw = fs.readFileSync(harvestPath, 'utf8');
  const harvest = JSON.parse(raw);

  if (harvest.format !== 'api-harvest-v1') {
    throw new Error(`Okänt format i ${harvestPath} (förväntar api-harvest-v1)`);
  }

  const historyStats = countHistoryInHarvest(harvest.api);
  const preWarnings = [];
  if (historyStats.hasDetails && historyStats.items === 0 && historyStats.errors > 0) {
    preWarnings.push(`daily_log_details: ${historyStats.errors} dag(ar) med API-fel i harvest.json`);
  } else if (!historyStats.hasDetails && harvest.api?.daily_logs) {
    preWarnings.push('Ingen daily_log_details i harvest.json — kör npm run harvest:history först');
  } else if (historyStats.items > 0) {
    preWarnings.push(`daily_log_details: ${historyStats.items} aktivitetsrader i harvest.json`);
  }

  const { bundles, warnings, meta } = await buildHarvestImportBundles(harvest, {
    defaultPassword: process.env.HARVEST_IMPORT_PASSWORD,
  });
  warnings.unshift(...preWarnings);

  const bundleByTable = new Map(bundles.map((b) => [b.table, b]));
  const client = await pool.connect();
  const summary = {};

  try {
    if (!opts.dryRun) await client.query('BEGIN');

    if (opts.replaceSchedules && !opts.dryRun) {
      const deleted = await deleteFamilyChildSchedules(client, meta.familyId);
      warnings.unshift(`replace-schedules: raderade ${deleted} weekly_schedule för barn i familjen`);
    }

    if (opts.replaceRedemptions && !opts.dryRun) {
      const deleted = await deleteFamilyRedemptions(client, meta.familyId);
      warnings.unshift(`replace-redemptions: raderade ${deleted} reward_redemption för familjen`);
    }

    for (const table of IMPORT_TABLE_ORDER) {
      const bundle = bundleByTable.get(table);
      if (!bundle || !bundle.rows.length) {
        summary[table] = { rows: 0, inserted: 0, conflicts_skipped: 0 };
        continue;
      }

      let rows = bundle.rows;
      if (table === 'daily_log_item' && !opts.dryRun) {
        const remapped = await remapDailyLogItemRows(client, rows);
        rows = remapped.rows;
        if (remapped.skipped > 0) {
          warnings.push(`daily_log_item: ${remapped.skipped} rad(er) hoppades över (saknar daily_log i DB)`);
        }
        if (!rows.length) {
          summary[table] = { rows: bundle.rows.length, inserted: 0, conflicts_skipped: 0, skipped_no_log: remapped.skipped };
          continue;
        }
      }

      const result = await insertRows(client, table, rows, bundle.conflict, opts.dryRun, bundle.upsert);
      if (result.tableMissing) {
        throw new Error(
          `Table "${table}" does not exist — run "npm run migrate" (baseline schema) before import:harvest`
        );
      }
      summary[table] = {
        rows: bundle.rows.length,
        inserted: result.inserted,
        upserted: result.upserted || 0,
        conflicts_skipped: result.skipped,
      };
    }

    if (!opts.dryRun) await client.query('COMMIT');

    const childBundle = bundleByTable.get('child');
    let syncWarnings = [];
    if (!opts.dryRun && childBundle?.rows?.length) {
      const scheduleBundle = bundleByTable.get('weekly_schedule_item');
      const hadScheduleWork =
        opts.replaceSchedules || (scheduleBundle?.rows?.length && summary.weekly_schedule_item?.inserted > 0);
      if (hadScheduleWork) {
        syncWarnings = await syncTodayDailyLogs(pool, childBundle.rows);
      }
    }

    return {
      familyId: meta.familyId,
      familyName: meta.familyName,
      summary,
      warnings: [...syncWarnings, ...warnings],
      tempPassword: meta.passwordPlain,
    };
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
    console.error('ERROR: DATABASE_URL is required (target database)');
    process.exit(1);
  }

  const familiesRoot = path.join(opts.inDir, 'families');
  if (!fs.existsSync(familiesRoot)) {
    console.error(`ERROR: ${familiesRoot} not found`);
    process.exit(1);
  }

  let familyDirs = fs
    .readdirSync(familiesRoot)
    .filter((name) => fs.statSync(path.join(familiesRoot, name)).isDirectory())
    .map((name) => path.join(familiesRoot, name));

  if (opts.familyId) {
    familyDirs = familyDirs.filter((d) => path.basename(d) === opts.familyId);
    if (!familyDirs.length) {
      console.error('Familjen hittades inte i harvest-mappen');
      process.exit(1);
    }
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  console.log(
    `${opts.dryRun ? 'Dry-run' : 'Importerar'} ${familyDirs.length} familj(er) från harvest → Postgres\n`
  );

  let ok = 0;
  let fail = 0;

  try {
    for (const dir of familyDirs) {
      const harvestPath = path.join(dir, 'harvest.json');
      if (!fs.existsSync(harvestPath)) {
        console.log(`[skip] ${path.basename(dir)} — saknar harvest.json`);
        continue;
      }

      const label = path.basename(dir);
      process.stdout.write(`[import] ${label} ... `);

      try {
        const result = await importHarvestFile(pool, harvestPath, opts);
        console.log('ok');
        ok++;
        for (const [table, stat] of Object.entries(result.summary)) {
          if (stat.rows > 0 || table === 'daily_log_item' || table === 'manual_star_grant') {
            const upsertNote = stat.upserted ? ` (${stat.upserted} upserted)` : '';
            console.log(`    ${table}: ${stat.inserted}/${stat.rows} inserts${upsertNote}`);
          }
        }
        for (const w of result.warnings) {
          console.log(`    ⚠ ${w}`);
        }
        if (!opts.dryRun && result.tempPassword) {
          console.log(`    temp password for parents: (see HARVEST_IMPORT_PASSWORD env)`);
        }
      } catch (err) {
        console.log('FEL:', err.message);
        fail++;
      }
    }

    console.log(`\nKlar. OK: ${ok}  Fel: ${fail}`);
    if (fail > 0) process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
