#!/usr/bin/env node
'use strict';

/**
 * Canonical ops toggle for feature_flag.english_app_global_enabled (ADR-021).
 * Run on VPS with DATABASE_URL loaded from app .env — never commit secrets.
 *
 *   ENGLISH_GLOBAL_FLAG_CONFIRM=1 node scripts/ops/english-app-global-flag.cjs --on
 *   ENGLISH_GLOBAL_FLAG_CONFIRM=1 node scripts/ops/english-app-global-flag.cjs --off
 *
 * Rollback: same command with --off (no redeploy).
 */
const {
  GLOBAL_FLAG_KEY,
  readEnglishAppGlobalFlagState,
} = require('../../src/lib/english-app-global-flag');

async function setGlobalFlag(enabled) {
  const db = require('../../src/lib/db');
  const result = await db.query(
    `UPDATE feature_flag
     SET enabled = $1, updated_at = NOW()
     WHERE key = $2
     RETURNING key, enabled`,
    [enabled, GLOBAL_FLAG_KEY]
  );
  if (!result.rows.length) {
    throw new Error(`feature_flag row missing: ${GLOBAL_FLAG_KEY}`);
  }
  return result.rows[0];
}

async function main() {
  const on = process.argv.includes('--on');
  const off = process.argv.includes('--off');
  if (on === off) {
    console.error('Usage: english-app-global-flag.cjs --on | --off');
    process.exit(2);
  }
  if (process.env.ENGLISH_GLOBAL_FLAG_CONFIRM !== '1') {
    console.error('Set ENGLISH_GLOBAL_FLAG_CONFIRM=1 to apply');
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(2);
  }

  const target = on;
  const before = await readEnglishAppGlobalFlagState();
  const row = await setGlobalFlag(target);
  const after = await readEnglishAppGlobalFlagState();

  console.log(
    JSON.stringify({
      ok: true,
      key: GLOBAL_FLAG_KEY,
      enabled: row.enabled === true,
      before_enabled: before.enabled,
      after_read_ok: after.readOk,
      after_row_present: after.rowPresent,
      after_enabled: after.enabled,
    })
  );
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ ok: false, error: e.message }));
    process.exit(1);
  })
  .finally(() => {
    try {
      require('../../src/lib/db').pool.end();
    } catch {
      /* ignore */
    }
  });
