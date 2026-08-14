'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  REFUSED_CODE,
  assertDestructiveTestDatabaseAllowed,
  tryAssertDestructiveTestDatabaseAllowed,
  gateDestructiveTestDatabaseCheck,
  buildDestructiveTestChildEnv,
  identityHashSafe,
} = require('../scripts/lib/test-database-safety.cjs');

const PROD_LOCAL = 'postgresql://stjarndag:secret@localhost:5432/stjarndag';
const PROD_REMOTE = 'postgresql://app:secret@db.example.com:5432/stjarndag';
const DISPOSABLE_LOCAL = 'postgresql://test:test@localhost:5432/stjarndag_test';
const DISPOSABLE_REMOTE = 'postgresql://ci:secret@ci-db.example.com:5432/test_ci_gate';

function baseEnv(overrides = {}) {
  return {
    NODE_ENV: 'test', // pragma: allowlist secret
    TEST_DB_DESTRUCTIVE_CONFIRM: '1',
    ...overrides,
  };
}

test('1. prod DATABASE_URL without TEST_DATABASE_URL => REFUSE', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({ DATABASE_URL: PROD_LOCAL })
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, REFUSED_CODE);
  assert.equal(result.reason, 'missing_test_database_url');
});

test('2. TEST_DATABASE_URL equals application DATABASE_URL (prod) => REFUSE', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      DATABASE_URL: PROD_LOCAL,
      TEST_DATABASE_URL: PROD_LOCAL,
    })
  );
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('test_url_equals_application_database_url'));
});

test('2b. TEST_DATABASE_URL equals DATABASE_URL when both disposable => ALLOW', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      DATABASE_URL: DISPOSABLE_LOCAL,
      TEST_DATABASE_URL: DISPOSABLE_LOCAL,
    })
  );
  assert.equal(result.ok, true);
});

test('3. localhost prod + APP_DEPLOY_PRODUCTION=1 => REFUSE', () => { // pragma: allowlist secret
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      DATABASE_URL: PROD_LOCAL,
      TEST_DATABASE_URL: DISPOSABLE_LOCAL,
      APP_DEPLOY_PRODUCTION: '1', // pragma: allowlist secret
    })
  );
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('app_deploy_prod')); // pragma: allowlist secret
});

test('4. protected DB name / prod identity hash => REFUSE', () => {
  const byName = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      TEST_DATABASE_URL: PROD_LOCAL,
      PROTECTED_DATABASE_NAME: 'stjarndag',
    })
  );
  assert.equal(byName.ok, false);
  assert.ok(byName.reasons.includes('protected_database_name'));

  const byHash = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      TEST_DATABASE_URL: PROD_LOCAL,
      EXPECTED_DATABASE_IDENTITY_HASH: identityHashSafe(PROD_LOCAL),
    })
  );
  assert.equal(byHash.ok, false);
  assert.ok(byHash.reasons.includes('matches_expected_prod_identity_hash')); // pragma: allowlist secret
});

test('5. localhost stjarndag_test + explicit confirmation => ALLOW', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({ TEST_DATABASE_URL: DISPOSABLE_LOCAL })
  );
  assert.equal(result.testDatabaseUrl, DISPOSABLE_LOCAL);
});

test('6. remote disposable CI DB + confirmation => ALLOW', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({ TEST_DATABASE_URL: DISPOSABLE_REMOTE })
  );
  assert.equal(result.testDatabaseUrl, DISPOSABLE_REMOTE);
});

test('7. VPS-like release gate env => BLOCKER before destructive child', () => {
  const gate = gateDestructiveTestDatabaseCheck(
    baseEnv({
      DATABASE_URL: PROD_LOCAL,
      APP_DEPLOY_PRODUCTION: '1', // pragma: allowlist secret
    })
  );
  assert.equal(gate.status, 'BLOCKER');
  assert.equal(gate.evidence.code, REFUSED_CODE);
});

test('8. canonical GitHub CI test DB env => PASS', () => {
  const gate = gateDestructiveTestDatabaseCheck(
    baseEnv({ TEST_DATABASE_URL: DISPOSABLE_LOCAL })
  );
  assert.equal(gate.status, 'PASS');
});

test('9. TEST_SKIP_MIGRATE=1 does not bypass safety', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      DATABASE_URL: PROD_LOCAL,
      TEST_SKIP_MIGRATE: '1',
    })
  );
  assert.equal(result.ok, false);
});

test('10. TEST_DB_DESTRUCTIVE_CONFIRM=1 alone against prod => REFUSE', () => {
  const result = tryAssertDestructiveTestDatabaseAllowed(
    baseEnv({
      TEST_DATABASE_URL: PROD_LOCAL,
      TEST_DB_DESTRUCTIVE_CONFIRM: '1',
    })
  );
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('database_name_not_disposable'));
});

test('11. localhost alone is never treated as safety evidence', () => {
  assert.equal(
    tryAssertDestructiveTestDatabaseAllowed(
      baseEnv({ TEST_DATABASE_URL: PROD_LOCAL })
    ).ok,
    false
  );
  assert.equal(
    tryAssertDestructiveTestDatabaseAllowed(
      baseEnv({ TEST_DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/stjarndag' })
    ).ok,
    false
  );
});

test('12. setupTestDb({ truncate: false }) against prod => REFUSE', async () => {
  const prev = { ...process.env };
  process.env.NODE_ENV = 'test'; // pragma: allowlist secret
  process.env.DATABASE_URL = PROD_LOCAL;
  process.env.TEST_DATABASE_URL = PROD_LOCAL;
  process.env.TEST_DB_DESTRUCTIVE_CONFIRM = '1';
  delete process.env.TEST_SKIP_MIGRATE;

  const { setupTestDb } = require('./helpers/setup.js');
  let db;
  try {
    db = await setupTestDb({ truncate: false });
    assert.fail('expected setupTestDb to refuse prod database');
  } catch (err) {
    assert.equal(err.code, REFUSED_CODE);
  } finally {
    if (db && !db.skip) await db.cleanup();
  }

  Object.assign(process.env, prev);
});

test('buildDestructiveTestChildEnv maps validated TEST_DATABASE_URL to DATABASE_URL', () => {
  const child = buildDestructiveTestChildEnv(baseEnv({ TEST_DATABASE_URL: DISPOSABLE_LOCAL }));
  assert.equal(child.DATABASE_URL, DISPOSABLE_LOCAL);
  assert.equal(child.TEST_DATABASE_URL, DISPOSABLE_LOCAL);
  assert.equal(child.NODE_ENV, 'test');
});

test('release gate orchestrator refuses VPS prod DATABASE_URL before migrate', () => {
  const script = path.join(ROOT, 'scripts/pre-public-release-gate.mjs');
  const r = require('child_process').spawnSync(
    process.execPath,
    [script, '--profile=public-runtime', '--json'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        DATABASE_URL: PROD_LOCAL,
        APP_DEPLOY_PRODUCTION: '1', // pragma: allowlist secret
      },
    }
  );
  assert.notEqual(r.status, 0);
  assert.match(`${r.stdout}${r.stderr}`, /REFUSED_PRODUCTION_DATABASE_FOR_TESTS/); // pragma: allowlist secret
  const reportPath = path.join(ROOT, 'artifacts/pre-public-release-gate.json');
  if (require('fs').existsSync(reportPath)) {
    const report = JSON.parse(require('fs').readFileSync(reportPath, 'utf8'));
    assert.equal(report.exitCode, 1);
  }
});

test('migrate with NODE_ENV=test refuses prod DATABASE_URL without disposable TEST_DATABASE_URL', () => {
  assert.throws(
    () =>
      execSync('node migrate.js', {
        cwd: ROOT,
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'test',
          DATABASE_URL: PROD_LOCAL,
          TEST_DB_DESTRUCTIVE_CONFIRM: '1',
        },
        stdio: 'pipe',
      }),
    (err) => /REFUSED_PRODUCTION_DATABASE_FOR_TESTS|TEST_DATABASE_URL is required/.test(String(err.stderr)) // pragma: allowlist secret
  );
});
