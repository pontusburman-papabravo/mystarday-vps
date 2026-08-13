'use strict';

const { KILL_SWITCH_SOURCE, STATUS } = require('./constants.cjs');
const { redact, mergeJar, api } = require('./prod.cjs');

function checkKillSwitchSourceDefaults() {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '../../..');
  const results = [];
  const problems = [];

  for (const spec of KILL_SWITCH_SOURCE) {
    const abs = path.join(ROOT, spec.file);
    if (!fs.existsSync(abs)) {
      problems.push(`missing ${spec.file}`);
      results.push({ id: spec.id, status: STATUS.BLOCKER, reason: 'file_missing' });
      continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const ok = spec.mustMatch.test(src);
    if (!ok) {
      problems.push(`${spec.id} default is not fail-secure in ${spec.file}`);
      results.push({ id: spec.id, status: STATUS.BLOCKER, reason: 'insecure_default' });
    } else {
      results.push({
        id: spec.id,
        status: STATUS.PASS,
        secureDefault: spec.secureDefault,
      });
    }
  }

  const authz = fs.readFileSync(path.join(ROOT, 'src/middleware/authz.js'), 'utf8');
  if (/AUTHZ_HARDENING_ENABLED\s*===\s*'true'/.test(authz)) {
    problems.push('AUTHZ_HARDENING_ENABLED === true would default OFF — insecure');
  }

  return {
    status: problems.length ? STATUS.BLOCKER : STATUS.PASS,
    evidence: { results, problems },
  };
}

function checkLocalProcessKillSwitches(env = process.env) {
  const observed = {
    AUTHZ_HARDENING_ENABLED: env.AUTHZ_HARDENING_ENABLED ?? '(unset → ON)',
    RATE_LIMIT_ENABLED: env.RATE_LIMIT_ENABLED ?? '(unset → ON)',
    EMAIL_ENABLED: env.EMAIL_ENABLED ?? '(unset)',
  };

  return {
    status: STATUS.PASS,
    evidence: {
      observed,
      note: 'Local/test process env is not live prod.',
    },
  };
}

function checkProdEnvKillSwitches(env = process.env) {
  const raw = env.PRE_PUBLIC_GATE_PROD_ENV;
  if (!raw) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'PRE_PUBLIC_GATE_PROD_ENV not set',
        note: 'Prefer admin GET /api/admin/release-readiness via PRE_PUBLIC_GATE_ADMIN_* + SMOKE_BASE_URL',
      },
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'PRE_PUBLIC_GATE_PROD_ENV is not valid JSON' },
    };
  }

  const problems = [];
  if (parsed.AUTHZ_HARDENING_ENABLED === 'false') {
    problems.push('prod AUTHZ_HARDENING_ENABLED=false');
  }
  if (parsed.RATE_LIMIT_ENABLED === 'false') {
    problems.push('prod RATE_LIMIT_ENABLED=false');
  }

  return {
    status: problems.length ? STATUS.BLOCKER : STATUS.PASS,
    evidence: {
      source: 'PRE_PUBLIC_GATE_PROD_ENV',
      AUTHZ_HARDENING_ENABLED: parsed.AUTHZ_HARDENING_ENABLED ?? '(unset → ON)',
      RATE_LIMIT_ENABLED: parsed.RATE_LIMIT_ENABLED ?? '(unset → ON)',
      problems,
    },
  };
}

/**
 * Read prod kill-switch effective status via admin-only GET /api/admin/release-readiness.
 * Read-only — no secrets returned.
 */
async function checkProdKillSwitchesViaAdmin(env = process.env) {
  const base = (env.SMOKE_BASE_URL || env.PROD_BASE || '').replace(/\/$/, '');
  const adminEmail = env.PRE_PUBLIC_GATE_ADMIN_EMAIL;
  const adminPassword = env.PRE_PUBLIC_GATE_ADMIN_PASSWORD;
  if (!base || !adminEmail || !adminPassword) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'admin_credentials_missing',
        hint: 'Set PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL',
      },
    };
  }

  try {
    const login = await api(base, '/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });
    if (login.status !== 200) {
      return {
        status: STATUS.BLOCKER,
        evidence: { reason: 'admin_login_failed', http: login.status, base },
      };
    }
    const jar = mergeJar({}, login.setCookie);
    const readiness = await api(base, '/api/admin/release-readiness', { jar });
    if (readiness.status !== 200 || !readiness.json) {
      return {
        status: STATUS.NOT_VERIFIED,
        evidence: { reason: 'release_readiness_unreadable', http: readiness.status, base },
      };
    }

    const { authzHardeningEnabled, rateLimitEnabled } = readiness.json;
    const problems = [];
    if (authzHardeningEnabled === false) problems.push('prod authzHardeningEnabled=false');
    if (rateLimitEnabled === false) problems.push('prod rateLimitEnabled=false');

    return {
      status: problems.length ? STATUS.BLOCKER : STATUS.PASS,
      evidence: {
        source: 'admin_api',
        base,
        authzHardeningEnabled,
        rateLimitEnabled,
        problems,
      },
    };
  } catch (err) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'admin_api_error', error: redact(err.message) },
    };
  }
}

/**
 * Prod kill switches: admin API first, PRE_PUBLIC_GATE_PROD_ENV fallback.
 */
async function checkProdKillSwitches(env = process.env) {
  const viaAdmin = await checkProdKillSwitchesViaAdmin(env);
  if (viaAdmin.status === STATUS.PASS || viaAdmin.status === STATUS.BLOCKER) {
    return viaAdmin;
  }
  const viaEnv = checkProdEnvKillSwitches(env);
  if (viaEnv.status === STATUS.PASS || viaEnv.status === STATUS.BLOCKER) {
    return viaEnv;
  }
  return {
    status: STATUS.NOT_VERIFIED,
    evidence: {
      reason: 'no_prod_kill_switch_source',
      admin: viaAdmin.evidence,
      envFallback: viaEnv.evidence,
      hint: 'Set PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL, or PRE_PUBLIC_GATE_PROD_ENV JSON',
    },
  };
}

module.exports = {
  checkKillSwitchSourceDefaults,
  checkLocalProcessKillSwitches,
  checkProdEnvKillSwitches,
  checkProdKillSwitchesViaAdmin,
  checkProdKillSwitches,
};
