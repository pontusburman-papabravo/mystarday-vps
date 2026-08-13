#!/usr/bin/env node
/**
 * Pre-public release gate — rollout-safe readiness check.
 *
 *   npm run release:pre-public-gate
 *
 * Exit 0 = GO (every required section PASS).
 * Exit 1 = BLOCKER.
 * Exit 2 = no blocker, but required checks remain NOT_VERIFIED.
 *
 * Default: zero live writes. Widget flags are asserted OFF and never enabled.
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

const { STATUS, EXIT, WIDGET_EXCLUSION } = require('./lib/pre-public-release-gate/constants.cjs');
const { AREAS, EXTRA_UNIT, EXTRA_DB, MIGRATION_UNIT, MIGRATION_DB } = require('./lib/pre-public-release-gate/manifest.cjs');
const {
  checkMigrationFlagSeeds,
  queryGlobalFlags,
  gateSourceMustNotMutateFlags,
} = require('./lib/pre-public-release-gate/flags.cjs');
const {
  checkKillSwitchSourceDefaults,
  checkLocalProcessKillSwitches,
  checkProdEnvKillSwitches,
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
  deviceQaAttestation,
  localDatabaseIsNotProd,
} = require('./lib/pre-public-release-gate/prod.cjs');
const { classifyOverall, collectBlockers, collectUnverified, humanSummary } = require('./lib/pre-public-release-gate/report.cjs');

function parseArgs(argv) {
  const out = {
    skipTestGate: false,
    jsonOut: path.join(ROOT, 'artifacts/pre-public-release-gate.json'),
    jsonStdout: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-test-gate') out.skipTestGate = true;
    else if (a === '--json') out.jsonStdout = true;
    else if (a === '--json-out') out.jsonOut = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
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
  npm run release:pre-public-gate -- --skip-test-gate   # marks CI health NOT_VERIFIED (cannot GO)
  npm run release:pre-public-gate -- --json             # JSON only on stdout
  npm run release:pre-public-gate -- --json-out <path>

Exit: 0 GO · 1 BLOCKER · 2 NOT_VERIFIED

Never mutates live. Never enables widget or family-device global flags.

Optional env (read-only):
  PRE_PUBLIC_GATE_FLAG_DATABASE_URL   SELECT feature_flag (read-only transaction)
  PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL
  FOUNDER_QA_EMAIL/PASSWORD + SMOKE_BASE_URL   read-only login smoke
  PRE_PUBLIC_GATE_PROD_ENV             JSON of prod kill-switch env values
`);
}

function remainingManual(report) {
  const items = [];
  const prodFlags = report.sections.flags?.checks?.find((c) => c.id === 'prod_global_flags');
  if (prodFlags?.status === STATUS.NOT_VERIFIED) {
    items.push(
      'Prod global feature_flag rows: provide PRE_PUBLIC_GATE_FLAG_DATABASE_URL (read-only) or admin API credentials and re-run. Confirm family-device + widget flags are OFF in live.'
    );
  }
  const prodKill = report.sections.kill_switches?.checks?.find((c) => c.id === 'prod_env');
  if (prodKill?.status === STATUS.NOT_VERIFIED) {
    items.push(
      'Prod kill-switch env: confirm AUTHZ_HARDENING_ENABLED is not false and RATE_LIMIT_ENABLED is not false on the VPS, then set PRE_PUBLIC_GATE_PROD_ENV JSON and re-run.'
    );
  }
  const founder = report.sections.prod_acceptance?.checks?.find((c) => c.id === 'founder_readonly');
  if (founder?.status === STATUS.NOT_VERIFIED) {
    items.push(
      'Founder QA read-only login: set FOUNDER_QA_EMAIL, FOUNDER_QA_PASSWORD, SMOKE_BASE_URL for live session smoke (no writes).'
    );
  }
  if (report.sections.android?.checks?.some((c) => c.id === 'android_signing' && c.status === STATUS.NOT_VERIFIED)) {
    items.push(
      'Android Play upload signing: ANDROID_KEYSTORE_PATH + ANDROID_KEYSTORE_PASSWORD + ANDROID_KEY_ALIAS + GOOGLE_WEB_CLIENT_ID must be present on the build machine (not this gate VM).'
    );
  }
  if (report.sections.ios_native?.checks?.some((c) => c.id === 'ios_device_qa' && c.status !== STATUS.PASS)) {
    items.push(
      'Physical iOS: cold start, select-parent PIN, profile switch, child schedule on a real iPhone WebView/TestFlight. Then set PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS.'
    );
  }
  if (report.sections.android?.checks?.some((c) => c.id === 'android_device_qa' && c.status !== STATUS.PASS)) {
    items.push(
      'Physical Android: same family-device + child runtime path on a mid-range Android WebView/Play internal build. Then set PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS.'
    );
  }
  items.push('Widget: EXCLUDED — paused. Do not run physical WidgetKit/Android widget QA as part of this rollout.');
  return items;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const baseSha = gitSha('origin/main') || gitSha('main');
  const candidateSha = gitSha('HEAD');

  const sections = {};
  const testRuns = [];

  const mutateGuard = gateSourceMustNotMutateFlags();
  const seed = checkMigrationFlagSeeds();

  let migrate = { status: STATUS.PASS, evidence: { skipped: true, reason: 'non_local_database' } };
  if (localDatabaseIsNotProd(process.env.DATABASE_URL)) {
    migrate = runNpmScript('migrate', { label: 'local_migrate' });
  } else if (!process.env.DATABASE_URL) {
    migrate = {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'DATABASE_URL missing; cannot migrate or query local flags' },
    };
  } else {
    migrate = {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'refusing to migrate non-local DATABASE_URL',
        note: 'Use PRE_PUBLIC_GATE_FLAG_DATABASE_URL for read-only prod flag SELECT.',
      },
    };
  }

  const localDbUrl = process.env.DATABASE_URL;
  const localFlags = await queryGlobalFlags(localDbUrl, { label: 'local_database' });
  if (
    migrate.status === STATUS.PASS &&
    localFlags.status === STATUS.NOT_VERIFIED &&
    localFlags.evidence?.reason === 'flag_rows_missing'
  ) {
    localFlags.status = STATUS.BLOCKER;
    localFlags.evidence.reason = 'flag_rows_missing_after_migrate';
  }
  const prodFlags = await checkProdGlobalFlags(process.env);

  sections.flags = {
    title: 'Flags (family-device + widget OFF)',
    status: null,
    checks: [
      { id: 'gate_does_not_mutate_flags', ...mutateGuard },
      { id: 'migration_seeds_off', ...seed },
      { id: 'local_migrate', ...migrate },
      { id: 'local_global_flags', ...localFlags },
      { id: 'prod_global_flags', ...prodFlags },
    ],
  };
  sections.flags.status = [mutateGuard, seed, migrate, localFlags, prodFlags].some((c) => c.status === STATUS.BLOCKER)
    ? STATUS.BLOCKER
    : [prodFlags, localFlags, migrate].some((c) => c.status === STATUS.NOT_VERIFIED)
      ? STATUS.NOT_VERIFIED
      : STATUS.PASS;
  if (seed.status === STATUS.PASS && mutateGuard.status === STATUS.PASS && localFlags.status === STATUS.PASS && prodFlags.status === STATUS.NOT_VERIFIED) {
    sections.flags.status = STATUS.NOT_VERIFIED;
    sections.flags.summary = 'Code/local flags OFF; live global flags not verified.';
  } else if (sections.flags.status === STATUS.PASS) {
    sections.flags.summary = 'Family-device and widget global flags are OFF in migrations, local DB, and prod.';
  }

  const ksSource = checkKillSwitchSourceDefaults();
  const ksLocal = checkLocalProcessKillSwitches();
  const ksProd = checkProdEnvKillSwitches();
  sections.kill_switches = {
    title: 'Kill switches',
    checks: [
      { id: 'source_defaults', ...ksSource },
      { id: 'local_process', ...ksLocal },
      { id: 'prod_env', ...ksProd },
    ],
  };
  sections.kill_switches.status = [ksSource, ksProd].some((c) => c.status === STATUS.BLOCKER)
    ? STATUS.BLOCKER
    : ksProd.status === STATUS.NOT_VERIFIED
      ? STATUS.NOT_VERIFIED
      : STATUS.PASS;
  sections.kill_switches.summary =
    ksSource.status === STATUS.PASS
      ? 'Authz + rate-limit source defaults are fail-secure (ON unless env=false). Prod env unverified unless PRE_PUBLIC_GATE_PROD_ENV is set.'
      : 'Kill-switch source default regression.';

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
    summary: 'Immutable files, destructive-SQL contract, rollback gate, IAP safety, flag seeds. Local migrate only.',
    checks: [
      { id: 'flag_seeds', ...seed },
      { id: 'local_migrate', ...migrate },
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

    const mapped = mapFilesToAreaStatus(area, testRuns);
    const checks = [{ id: 'automated_tests', ...mapped }];

    if (key === 'android') {
      const hardening = runNodeScript('scripts/verify-android-release-hardening.mjs', {
        label: 'android_hardening',
      });
      const signing = runNodeScript('scripts/assert-android-release-signing.mjs', {
        label: 'android_signing',
        allowNonZeroAs: STATUS.NOT_VERIFIED,
      });
      const device = deviceQaAttestation(
        process.env,
        'PRE_PUBLIC_GATE_ANDROID_DEVICE_QA',
        'physical Android mid-range WebView'
      );
      checks.push({ id: 'android_hardening', ...hardening });
      checks.push({ id: 'android_signing', ...signing });
      checks.push({ id: 'android_device_qa', ...device });
      const statuses = [mapped.status, hardening.status, device.status];
      sections.android = {
        title: area.title,
        status: statuses.includes(STATUS.BLOCKER)
          ? STATUS.BLOCKER
          : statuses.includes(STATUS.NOT_VERIFIED)
            ? STATUS.NOT_VERIFIED
            : STATUS.PASS,
        summary:
          'Source hardening + AAB/Play contracts. Physical device QA requires PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS.',
        checks,
      };
      continue;
    }

    if (key === 'ios_native') {
      const device = deviceQaAttestation(
        process.env,
        'PRE_PUBLIC_GATE_IOS_DEVICE_QA',
        'physical iPhone WebView / TestFlight'
      );
      checks.push({ id: 'ios_device_qa', ...device });
      const statuses = [mapped.status, device.status];
      sections.ios_native = {
        title: area.title,
        status: statuses.includes(STATUS.BLOCKER)
          ? STATUS.BLOCKER
          : statuses.includes(STATUS.NOT_VERIFIED)
            ? STATUS.NOT_VERIFIED
            : STATUS.PASS,
        summary:
          'ATT/no-ATT/localization contracts. Physical iPhone QA requires PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS.',
        checks,
      };
      continue;
    }

    sections[key] = {
      title: area.title,
      status: mapped.status,
      summary: `${area.covers.join('; ')}. Tests: ${(area.unit.length + area.db.length)} files.`,
      checks,
    };
  }

  const founder = await founderReadOnlyAcceptance(process.env);
  const pilot = prodPilotPolicy(process.env);
  const prodAcceptanceBlocker = [founder, pilot].some((c) => c.status === STATUS.BLOCKER);
  sections.prod_acceptance = {
    title: 'Prod acceptance',
    status: prodAcceptanceBlocker ? STATUS.BLOCKER : STATUS.PASS,
    optional: true,
    summary:
      founder.status === STATUS.PASS
        ? 'Read-only founder QA login succeeded; no writes.'
        : 'Optional. Missing founder/prod credentials is not a blocker; see remaining manual work.',
    checks: [
      { id: 'founder_readonly', ...founder },
      { id: 'prod_pilot_policy', ...pilot },
    ],
  };

  const report = {
    schema: 'stjarndag.pre_public_release_gate.v1',
    generatedAt: new Date().toISOString(),
    baseSha,
    candidateSha,
    exactCommand: 'NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run release:pre-public-gate',
    widget: 'EXCLUDED — PAUSED',
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
