'use strict';

/**
 * Enable ACT-1 feature flags on VPS.
 * Default: PR 1–4 only (template, handoff, first star guide, AI).
 * Pass --full for PR 5 nudge + referral + first_star_mode.
 *
 * Usage: node scripts/enable-act1-flags.js [--full]
 */
const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');
const { ACT1_PR14_FLAG_KEYS, FLAG_KEYS } = require('../src/lib/activation-flags');

loadEnvFile();
const db = require('../src/lib/db');

const FULL_ROLLOUT_KEYS = [
  ...ACT1_PR14_FLAG_KEYS,
  FLAG_KEYS.firstStarMode,
  FLAG_KEYS.nudge,
  FLAG_KEYS.referral,
];

async function main() {
  const fullRollout = process.argv.includes('--full');
  const flagKeys = fullRollout ? FULL_ROLLOUT_KEYS : ACT1_PR14_FLAG_KEYS;

  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  if (!diag.ok) {
    console.error('[act1-flags]', diag.message);
    process.exit(1);
  }

  if (process.env.ACTIVATION_ONBOARDING_LAUNCH_AT) {
    console.warn(
      '[act1-flags] VARNING: ACTIVATION_ONBOARDING_LAUNCH_AT=%s — endast familjer skapade efter detta datum får ACT-1.',
      process.env.ACTIVATION_ONBOARDING_LAUNCH_AT
    );
    console.warn('[act1-flags] Ta bort raden i .env och starta om om alla nya ska få flödet direkt.');
  } else {
    console.log('[act1-flags] ACTIVATION_ONBOARDING_LAUNCH_AT ej satt — alla familjer får ACT-1 när flaggorna är på.');
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[act1-flags] OPENAI_API_KEY saknas — AI-personalisering faller tillbaka till mall (onboarding fortsätter).');
  } else {
    console.log('[act1-flags] OPENAI_API_KEY satt — template_plus_ai kan använda AI.');
  }

  const result = await db.query(
    `UPDATE feature_flag
     SET enabled = true
     WHERE key = ANY($1::text[])
     RETURNING key, enabled`,
    [flagKeys]
  );

  const enabled = new Set(result.rows.map((r) => r.key));
  const missing = flagKeys.filter((k) => !enabled.has(k));
  if (missing.length) {
    console.error('[act1-flags] Saknade flaggor i DB (kör migrate först):', missing.join(', '));
    process.exit(1);
  }

  const all = await db.query(
    `SELECT key, enabled, description
     FROM feature_flag
     WHERE key = ANY($1::text[])
     ORDER BY key`,
    [flagKeys]
  );

  console.log(`[act1-flags] Aktiverade (${fullRollout ? 'full' : 'PR 1–4'}):`);
  for (const row of all.rows) {
    console.log(`  ${row.enabled ? 'ON ' : 'OFF'}  ${row.key}`);
  }
  console.log('[act1-flags] Klar.');
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
    console.error('[act1-flags]', err);
    return shutdown(1);
  });
