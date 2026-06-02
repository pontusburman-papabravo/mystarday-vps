#!/usr/bin/env node
/**
 * Full family data export for platform migration.
 *
 * Unlike GET /api/account/export-data (GDPR CSV), this script:
 * - Exports ALL families (no 24h rate limit)
 * - Preserves UUIDs and full row data (JSON per table)
 * - Includes tables missing from the GDPR ZIP
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/export-family-data.js
 *   DATABASE_URL=... node scripts/export-family-data.js --family-id <uuid>
 *   DATABASE_URL=... node scripts/export-family-data.js --out ./my-export --zip
 *
 * Output:
 *   <out>/index.json
 *   <out>/families/<family_id>/<table>.json
 *
 * Does NOT download R2 images (avatar_url / image_url are exported as URLs only).
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const archiver = require('archiver');

const CHILD_IDS = '(SELECT id FROM child WHERE family_id = $1)';
const PARENT_IDS = '(SELECT id FROM parent WHERE family_id = $1)';
const ACTIVITY_IDS = '(SELECT id FROM activity_template WHERE family_id = $1)';
const WEEKLY_SCHEDULE_IDS = `(
  SELECT ws.id FROM weekly_schedule ws
  WHERE ws.family_id = $1 OR ws.child_id IN ${CHILD_IDS}
)`;

/** @type {{ file: string, sql: string, optional?: boolean }[]} */
const FAMILY_EXPORT_TABLES = [
  { file: 'family.json', sql: 'SELECT * FROM family WHERE id = $1' },
  { file: 'parent.json', sql: `SELECT * FROM parent WHERE family_id = $1` },
  { file: 'parent_child.json', sql: `
    SELECT * FROM parent_child
    WHERE parent_id IN ${PARENT_IDS} OR child_id IN ${CHILD_IDS}` },
  { file: 'child.json', sql: `SELECT * FROM child WHERE family_id = $1` },
  { file: 'category.json', sql: `SELECT * FROM category WHERE family_id = $1` },
  { file: 'activity_template.json', sql: `SELECT * FROM activity_template WHERE family_id = $1` },
  { file: 'activity_sub_step.json', sql: `
    SELECT ass.* FROM activity_sub_step ass
    WHERE ass.activity_template_id IN ${ACTIVITY_IDS}` },
  { file: 'weekly_schedule.json', sql: `
    SELECT * FROM weekly_schedule
    WHERE family_id = $1 OR child_id IN ${CHILD_IDS}` },
  { file: 'weekly_schedule_item.json', sql: `
    SELECT wsi.* FROM weekly_schedule_item wsi
    WHERE wsi.weekly_schedule_id IN ${WEEKLY_SCHEDULE_IDS}` },
  { file: 'special_day_schedule.json', sql: `
    SELECT * FROM special_day_schedule WHERE child_id IN ${CHILD_IDS}` },
  { file: 'special_day_schedule_item.json', sql: `
    SELECT sdsi.* FROM special_day_schedule_item sdsi
    JOIN special_day_schedule sds ON sds.id = sdsi.special_day_schedule_id
    WHERE sds.child_id IN ${CHILD_IDS}` },
  { file: 'schedule_date_exclusion.json', sql: `
    SELECT * FROM schedule_date_exclusion WHERE child_id IN ${CHILD_IDS}` },
  { file: 'reward.json', sql: `SELECT * FROM reward WHERE family_id = $1` },
  { file: 'child_reward_goal.json', sql: `
    SELECT * FROM child_reward_goal WHERE child_id IN ${CHILD_IDS}` },
  { file: 'child_reward_goal_change_request.json', sql: `
    SELECT * FROM child_reward_goal_change_request WHERE child_id IN ${CHILD_IDS}` },
  { file: 'daily_log.json', sql: `SELECT * FROM daily_log WHERE child_id IN ${CHILD_IDS}` },
  { file: 'daily_log_item.json', sql: `
    SELECT dli.* FROM daily_log_item dli
    JOIN daily_log dl ON dl.id = dli.daily_log_id
    WHERE dl.child_id IN ${CHILD_IDS}` },
  { file: 'rating.json', sql: `
    SELECT r.* FROM rating r
    JOIN daily_log_item dli ON dli.id = r.daily_log_item_id
    JOIN daily_log dl ON dl.id = dli.daily_log_id
    WHERE dl.child_id IN ${CHILD_IDS}` },
  { file: 'reward_redemption.json', sql: `
    SELECT * FROM reward_redemption
    WHERE child_id IN ${CHILD_IDS}
       OR reward_id IN (SELECT id FROM reward WHERE family_id = $1)` },
  { file: 'manual_star_grant.json', sql: `
    SELECT * FROM manual_star_grant WHERE child_id IN ${CHILD_IDS}` },
  { file: 'streak.json', sql: `SELECT * FROM streak WHERE child_id IN ${CHILD_IDS}` },
  { file: 'parent_note.json', sql: `SELECT * FROM parent_note WHERE child_id IN ${CHILD_IDS}`, optional: true },
  { file: 'pedagog_notes.json', sql: `SELECT * FROM pedagog_notes WHERE child_id IN ${CHILD_IDS}`, optional: true },
  { file: 'child_observation.json', sql: `
    SELECT * FROM child_observation WHERE child_id IN ${CHILD_IDS}`, optional: true },
  { file: 'general_observations.json', sql: `
    SELECT * FROM general_observations WHERE family_id = $1`, optional: true },
  { file: 'family_subscriptions.json', sql: `
    SELECT * FROM family_subscriptions WHERE family_id = $1`, optional: true },
  { file: 'family_features.json', sql: `
    SELECT * FROM family_features WHERE family_id = $1`, optional: true },
  { file: 'family_invite.json', sql: `SELECT * FROM family_invite WHERE family_id = $1` },
  { file: 'pedagog_invite.json', sql: `SELECT * FROM pedagog_invite WHERE family_id = $1`, optional: true },
  { file: 'professional_share_link.json', sql: `
    SELECT * FROM professional_share_link WHERE family_id = $1`, optional: true },
  { file: 'system_messages.json', sql: `
    SELECT * FROM system_messages WHERE family_id = $1` },
  { file: 'notification_preference.json', sql: `
    SELECT * FROM notification_preference WHERE parent_id IN ${PARENT_IDS}`, optional: true },
  { file: 'email_subscriptions.json', sql: `
    SELECT * FROM email_subscriptions WHERE parent_id IN ${PARENT_IDS}`, optional: true },
];

function parseArgs(argv) {
  const opts = {
    out: path.join(process.cwd(), 'export', `stjarndag-${new Date().toISOString().slice(0, 10)}`),
    familyId: null,
    zip: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      opts.out = path.resolve(argv[++i]);
    } else if (argv[i] === '--family-id' && argv[i + 1]) {
      opts.familyId = argv[++i];
    } else if (argv[i] === '--zip') {
      opts.zip = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Usage: node scripts/export-family-data.js [options]

Options:
  --out <dir>       Output directory (default: ./export/stjarndag-YYYY-MM-DD)
  --family-id <id>  Export a single family only
  --zip             Also create a .zip of the export directory
  --help            Show this help

Requires DATABASE_URL in the environment.
`);
      process.exit(0);
    }
  }
  return opts;
}

function serializeValue(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (Buffer.isBuffer(v)) return v.toString('base64');
  if (typeof v === 'object') return v;
  return v;
}

function serializeRows(rows) {
  return rows.map((row) => {
    const out = {};
    for (const [key, val] of Object.entries(row)) {
      out[key] = serializeValue(val);
    }
    return out;
  });
}

async function queryTable(pool, sql, familyId, optional) {
  try {
    const result = await pool.query(sql, [familyId]);
    return { rows: result.rows, skipped: false, error: null };
  } catch (err) {
    if (optional && err.code === '42P01') {
      return { rows: [], skipped: true, error: 'table_missing' };
    }
    throw err;
  }
}

async function exportFamily(pool, familyId, familyDir) {
  fs.mkdirSync(familyDir, { recursive: true });
  const manifest = { family_id: familyId, exported_at: new Date().toISOString(), tables: {} };

  for (const { file, sql, optional } of FAMILY_EXPORT_TABLES) {
    const { rows, skipped, error } = await queryTable(pool, sql, familyId, optional);
    const data = serializeRows(rows);
    fs.writeFileSync(path.join(familyDir, file), JSON.stringify(data, null, 2));
    manifest.tables[file.replace('.json', '')] = {
      row_count: data.length,
      ...(skipped ? { skipped: true, reason: error } : {}),
    };
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

  try {
    let families;
    if (opts.familyId) {
      const check = await pool.query('SELECT id, name FROM family WHERE id = $1', [opts.familyId]);
      if (check.rows.length === 0) {
        console.error(`Family not found: ${opts.familyId}`);
        process.exit(1);
      }
      families = check.rows;
    } else {
      const result = await pool.query(
        `SELECT id, name FROM family ORDER BY created_at ASC NULLS LAST, id ASC`
      );
      families = result.rows;
    }

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
      const label = f.name || f.id;
      process.stdout.write(`[${i + 1}/${families.length}] ${label} ... `);
      const manifest = await exportFamily(pool, f.id, path.join(familiesRoot, f.id));
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
    console.log(`Done. Index: ${path.join(opts.out, 'index.json')}`);

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
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
