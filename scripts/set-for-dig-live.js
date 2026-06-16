'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');

loadEnvFile();
const db = require('../src/lib/db');

async function main() {
  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  if (!diag.ok) {
    console.error('[for-dig-live]', diag.message);
    process.exit(1);
  }

  let result = await db.query(
    "UPDATE features SET status = 'live', updated_at = NOW() WHERE slug = 'for_dig'"
  );

  if (result.rowCount === 0) {
    console.log('[for-dig-live] for_dig saknas — kör seed-features.js');
    const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed-features.js')], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    if (seed.status !== 0) process.exit(seed.status || 1);
    result = await db.query(
      "UPDATE features SET status = 'live', updated_at = NOW() WHERE slug = 'for_dig'"
    );
  }

  const check = await db.query("SELECT slug, status FROM features WHERE slug = 'for_dig'");
  if (check.rows.length === 0) {
    console.error('[for-dig-live] for_dig finns fortfarande inte efter seed');
    process.exit(1);
  }

  console.log('[for-dig-live] OK — for_dig status:', check.rows[0].status);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[for-dig-live] Fel:', err.message);
    process.exit(1);
  });
