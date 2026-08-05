#!/usr/bin/env node
'use strict';

/**
 * Founder parent English prod smoke — API scenarios 1–5 only.
 * See founder-parent-english-prod-smoke.cjs for combined entry.
 */
const {
  finalizeFounderSmokeReport,
  snapshotsEqual,
} = require('./founder-smoke-report-lib.cjs');
const { vpsDb } = require('./founder-smoke-vps.cjs');
const { performSc5ProdCleanup } = require('./founder-smoke-sc5-cleanup.cjs');

const BASE = process.env.SMOKE_BASE_URL || process.env.PROD_BASE;
const VPS_APP = process.env.VPS_APP_PATH;
const EMAIL = process.env.FOUNDER_QA_EMAIL;
const PASSWORD = process.env.FOUNDER_QA_PASSWORD;
const CHILD_PIN = process.env.FOUNDER_CHILD_PIN;
let CHILD_USER = process.env.FOUNDER_CHILD_USERNAME;

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
  return fetch(url, opts);
}

async function parentLogin(cookies, email = EMAIL, password = PASSWORD) {
  const res = await jfetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  cookies.store(res);
  const body = await res.json();
  return { res, body, csrf: body.csrfToken };
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
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
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

async function deleteSmokeFamily(cookies, csrf) {
  const res = await jfetch(`${BASE}/api/family/delete-account`, {
    method: 'DELETE',
    headers: { Cookie: cookies.h(), 'X-CSRF-Token': csrf || '' },
  });
  return res.status;
}

function assertEnv() {
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
}

async function runApiSmoke(opts = {}) {
  assertEnv();
  const report = { base: BASE, part: 'api', scenarios: {}, errors: [], health: null };

  report.health = await jfetch(`${BASE}/health`).then((r) => r.json());

  const cookies = jar();
  const login = await parentLogin(cookies);
  if (!login.body.user) throw new Error('parent login failed');
  const me = await parentMe(cookies);
  const familyId = me.family_id;
  const astrid = (me.children || []).find((c) => /astrid/i.test(c.name));
  if (!CHILD_USER && astrid) CHILD_USER = astrid.username;
  if (!CHILD_USER) throw new Error('child username unknown');

  let snap = null;
  if (process.env.FOUNDER_SMOKE_VPS === '1') {
    snap = vpsDb('snapshot', familyId);
    report.snapshot_before = snap;
  } else {
    report.errors.push('FOUNDER_SMOKE_VPS=1 required for founder prod smoke (scenarios 1–3 + restore)');
  }

  try {
    const child4 = await childSession(CHILD_USER);
    report.scenarios.sc4_sv_control = {
      parent_locale: me.preferred_locale,
      child: child4,
      pass:
        me.preferred_locale === 'sv-SE' &&
        child4.status === 200 &&
        child4.childMe?.child_ui_locale === 'sv-SE',
    };

    if (process.env.FOUNDER_SMOKE_VPS === '1') {
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

      vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
      vpsDb('set', familyId, ['--slug', 'english_child_experience', '--on']);
      const c2 = await childSession(CHILD_USER);
      report.scenarios.sc2_child_en = {
        childMe: c2.childMe,
        pass:
          c2.childMe?.preferred_locale === 'en-GB' &&
          c2.childMe?.child_ui_locale === 'en-GB',
      };

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
      const vpsRequired = { pass: false, reason: 'FOUNDER_SMOKE_VPS=1 not set' };
      report.scenarios.sc1_grandfather = { ...vpsRequired };
      report.scenarios.sc2_child_en = { ...vpsRequired };
      report.scenarios.sc3_separation = { ...vpsRequired };
    }

    const regEmail = `smoke-${Date.now()}@example.com`;
    const regPass = `SmokeTest-${Date.now()}!aB`;
    const smokeRunStartedAt = Date.now();
    let registerCreatedFamily = false;
    let smokeFamilyId = null;
    try {
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
      if (regStatus !== 201) {
        report.scenarios.sc5_new_family = {
          register: regStatus,
          pass: false,
          reason: 'register failed on prod',
        };
      } else {
        registerCreatedFamily = true;
        const sc5Cookies = jar();
        const sc5Login = await parentLogin(sc5Cookies, regEmail, regPass);
        const sc5Csrf = sc5Login.csrf;
        const me5reg = await parentMe(sc5Cookies);
        smokeFamilyId = me5reg?.family_id || null;
        const opts5 = await localeOptions(sc5Cookies);
        const putEn = await apiLocale(sc5Cookies, sc5Csrf, 'en-GB');
        const me5 = await parentMe(sc5Cookies);
        report.scenarios.sc5_new_family = {
          register: regStatus,
          family_id: smokeFamilyId,
          locale_options: opts5,
          put_en_gb_status: putEn.status,
          put_en_gb_error: putEn.body?.error,
          parent_locale_after: me5.preferred_locale,
          pass:
            opts5.english_app_enabled === false &&
            putEn.status === 403 &&
            putEn.body?.error === 'ENGLISH_NOT_AVAILABLE' &&
            me5.preferred_locale === 'sv-SE',
        };
      }
    } finally {
      const vpsOn = process.env.FOUNDER_SMOKE_VPS === '1';
      report.sc5_cleanup = await performSc5ProdCleanup({
        base: BASE,
        email: regEmail,
        password: regPass,
        smokeRunStartedAt,
        registerCreatedFamily,
        knownFamilyId: smokeFamilyId,
        parentLogin: { jar, fn: parentLogin },
        parentMe,
        deleteSmokeFamily,
        vpsEnabled: vpsOn,
        vpsDb: vpsOn ? vpsDb : null,
      });
      if (report.sc5_cleanup.ok !== true) {
        report.errors.push('sc5_cleanup failed');
      }
    }
  } finally {
    if (snap && process.env.FOUNDER_SMOKE_VPS === '1') {
      const restored = vpsDb('restore', familyId, snap);
      report.restored = restored?.ok === true;
      report.restore_matches_snapshot =
        restored?.restore_matches_snapshot === true || snapshotsEqual(snap, restored?.after);
      report.snapshot_after = restored?.after || null;
      if (!report.restored) report.errors.push('restore did not report ok');
      if (!report.restore_matches_snapshot) {
        report.errors.push('restore snapshot mismatch');
      }
    } else if (process.env.FOUNDER_SMOKE_VPS === '1') {
      report.restored = false;
      report.restore_matches_snapshot = false;
    }
  }

  report.health_after = await jfetch(`${BASE}/health`).then((r) => r.json());
  if (opts.finalize === false) return report;
  return finalizeFounderSmokeReport(report, {
    requireRestore: process.env.FOUNDER_SMOKE_VPS === '1',
    requireBrowser: false,
  });
}

async function main() {
  const report = await runApiSmoke({});
  console.log(JSON.stringify(report, null, 2));
  if (report.overall !== 'PASS') process.exit(1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(JSON.stringify({ overall: 'INCOMPLETE', errors: [e.message] }, null, 2));
    process.exit(1);
  });
}

module.exports = { runApiSmoke };
