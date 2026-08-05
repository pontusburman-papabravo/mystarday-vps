#!/usr/bin/env node
'use strict';

/**
 * R1 — founder QA Hem pilot (prod-safe): per-family flags only, no global toggles.
 *
 *   npm run r1:hem-founder-pilot -- --status
 *   npm run r1:hem-founder-pilot -- --enable --apply
 *   npm run r1:hem-founder-pilot -- --disable --apply
 *
 * Requires DATABASE_URL + FOUNDER_QA_EMAIL (founder household only).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');

loadEnvFile();

const db = require('../src/lib/db');
const familyOverrides = require('../db/family-feature-overrides');
const { PILOT_OVERRIDE_KEY } = require('../src/lib/journey/family-pilot');
const { isActivationFlagEnabled } = require('../src/lib/activation-flags');
const { assertFamilyEligibleForFounderOverride } = require('../src/lib/founder-qa-family-guard');
const overrideCache = require('../src/lib/activation-flag-family-cache');

const ACTIVATION_KEY = 'activation_first_success_v1';

const JOURNEY_GLOBAL_KEYS = [
  'family_journey_context_api',
  'family_journey_evaluator_enabled',
  'family_journey_coach_v1',
  'activation_first_success_v1',
];

function parseArgs(argv) {
  const out = { status: false, enable: false, disable: false, apply: false, familyId: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--status') out.status = true;
    else if (a === '--enable') out.enable = true;
    else if (a === '--disable') out.disable = true;
    else if (a === '--apply') out.apply = true;
    else if (a === '--family-id') out.familyId = argv[++i];
  }
  return out;
}

async function resolveFounderFamilyId(familyIdArg) {
  if (familyIdArg) return familyIdArg;
  const email = process.env.FOUNDER_QA_EMAIL;
  if (!email) throw new Error('FOUNDER_QA_EMAIL or --family-id required');
  const { rows } = await db.query(
    `SELECT family_id FROM parent WHERE lower(email) = lower($1) LIMIT 1`,
    [email.trim()]
  );
  if (!rows[0]) throw new Error('Founder QA parent not found in DB');
  return rows[0].family_id;
}

async function globalFlags() {
  const { rows } = await db.query(
    `SELECT key, enabled FROM feature_flag WHERE key = ANY($1::text[])`,
    [JOURNEY_GLOBAL_KEYS]
  );
  const map = Object.fromEntries(JOURNEY_GLOBAL_KEYS.map((k) => [k, false]));
  for (const row of rows) map[row.key] = Boolean(row.enabled);
  return map;
}

async function familyOverridesStatus(familyId) {
  const journey = await familyOverrides.getActiveOverride(familyId, PILOT_OVERRIDE_KEY);
  const activation = await familyOverrides.getActiveOverride(familyId, ACTIVATION_KEY);
  const activationEffective = await isActivationFlagEnabled(ACTIVATION_KEY, familyId);
  return {
    family_id: familyId,
    family_journey_hem_pilot_v1: journey
      ? { enabled: journey.enabled, reason: journey.reason, expires_at: journey.expires_at }
      : null,
    activation_first_success_v1: activation
      ? { enabled: activation.enabled, reason: activation.reason, expires_at: activation.expires_at }
      : null,
    activation_effective: activationEffective,
  };
}

async function writeAudit(familyId, action, metadata) {
  await db.query(
    `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
     VALUES (NULL, $1, $2, $3::jsonb)`,
    [familyId, action, JSON.stringify(metadata)]
  );
}

async function setOverride(familyId, featureKey, enabled, reason, apply) {
  if (!apply) {
    return { dry_run: true, feature_key: featureKey, enabled };
  }
  if (enabled) {
    const row = await familyOverrides.upsertOverride(familyId, featureKey, true, {
      reason,
      source: 'r1:hem-founder-pilot',
      createdBy: 'r1:hem-founder-pilot',
    });
    overrideCache.invalidateFamilyOverrideCache(familyId, featureKey);
    await writeAudit(familyId, 'family_feature_override_enabled', { feature_key: featureKey, reason });
    return row;
  }
  const row = await familyOverrides.removeOverride(familyId, featureKey);
  overrideCache.invalidateFamilyOverrideCache(familyId, featureKey);
  await writeAudit(familyId, 'family_feature_override_removed', { feature_key: featureKey });
  return row;
}

async function main() {
  const args = parseArgs(process.argv);
  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  if (!diag.ok) {
    console.error('[r1-hem-pilot]', diag.message);
    process.exit(1);
  }

  const familyId = await resolveFounderFamilyId(args.familyId);
  await assertFamilyEligibleForFounderOverride(db, familyId);

  if (args.status || (!args.enable && !args.disable)) {
    const report = {
      step: 'r1-hem-founder-pilot-status',
      global_feature_flag: await globalFlags(),
      family: await familyOverridesStatus(familyId),
      rollback: 'npm run r1:hem-founder-pilot -- --disable --apply',
    };
    console.log(JSON.stringify(report, null, 2));
    if (!args.enable && !args.disable) process.exit(0);
  }

  if (args.enable && args.disable) {
    console.error('[r1-hem-pilot] use --enable or --disable, not both');
    process.exit(1);
  }

  const enable = args.enable;
  const reason = enable ? 'r1-hem-orchestration-pilot' : 'r1-hem-pilot-rollback';

  const plan = {
    family_id: familyId,
    journey_pilot: await setOverride(familyId, PILOT_OVERRIDE_KEY, enable, reason, args.apply),
    activation: await setOverride(familyId, ACTIVATION_KEY, enable, reason, args.apply),
    dry_run: !args.apply,
  };

  console.log(JSON.stringify({
    step: enable ? 'r1-hem-founder-pilot-enable' : 'r1-hem-founder-pilot-disable',
    plan,
    after: await familyOverridesStatus(familyId),
  }, null, 2));

  if (!args.apply) {
    console.error('[r1-hem-pilot] dry-run only — re-run with --apply to write');
  }
}

main()
  .then(() => db.pool.end())
  .catch((err) => {
    console.error('[r1-hem-pilot]', err.message);
    db.pool.end().finally(() => process.exit(1));
  });
