'use strict';

/**
 * Enable FEAT-1 boendeschema globally (idempotent).
 * Prefer: migrate deploys 1808720000000_enable_custody_schedule.js automatically.
 * Usage on VPS: node scripts/enable-custody-beta.js
 */
const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');

loadEnvFile();
const db = require('../src/lib/db');

const FLAG_KEY = 'custody_schedule_beta';

async function main() {
  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  if (!diag.ok) {
    console.error('[custody-beta]', diag.message);
    process.exit(1);
  }

  const result = await db.query(
    `UPDATE feature_flag SET enabled = true WHERE key = $1 RETURNING key, enabled`,
    [FLAG_KEY]
  );
  if (result.rows.length === 0) {
    console.error('[custody-beta] Flaggan saknas — kör migrate först');
    process.exit(1);
  }
  console.log('[custody-beta] custody_schedule_beta = ON');
  console.log('[custody-beta] Klar — testa i Familj → Boendeschema.');
}

async function shutdown(code) {
  try {
    await db.pool.end();
  } catch (_) { /* ignore */ }
  process.exit(code);
}

main()
  .then(() => shutdown(0))
  .catch((err) => {
    console.error('[custody-beta]', err);
    return shutdown(1);
  });
