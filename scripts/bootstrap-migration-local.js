#!/usr/bin/env node
/**
 * Bootstrap local migration DB: feature flags + standard library checklist.
 *
 * Usage:
 *   DATABASE_URL=postgres://.../mystarday_dev npm run bootstrap:migration
 *
 * Does NOT fetch global-library.json — run harvest:library + import:library for that.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');
const { ensureStandardLibraryAccess, isLocalMigrationDb } = require('../src/lib/global-library-import');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  if (!isLocalMigrationDb()) {
    console.warn('WARNING: DATABASE_URL is not localhost — bootstrap only adjusts standardbibliotek on local DBs');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS n FROM features');
    if (countRows[0].n === 0) {
      console.log('features-tabellen är tom — kör seed-features.js ...');
      const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed-features.js')], {
        stdio: 'inherit',
        env: process.env,
      });
      if (seed.status !== 0) {
        throw new Error('seed-features.js misslyckades');
      }
    }

    if (isLocalMigrationDb()) {
      const feat = await ensureStandardLibraryAccess(client);
      console.log(`standardbibliotek feature: ${feat.status || 'live'} (lokal bootstrap)`);
    }

    const { rows: lib } = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM default_activity_template) AS aktiviteter,
        (SELECT COUNT(*)::int FROM default_reward) AS beloningar,
        (SELECT COUNT(*)::int FROM default_schedule) AS scheman
    `);

    console.log('\nStandardbibliotek i databasen:');
    console.log(`  aktiviteter: ${lib[0].aktiviteter}`);
    console.log(`  belöningar:  ${lib[0].beloningar}`);
    console.log(`  scheman:     ${lib[0].scheman}`);

    if (lib[0].aktiviteter === 0 && lib[0].beloningar === 0 && lib[0].scheman === 0) {
      console.log(`
Standardbiblioteket är tomt. Hämta från prod (en gång):

  ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:library -- \\
    --url https://stjarndag.polsia.app --out ./Backup/stjarndag-harvest-2026-06-02

  npm run import:library -- --in ./Backup/stjarndag-harvest-2026-06-02
`);
      process.exit(1);
    }

    console.log('\nKlart — ladda om Bibliotek i appen.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
