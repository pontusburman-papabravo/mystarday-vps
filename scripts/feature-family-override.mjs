#!/usr/bin/env node
'use strict';

/**
 * Per-family activation flag override (founder QA dark launch).
 *
 * Examples:
 *   npm run feature:family-override -- --family-id <uuid> --feature activation_first_success_v1 --enable --reason founder-dark-launch
 *   npm run feature:family-override -- --family-id <uuid> --feature activation_first_success_v1 --disable --apply
 *   npm run feature:family-override -- --family-id <uuid> --feature activation_first_success_v1 --verify
 *
 * Default: dry-run (no writes). Pass --apply to write.
 * Cannot change global feature_flag — family override only.
 */

const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');

loadEnvFile();

const db = require('../src/lib/db');
const familyOverrides = require('../db/family-feature-overrides');
const overrideCache = require('../src/lib/activation-flag-family-cache');
const { isActivationFlagEnabled } = require('../src/lib/activation-flags');
const { assertFamilyEligibleForFounderOverride } = require('../src/lib/founder-qa-family-guard');

function parseArgs(argv) {
  const out = {
    familyId: null,
    feature: null,
    enable: false,
    disable: false,
    verify: false,
    apply: false,
    reason: null,
    expiresAt: null,
    source: 'cli',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--family-id') out.familyId = argv[++i];
    else if (a === '--feature') out.feature = argv[++i];
    else if (a === '--enable') out.enable = true;
    else if (a === '--disable') out.disable = true;
    else if (a === '--verify') out.verify = true;
    else if (a === '--apply') out.apply = true;
    else if (a === '--reason') out.reason = argv[++i];
    else if (a === '--expires-at') out.expiresAt = argv[++i];
    else if (a === '--source') out.source = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
feature:family-override — per-family activation flag override (QA allowlist)

  --family-id <uuid>
  --feature activation_first_success_v1
  --enable | --disable | --verify
  --reason <text>
  --expires-at <ISO8601>   optional expiry
  --apply                  write changes (default dry-run)
  --source cli             audit source label

Environment: DATABASE_URL required. FOUNDER_QA_EMAIL required unless FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD=1.
Does not modify global feature_flag.
`);
}

async function writeAuditLog(familyId, action, metadata) {
  await db.query(
    `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
     VALUES (NULL, $1, $2, $3::jsonb)`,
    [familyId, action, JSON.stringify(metadata)]
  );
}

async function evaluateStatus(familyId, featureKey) {
  const global = await db.query(
    'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
    [featureKey]
  );
  const override = await familyOverrides.getActiveOverride(familyId, featureKey);
  const effective = await isActivationFlagEnabled(featureKey, familyId);
  return {
    family_id: familyId,
    feature_key: featureKey,
    global_enabled: Boolean(global.rows[0]?.enabled),
    override: override
      ? { enabled: override.enabled, reason: override.reason, expires_at: override.expires_at }
      : null,
    effective_enabled: effective,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  if (!diag.ok) {
    console.error('[feature:family-override]', diag.message);
    process.exit(1);
  }

  if (!args.familyId || !args.feature) {
    console.error('[feature:family-override] --family-id and --feature are required');
    process.exit(1);
  }

  familyOverrides.assertOverrideFeatureKey(args.feature);

  if (!args.enable && !args.disable && !args.verify) {
    console.error('[feature:family-override] pass --enable, --disable, or --verify');
    process.exit(1);
  }

  const lifecycle = await familyOverrides.getFamilyLifecycle(args.familyId);
  if (!lifecycle) {
    console.error('[feature:family-override] family not found:', args.familyId);
    process.exit(1);
  }
  if (lifecycle.archived_at) {
    console.error('[feature:family-override] family is archived — override refused');
    process.exit(1);
  }

  if (args.verify) {
    const status = await evaluateStatus(args.familyId, args.feature);
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  }

  await assertFamilyEligibleForFounderOverride(db, args.familyId);

  const plan = {
    mode: args.enable ? 'enable' : 'disable',
    family_id: args.familyId,
    feature_key: args.feature,
    reason: args.reason || null,
    expires_at: args.expiresAt || null,
    dry_run: !args.apply,
  };

  if (!args.apply) {
    console.log('[feature:family-override] dry-run plan:', JSON.stringify(plan, null, 2));
    const status = await evaluateStatus(args.familyId, args.feature);
    console.log('[feature:family-override] current status:', JSON.stringify(status, null, 2));
    console.log('[feature:family-override] re-run with --apply to write');
    process.exit(0);
  }

  if (args.enable) {
    const row = await familyOverrides.upsertOverride(args.familyId, args.feature, true, {
      reason: args.reason,
      source: args.source,
      createdBy: 'feature:family-override',
      expiresAt: args.expiresAt,
    });
    overrideCache.invalidateFamilyOverrideCache(args.familyId, args.feature);
    await writeAuditLog(args.familyId, 'family_feature_override_enabled', {
      feature_key: args.feature,
      reason: args.reason,
      expires_at: args.expiresAt,
      source: args.source,
    });
    console.log('[feature:family-override] enabled:', JSON.stringify(row, null, 2));
  } else {
    const row = await familyOverrides.removeOverride(args.familyId, args.feature);
    overrideCache.invalidateFamilyOverrideCache(args.familyId, args.feature);
    await writeAuditLog(args.familyId, 'family_feature_override_removed', {
      feature_key: args.feature,
      source: args.source,
    });
    console.log('[feature:family-override] removed:', JSON.stringify(row || { removed: false }, null, 2));
  }

  const status = await evaluateStatus(args.familyId, args.feature);
  console.log('[feature:family-override] verify:', JSON.stringify(status, null, 2));
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
    console.error('[feature:family-override]', err.message);
    shutdown(1);
  });
