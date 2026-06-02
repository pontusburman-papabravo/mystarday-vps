/**
 * Full public-schema PostgreSQL export as SQL (schema + data).
 * Used by GET /api/admin/export/sql and scripts/export-full-database-sql.js.
 */

const { spawn } = require('child_process');
const { prepareRowForExport, rowsToInsertSql, quoteIdent } = require('./sql-export-utils');

/** Preferred insert order (FK-friendly); unknown tables are appended alphabetically. */
const TABLE_EXPORT_ORDER = [
  'features',
  'feature_flag',
  'subscription_addons',
  'default_activity_template',
  'default_reward',
  'default_schedule',
  'default_schedule_item',
  'welcome_email_template',
  'email_templates',
  'app_settings',
  'app_config',
  'landing_news',
  'dagens_nyhet',
  'newsletters',
  'surveys',
  'survey_questions',
  'survey_options',
  'waitlist',
  'professional_interest',
  'contact_message',
  'library_update_log',
  'admin_uploaded_images',
  'pgmigrations',
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
  'schedule_date_exclusion',
  'reward',
  'child_reward_goal',
  'child_reward_goal_change_request',
  'daily_log',
  'daily_log_item',
  'daily_log_item_sub_step',
  'rating',
  'reward_redemption',
  'manual_star_grant',
  'streak',
  'parent_note',
  'pedagog_notes',
  'child_observation',
  'general_observations',
  'family_subscriptions',
  'family_features',
  'family_invite',
  'pedagog_invite',
  'professional_share_link',
  'system_messages',
  'notification_preference',
  'notification_log',
  'push_subscriptions',
  'email_subscriptions',
  'refresh_token',
  'email_verification',
  'password_reset',
  'email_change_token',
  'login_attempt',
  'login_event',
  'pin_lockout',
  'pin_notification_log',
  'pin_audit_log',
  'user_consent',
  'admin_audit_log',
  'deletion_job',
  'reminder_settings',
  'analytics_events',
  'analytics_daily_snapshots',
  'win_back_email_log',
  'survey_responses',
  'survey_response_answers',
  'survey_participants',
  'survey_popup_interactions',
  'survey_contest_entries',
];

const BATCH_SIZE = 400;

function isDatabaseExportEnabled() {
  return process.env.MIGRATION_EXPORT_ENABLED === 'true';
}

function sortTablesForExport(tableNames) {
  const remaining = new Set(tableNames);
  const ordered = [];
  for (const name of TABLE_EXPORT_ORDER) {
    if (remaining.has(name)) {
      ordered.push(name);
      remaining.delete(name);
    }
  }
  ordered.push(...[...remaining].sort());
  return ordered;
}

async function listPublicTables(client) {
  const result = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return result.rows.map((r) => r.table_name);
}

async function getPrimaryKeyColumns(client, tableName) {
  const result = await client.query(
    `SELECT a.attname AS column_name
     FROM pg_index i
     JOIN pg_attribute a
       ON a.attrelid = i.indrelid
      AND a.attnum = ANY(i.indkey)
      AND a.attnum > 0
      AND NOT a.attisdropped
     WHERE i.indrelid = $1::regclass
       AND i.indisprimary
     ORDER BY array_position(i.indkey, a.attnum)`,
    [`public.${tableName}`]
  );
  return result.rows.map((r) => r.column_name);
}

async function getTableRowCount(client, tableName) {
  const result = await client.query(
    `SELECT COUNT(*)::bigint AS count FROM ${quoteIdent(tableName)}`
  );
  return Number(result.rows[0].count);
}

/**
 * Append pg_dump --schema-only when available on the host.
 * @param {(chunk: string) => void | Promise<void>} write
 */
function streamSchemaDump(write) {
  return new Promise((resolve) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      write('-- Schema: DATABASE_URL not set\n\n');
      return resolve({ ok: false, reason: 'no_database_url' });
    }

    const child = spawn(
      'pg_dump',
      [
        databaseUrl,
        '--schema-only',
        '--no-owner',
        '--no-privileges',
        '--schema=public',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';
    const chunks = [];
    let settled = false;

    const finish = async (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    child.stderr.on('data', (buf) => {
      stderr += buf.toString();
    });

    child.stdout.on('data', (buf) => {
      chunks.push(buf);
    });

    child.on('error', async () => {
      await write(`-- Schema: pg_dump not available on this host.
-- On target: run "npm run migrate" on an empty database before importing data below.

`);
      finish({ ok: false, reason: 'pg_dump_missing' });
    });

    child.on('close', async (code) => {
      if (settled) return;
      if (code !== 0 && code !== null) {
        await write(`-- Schema dump failed (pg_dump exit ${code}): ${stderr.trim().slice(0, 500)}
-- On target: run "npm run migrate" on an empty database before importing data below.

`);
        finish({ ok: false, reason: 'pg_dump_failed' });
        return;
      }
      const schemaSql = Buffer.concat(chunks).toString('utf8');
      if (schemaSql.trim()) {
        await write(schemaSql);
        if (!schemaSql.endsWith('\n')) await write('\n');
      }
      await write('\n');
      finish({ ok: true });
    });
  });
}

function buildExportHeader() {
  const date = new Date().toISOString();
  return `-- Min Stjärndag — full database SQL export
-- Generated: ${date}
-- Import: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f stjarndag-full-export.sql
-- Sensitive columns (password_hash, token_hash, native_token) are exported as '[REDACTED]'.

SET client_encoding = 'UTF8';

`;
}

function buildDataSectionHeader() {
  return `-- ═══════════════════════════════════════════════════════════
-- DATA (INSERT statements; FK checks relaxed during import)
-- ═══════════════════════════════════════════════════════════

BEGIN;
SET session_replication_role = replica;

`;
}

function buildExportFooter() {
  return `
SET session_replication_role = DEFAULT;
COMMIT;
-- Export complete.
`;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} tableName
 * @param {string[]} pkCols
 * @param {(text: string) => void | Promise<void>} write
 * @param {{ redactSensitive?: boolean, onProgress?: (info: object) => void }} [opts]
 */
async function exportTableData(client, tableName, pkCols, write, opts = {}) {
  const total = await getTableRowCount(client, tableName);
  await write(`-- Table ${tableName}: ${total} row(s)\n`);

  if (total === 0) {
    await write('\n');
    return { table: tableName, rows: 0 };
  }

  let exported = 0;
  const qTable = quoteIdent(tableName);

  if (pkCols.length === 1) {
    const pk = quoteIdent(pkCols[0]);
    let lastVal = null;
    while (exported < total) {
      const params = lastVal === null ? [BATCH_SIZE] : [lastVal, BATCH_SIZE];
      const sql =
        lastVal === null
          ? `SELECT * FROM ${qTable} ORDER BY ${pk} ASC LIMIT $1`
          : `SELECT * FROM ${qTable} WHERE ${pk} > $1 ORDER BY ${pk} ASC LIMIT $2`;
      const result = await client.query(sql, params);
      if (!result.rows.length) break;

      const prepared = result.rows.map((row) =>
        prepareRowForExport(row, { redactSensitive: opts.redactSensitive !== false })
      );
      const lines = rowsToInsertSql(tableName, prepared, pkCols);
      if (lines.length) await write(`${lines.join('\n')}\n`);

      exported += result.rows.length;
      lastVal = result.rows[result.rows.length - 1][pkCols[0]];
      opts.onProgress?.({ table: tableName, exported, total });
    }
  } else {
    let offset = 0;
    while (offset < total) {
      const result = await client.query(
        `SELECT * FROM ${qTable} ORDER BY ctid LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      );
      if (!result.rows.length) break;

      const prepared = result.rows.map((row) =>
        prepareRowForExport(row, { redactSensitive: opts.redactSensitive !== false })
      );
      const lines = rowsToInsertSql(
        tableName,
        prepared,
        pkCols.length ? pkCols : null
      );
      if (lines.length) await write(`${lines.join('\n')}\n`);

      exported += result.rows.length;
      offset += BATCH_SIZE;
      opts.onProgress?.({ table: tableName, exported, total });
    }
  }

  await write('\n');
  return { table: tableName, rows: exported };
}

/**
 * @param {import('pg').PoolClient} client
 * @param {(text: string) => void | Promise<void>} write
 * @param {{ includeSchema?: boolean, redactSensitive?: boolean, onTableStart?: Function, onTableDone?: Function }} [opts]
 */
async function streamFullDatabaseExport(client, write, opts = {}) {
  await client.query('SET statement_timeout = 0');

  await write(buildExportHeader());

  if (opts.includeSchema !== false) {
    await write('-- ═══════════════════════════════════════════════════════════\n');
    await write('-- SCHEMA (pg_dump --schema-only when available)\n');
    await write('-- ═══════════════════════════════════════════════════════════\n\n');
    await streamSchemaDump(write);
  }

  const discovered = await listPublicTables(client);
  const tables = sortTablesForExport(discovered);
  const pkCache = new Map();

  await write(buildDataSectionHeader());
  await write(`-- Tables: ${tables.length}\n\n`);

  const summary = [];
  for (const tableName of tables) {
    opts.onTableStart?.(tableName);
    let pkCols = pkCache.get(tableName);
    if (!pkCols) {
      try {
        pkCols = await getPrimaryKeyColumns(client, tableName);
      } catch {
        pkCols = [];
      }
      pkCache.set(tableName, pkCols);
    }

    try {
      const stat = await exportTableData(client, tableName, pkCols, write, {
        redactSensitive: opts.redactSensitive,
        onProgress: (info) => opts.onTableProgress?.(info),
      });
      summary.push(stat);
      opts.onTableDone?.(tableName, stat);
    } catch (err) {
      await write(`-- ERROR exporting ${tableName}: ${err.message}\n\n`);
      summary.push({ table: tableName, rows: 0, error: err.message });
      opts.onTableDone?.(tableName, { error: err.message });
    }
  }

  await write(buildExportFooter());
  return { tables: tables.length, summary };
}

module.exports = {
  TABLE_EXPORT_ORDER,
  BATCH_SIZE,
  isDatabaseExportEnabled,
  sortTablesForExport,
  listPublicTables,
  getPrimaryKeyColumns,
  streamSchemaDump,
  streamFullDatabaseExport,
  buildExportHeader,
  buildExportFooter,
};
