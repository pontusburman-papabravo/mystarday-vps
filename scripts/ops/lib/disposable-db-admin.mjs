'use strict';

import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { assertDisposableRestoreDatabaseName } from './backup-gate-core.mjs';
import { validateDisposableDatabaseName } from './disposable-db-name.mjs';

const { Pool } = pg;

const DEFAULT_HELPER = '/usr/local/sbin/app-disposable-db';

/** Minimal env for subprocesses — no inherited PG* or PATH hijack. */
export function minimalSubprocessEnv() {
  return {
    PATH: '/usr/bin:/bin',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
  };
}

function helperPath() {
  return process.env.APP_DISPOSABLE_DB_HELPER || DEFAULT_HELPER;
}

function sudoCreateDropAvailable() {
  const helper = helperPath();
  const probe = spawnSync(
    'sudo',
    ['-n', '-l'],
    { encoding: 'utf8', env: minimalSubprocessEnv() }
  );
  if (probe.status !== 0) return false;
  return probe.stdout.includes(helper);
}

function runSudoHelper(action, dbName) {
  const helper = helperPath();
  const result = spawnSync(
    'sudo',
    ['-n', helper, action, dbName],
    { encoding: 'utf8', env: minimalSubprocessEnv() }
  );
  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || '').trim() || `exit ${result.status}`;
    throw new Error(`SUDO_DISPOSABLE_DB_${action.toUpperCase()}_FAILED:${msg}`);
  }
}

async function runAdminUrl(action, dbName) {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) {
    throw new Error('DATABASE_ADMIN_URL_REQUIRED_FOR_CI_DISPOSABLE');
  }
  const pool = new Pool({
    connectionString: adminUrl,
    ssl: adminUrl.includes('localhost') || adminUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    if (action === 'drop') {
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`DROP DATABASE IF EXISTS ${quoteIdent(dbName)}`);
    } else if (action === 'create') {
      await client.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
    } else {
      throw new Error('INVALID_ACTION');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

function quoteIdent(name) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error('INVALID_DB_NAME');
  return `"${name}"`;
}

/**
 * VPS production: passwordless sudo to app-disposable-db (no SETENV).
 * CI/disposable tests: DATABASE_ADMIN_URL with CREATEDB (never installed on VPS app role).
 * @param {{ protectedName?: string, lifecycle?: 'managed' | 'sudo' }} [opts]
 */
export async function createDisposableDatabase(dbName, opts = {}) {
  assertDisposableRestoreDatabaseName(dbName);
  const v = validateDisposableDatabaseName(dbName, { protectedName: opts.protectedName });
  if (!v.ok) throw new Error(`INVALID_DISPOSABLE_NAME:${v.reason}`);

  if (opts.lifecycle === 'managed') {
    if (!process.env.DATABASE_ADMIN_URL) {
      throw new Error('DATABASE_ADMIN_URL_REQUIRED_FOR_MANAGED_LIFECYCLE');
    }
    await runAdminUrl('create', dbName);
    return { method: 'database_admin_url_ci' };
  }

  if (process.env.APP_DISPOSABLE_DB_USE_SUDO === '1' || opts.lifecycle === 'sudo' || sudoCreateDropAvailable()) {
    runSudoHelper('create', dbName);
    return { method: 'sudo_helper' };
  }
  if (process.env.DATABASE_ADMIN_URL) {
    await runAdminUrl('create', dbName);
    return { method: 'database_admin_url_ci' };
  }
  throw new Error('DISPOSABLE_DB_ADMIN_UNAVAILABLE');
}

/**
 * @param {{ protectedName?: string, lifecycle?: 'managed' | 'sudo' }} [opts]
 */
export async function dropDisposableDatabase(dbName, opts = {}) {
  assertDisposableRestoreDatabaseName(dbName);
  const v = validateDisposableDatabaseName(dbName, { protectedName: opts.protectedName });
  if (!v.ok) throw new Error(`INVALID_DISPOSABLE_NAME:${v.reason}`);

  if (opts.lifecycle === 'managed') {
    if (!process.env.DATABASE_ADMIN_URL) {
      throw new Error('DATABASE_ADMIN_URL_REQUIRED_FOR_MANAGED_LIFECYCLE');
    }
    await runAdminUrl('drop', dbName);
    return { method: 'database_admin_url_ci' };
  }

  if (process.env.APP_DISPOSABLE_DB_USE_SUDO === '1' || opts.lifecycle === 'sudo' || sudoCreateDropAvailable()) {
    runSudoHelper('drop', dbName);
    return { method: 'sudo_helper' };
  }
  if (process.env.DATABASE_ADMIN_URL) {
    await runAdminUrl('drop', dbName);
    return { method: 'database_admin_url_ci' };
  }
  throw new Error('DISPOSABLE_DB_ADMIN_UNAVAILABLE');
}

export { sudoCreateDropAvailable, runSudoHelper, helperPath };
