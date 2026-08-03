'use strict';

import pg from 'pg';
import { validateDisposableDatabaseName } from './disposable-db-name.mjs';
import { assertDisposableRestoreDatabaseName } from './backup-gate-core.mjs';

const { Pool } = pg;

const SYSTEM_SCHEMAS = new Set(['pg_catalog', 'information_schema', 'pg_toast']);

/**
 * @param {string} databaseUrl
 * @returns {string}
 */
export function sourceDatabaseNameFromUrl(databaseUrl) {
  const u = new URL(databaseUrl);
  const name = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!name) throw new Error('SOURCE_DATABASE_NAME_MISSING');
  return name;
}

/**
 * @param {string} databaseUrl
 * @param {string} targetDbName
 * @param {{ protectedName?: string | null, expectedOwner?: string | null }} opts
 */
export async function verifyPrecreatedRestoreTarget(databaseUrl, targetDbName, opts = {}) {
  assertDisposableRestoreDatabaseName(targetDbName);
  const protectedName =
    opts.protectedName ??
    (process.env.PROTECTED_DATABASE_NAME ? process.env.PROTECTED_DATABASE_NAME : null);
  const v = validateDisposableDatabaseName(targetDbName, { protectedName });
  if (!v.ok) {
    throw new Error(`INVALID_RESTORE_TARGET:${v.reason}`);
  }

  const sourceName = sourceDatabaseNameFromUrl(databaseUrl);
  if (targetDbName === sourceName) {
    throw new Error('RESTORE_TARGET_IS_SOURCE_DATABASE');
  }

  const catalogUrl = new URL(databaseUrl);
  catalogUrl.pathname = '/postgres';

  const appUser = decodeURIComponent(new URL(databaseUrl).username || '');

  const catalogPool = new Pool({ connectionString: catalogUrl.toString(), ssl: sslMode(databaseUrl) });
  const catalog = await catalogPool.connect();
  try {
    const exists = await catalog.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );
    if (exists.rowCount === 0) {
      throw new Error('RESTORE_TARGET_NOT_FOUND');
    }
    if (appUser) {
      const ownerRow = await catalog.query(
        `SELECT pg_catalog.pg_get_userbyid(d.datdba) AS owner
         FROM pg_catalog.pg_database d WHERE d.datname = $1`,
        [targetDbName]
      );
      const owner = ownerRow.rows[0]?.owner;
      if (owner && owner !== appUser) {
        throw new Error('RESTORE_TARGET_OWNER_MISMATCH');
      }
    }
  } finally {
    catalog.release();
    await catalogPool.end();
  }

  const targetUrl = new URL(databaseUrl);
  targetUrl.pathname = `/${targetDbName}`;

  const targetPool = new Pool({ connectionString: targetUrl.toString(), ssl: sslMode(databaseUrl) });
  const targetClient = await targetPool.connect();
  try {
    const tables = await targetClient.query(
      `SELECT COUNT(*)::int AS n
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
         AND table_type = 'BASE TABLE'`
    );
    if (tables.rows[0].n > 0) {
      throw new Error('RESTORE_TARGET_NOT_EMPTY');
    }
  } finally {
    targetClient.release();
    await targetPool.end();
  }

  return { targetUrl: targetUrl.toString(), sourceName, appUser };
}

function sslMode(databaseUrl) {
  const host = new URL(databaseUrl).hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return { rejectUnauthorized: false };
}

export { SYSTEM_SCHEMAS };
