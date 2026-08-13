'use strict';

const { STATUS, FLAGS_MUST_BE_OFF, WIDGET_FLAGS } = require('./constants.cjs');
const { queryGlobalFlags, sanitizeDbMeta } = require('./flags.cjs');

function redact(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"pin"\s*:\s*"[^"]*"/gi, '"pin":"[REDACTED]"');
}

function mergeJar(jar, setCookie) {
  for (const h of setCookie || []) {
    const pair = String(h).split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return jar;
}

async function api(baseUrl, pathname, { method = 'GET', jar = {}, body, csrf } = {}) {
  const headers = {
    Cookie: Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; '),
  };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return { status: res.status, json, setCookie, text: text.slice(0, 300) };
}

/**
 * Optional prod / live flag check. Never writes.
 *
 * Sources (first available):
 * 1. PRE_PUBLIC_GATE_FLAG_DATABASE_URL — read-only SELECT
 * 2. PRE_PUBLIC_GATE_ADMIN_EMAIL + PRE_PUBLIC_GATE_ADMIN_PASSWORD + SMOKE_BASE_URL
 *    — GET /api/admin/feature-flags
 */
async function checkProdGlobalFlags(env = process.env) {
  const flagUrl = env.PRE_PUBLIC_GATE_FLAG_DATABASE_URL;
  if (flagUrl) {
    const result = await queryGlobalFlags(flagUrl, { label: 'prod_flag_database' });
    return result;
  }

  const base = (env.SMOKE_BASE_URL || env.PROD_BASE || '').replace(/\/$/, '');
  const adminEmail = env.PRE_PUBLIC_GATE_ADMIN_EMAIL;
  const adminPassword = env.PRE_PUBLIC_GATE_ADMIN_PASSWORD;
  if (base && adminEmail && adminPassword) {
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
      const flags = await api(base, '/api/admin/feature-flags', { jar });
      if (flags.status !== 200 || !Array.isArray(flags.json)) {
        return {
          status: STATUS.NOT_VERIFIED,
          evidence: { reason: 'admin_flags_unreadable', http: flags.status, base },
        };
      }
      const map = {};
      for (const row of flags.json) map[row.key] = Boolean(row.enabled);
      const on = FLAGS_MUST_BE_OFF.filter((k) => map[k] === true);
      const missing = FLAGS_MUST_BE_OFF.filter((k) => map[k] === undefined);
      if (on.length) {
        return {
          status: STATUS.BLOCKER,
          evidence: { source: 'admin_api', globallyOn: on, widgetOn: WIDGET_FLAGS.filter((k) => map[k]) },
        };
      }
      if (missing.length) {
        return {
          status: STATUS.NOT_VERIFIED,
          evidence: { source: 'admin_api', missing },
        };
      }
      return {
        status: STATUS.PASS,
        evidence: { source: 'admin_api', base, flags: Object.fromEntries(FLAGS_MUST_BE_OFF.map((k) => [k, map[k]])) },
      };
    } catch (err) {
      return {
        status: STATUS.NOT_VERIFIED,
        evidence: { reason: 'admin_api_error', error: redact(err.message) },
      };
    }
  }

  return {
    status: STATUS.NOT_VERIFIED,
    evidence: {
      reason: 'no_prod_flag_source',
      hint: 'Set PRE_PUBLIC_GATE_FLAG_DATABASE_URL (read-only) or PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL',
    },
  };
}

/**
 * Read-only founder QA login smoke. Does not mutate family data.
 * Requires FOUNDER_QA_EMAIL + FOUNDER_QA_PASSWORD + SMOKE_BASE_URL.
 */
async function founderReadOnlyAcceptance(env = process.env) {
  const base = (env.SMOKE_BASE_URL || env.PROD_BASE || '').replace(/\/$/, '');
  const email = env.FOUNDER_QA_EMAIL;
  const password = env.FOUNDER_QA_PASSWORD;
  if (!base || !email || !password) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'founder_qa_env_missing',
        hasBase: Boolean(base),
        hasEmail: Boolean(email),
        hasPassword: Boolean(password),
      },
    };
  }

  try {
    const health = await fetch(`${base}/health`);
    const healthJson = await health.json().catch(() => ({}));
    if (!health.ok) {
      return {
        status: STATUS.BLOCKER,
        evidence: { reason: 'health_failed', http: health.status, base },
      };
    }

    const login = await api(base, '/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (login.status !== 200) {
      return {
        status: STATUS.BLOCKER,
        evidence: { reason: 'founder_login_failed', http: login.status, base },
      };
    }
    const jar = mergeJar({}, login.setCookie);
    const children = await api(base, '/api/children', { jar });
    if (children.status !== 200) {
      return {
        status: STATUS.BLOCKER,
        evidence: { reason: 'children_read_failed', http: children.status },
      };
    }
    const childCount = Array.isArray(children.json)
      ? children.json.length
      : Array.isArray(children.json?.children)
        ? children.json.children.length
        : null;

    await api(base, '/api/auth/logout', { method: 'POST', jar }).catch(() => null);

    return {
      status: STATUS.PASS,
      evidence: {
        base,
        health: healthJson.git_sha || healthJson.status || 'ok',
        childCount,
        mutated: false,
      },
    };
  } catch (err) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'founder_acceptance_error', error: redact(err.message) },
    };
  }
}

/**
 * Self-cleaning family-device prod pilot — OFF by default.
 * Requires PRE_PUBLIC_GATE_PROD_PILOT=1 plus the existing family-device pilot env.
 * Widget flags are never enabled by that harness's global path (family override only);
 * this gate still refuses to invoke it unless explicitly requested.
 */
function prodPilotPolicy(env = process.env) {
  if (env.PRE_PUBLIC_GATE_PROD_PILOT === '1') {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'explicit_pilot_requested_but_not_auto_run',
        note: 'Run `npm run family-device:prod-pilot` separately. This gate does not mutate prod.',
      },
    };
  }
  return {
    status: STATUS.PASS,
    evidence: {
      mutated: false,
      note: 'Prod pilot not requested. Default is zero writes.',
    },
  };
}

/**
 * Read-only prod Activity Timer rollout via admin GET /api/admin/release-readiness.
 * BLOCKER when ACTIVITY_TIMER_V2_DISABLED=true in prod (timer unavailable for marketing).
 */
async function checkProdActivityTimerRuntime(env = process.env) {
  const base = (env.SMOKE_BASE_URL || env.PROD_BASE || '').replace(/\/$/, '');
  const adminEmail = env.PRE_PUBLIC_GATE_ADMIN_EMAIL;
  const adminPassword = env.PRE_PUBLIC_GATE_ADMIN_PASSWORD;
  if (!base || !adminEmail || !adminPassword) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'admin_credentials_missing',
        hint: 'Set PRE_PUBLIC_GATE_ADMIN_EMAIL/PASSWORD + SMOKE_BASE_URL for activityTimerV2Available',
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

    const { activityTimerV2Disabled, activityTimerV2Available } = readiness.json;
    if (activityTimerV2Disabled === true || activityTimerV2Available === false) {
      return {
        status: STATUS.BLOCKER,
        evidence: {
          source: 'admin_api',
          base,
          activityTimerV2Disabled,
          activityTimerV2Available,
          reason: 'ACTIVITY_TIMER_V2_DISABLED in prod',
        },
      };
    }

    return {
      status: STATUS.PASS,
      evidence: {
        source: 'admin_api',
        base,
        activityTimerV2Disabled: false,
        activityTimerV2Available: true,
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
 * Self-cleaning Activity Timer prod pilot — OFF by default.
 * Requires PRE_PUBLIC_GATE_ACTIVITY_TIMER_PILOT=1; run npm run activity-timer:prod-pilot separately.
 */
function activityTimerProdPilotPolicy(env = process.env) {
  if (env.PRE_PUBLIC_GATE_ACTIVITY_TIMER_PILOT === '1') {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'explicit_activity_timer_pilot_requested_but_not_auto_run',
        note: 'Run `npm run activity-timer:prod-pilot` separately. This gate does not mutate prod.',
      },
    };
  }
  return {
    status: STATUS.PASS,
    evidence: {
      mutated: false,
      note: 'Activity Timer prod pilot not requested. Default is zero writes.',
    },
  };
}

function localDatabaseIsNotProd(databaseUrl) {
  const meta = sanitizeDbMeta(databaseUrl);
  return Boolean(meta.isLocal);
}

/**
 * Human device-QA attestation. Unset → NOT_VERIFIED (never PASS).
 * Only the exact value PASS is accepted. Any other value is BLOCKER.
 */
function deviceQaAttestation(env, key, label) {
  const raw = (env[key] || '').trim();
  if (!raw) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: {
        reason: 'no_attestation',
        env: key,
        label,
        note: `Set ${key}=PASS only after real-device evidence. Never default.`,
      },
    };
  }
  if (raw === 'PASS') {
    return {
      status: STATUS.PASS,
      evidence: { env: key, label, attested: true },
    };
  }
  return {
    status: STATUS.BLOCKER,
    evidence: { env: key, label, value: raw, reason: 'attestation_must_be_PASS' },
  };
}

module.exports = {
  checkProdGlobalFlags,
  founderReadOnlyAcceptance,
  prodPilotPolicy,
  checkProdActivityTimerRuntime,
  activityTimerProdPilotPolicy,
  localDatabaseIsNotProd,
  deviceQaAttestation,
  redact,
  api,
  mergeJar,
};
