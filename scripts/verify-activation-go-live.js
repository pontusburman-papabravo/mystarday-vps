#!/usr/bin/env node
'use strict';

/**
 * Pre/post go-live sanity check — Föräldraaktivering 7D (Fas 1–6C).
 * Usage: node scripts/verify-activation-go-live.js
 */

const { execSync } = require('child_process');

const REQUIRED_TABLES = [
  'parent_activation_program',
  'parent_seen_completion',
];

const PROD_ENV_KEYS = [
  'ACTIVATION_PROGRAM_ENABLED',
  'ACTIVATION_PROGRAM_LAUNCH_AT',
  'ACTIVATION_PROGRAM_EMAIL_ENABLED',
  'ACTIVATION_PROGRAM_AB_ENABLED',
  'ACTIVATION_PROGRAM_EXPIRY_DAY',
];

async function main() {
  let ok = true;

  console.log('[GO-LIVE] Föräldraaktivering 7D — readiness check (Fas 1–6C)\n');

  try {
    execSync('node --test test/activation-program.test.js test/activation-program-aha.test.js test/activation-program-fas2.test.js test/activation-program-fas3.test.js test/activation-program-fas4.test.js test/activation-program-fas5.test.js test/activation-program-fas6a.test.js test/activation-program-fas6b.test.js test/activation-program-fas6c.test.js', {
      stdio: 'inherit',
    });
    console.log('\n[OK] Activation test suite (106 tests)');
  } catch {
    console.error('\n[FAIL] Activation tests failed');
    ok = false;
  }

  if (process.env.DATABASE_URL) {
    try {
      const db = require('../src/lib/db');
      for (const table of REQUIRED_TABLES) {
        const r = await db.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        );
        if (r.rows.length === 0) {
          console.error(`[FAIL] Table missing: ${table}`);
          ok = false;
        } else {
          console.log(`[OK] Table: ${table}`);
        }
      }
    } catch (err) {
      console.error('[FAIL] DB:', err.message);
      ok = false;
    } finally {
      try {
        const { pool } = require('../src/lib/db');
        await pool.end();
      } catch (_) {}
    }
  } else {
    console.log('[SKIP] DATABASE_URL — table check skipped');
  }

  console.log('\n[ENV] Production (Polsia Dashboard):');
  for (const key of PROD_ENV_KEYS) {
    const val = process.env[key];
    console.log(`  ${key}=${val ?? '<set in prod dashboard>'}`);
  }

  if (process.env.ACTIVATION_PROGRAM_ENABLED === 'true' && !process.env.ACTIVATION_PROGRAM_LAUNCH_AT) {
    console.error('\n[WARN] ENABLED=true but LAUNCH_AT missing');
    ok = false;
  }

  if (process.env.ACTIVATION_PROGRAM_AB_ENABLED === 'true') {
    console.warn('\n[WARN] AB_ENABLED=true — contract says no random A/B at go-live');
  }

  console.log(ok ? '\n[GO-LIVE] Technical readiness OK — set prod env + PO approval' : '\n[GO-LIVE] Fix failures first');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
