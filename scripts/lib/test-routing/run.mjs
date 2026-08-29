import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * Run node --test on deduplicated test files with wall-clock timing.
 * @param {string} root
 * @param {string[]} tests
 * @param {object} [options]
 */
export function runTests(root, tests, options = {}) {
  const started = Date.now();
  if (!tests.length) {
    return {
      ok: true,
      exitCode: 0,
      wallMs: 0,
      tests: [],
      skipped: true,
      reason: options.skipReason || 'no_tests',
    };
  }

  const dbTests = tests.filter((t) => needsDb(t));
  const unitTests = tests.filter((t) => !needsDb(t));

  const results = [];
  let exitCode = 0;

  if (unitTests.length) {
    const r = spawnNodeTest(root, unitTests, { concurrency: 4, forceExit: false });
    results.push({ bucket: 'unit', ...r });
    if (r.exitCode !== 0) exitCode = r.exitCode;
  }

  if (dbTests.length) {
    const r = spawnNodeTest(root, dbTests, { concurrency: 1, forceExit: true });
    results.push({ bucket: 'db', ...r });
    if (r.exitCode !== 0) exitCode = r.exitCode;
  }

  return {
    ok: exitCode === 0,
    exitCode,
    wallMs: Date.now() - started,
    tests,
    results,
  };
}

/**
 * Heuristic: integration tests and known db-heavy files need test DB.
 * @param {string} testFile
 */
function needsDb(testFile) {
  return (
    testFile.includes('.integration.')
    || testFile.includes('integration.test.js')
    || /test\/(auth-integration|setup-test-db|db-test-lock|migration)/.test(testFile)
  );
}

/**
 * @param {string} root
 * @param {string[]} tests
 * @param {{ concurrency: number, forceExit: boolean }} opts
 */
function spawnNodeTest(root, tests, opts) {
  const started = Date.now();
  const args = [
    '-r', './test/helpers/apply-test-database-env.js',
    '--test',
    `--test-concurrency=${opts.concurrency}`,
  ];
  if (opts.forceExit) args.push('--test-force-exit');
  args.push(...tests);

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    TEST_DB_DESTRUCTIVE_CONFIRM: process.env.TEST_DB_DESTRUCTIVE_CONFIRM || '1',
    REQUIRE_EMAIL_VERIFICATION: 'false',
  };

  const proc = spawnSync(process.execPath, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: false,
  });

  return {
    exitCode: proc.status ?? 1,
    wallMs: Date.now() - started,
    count: tests.length,
  };
}

/**
 * Run domain gate with per-domain timing breakdown (sequential per domain for reporting).
 * @param {string} root
 * @param {Record<string, string[]>} perDomain
 */
export function runDomainGateWithTiming(root, perDomain) {
  const timing = {};
  let allOk = true;
  let totalMs = 0;
  const executed = new Set();

  for (const [domain, tests] of Object.entries(perDomain)) {
    const unique = tests.filter((t) => !executed.has(t));
    unique.forEach((t) => executed.add(t));
    const started = Date.now();
    const result = runTests(root, unique);
    timing[domain] = {
      wallMs: Date.now() - started,
      testCount: unique.length,
      ok: result.ok,
      exitCode: result.exitCode,
    };
    totalMs += timing[domain].wallMs;
    if (!result.ok) allOk = false;
  }

  return { ok: allOk, wallMs: totalMs, timing, executedCount: executed.size };
}
