#!/usr/bin/env node
/**
 * Win-back eligibility diagnostic (safe output).
 * Usage: cd $VPS_APP_PATH && node scripts/diagnose-win-back.js
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');
const {
  fetchEligibleFamilies,
  INACTIVITY_THRESHOLD_DAYS,
} = require('../src/lib/win-back-scheduler');

function envOn(key) {
  return process.env[key] === 'true' ? 'ON' : 'OFF/unset';
}

async function main() {
  console.log('=== Win-back diagnose ===');
  console.log('WIN_BACK_ENABLED:', envOn('WIN_BACK_ENABLED'));
  console.log('EMAIL_ENABLED:', envOn('EMAIL_ENABLED'));
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'set' : 'missing');
  console.log('Inactivity threshold:', INACTIVITY_THRESHOLD_DAYS, 'days');

  const np = await db.query(`
    SELECT
      COUNT(*)::int AS parents,
      COUNT(np.parent_id)::int AS with_pref,
      COUNT(*) FILTER (WHERE np.email_enabled = false)::int AS email_opt_out
    FROM parent p
    LEFT JOIN notification_preference np ON np.parent_id = p.id
    WHERE p.is_admin = false
  `);
  console.log('Parents / notification_preference:', np.rows[0]);

  const table = await db.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'win_back_email_log'
    ) AS ok
  `);
  console.log('win_back_email_log table:', table.rows[0]?.ok ? 'OK' : 'MISSING');

  if (process.env.WIN_BACK_ENABLED !== 'true') {
    console.log('\n⚠ Set WIN_BACK_ENABLED=true in .env and restart the Node service');
  }

  const eligible = await fetchEligibleFamilies();
  console.log('\nEligible families (would create pending_approval):', eligible.rows.length);
  if (eligible.rows.length > 0) {
    console.log('Sample (max 10):');
    for (const row of eligible.rows.slice(0, 10)) {
      console.log(`  - ${row.parent_email} (${row.child_name})`);
    }
  }

  const pending = await db.query(
    `SELECT COUNT(*)::int AS n FROM win_back_email_log WHERE status = 'pending_approval'`
  );
  console.log('Pending approval in queue:', pending.rows[0]?.n ?? 0);

  try {
    const winBackLog = require('../db/win-back-email-log');
    const summary = await winBackLog.getSummary();
    const records = await winBackLog.getAll({ limit: 1 });
    console.log('getSummary(): OK', summary);
    console.log('getAll(): OK, sample rows:', records.length);
  } catch (err) {
    console.error('email-log API queries FAIL:', err.message);
    console.error('→ Run npm run migrate (needs email_type + error columns)');
    process.exitCode = 1;
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error('diagnose failed:', err.message);
  process.exit(1);
});
