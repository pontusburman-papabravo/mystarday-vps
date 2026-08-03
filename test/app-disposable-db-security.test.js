'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { URL } = require('node:url');

const REPO = path.join(__dirname, '..');
const HELPER_SRC = path.join(REPO, 'scripts/ops/app-disposable-db.sh');
const INSTALL_SRC = path.join(REPO, 'scripts/ops/install-vps-ops-environment.sh');

function readUtf8(file) {
  return fs.readFileSync(file, 'utf8');
}

function runHelper(argv, envExtra = {}) {
  const baseEnv = {
    PATH: '/usr/bin:/bin',
    LANG: 'C.UTF-8',
  };
  const env = { ...baseEnv, ...envExtra };
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  if (isRoot) {
    return spawnSync('bash', [HELPER_SRC, ...argv], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
  }
  const envAssign = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  return spawnSync('sudo', ['-n', 'env', ...envAssign, 'bash', HELPER_SRC, ...argv], {
    encoding: 'utf8',
    env: baseEnv,
  });
}

function adminUrlFromDatabaseUrl(databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    u.pathname = '/postgres';
    return u.toString();
  } catch {
    return null;
  }
}

async function connectAdminPool(t) {
  const adminUrl = adminUrlFromDatabaseUrl(process.env.DATABASE_URL);
  if (!adminUrl) {
    t.skip('DATABASE_URL missing or invalid');
    return null;
  }
  const pg = require('pg');
  try {
    const pool = new pg.Pool({ connectionString: adminUrl, ssl: false });
    await pool.query('SELECT 1');
    return pool;
  } catch (err) {
    t.skip(`admin postgres connection unavailable: ${err.code || err.message}`);
    return null;
  }
}

async function canUseDatabaseAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminUrl = adminUrlFromDatabaseUrl(databaseUrl);
  if (!adminUrl || /mock_test/i.test(databaseUrl || '')) return false;
  try {
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: adminUrl, ssl: false });
    const client = await pool.connect();
    try {
      const r = await client.query(
        `SELECT rolcreatedb, rolsuper, rolcreaterole FROM pg_roles WHERE rolname = current_user`
      );
      return r.rows[0]?.rolcreatedb === true;
    } finally {
      client.release();
      await pool.end();
    }
  } catch {
    return false;
  }
}

function localPostgresSocketReady() {
  const dir = '/var/run/postgresql';
  if (!fs.existsSync(dir)) return false;
  try {
    return fs.readdirSync(dir).some((f) => f.startsWith('.s.PGSQL.'));
  } catch {
    return false;
  }
}

function canRunHelperAsPostgres() {
  if (!localPostgresSocketReady()) {
    return false;
  }
  const viaSudo = spawnSync(
    'sudo',
    ['-n', '/usr/sbin/runuser', '-u', 'postgres', '--', '/bin/true'],
    { encoding: 'utf8' }
  );
  if (viaSudo.status === 0) return true;
  return (
    spawnSync('/usr/sbin/runuser', ['-u', 'postgres', '--', '/bin/true'], { encoding: 'utf8' })
      .status === 0
  );
}

function extractSudoersHeredoc(installScript) {
  const m = installScript.match(/<<SUDOERS\n([\s\S]*?)\nSUDOERS/);
  return m ? m[1] : '';
}

function extractDeployOpsEnvTemplate(installScript) {
  const m = installScript.match(/cat >"\$OPS_ENV" <<ENV\n([\s\S]*?)\nENV/);
  return m ? m[1] : '';
}

describe('app-disposable-db security (static)', () => {
  test('install sudoers template has no SETENV', () => {
    const install = readUtf8(INSTALL_SRC);
    const sudoers = extractSudoersHeredoc(install);
    assert.ok(sudoers.length > 0, 'sudoers heredoc missing');
    const { parseSudoersDisposableDbRules } = require('../scripts/ops/lib/disposable-db-name.mjs');
    const { hasSetenv } = parseSudoersDisposableDbRules(sudoers);
    assert.equal(hasSetenv, false);
    assert.doesNotMatch(sudoers, /\bSETENV\b/i);
  });

  test('install uses Cmnd_Alias with create/drop integrity_restore_* only', () => {
    const install = readUtf8(INSTALL_SRC);
    const sudoers = extractSudoersHeredoc(install);
    const opsEnv = extractDeployOpsEnvTemplate(install);
    assert.match(sudoers, /Cmnd_Alias APP_DISPOSABLE_DB/);
    assert.match(sudoers, /create integrity_restore_\*/);
    assert.match(sudoers, /drop integrity_restore_\*/);
    assert.match(sudoers, /NOPASSWD: APP_DISPOSABLE_DB/);
    assert.doesNotMatch(opsEnv, /DATABASE_ADMIN_URL/);
    assert.doesNotMatch(install, /app_disposable_ops/);
    assert.doesNotMatch(install, /CREATE\s+ROLE/i);
  });

  test('helper uses env -i, psql -X, and local socket dir', () => {
    const helper = readUtf8(HELPER_SRC);
    assert.match(helper, /"\$ENVI" -i/);
    assert.match(helper, /"\$PSQL" -X/);
    assert.match(helper, /-h "\$PG_SOCKET_DIR"/);
    assert.match(helper, /PG_SOCKET_DIR="\/var\/run\/postgresql"/);
    assert.match(helper, /RUNUSER="\/usr\/sbin\/runuser"/);
    assert.match(helper, /PSQL="\/usr\/bin\/psql"/);
  });

  test('helper requires exactly two arguments', () => {
    const cfg = makeTestConfig('stjarndag_prod_guard');
    const three = runHelper(['create', 'integrity_restore_ok', 'extra'], cfg.env);
    assert.notEqual(three.status, 0);
    const one = runHelper(['create'], cfg.env);
    assert.notEqual(one.status, 0);
    cleanupTestConfig(cfg.dir);
  });

  test('name validation rejects bad inputs', async () => {
    const { validateDisposableDatabaseName } = await import('../scripts/ops/lib/disposable-db-name.mjs');
    const protectedName = 'integrity_restore_production';
    const cases = [
      ['integrity_restore_OK', 'prefix_or_charset'],
      ['integrity_restore-a', 'invalid_chars'],
      ['integrity_restore.a', 'invalid_chars'],
      ['integrity_restore/foo', 'invalid_chars'],
      ['integrity_restore_x\ny', 'invalid_chars'],
      ['integrity_restore_', 'prefix_or_charset'],
      [`integrity_restore_${'a'.repeat(60)}`, 'too_long'],
      [protectedName, 'protected_database'],
      ['migrate', 'prefix_or_charset'],
      ['drop', 'prefix_or_charset'],
    ];
    for (const [name, reason] of cases) {
      const r = validateDisposableDatabaseName(name, { protectedName });
      assert.equal(r.ok, false, `expected reject ${name}`);
      assert.equal(r.reason, reason, name);
    }
    assert.equal(validateDisposableDatabaseName('integrity_restore_ci_test', { protectedName }).ok, true);
  });
});

describe('app-disposable-db security (helper CLI)', () => {
  test('invalid action and bad prefix rejected before postgres', () => {
    const cfg = makeTestConfig('prod_db');
    for (const args of [
      ['restore', 'integrity_restore_x'],
      ['create', 'stjarndag'],
      ['drop', 'public'],
    ]) {
      const r = runHelper(args, cfg.env);
      assert.notEqual(r.status, 0, args.join(' '));
    }
    cleanupTestConfig(cfg.dir);
  });
});

describe('app-disposable-db security (integration)', () => {
  let adminOk = false;
  let helperRootOk = false;
  let protectedName = 'stjarndag_gate_prod';
  let configDir;

  before(async () => {
    adminOk = await canUseDatabaseAdmin();
    helperRootOk = canRunHelperAsPostgres();
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && !/mock_test/i.test(databaseUrl)) {
      try {
        protectedName = new URL(databaseUrl).pathname.replace(/^\//, '') || protectedName;
      } catch {
        /* keep default */
      }
    }
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ops-test-'));
    fs.writeFileSync(path.join(configDir, 'protected-database-name'), protectedName, 'utf8');
    const appRole = (() => {
      try {
        return new URL(process.env.DATABASE_URL || '').username || 'postgres';
      } catch {
        return 'postgres';
      }
    })();
    fs.writeFileSync(path.join(configDir, 'database-app-role'), appRole, 'utf8');
  });

  after(() => {
    if (configDir) {
      try {
        fs.rmSync(configDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  test('CI admin connection (DATABASE_ADMIN_URL) is CREATEDB only, not superuser', async (t) => {
    if (!adminOk) {
      t.skip('DATABASE_URL admin without CREATEDB');
      return;
    }
    const adminUrl = adminUrlFromDatabaseUrl(process.env.DATABASE_URL);
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: adminUrl, ssl: false });
    const client = await pool.connect();
    try {
      const r = await client.query(
        `SELECT rolcreatedb, rolsuper, rolcreaterole FROM pg_roles WHERE rolname = current_user`
      );
      const row = r.rows[0];
      assert.equal(row.rolcreatedb, true);
      if (row.rolsuper === true) {
        t.skip('disposable CI often uses cluster superuser; VPS uses non-super sudo helper only');
        return;
      }
      assert.equal(row.rolcreaterole, false);
    } finally {
      client.release();
      await pool.end();
    }
  });

  test('create and drop disposable database via DATABASE_ADMIN_URL (CI)', async (t) => {
    if (!adminOk) {
      t.skip('DATABASE_URL admin without CREATEDB');
      return;
    }
    const adminUrl = adminUrlFromDatabaseUrl(process.env.DATABASE_URL);
    const dbName = `integrity_restore_sec_${Date.now()}`;
    const prev = process.env.DATABASE_ADMIN_URL;
    process.env.DATABASE_ADMIN_URL = adminUrl;
    delete process.env.APP_DISPOSABLE_DB_USE_SUDO;
    const { createDisposableDatabase, dropDisposableDatabase } = await import(
      '../scripts/ops/lib/disposable-db-admin.mjs'
    );
    try {
      await createDisposableDatabase(dbName, { protectedName });
      const pg = require('pg');
      const pool = new pg.Pool({ connectionString: adminUrl, ssl: false });
      const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      await pool.end();
      assert.equal(exists.rowCount, 1);
      await dropDisposableDatabase(dbName, { protectedName });
      const pool2 = new pg.Pool({ connectionString: adminUrl, ssl: false });
      const gone = await pool2.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      await pool2.end();
      assert.equal(gone.rowCount, 0);
    } finally {
      if (prev === undefined) delete process.env.DATABASE_ADMIN_URL;
      else process.env.DATABASE_ADMIN_URL = prev;
    }
  });

  test('install deploy-ops.env template has no DATABASE_ADMIN_URL', () => {
    const install = readUtf8(INSTALL_SRC);
    const opsEnv = extractDeployOpsEnvTemplate(install);
    assert.doesNotMatch(opsEnv, /DATABASE_ADMIN_URL/);
    assert.doesNotMatch(install, /CREATE\s+ROLE/i);
    assert.doesNotMatch(install, /app_disposable_ops/);
  });

  test('app DATABASE_URL role has no new CREATEDB when not dev superuser', async (t) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || /mock_test/i.test(databaseUrl)) {
      t.skip('DATABASE_URL not set');
      return;
    }
    let pool;
    try {
      const pg = require('pg');
      pool = new pg.Pool({ connectionString: databaseUrl, ssl: false });
      await pool.query('SELECT 1');
    } catch (err) {
      t.skip(`DATABASE_URL not reachable: ${err.code || err.message}`);
      return;
    }
    const client = await pool.connect();
    try {
      const r = await client.query(
        `SELECT rolcreatedb, rolsuper, rolcreaterole FROM pg_roles WHERE rolname = current_user`
      );
      const row = r.rows[0];
      assert.ok(row);
      if (row.rolsuper === true || row.rolcreatedb === true) {
        t.skip('local DATABASE_URL is admin/superuser — use prod-like role for this assertion');
        return;
      }
      assert.equal(row.rolcreatedb, false, 'app role must not have CREATEDB');
      assert.equal(row.rolsuper, false, 'app role must not be superuser');
      assert.equal(row.rolcreaterole, false, 'app role must not have CREATEROLE');
    } finally {
      client.release();
      await pool.end();
    }
  });

  test('optional legacy ops role app_disposable_ops is absent', async (t) => {
    const pool = await connectAdminPool(t);
    if (!pool) return;
    const client = await pool.connect();
    try {
      const r = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = 'app_disposable_ops'`);
      assert.equal(r.rowCount, 0, 'VPS installer must not leave parallel CREATEDB ops role');
    } finally {
      client.release();
      await pool.end();
    }
  });

  test('helper ignores PGHOST/PGPORT/PSQLRC/PGOPTIONS/PATH hijack when runuser works', async (t) => {
    if (!helperRootOk) {
      t.skip('local postgresql socket dir or runuser unavailable');
      return;
    }
    const dbName = `integrity_restore_env_${Date.now()}`;
    const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-psql-'));
    const trapPath = path.join(fakeBin, 'psql');
    fs.writeFileSync(trapPath, '#!/bin/sh\necho PSQL_TRAP >&2\nexit 99\n', { mode: 0o755 });
    const evilPsqlrc = path.join(os.tmpdir(), `evil-${Date.now()}.psqlrc`);
    fs.writeFileSync(evilPsqlrc, '\\echo PSQLRC_LOADED\n', 'utf8');

    const env = {
      APP_DISPOSABLE_DB_CONFIG_DIR: configDir,
      PGHOST: '127.0.0.1',
      PGPORT: '9',
      PGOPTIONS: '-c statement_timeout=1',
      PSQLRC: evilPsqlrc,
      PATH: `${fakeBin}:/usr/bin:/bin`,
    };

    const create = runHelper(['create', dbName], env);
    assert.equal(create.status, 0, create.stderr || create.stdout);
    assert.doesNotMatch(create.stderr + create.stdout, /PSQL_TRAP/);
    assert.doesNotMatch(create.stderr + create.stdout, /PSQLRC_LOADED/);

    const drop = runHelper(['drop', dbName], env);
    assert.equal(drop.status, 0, drop.stderr || drop.stdout);

    fs.rmSync(fakeBin, { recursive: true, force: true });
    try {
      fs.unlinkSync(evilPsqlrc);
    } catch {
      /* ignore */
    }
  });

  test('helper refuses protected production database name', async (t) => {
    if (!helperRootOk) {
      t.skip('runuser -u postgres requires root');
      return;
    }
    const blockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ops-block-'));
    fs.writeFileSync(path.join(blockDir, 'protected-database-name'), 'integrity_restore_production', 'utf8');
    fs.writeFileSync(path.join(blockDir, 'database-app-role'), 'postgres', 'utf8');
    const r = runHelper(['create', 'integrity_restore_production'], {
      APP_DISPOSABLE_DB_CONFIG_DIR: blockDir,
    });
    fs.rmSync(blockDir, { recursive: true, force: true });
    assert.notEqual(r.status, 0);
    assert.match((r.stderr || '') + (r.stdout || ''), /protected/i);
  });

  test('helper binds to local socket (database appears on this cluster)', async (t) => {
    if (!helperRootOk) {
      t.skip('local postgresql socket dir or runuser unavailable');
      return;
    }
    if (!adminOk) {
      t.skip('admin catalog read unavailable');
      return;
    }
    const dbName = `integrity_restore_bind_${Date.now()}`;
    const create = runHelper(['create', dbName], { APP_DISPOSABLE_DB_CONFIG_DIR: configDir });
    assert.equal(create.status, 0);
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: adminUrlFromDatabaseUrl(process.env.DATABASE_URL), ssl: false });
    const r = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    await pool.end();
    assert.equal(r.rowCount, 1);
    const drop = runHelper(['drop', dbName], { APP_DISPOSABLE_DB_CONFIG_DIR: configDir });
    assert.equal(drop.status, 0);
  });
});

function makeTestConfig(protectedDb) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ops-static-'));
  fs.writeFileSync(path.join(dir, 'protected-database-name'), protectedDb, 'utf8');
  fs.writeFileSync(path.join(dir, 'database-app-role'), 'postgres', 'utf8');
  return { dir, env: { APP_DISPOSABLE_DB_CONFIG_DIR: dir } };
}

function cleanupTestConfig(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
