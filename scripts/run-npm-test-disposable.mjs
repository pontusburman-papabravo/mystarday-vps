#!/usr/bin/env node
/**
 * Full test suite on a fresh disposable PostgreSQL database (create → migrate → test → drop).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createDisposableDatabase,
  dropDisposableDatabase,
  generateDisposableDatabaseName,
  assertDisposableDatabaseUrl,
} = require('../test/helpers/database-branch-guard.js');

const REPO_ROOT = new URL('..', import.meta.url).pathname;

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: false,
  });
  return r.status ?? 1;
}

async function main() {
  const adminUrl = process.env.DATABASE_URL;
  if (!adminUrl) {
    console.error('run-npm-test-disposable: set DATABASE_URL (admin connection, any existing DB on cluster)');
    process.exit(1);
  }

  const prefix = process.env.TEST_DISPOSABLE_DB_PREFIX || 'stjarndag_test';
  const dbName = process.env.TEST_DISPOSABLE_DB_NAME || generateDisposableDatabaseName(prefix);
  assertDisposableDatabaseNameOnly(dbName);

  let testUrl;
  try {
    testUrl = await createDisposableDatabase(adminUrl, dbName);
    console.error(`[test:disposable] created ${dbName}`);

    const baseEnv = {
      ...process.env,
      DATABASE_URL: testUrl,
      NODE_ENV: process.env.NODE_ENV || 'test',
      REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION || 'false',
    };
    delete baseEnv.RESEND_API_KEY;
    delete baseEnv.RESEND_API_KEY_WEEKLY;

    let code = run('npm', ['run', 'migrate'], baseEnv);
    if (code !== 0) process.exit(code);

    code = run('node', ['scripts/assert-disposable-database.mjs'], baseEnv);
    if (code !== 0) process.exit(code);

    code = run('npm', ['test'], { ...baseEnv, RESEND_API_KEY: '', RESEND_API_KEY_WEEKLY: '' });
    process.exitCode = code;
  } finally {
    if (testUrl && process.env.TEST_DISPOSABLE_KEEP_DB !== '1') {
      try {
        await dropDisposableDatabase(adminUrl, dbName);
        console.error(`[test:disposable] dropped ${dbName}`);
      } catch (err) {
        console.error(`[test:disposable] drop failed: ${err.message}`);
        process.exitCode = process.exitCode || 1;
      }
    }
  }
}

function assertDisposableDatabaseNameOnly(dbName) {
  try {
    assertDisposableDatabaseUrl(`postgresql://u:p@localhost:5432/${dbName}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
