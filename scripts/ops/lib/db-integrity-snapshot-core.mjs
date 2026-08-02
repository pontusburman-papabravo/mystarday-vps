import crypto from 'node:crypto';
import pg from 'pg';
import { databaseIdentityHash } from './database-identity.mjs';
import { SNAPSHOT_TABLE_SPECS } from './snapshot-tables.mjs';

const { Pool } = pg;

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`INVALID_IDENT:${name}`);
  }
  return `"${name}"`;
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(client, tableName, columnName) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

function buildFingerprintSql(spec) {
  const cols = spec.fingerprintColumns.filter(Boolean);
  const orderCols = spec.orderBy || [spec.idColumn];
  const orderClause = orderCols.map((c) => quoteIdent(c)).join(', ');
  const aggExpr = cols
    .map((c) => `coalesce(${quoteIdent(c)}::text, '')`)
    .join(` || ':' || `);
  return `SELECT encode(digest(coalesce(string_agg((${aggExpr}), '|' ORDER BY ${orderClause}), ''), 'sha256'), 'hex') AS fp FROM ${quoteIdent(spec.table)}`;
}

async function snapshotTable(client, spec) {
  const exists = await tableExists(client, spec.table);
  if (!exists) {
    return { exists: false, optional: !!spec.optional };
  }

  const idCol = spec.idColumn;
  const hasId = await columnExists(client, spec.table, idCol);
  const countRes = await client.query(`SELECT COUNT(*)::bigint AS n FROM ${quoteIdent(spec.table)}`);
  const rowCount = Number(countRes.rows[0].n);

  let minId = null;
  let maxId = null;
  if (hasId) {
    const mm = await client.query(
      `SELECT MIN(${quoteIdent(idCol)}::text) AS min_id, MAX(${quoteIdent(idCol)}::text) AS max_id FROM ${quoteIdent(spec.table)}`
    );
    minId = mm.rows[0].min_id;
    maxId = mm.rows[0].max_id;
  }

  let minTs = null;
  let maxTs = null;
  for (const tsCol of spec.tsColumns || []) {
    if (!(await columnExists(client, spec.table, tsCol))) continue;
    const tsRes = await client.query(
      `SELECT MIN(${quoteIdent(tsCol)})::text AS min_ts, MAX(${quoteIdent(tsCol)})::text AS max_ts FROM ${quoteIdent(spec.table)}`
    );
    if (tsRes.rows[0].min_ts != null) {
      minTs = minTs == null ? tsRes.rows[0].min_ts : (minTs < tsRes.rows[0].min_ts ? minTs : tsRes.rows[0].min_ts);
      maxTs = maxTs == null ? tsRes.rows[0].max_ts : (maxTs > tsRes.rows[0].max_ts ? maxTs : tsRes.rows[0].max_ts);
    }
  }

  let rowFingerprint = null;
  try {
    const fpSql = buildFingerprintSql(spec);
    const fpRes = await client.query(fpSql);
    rowFingerprint = fpRes.rows[0]?.fp || crypto.createHash('sha256').update('').digest('hex');
  } catch {
    rowFingerprint = null;
  }

  return {
    exists: true,
    optional: !!spec.optional,
    row_count: rowCount,
    min_id: minId,
    max_id: maxId,
    min_timestamp: minTs,
    max_timestamp: maxTs,
    row_fingerprint_sha256: rowFingerprint,
  };
}

/**
 * @param {string} databaseUrl
 * @param {{ label?: string, deploySha?: string }} meta
 */
export async function captureDbIntegritySnapshot(databaseUrl, meta = {}) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const pgVersion = await client.query('SHOW server_version');
    const dbSize = await client.query(
      'SELECT pg_database_size(current_database())::bigint AS bytes'
    );

    const tables = {};
    for (const spec of SNAPSHOT_TABLE_SPECS) {
      tables[spec.table] = await snapshotTable(client, spec);
    }

    return {
      version: 1,
      captured_at_utc: new Date().toISOString(),
      label: meta.label || null,
      deploy_sha: meta.deploySha || null,
      database_identity_hash: databaseIdentityHash(databaseUrl),
      postgres_server_version: pgVersion.rows[0].server_version,
      database_size_bytes: Number(dbSize.rows[0].bytes),
      tables,
    };
  } finally {
    client.release();
    await pool.end();
  }
}
