'use strict';

/**
 * Enable all ACT-1 + growth flags on production (full rollout).
 * Idempotent: only sets enabled=true for listed keys — never disables flags.
 * Usage on VPS: node scripts/enable-act1-flags.js
 */
const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');

loadEnvFile();
const db = require('../src/lib/db');

const FLAG_KEYS = [
  'activation_onboarding_v1',
  'activation_child_handoff_v1',
  'activation_first_star_guide_v1',
  'activation_first_star_mode_v1',
  'activation_ai_starter_plan',
  'activation_nudge_v1',
  'referral_program',
];

async function main() {
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
    console.log('[act1-flags] ACTIVATION_ONBOARDING_LAUNCH_AT ej satt — alla nya familjer får ACT-1 när flaggorna är på.');
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
    [FLAG_KEYS]
  );

  const enabled = new Set(result.rows.map((r) => r.key));
  const missing = FLAG_KEYS.filter((k) => !enabled.has(k));
  if (missing.length) {
    console.error('[act1-flags] Saknade flaggor i DB (kör migrate först):', missing.join(', '));
    process.exit(1);
  }

  const all = await db.query(
    `SELECT key, enabled, description
     FROM feature_flag
     WHERE key = ANY($1::text[])
     ORDER BY key`,
    [FLAG_KEYS]
  );

  console.log('[act1-flags] Aktiverade:');
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
