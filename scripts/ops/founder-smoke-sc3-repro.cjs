#!/usr/bin/env node
'use strict';
/**
 * Focused sc3 isolation repro — stdout JSON only, no credentials.
 */
const puppeteer = require('puppeteer');
const { vpsDb } = require('./founder-smoke-vps.cjs');
const { robustParentLogin } = require('./founder-smoke-browser-login.cjs');
const {
  enterChildPin,
  selectExpectedChild,
} = require('./founder-parent-english-prod-smoke-browser.cjs');
const { collectChildTodayVisibleCopy } = require('./founder-smoke-browser-settings-wait.cjs');

const BASE = (process.env.SMOKE_BASE_URL || process.env.PROD_BASE || '').replace(/\/$/, '');
const EMAIL = process.env.FOUNDER_QA_EMAIL;
const PASSWORD = process.env.FOUNDER_QA_PASSWORD;
const CHILD_PIN = process.env.FOUNDER_CHILD_PIN;
const CHILD_USER = process.env.FOUNDER_CHILD_USERNAME;
const VPS_ON = process.env.FOUNDER_SMOKE_VPS === '1';

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

async function parentLoginApi() {
  const cookies = jar();
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  cookies.store(res);
  const body = await res.json();
  return { cookies, familyId: body.user?.familyId || body.user?.family_id, csrf: body.csrfToken };
}

async function childMeFromApi() {
  const cj = jar();
  const res = await fetch(`${BASE}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: CHILD_USER, pin: CHILD_PIN }),
  });
  cj.store(res);
  if (res.status !== 200) return { status: res.status, me: null };
  const me = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cj.h() } }).then((r) => r.json());
  return { status: res.status, me };
}

function prepareSc3ServerState(familyId) {
  vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
  vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
  vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
}

function prepareSc2ServerState(familyId) {
  vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
  vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
  vpsDb('set', familyId, ['--slug', 'english_child_experience', '--on']);
}

async function probePage(page) {
  const copy = await collectChildTodayVisibleCopy(page);
  const me = await fetch(`${BASE}/api/auth/me`, {
    headers: {
      Cookie: (await page.cookies()).map((c) => `${c.name}=${c.value}`).join('; '),
    },
  }).then((r) => (r.ok ? r.json() : null));
  const ds = await page.evaluate(() => ({
    html_lang: document.documentElement.lang || '',
    childTodayI18nReady: document.documentElement.dataset.childTodayI18nReady || '',
    childTodayI18nLocale: document.documentElement.dataset.childTodayI18nLocale || '',
    pathname: window.location.pathname,
  }));
  const snip = (s) => String(s || '').slice(0, 120);
  return {
    child_ui_locale: me?.child_ui_locale ?? null,
    english_child_experience_enabled: me?.english_child_experience_enabled ?? null,
    html_lang: ds.html_lang,
    childTodayI18nReady: ds.childTodayI18nReady,
    childTodayI18nLocale: ds.childTodayI18nLocale,
    pathname: ds.pathname,
    main_copy_snippet: snip(copy.mainText),
    nav_copy_snippet: snip(copy.navText),
  };
}

async function runSc3OnPage(page, browser) {
  try {
    await robustParentLogin(page, browser, {
      base: BASE,
      email: EMAIL,
      password: PASSWORD,
      fetchMe: async () => {
        const cs = await page.cookies();
        const h = cs.map((c) => `${c.name}=${c.value}`).join('; ');
        const r = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: h } });
        return r.ok ? r.json() : null;
      },
    });
    const result = await enterChildPin(page, CHILD_USER, 'sv-SE');
    const probe = await probePage(page);
    return { pass: result.pass === true, reason: result.reason || null, probe };
  } catch (e) {
    const probe = await probePage(page).catch(() => ({}));
    return { pass: false, reason: e.code || e.message, probe };
  }
}

async function runSc2OnPage(page, browser) {
  try {
    await robustParentLogin(page, browser, {
      base: BASE,
      email: EMAIL,
      password: PASSWORD,
      fetchMe: async () => {
        const cs = await page.cookies();
        const h = cs.map((c) => `${c.name}=${c.value}`).join('; ');
        const r = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: h } });
        return r.ok ? r.json() : null;
      },
    });
    return await enterChildPin(page, CHILD_USER, 'en-GB');
  } catch (e) {
    return { pass: false, reason: e.code || e.message };
  }
}

async function main() {
  if (!VPS_ON || !EMAIL || !CHILD_USER || !BASE) {
    console.error(JSON.stringify({ error: 'missing env' }));
    process.exit(2);
  }
  const { familyId } = await parentLoginApi();
  if (!familyId) {
    console.error(JSON.stringify({ error: 'parent login failed' }));
    process.exit(2);
  }

  const report = {
    sc3_alone_pass: false,
    sc2_then_sc3_same_context_pass: false,
    sc2_then_sc3_fresh_context_pass: false,
    api_before_sc3_alone: null,
    probes: {},
  };

  prepareSc3ServerState(familyId);
  report.api_before_sc3_alone = await childMeFromApi();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // A — sc3 alone, fresh context
    const ctxA = await browser.createBrowserContext();
    try {
      const pageA = await ctxA.newPage();
      await pageA.setViewport({ width: 390, height: 844, isMobile: true });
      const a = await runSc3OnPage(pageA, browser);
      report.sc3_alone_pass = a.pass;
      report.probes.sc3_alone = a.probe;
      if (!a.pass) report.probes.sc3_alone_fail_reason = a.reason;
    } finally {
      await ctxA.close();
    }

    // B — sc2 then sc3 same context
    prepareSc2ServerState(familyId);
    const ctxB = await browser.createBrowserContext();
    try {
      const pageB = await ctxB.newPage();
      await pageB.setViewport({ width: 390, height: 844, isMobile: true });
      const sc2b = await runSc2OnPage(pageB, browser);
      report.probes.sc2_same_context_pass = sc2b.pass === true;
      prepareSc3ServerState(familyId);
      report.api_before_sc3_same_context = await childMeFromApi();
      const sc3b = await runSc3OnPage(pageB, browser);
      report.sc2_then_sc3_same_context_pass = sc3b.pass;
      report.probes.sc3_same_context = sc3b.probe;
      if (!sc3b.pass) report.probes.sc3_same_context_fail_reason = sc3b.reason;
    } finally {
      await ctxB.close();
    }

    // C — sc2 then sc3 fresh contexts
    prepareSc2ServerState(familyId);
    const ctxC2 = await browser.createBrowserContext();
    try {
      const pageC2 = await ctxC2.newPage();
      await pageC2.setViewport({ width: 390, height: 844, isMobile: true });
      await runSc2OnPage(pageC2, browser);
    } finally {
      await ctxC2.close();
    }
    prepareSc3ServerState(familyId);
    report.api_before_sc3_fresh = await childMeFromApi();
    const ctxC3 = await browser.createBrowserContext();
    try {
      const pageC3 = await ctxC3.newPage();
      await pageC3.setViewport({ width: 390, height: 844, isMobile: true });
      const sc3c = await runSc3OnPage(pageC3, browser);
      report.sc2_then_sc3_fresh_context_pass = sc3c.pass;
      report.probes.sc3_fresh_context = sc3c.probe;
      if (!sc3c.pass) report.probes.sc3_fresh_context_fail_reason = sc3c.reason;
    } finally {
      await ctxC3.close();
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ fatal_error: e.message }));
  process.exit(1);
});
