'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Pool } = require('pg');
const { assertMigrationsMatchFilesystem } = require('./database-branch-guard.js');

const REPO_ROOT = path.join(__dirname, '../..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'migrations');

function isMockDatabaseUrl(url) {
  return !url || /mock_test/i.test(url);
}

function makePool(url) {
  return new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
}

function runMigrate(url) {
  const {
    buildDestructiveTestChildEnv,
    resolveApplicationDatabaseUrl,
  } = require('../../scripts/lib/test-database-safety.cjs');
  const anchorUrl = resolveApplicationDatabaseUrl(process.env);
  const childEnv = buildDestructiveTestChildEnv(process.env, {
    TEST_DATABASE_URL: url,
    ...(anchorUrl ? { APPLICATION_DATABASE_URL: anchorUrl } : {}),
  });
  execSync('npm run migrate', {
    cwd: REPO_ROOT,
    env: childEnv,
    stdio: 'pipe',
  });
}

function findMigrationByName(name) {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const mod = require(filePath);
    const migName = mod.name || file.replace('.js', '');
    if (migName === name) {
      return { file, mod };
    }
  }
  throw new Error(`Migration not found: ${name}`);
}

function listMigrationsWithDown() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort();
  return files
    .map((file) => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const mod = require(filePath);
      const name = mod.name || file.replace('.js', '');
      return { file, name, hasDown: typeof mod.down === 'function' };
    })
    .filter((m) => m.hasDown);
}

async function wipePublicSchema(client) {
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  await client.query('GRANT ALL ON SCHEMA public TO PUBLIC');
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return rows.length > 0;
}

/**
 * Roll back the N most recently applied folder migrations that define down()
 * (newest first; skips applied migrations without down()).
 */
async function rollbackLastApplied(pool, count = 1) {
  await assertMigrationsMatchFilesystem(pool);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, name FROM _migrations ORDER BY id DESC'
    );

    const rolled = [];
    for (const row of rows) {
      if (rolled.length >= count) break;
      const { mod } = findMigrationByName(row.name);
      if (typeof mod.down !== 'function') {
        continue;
      }
      await client.query('BEGIN');
      try {
        await mod.down(client);
        await client.query('DELETE FROM _migrations WHERE id = $1', [row.id]);
        await client.query('COMMIT');
        rolled.push(row.name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    if (rolled.length < count) {
      throw new Error(`Only rolled back ${rolled.length}/${count} migrations (not enough down() handlers)`);
    }
    return rolled;
  } finally {
    client.release();
  }
}

module.exports = {
  isMockDatabaseUrl,
  makePool,
  runMigrate,
  findMigrationByName,
  listMigrationsWithDown,
  wipePublicSchema,
  tableExists,
  rollbackLastApplied,
};
