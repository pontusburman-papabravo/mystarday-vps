/**
 * Database Migration Runner
 *
 * Runs on every deploy via `npm run build`.
 *
 * How it works:
 * 1. Creates core tables (_migrations tracking + schedule_date_exclusion) — idempotent
 * 2. Reads migrations from migrations/ folder
 * 3. Runs new migrations in order (tracked in _migrations table)
 *
 * To create a new migration:
 *   Create a file in migrations/ with format: {timestamp}_{name}.js
 *   Example: migrations/1704067200000_add_products_table.js
 *
 * Migration file format:
 *   module.exports = {
 *     name: 'add_products_table',
 *     up: async (client) => {
 *       await client.query(`CREATE TABLE products (...)`);
 *     }
 *   };
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { loadEnvFile, diagnoseDatabaseUrl } = require('./src/lib/load-env');

const envLoaded = loadEnvFile();
const dbDiag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
if (!dbDiag.ok) {
  console.error('ERROR:', dbDiag.message);
  if (!envLoaded) {
    console.error('No .env file found in', process.cwd());
  } else {
    console.error('Tip: grep DATABASE_URL .env — use postgresql://user:password@host:5432/dbname');
    console.error('If password has special chars, URL-encode them (e.g. @ → %40, # → %23).');
    console.error('Or run: set -a && source .env && set +a && npm run migrate');
  }
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const MIGRATION_RUNNER_LOCK_ID = 1099;

async function migrate() {
  console.log('Running migrations...');

  const client = await pool.connect();
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [MIGRATION_RUNNER_LOCK_ID]);
    if (!lock.rows[0]?.acquired) {
      throw new Error('Another migration runner holds the advisory lock');
    }
    await client.query('SET lock_timeout = 30000');
    await client.query('SET statement_timeout = 600000');
    // 1. Create migration tracking table (always first)
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Core tables (idempotent - safe to run every time)
    await runCoreMigrations(client);

    // 3. Run migrations from migrations/ folder
    await runFolderMigrations(client);

    console.log('Migrations complete.');
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_RUNNER_LOCK_ID]);
    } catch {
      // ignore unlock errors on disconnect
    }
    client.release();
    await pool.end();
  }
}

/**
 * Core tables that every app needs.
 * These use CREATE IF NOT EXISTS so they're safe to run repeatedly.
 */
async function runCoreMigrations(client) {
  // Per-date exclusion for recurring schedule items ("bara denna dag" delete)
  await client.query(`
    CREATE TABLE IF NOT EXISTS schedule_date_exclusion (
      child_id UUID NOT NULL,
      date DATE NOT NULL,
      activity_template_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (child_id, date, activity_template_id)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS schedule_date_exclusion_child_date_idx
      ON schedule_date_exclusion (child_id, date)
  `);
}

/**
 * Run migrations from migrations/ folder.
 * Each migration runs once and is tracked in _migrations table.
 */
async function runFolderMigrations(client) {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Skip if no migrations folder
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  // Get all migration files, sorted by name (timestamp prefix ensures order)
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (files.length === 0) {
    return;
  }

  // Get already-applied migrations
  const applied = await client.query('SELECT name FROM _migrations');
  const appliedNames = new Set(applied.rows.map(r => r.name));

  // Run pending migrations
  for (const file of files) {
    const migration = require(path.join(migrationsDir, file));
    const name = migration.name || file.replace('.js', '');

    if (appliedNames.has(name)) {
      continue; // Already applied
    }

    console.log(`Running migration: ${name}`);

    try {
      await client.query('BEGIN');
      await migration.up(client);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Migration complete: ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration failed (${name}): ${err.message}`);
    }
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
