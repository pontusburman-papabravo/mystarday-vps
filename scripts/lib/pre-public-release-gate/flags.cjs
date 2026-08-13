'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { FLAGS_MUST_BE_OFF, FAMILY_DEVICE_FLAGS, WIDGET_FLAGS, MAINTENANCE_FLAG, STATUS } =
  require('./constants.cjs');

const ROOT = path.join(__dirname, '../../..');

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    return null;
  }
  try {
    const parsed = new URL(databaseUrl);
    const host = (parsed.hostname || '').toLowerCase();
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
    return {
      host,
      port: parsed.port || '5432',
      database: decodeURIComponent((parsed.pathname || '').replace(/^\//, '') || ''),
      user: decodeURIComponent(parsed.username || ''),
      isLocal,
      ssl: !isLocal,
    };
  } catch {
    return { invalid: true };
  }
}

function sanitizeDbMeta(databaseUrl) {
  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed) return { present: false };
  if (parsed.invalid) return { present: true, invalid: true };
  return {
    present: true,
    host: parsed.host,
    database: parsed.database,
    user: parsed.user,
    isLocal: parsed.isLocal,
  };
}

/**
 * Read snapshotContract.featureFlagInserts from migrations.
 * Fail closed: missing seed or enabled:true for a must-be-off key is BLOCKER.
 */
function checkMigrationFlagSeeds() {
  const migrationsDir = path.join(ROOT, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js'));
  const found = {};
  const problems = [];

  for (const file of files) {
    let mod;
    try {
      mod = require(path.join(migrationsDir, file));
    } catch {
      continue;
    }
    const inserts = mod.snapshotContract?.featureFlagInserts || [];
    for (const row of inserts) {
      if (!FLAGS_MUST_BE_OFF.includes(row.key)) continue;
      found[row.key] = { file, enabled: Boolean(row.enabled) };
      if (row.enabled === true) {
        problems.push(`${file} seeds ${row.key} enabled:true`);
      }
    }
  }

  const missing = FLAGS_MUST_BE_OFF.filter((k) => !found[k]);
  if (missing.length) {
    problems.push(`No snapshotContract seed found for: ${missing.join(', ')}`);
  }

  const enabledOn = Object.entries(found)
    .filter(([, v]) => v.enabled === true)
    .map(([k]) => k);

  if (problems.length || enabledOn.length) {
    return {
      status: STATUS.BLOCKER,
      evidence: { found, problems, enabledOn },
    };
  }

  return {
    status: STATUS.PASS,
    evidence: {
      found,
      note: 'Migrations seed all family-device and widget flags as enabled:false (ON CONFLICT DO NOTHING).',
    },
  };
}

function pgClientConfig(databaseUrl) {
  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed || parsed.invalid) return null;
  return {
    connectionString: databaseUrl,
    ssl: parsed.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8000,
    statement_timeout: 10000,
  };
}

/**
 * Read-only SELECT of global flags. Sets default_transaction_read_only.
 * Never writes. Missing URL → NOT_VERIFIED.
 */
async function queryGlobalFlags(databaseUrl, { label } = {}) {
  const meta = sanitizeDbMeta(databaseUrl);
  if (!meta.present) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'no_database_url', label, meta },
    };
  }
  if (meta.invalid) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'invalid_database_url', label },
    };
  }

  const cfg = pgClientConfig(databaseUrl);
  const client = new Client(cfg);
  try {
    await client.connect();
    await client.query('SET default_transaction_read_only = on');
    await client.query('BEGIN');
    const keys = [...FLAGS_MUST_BE_OFF, MAINTENANCE_FLAG];
    const { rows } = await client.query(
      `SELECT key, enabled FROM feature_flag WHERE key = ANY($1::text[])`,
      [keys]
    );
    await client.query('ROLLBACK');

    const map = Object.fromEntries(keys.map((k) => [k, null]));
    for (const row of rows) map[row.key] = Boolean(row.enabled);

    const missing = FLAGS_MUST_BE_OFF.filter((k) => map[k] === null);
    const on = FLAGS_MUST_BE_OFF.filter((k) => map[k] === true);
    const widgetOn = WIDGET_FLAGS.filter((k) => map[k] === true);
    const familyOn = FAMILY_DEVICE_FLAGS.filter((k) => map[k] === true);

    if (on.length || widgetOn.length) {
      return {
        status: STATUS.BLOCKER,
        evidence: {
          label,
          meta,
          flags: map,
          globallyOn: on,
          widgetOn,
          familyDeviceOn: familyOn,
          reason: 'global_flags_must_be_off_before_public_rollout',
        },
      };
    }

    if (missing.length) {
      return {
        status: STATUS.NOT_VERIFIED,
        evidence: {
          label,
          meta,
          flags: map,
          missing,
          reason: 'flag_rows_missing',
        },
      };
    }

    return {
      status: STATUS.PASS,
      evidence: {
        label,
        meta,
        flags: map,
        maintenance: map[MAINTENANCE_FLAG],
        note: 'All family-device and widget global flags are OFF.',
      },
    };
  } catch (err) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        label,
        meta,
        reason: 'query_failed',
        error: err.message,
      },
    };
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

function gateSourceMustNotMutateFlags(gateDir) {
  const dir = gateDir || path.join(ROOT, 'scripts/lib/pre-public-release-gate');
  const files = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        (f.endsWith('.cjs') || f.endsWith('.mjs')) &&
        f !== 'flags.cjs' &&
        f !== 'local-flag-repair.cjs'
    );
  const entry = path.join(ROOT, 'scripts/pre-public-release-gate.mjs');
  const srcs = [
    ...files.map((f) => ({
      file: `scripts/lib/pre-public-release-gate/${f}`,
      src: fs.readFileSync(path.join(dir, f), 'utf8'),
    })),
    { file: 'scripts/pre-public-release-gate.mjs', src: fs.readFileSync(entry, 'utf8') },
    {
      file: 'scripts/lib/pre-public-release-gate/flags.cjs',
      src: fs.readFileSync(path.join(dir, 'flags.cjs'), 'utf8'),
    },
  ];
  const problems = [];
  const writeFlag = /(?:UPDATE|INSERT\s+INTO)\s+feature_flag/i;
  const enableSwitch = 'PRE_PUBLIC_GATE_ENABLE_' + 'WIDGET';
  for (const { file, src } of srcs) {
    const executable = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (file.endsWith('flags.cjs')) {
      if (!/default_transaction_read_only/.test(src)) {
        problems.push(`${file} must force read-only transactions for flag SELECT`);
      }
      if (!/SELECT key, enabled FROM feature_flag/.test(src)) {
        problems.push(`${file} must SELECT flags, not write them`);
      }
      if (/client\.query\([^)]*(?:UPDATE|INSERT)/i.test(src)) {
        problems.push(`${file} executes a feature_flag write`);
      }
      continue;
    }
    if (writeFlag.test(executable)) problems.push(`${file} contains a feature_flag write`);
    if (executable.includes(enableSwitch)) problems.push(`${file} defines a widget-enable switch`);
  }
  return {
    status: problems.length ? STATUS.BLOCKER : STATUS.PASS,
    evidence: { problems, files: srcs.map((s) => s.file) },
  };
}

module.exports = {
  parseDatabaseUrl,
  sanitizeDbMeta,
  checkMigrationFlagSeeds,
  queryGlobalFlags,
  gateSourceMustNotMutateFlags,
};
