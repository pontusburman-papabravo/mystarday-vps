'use strict';

const fs = require('fs');
const path = require('path');
const { KILL_SWITCH_SOURCE, STATUS } = require('./constants.cjs');

const ROOT = path.join(__dirname, '../../..');

function checkKillSwitchSourceDefaults() {
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

/**
 * Runtime env kill switches for *this process*.
 * Test runs set RATE_LIMIT_ENABLED=false locally — that is expected and not a prod BLOCKER.
 * Prod env is NOT_VERIFIED unless PRE_PUBLIC_GATE_PROD_ENV JSON is supplied.
 */
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
      note: 'Local/test process env is not live. Prod kill-switch values require PRE_PUBLIC_GATE_PROD_ENV or SSH.',
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
        required: {
          AUTHZ_HARDENING_ENABLED: 'unset or not "false" (ON)',
          RATE_LIMIT_ENABLED: 'unset or not "false" (ON)',
        },
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
      AUTHZ_HARDENING_ENABLED: parsed.AUTHZ_HARDENING_ENABLED ?? '(unset → ON)',
      RATE_LIMIT_ENABLED: parsed.RATE_LIMIT_ENABLED ?? '(unset → ON)',
      problems,
    },
  };
}

module.exports = {
  checkKillSwitchSourceDefaults,
  checkLocalProcessKillSwitches,
  checkProdEnvKillSwitches,
};
