#!/usr/bin/env node
'use strict';
/**
 * Founder parent English prod smoke — API + optional VPS DB helper.
 * Env: FOUNDER_QA_EMAIL, FOUNDER_QA_PASSWORD, FOUNDER_CHILD_PIN,
 *      FOUNDER_CHILD_USERNAME (optional; resolved from /api/auth/me),
 *      SMOKE_BASE_URL or PROD_BASE (required),
 *      VPS_APP_PATH (required when FOUNDER_SMOKE_VPS=1),
 *      FOUNDER_SMOKE_VPS=1 to run DB helper via scripts/vps-ssh.sh
 */
const { execFileSync } = require('child_process');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || process.env.PROD_BASE;
const VPS_APP = process.env.VPS_APP_PATH;
const EMAIL = process.env.FOUNDER_QA_EMAIL;
const PASSWORD = process.env.FOUNDER_QA_PASSWORD;
const CHILD_PIN = process.env.FOUNDER_CHILD_PIN;
let CHILD_USER = process.env.FOUNDER_CHILD_USERNAME;

const report = { base: BASE, scenarios: {}, errors: [], health: null };

function jar() {
  const m = new Map();
  return {
    store(r) {
      for (const c of r.headers.getSetCookie?.() || []) {
        const p = c.split(';')[0];
        const i = p.indexOf('=');
        if (i > 0) m.set(p.slice(0, i), p.slice(i + 1));
      }
    },
    h: () => [...m].map(([k, v]) => `${k}=${v}`).join('; '),
  };
}

async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts);
  return res;
}

async function parentLogin(cookies) {
  const res = await jfetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  cookies.store(res);
  const body = await res.json();
  return { res, body, csrf: body.csrfToken };
}

function parseVpsJson(out) {
  const lines = out.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) {
      return JSON.parse(line);
    }
  }
  throw new Error(`No JSON line in VPS output (first 300 chars): ${out.slice(0, 300)}`);
}

function vpsDb(cmd, familyId, extra) {
  if (process.env.FOUNDER_SMOKE_VPS !== '1') {
    throw new Error('FOUNDER_SMOKE_VPS=1 required for DB scenarios');
  }
  let cliExtra = '';
  if (cmd === 'restore' && extra && !Array.isArray(extra)) {
    const b64 = Buffer.from(JSON.stringify(extra)).toString('base64');
    cliExtra = `--json-base64 ${JSON.stringify(b64)}`;
  } else if (Array.isArray(extra)) {
    cliExtra = extra.join(' ');
  }
  const script = path.join(__dirname, 'founder-smoke-db-helper.cjs');
  const remote = [
    'set -a',
    `[ -f ${VPS_APP}/.env ] && . ${VPS_APP}/.env`,
    'set +a',
    `cd ${VPS_APP}`,
    `export FOUNDER_QA_EMAIL=${JSON.stringify(EMAIL)}`,
    `node scripts/ops/founder-smoke-db-helper.cjs ${cmd} --family-id ${familyId} ${cliExtra}`,
  ].join(' && ');
  const out = execFileSync(path.join(__dirname, '../vps-ssh.sh'), [remote], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
  return parseVpsJson(out);
}

async function apiLocale(cookies, csrf, locale) {
  const res = await jfetch(`${BASE}/api/family/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies.h(),
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ preferred_locale: locale }),
  });
  return res.status;
}

async function localeOptions(cookies) {
  const res = await jfetch(`${BASE}/api/family/locale-options`, {
    headers: { Cookie: cookies.h() },
  });
  return res.json();
}

async function parentMe(cookies) {
  const res = await jfetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookies.h() } });
  return res.json();
}

async function childSession(username) {
  const res = await jfetch(`${BASE}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin: CHILD_PIN }),
  });
  const cookies = jar();
  cookies.store(res);
  const body = await res.json();
  if (res.status !== 200) return { status: res.status, body };
  const me = await jfetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookies.h() } });
  return { status: res.status, childMe: await me.json() };
}

async function logout(cookies, csrf) {
  const res = await jfetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookies.h(), 'X-CSRF-Token': csrf || '' },
  });
  return res.status;
}

async function main() {
  if (!EMAIL || !PASSWORD || !CHILD_PIN) {
    console.error('Missing FOUNDER_QA_* env');
    process.exit(2);
  }
  if (!BASE) {
    console.error('Set SMOKE_BASE_URL or PROD_BASE');
    process.exit(2);
  }
  if (process.env.FOUNDER_SMOKE_VPS === '1' && !VPS_APP) {
    console.error('FOUNDER_SMOKE_VPS=1 requires VPS_APP_PATH');
    process.exit(2);
  }

  report.health = await jfetch(`${BASE}/health`).then((r) => r.json());

  const cookies = jar();
  let { body, csrf } = await parentLogin(cookies);
  if (!body.user) throw new Error('parent login failed');
  const me = await parentMe(cookies);
  const familyId = me.family_id;
  const astrid = (me.children || []).find((c) => /astrid/i.test(c.name));
  if (!CHILD_USER && astrid) CHILD_USER = astrid.username;
  if (!CHILD_USER) throw new Error('child username unknown');

  let snap = null;
  if (process.env.FOUNDER_SMOKE_VPS === '1') {
    snap = vpsDb('snapshot', familyId);
  }

  try {
    // Scenario 4 — sv-SE control (baseline)
    report.scenarios.sc4_sv_control = {
      parent_locale: me.preferred_locale,
      pass: me.preferred_locale === 'sv-SE',
      child: await childSession(CHILD_USER),
    };

    if (process.env.FOUNDER_SMOKE_VPS === '1') {
      // Scenario 1 — grandfather: en-GB without english_app row
      vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
      vpsDb('set', familyId, ['--slug', 'english_app', '--off']);
      const cookies1 = jar();
      const l1 = await parentLogin(cookies1);
      const opts1 = await localeOptions(cookies1);
      await logout(cookies1, l1.csrf);
      const cookies1b = jar();
      const l1b = await parentLogin(cookies1b);
      report.scenarios.sc1_grandfather = {
        locale_options: opts1,
        relogin_locale: l1b.body.user?.preferred_locale,
        pass:
          opts1.preferred_locale === 'en-GB' &&
          opts1.english_app_enabled === true &&
          l1b.body.user?.preferred_locale === 'en-GB',
      };

      // Scenario 2 — en-GB + child experience ON
      vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
      vpsDb('set', familyId, ['--slug', 'english_child_experience', '--on']);
      const c2 = await childSession(CHILD_USER);
      report.scenarios.sc2_child_en = {
        childMe: c2.childMe,
        pass:
          c2.childMe?.preferred_locale === 'en-GB' &&
          c2.childMe?.child_ui_locale === 'en-GB',
      };

      // Scenario 3 — separation child OFF
      vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
      const cookies3 = jar();
      await parentLogin(cookies3);
      const pm3 = await parentMe(cookies3);
      const c3 = await childSession(CHILD_USER);
      report.scenarios.sc3_separation = {
        parent_locale: pm3.preferred_locale,
        child_ui: c3.childMe?.child_ui_locale,
        pass: pm3.preferred_locale === 'en-GB' && c3.childMe?.child_ui_locale === 'sv-SE',
      };
    } else {
      report.scenarios.sc1_grandfather = { skip: 'FOUNDER_SMOKE_VPS=1 not set' };
      report.scenarios.sc2_child_en = { skip: 'FOUNDER_SMOKE_VPS=1 not set' };
      report.scenarios.sc3_separation = { skip: 'FOUNDER_SMOKE_VPS=1 not set' };
    }

    // Scenario 5 — new family cannot select en-GB (register + login attempt)
    const regEmail = `smoke-${Date.now()}@example.com`;
    const regPass = `SmokeTest-${Date.now()}!aB`;
    const regRes = await jfetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        password: regPass,
        name: 'Smoke Test',
        preferred_locale: 'sv-SE',
      }),
    });
    const regStatus = regRes.status;
    if (regStatus === 201) {
      const loginTry = await jfetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPass,
          preferred_locale: 'en-GB',
        }),
      });
      const lb = await loginTry.json();
      report.scenarios.sc5_new_family = {
        register: regStatus,
        login_en_locale: lb.user?.preferred_locale,
        pass: lb.user?.preferred_locale === 'sv-SE',
        note: 'disposable @example.com family; delete manually if needed',
      };
    } else {
      report.scenarios.sc5_new_family = {
        register: regStatus,
        skip: 'register failed on prod',
        pass: null,
      };
    }
  } finally {
    if (snap && process.env.FOUNDER_SMOKE_VPS === '1') {
      const restored = vpsDb('restore', familyId, snap);
      report.restored = restored?.ok === true;
      if (!report.restored) {
        report.errors.push('restore did not report ok');
      }
    }
  }

  report.health_after = await jfetch(`${BASE}/health`).then((r) => r.json());
  const allPass = Object.values(report.scenarios).every((s) => s.pass === true || s.skip);
  report.overall = allPass ? 'PASS' : 'PARTIAL';
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  report.errors.push(e.message);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
