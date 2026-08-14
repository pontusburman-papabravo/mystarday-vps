#!/usr/bin/env node
/**
 * Pre-public release gate — rollout-safe readiness check.
 *
 *   npm run release:pre-public-gate
 *   npm run release:pre-public-gate -- --profile=native-store
 *
 * Exit 0 = GO (profile-specific required sections PASS).
 * Exit 1 = BLOCKER.
 * Exit 2 = no blocker, but required checks remain NOT_VERIFIED.
 *
 * Default profile: public-runtime (web/server rollout — no store binary required).
 * Widget flags are asserted OFF and never enabled.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const { loadEnvFile } = require('../src/lib/load-env.js');
loadEnvFile();

const { STATUS, EXIT, WIDGET_EXCLUSION, PROFILES, DEFAULT_PROFILE } = require('./lib/pre-public-release-gate/constants.cjs');
const { AREAS, EXTRA_UNIT, EXTRA_DB, MIGRATION_UNIT, MIGRATION_DB } = require('./lib/pre-public-release-gate/manifest.cjs');
const {
  checkMigrationFlagSeeds,
  queryGlobalFlags,
  gateSourceMustNotMutateFlags,
} = require('./lib/pre-public-release-gate/flags.cjs');
const { repairMissingFeatureFlagSeeds, isRepairAllowedDatabase } = require('./lib/pre-public-release-gate/local-flag-repair.cjs');
const {
  checkKillSwitchSourceDefaults,
  checkLocalProcessKillSwitches,
  checkProdKillSwitches,
} = require('./lib/pre-public-release-gate/kill-switches.cjs');
const {
  runNodeTest,
  runNpmScript,
  runNodeScript,
  mapFilesToAreaStatus,
} = require('./lib/pre-public-release-gate/run-checks.cjs');
const {
  checkProdGlobalFlags,
  founderReadOnlyAcceptance,
  prodPilotPolicy,
  checkProdActivityTimerRuntime,
  activityTimerProdPilotPolicy,
  deviceQaAttestation,
} = require('./lib/pre-public-release-gate/prod.cjs');
const { gateDestructiveTestDatabaseCheck } = require('./lib/test-database-safety.cjs');
const { classifyOverall, collectBlockers, collectUnverified, humanSummary, worstStatus } = require('./lib/pre-public-release-gate/report.cjs');

function parseArgs(argv) {
  const out = {
    skipTestGate: false,
    jsonOut: path.join(ROOT, 'artifacts/pre-public-release-gate.json'),
    jsonStdout: false,
    help: false,
    profile: DEFAULT_PROFILE,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-test-gate') out.skipTestGate = true;
    else if (a === '--json') out.jsonStdout = true;
    else if (a === '--json-out') out.jsonOut = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--profile=')) out.profile = a.slice('--profile='.length);
    else if (a === '--profile') out.profile = argv[++i];
  }
  if (![PROFILES.PUBLIC_RUNTIME, PROFILES.NATIVE_STORE].includes(out.profile)) {
    console.error(`Unknown profile: ${out.profile}. Use public-runtime or native-store.`);
    process.exit(EXIT.BLOCKER);
  }
  return out;
}

function gitSha(ref) {
  try {
    return execSync(`git rev-parse ${ref}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function printHelp() {
  console.log(`
release:pre-public-gate — public rollout readiness

  npm run release:pre-public-gate
  npm run release:pre-public-gate -- --profile=public-runtime   (default)
  npm run release:pre-public-gate -- --profile=native-store
  npm run release:pre-public-gate -- --skip-test-gate
  npm run release:pre-public-gate -- --json

Exit: 0 GO · 1 BLOCKER · 2 NOT_VERIFIED

Profiles:
  public-runtime  — web/server rollout; native store signing/device QA is advisory only
  native-store    — requires Android/iOS store release evidence

Never mutates live. Never enables widget or family-device global flags.

Optional env (read-only):
  PRE_PUBLIC_GATE_FLAG_DATABASE_URL   SELECT feature_flag (read-only transaction)
  PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL
    — GET /api/admin/feature-flags + GET /api/admin/release-readiness
      (authzHardeningEnabled, rateLimitEnabled, activityTimerV2Available)
  PRE_PUBLIC_GATE_ACTIVITY_TIMER_PILOT=1   optional — run npm run activity-timer:prod-pilot separately
  FOUNDER_QA_EMAIL/PASSWORD + SMOKE_BASE_URL   read-only login smoke
  PRE_PUBLIC_GATE_PROD_ENV             JSON fallback for prod kill-switch env
  PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS   native-store profile only (advisory for public-runtime)
  PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS
`);
}

function remainingManual(report) {
  const items = [];
  const profile = report.profile || DEFAULT_PROFILE;

  const prodFlags = report.sections.flags?.checks?.find((c) => c.id === 'prod_global_flags');
  if (prodFlags?.status === STATUS.NOT_VERIFIED) {
    items.push(
      'Prod global feature_flag rows: provide PRE_PUBLIC_GATE_FLAG_DATABASE_URL (read-only) or admin API credentials and re-run.'
    );
  }

  const prodKill = report.sections.kill_switches?.checks?.find((c) => c.id === 'prod_kill_switches');
  if (prodKill?.status === STATUS.NOT_VERIFIED) {
    items.push(
      'Prod kill-switches: set PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL for GET /api/admin/release-readiness.'
    );
  }

  const atRuntime = report.sections.activity_timer?.checks?.find((c) => c.id === 'prod_runtime');
  if (atRuntime?.status === STATUS.NOT_VERIFIED) {
    items.push(
      'Activity Timer prod runtime: same admin credentials expose activityTimerV2Available on GET /api/admin/release-readiness.'
    );
  }
  if (atRuntime?.status === STATUS.BLOCKER) {
    items.push('Activity Timer blocked in prod: ACTIVITY_TIMER_V2_DISABLED=true — remove kill switch before marketing.');
  }

  if (profile === PROFILES.NATIVE_STORE) {
    if (report.sections.android?.checks?.some((c) => c.id === 'android_signing' && c.status === STATUS.NOT_VERIFIED && !c.advisory)) {
      items.push('Android Play upload signing secrets required for native-store profile.');
    }
    if (report.sections.ios_native?.checks?.some((c) => c.id === 'ios_device_qa' && c.status !== STATUS.PASS && !c.advisory)) {
      items.push('Physical iOS QA: set PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS after TestFlight evidence.');
    }
    if (report.sections.android?.checks?.some((c) => c.id === 'android_device_qa' && c.status !== STATUS.PASS && !c.advisory)) {
      items.push('Physical Android QA: set PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS after Play internal build evidence.');
    }
  }

  items.push('Widget: EXCLUDED — paused. Do not run WidgetKit/Android widget acceptance as part of this rollout.');
  return items;
}

async function runLocalMigrateAndRepair() {
  const safety = gateDestructiveTestDatabaseCheck(process.env);
  if (safety.status !== 'PASS') {
    return {
      status: STATUS.BLOCKER,
      evidence: {
        code: safety.evidence?.code || 'REFUSED_PRODUCTION_DATABASE_FOR_TESTS', // pragma: allowlist secret
        reason: safety.evidence?.reason || 'destructive_test_database_refused',
        reasons: safety.evidence?.reasons,
        meta: safety.evidence?.meta,
        note: 'Set disposable TEST_DATABASE_URL + TEST_DB_DESTRUCTIVE_CONFIRM=1. prod DATABASE_URL must never be the test database.',
      },
    };
  }

  const { testDatabaseUrl } = safety.evidence;
  const { buildDestructiveTestChildEnv } = require('./lib/test-database-safety.cjs');

  const migrate = runNpmScript('migrate', {
    label: 'local_migrate',
    extraEnv: buildDestructiveTestChildEnv(process.env, { NODE_ENV: 'test' }), // pragma: allowlist secret
  });
  if (migrate.status !== STATUS.PASS) return migrate;

  let repair = { status: STATUS.PASS, evidence: { skipped: true, reason: 'not_needed' } };
  if (isRepairAllowedDatabase(testDatabaseUrl, process.env)) {
    try {
      const result = await repairMissingFeatureFlagSeeds(testDatabaseUrl, { env: process.env });
      repair = {
        status: STATUS.PASS,
        evidence: { ...result, note: 'Validated disposable test DB repair (ON CONFLICT DO NOTHING)' },
      };
    } catch (err) {
      if (err.code === 'REPAIR_REFUSED') {
        repair = { status: STATUS.BLOCKER, evidence: { reason: err.message, code: err.code } };
      } else {
        repair = { status: STATUS.NOT_VERIFIED, evidence: { reason: 'repair_failed', error: err.message } };
      }
    }
  } else {
    repair = {
      status: STATUS.BLOCKER,
      evidence: { reason: 'local_flag_repair_refused', note: 'TEST_DATABASE_URL is not a validated disposable test database' },
    };
  }

  const combinedStatus = repair.status === STATUS.BLOCKER ? STATUS.BLOCKER : migrate.status;
  return {
    status: combinedStatus,
    evidence: { migrate: migrate.evidence, repair: repair.evidence, testDatabaseUrl },
  };
}

function buildAndroidSection(profile, testRuns) {
  const area = AREAS.android;
  const mapped = mapFilesToAreaStatus(area, testRuns);
  const hardening = runNodeScript('scripts/verify-android-release-hardening.mjs', {
    label: 'android_hardening',
  });
  const signing = runNodeScript('scripts/assert-android-release-signing.mjs', {
    label: 'android_signing',
    allowNonZeroAs: profile === PROFILES.PUBLIC_RUNTIME ? STATUS.NOT_VERIFIED : STATUS.NOT_VERIFIED,
  });
  const device = deviceQaAttestation(
    process.env,
    'PRE_PUBLIC_GATE_ANDROID_DEVICE_QA',
    'physical Android mid-range WebView'
  );

  const isPublicRuntime = profile === PROFILES.PUBLIC_RUNTIME;
  const signingCheck = { id: 'android_signing', ...signing, advisory: isPublicRuntime };
  const deviceCheck = { id: 'android_device_qa', ...device, advisory: isPublicRuntime };
  const checks = [
    { id: 'automated_tests', ...mapped },
    { id: 'android_hardening', ...hardening },
    signingCheck,
    deviceCheck,
  ];

  const voting = isPublicRuntime
    ? [mapped.status, hardening.status]
    : [mapped.status, hardening.status, signing.status, device.status];

  return {
    title: area.title,
    status: worstStatus(voting),
    summary: isPublicRuntime
      ? 'Source hardening + contracts. Signing and physical device QA are advisory for public-runtime.'
      : 'Source hardening + AAB/Play contracts + signing + physical device QA required.',
    checks,
  };
}

async function buildActivityTimerSection(testRuns) {
  const area = AREAS.activity_timer;
  const mapped = mapFilesToAreaStatus(area, testRuns);
  const prodRuntime = await checkProdActivityTimerRuntime(process.env);
  const pilot = activityTimerProdPilotPolicy(process.env);
  const checks = [
    { id: 'automated_tests', ...mapped },
    { id: 'prod_runtime', ...prodRuntime },
    { id: 'prod_pilot_policy', ...pilot, advisory: true },
  ];
  return {
    title: area.title,
    status: worstStatus([mapped.status, prodRuntime.status]),
    summary:
      '24-scenario matrix + prod activityTimerV2Available via release-readiness. Disposable at-pilot prod pilot is separate runtime evidence. Legacy Puppeteer VPS smoke is advisory — missing GUI libs on prod app server must not block GO.',
    checks,
  };
}

function buildIosSection(profile, testRuns) {
  const area = AREAS.ios_native;
  const mapped = mapFilesToAreaStatus(area, testRuns);
  const device = deviceQaAttestation(
    process.env,
    'PRE_PUBLIC_GATE_IOS_DEVICE_QA',
    'physical iPhone WebView / TestFlight'
  );
  const isPublicRuntime = profile === PROFILES.PUBLIC_RUNTIME;
  const deviceCheck = { id: 'ios_device_qa', ...device, advisory: isPublicRuntime };
  const checks = [{ id: 'automated_tests', ...mapped }, deviceCheck];
  const voting = isPublicRuntime ? [mapped.status] : [mapped.status, device.status];

  return {
    title: area.title,
    status: worstStatus(voting),
    summary: isPublicRuntime
      ? 'ATT/localization source contracts. Physical iPhone QA is advisory for public-runtime.'
      : 'ATT/localization contracts + physical iPhone QA required.',
    checks,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const baseSha = gitSha('origin/main') || gitSha('main');
  const candidateSha = gitSha('HEAD');

  const destructiveDbSafety = gateDestructiveTestDatabaseCheck(process.env);
  if (destructiveDbSafety.status !== 'PASS') {
    const report = {
      profile: args.profile,
      candidateSha,
      baseSha,
      overallStatus: STATUS.BLOCKER,
      exitCode: EXIT.BLOCKER,
      decision: 'BLOCKER — destructive test database refused',
      destructiveDbSafety,
      sections: {
        ci_health: {
          title: 'CI / test health',
          status: STATUS.BLOCKER,
          summary: 'Refused before migrate/test:gate — prod or unvalidated DATABASE_URL cannot be used for tests.',
          checks: [{ id: 'destructive_test_database', ...destructiveDbSafety }],
        },
      },
    };
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
    fs.writeFileSync(args.jsonOut, JSON.stringify(report, null, 2));
    console.error(
      `[pre-public-release-gate] ${destructiveDbSafety.evidence?.code || 'REFUSED_PRODUCTION_DATABASE_FOR_TESTS'}: ` + // pragma: allowlist secret
        `${destructiveDbSafety.evidence?.reason || 'destructive test database refused'}`
    );
    if (args.jsonStdout) console.log(JSON.stringify(report, null, 2));
    process.exit(EXIT.BLOCKER);
  }

  const sections = {};
  const testRuns = [];

  const mutateGuard = gateSourceMustNotMutateFlags();
  const seed = checkMigrationFlagSeeds();
  const migrate = await runLocalMigrateAndRepair();

  const localDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  const localFlags = await queryGlobalFlags(localDbUrl, { label: 'local_database' });
  if (
    migrate.status === STATUS.PASS &&
    localFlags.status === STATUS.NOT_VERIFIED &&
    localFlags.evidence?.reason === 'flag_rows_missing'
  ) {
    localFlags.status = STATUS.BLOCKER;
    localFlags.evidence.reason = 'flag_rows_missing_after_local_repair';
  }
  const prodFlags = await checkProdGlobalFlags(process.env);

  sections.flags = {
    title: 'Flags (family-device + widget OFF)',
    status: null,
    checks: [
      { id: 'gate_does_not_mutate_flags', ...mutateGuard },
      { id: 'migration_seeds_off', ...seed },
      { id: 'local_migrate_and_repair', ...migrate },
      { id: 'local_global_flags', ...localFlags },
      { id: 'prod_global_flags', ...prodFlags },
    ],
  };
  sections.flags.status = [mutateGuard, seed, migrate, localFlags, prodFlags].some((c) => c.status === STATUS.BLOCKER)
    ? STATUS.BLOCKER
    : [prodFlags, localFlags, migrate].some((c) => c.status === STATUS.NOT_VERIFIED)
      ? STATUS.NOT_VERIFIED
      : STATUS.PASS;

  const ksSource = checkKillSwitchSourceDefaults();
  const ksLocal = checkLocalProcessKillSwitches();
  const ksProd = await checkProdKillSwitches(process.env);
  sections.kill_switches = {
    title: 'Kill switches',
    checks: [
      { id: 'source_defaults', ...ksSource },
      { id: 'local_process', ...ksLocal },
      { id: 'prod_kill_switches', ...ksProd },
    ],
  };
  sections.kill_switches.status = [ksSource, ksProd].some((c) => c.status === STATUS.BLOCKER)
    ? STATUS.BLOCKER
    : ksProd.status === STATUS.NOT_VERIFIED
      ? STATUS.NOT_VERIFIED
      : STATUS.PASS;

  const credentials = runNpmScript('check:credentials', { label: 'credentials' });
  const extrasUnit = runNodeTest(EXTRA_UNIT, { concurrency: 4, label: 'extra_unit' });
  const extrasDb = runNodeTest(EXTRA_DB, { concurrency: 1, forceExit: true, label: 'extra_db' });
  testRuns.push(extrasUnit, extrasDb);

  let gateUnit = { status: STATUS.NOT_VERIFIED, evidence: { reason: 'skipped' } };
  let gateDb = { status: STATUS.NOT_VERIFIED, evidence: { reason: 'skipped' } };
  if (args.skipTestGate) {
    sections.ci_health = {
      title: 'CI / test health',
      status: STATUS.NOT_VERIFIED,
      summary: '--skip-test-gate set; test:gate not run. Cannot GO.',
      checks: [
        { id: 'credentials', ...credentials },
        { id: 'test_gate_unit', ...gateUnit },
        { id: 'test_gate_db', ...gateDb },
        { id: 'extra_unit', ...extrasUnit },
        { id: 'extra_db', ...extrasDb },
      ],
    };
  } else {
    gateUnit = runNpmScript('test:gate:unit', { label: 'test_gate_unit' });
    gateDb = runNpmScript('test:gate:db', { label: 'test_gate_db' });
    testRuns.push(gateUnit, gateDb);
    const ciStatus = [credentials, extrasUnit, extrasDb, gateUnit, gateDb].some((c) => c.status === STATUS.BLOCKER)
      ? STATUS.BLOCKER
      : STATUS.PASS;
    sections.ci_health = {
      title: 'CI / test health',
      status: ciStatus,
      summary:
        ciStatus === STATUS.PASS
          ? 'check:credentials + extra scoped tests + test:gate unit/db passed.'
          : 'A CI/test health command failed — see checks.',
      checks: [
        { id: 'credentials', ...credentials },
        { id: 'extra_unit', ...extrasUnit },
        { id: 'extra_db', ...extrasDb },
        { id: 'test_gate_unit', ...gateUnit },
        { id: 'test_gate_db', ...gateDb },
      ],
    };
  }

  const migUnit = runNodeTest(MIGRATION_UNIT, { concurrency: 4, label: 'migration_unit' });
  const migDb = runNodeTest(MIGRATION_DB, { concurrency: 1, forceExit: true, label: 'migration_db' });
  testRuns.push(migUnit, migDb);
  sections.migrations = {
    title: 'Migrations / contracts',
    status: [migUnit, migDb, seed, migrate].some((c) => c.status === STATUS.BLOCKER)
      ? STATUS.BLOCKER
      : [migUnit, migDb, migrate].some((c) => c.status === STATUS.NOT_VERIFIED)
        ? STATUS.NOT_VERIFIED
        : STATUS.PASS,
    summary: 'Immutable files, destructive-SQL contract, rollback gate, IAP safety, flag seeds. Local migrate + local-only repair.',
    checks: [
      { id: 'flag_seeds', ...seed },
      { id: 'local_migrate_and_repair', ...migrate },
      { id: 'migration_unit', ...migUnit },
      { id: 'migration_db', ...migDb },
    ],
  };

  for (const [key, area] of Object.entries(AREAS)) {
    if (area.excluded) {
      sections[key] = {
        title: area.title,
        status: STATUS.EXCLUDED,
        excluded: true,
        summary: WIDGET_EXCLUSION.reason,
        checks: [
          {
            id: 'widget_flags_off',
            status: [seed, localFlags, prodFlags].some((c) => c.status === STATUS.BLOCKER)
              ? STATUS.BLOCKER
              : prodFlags.status === STATUS.NOT_VERIFIED
                ? STATUS.NOT_VERIFIED
                : STATUS.PASS,
            evidence: {
              exclusion: WIDGET_EXCLUSION,
              seed: seed.status,
              local: localFlags.status,
              prod: prodFlags.status,
            },
          },
        ],
      };
      continue;
    }

    if (key === 'android') {
      sections.android = buildAndroidSection(args.profile, testRuns);
      continue;
    }
    if (key === 'ios_native') {
      sections.ios_native = buildIosSection(args.profile, testRuns);
      continue;
    }
    if (key === 'activity_timer') {
      sections.activity_timer = await buildActivityTimerSection(testRuns);
      continue;
    }

    const mapped = mapFilesToAreaStatus(area, testRuns);
    sections[key] = {
      title: area.title,
      status: mapped.status,
      summary: `${area.covers.join('; ')}. Tests: ${(area.unit.length + area.db.length)} files.`,
      checks: [{ id: 'automated_tests', ...mapped }],
    };
  }

  const founder = await founderReadOnlyAcceptance(process.env);
  const pilot = prodPilotPolicy(process.env);
  sections.prod_acceptance = {
    title: 'Prod acceptance',
    status: [founder, pilot].some((c) => c.status === STATUS.BLOCKER) ? STATUS.BLOCKER : STATUS.PASS,
    optional: true,
    summary: 'Optional founder read-only login; not required for public-runtime GO.',
    checks: [
      { id: 'founder_readonly', ...founder },
      { id: 'prod_pilot_policy', ...pilot },
    ],
  };

  const report = {
    schema: 'stjarndag.pre_public_release_gate.v2',
    generatedAt: new Date().toISOString(),
    profile: args.profile,
    baseSha,
    candidateSha,
    exactCommand: `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run release:pre-public-gate -- --profile=${args.profile}`,
    widget: 'EXCLUDED_PAUSED',
    sections,
    remainingManualWork: [],
  };

  const classified = classifyOverall(report);
  Object.assign(report, classified);
  report.blockers = collectBlockers(report);
  report.unverified = collectUnverified(report);
  report.remainingManualWork = remainingManual(report);

  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
  fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`);

  if (args.jsonStdout) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${humanSummary(report)}\n\n---JSON---\n${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`\nJSON written to ${args.jsonOut}\n`);
  }

  process.exit(classified.exitCode);
}

main().catch((err) => {
  console.error('[pre-public-release-gate] fatal:', err.message);
  process.exit(EXIT.BLOCKER);
});
