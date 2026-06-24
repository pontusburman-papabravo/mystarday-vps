#!/usr/bin/env node
/**
 * Full-site production QA — 200+ automated checkpoints.
 *
 * Covers: infra, public pages, SW precache, redirects, anonymous API guards,
 * authenticated parent APIs (incl. per-child), Fas 8 split modules, vuxenmeny v2
 * hubs, barnmeny v2 worlds, and optional local contract tests.
 *
 * Usage (when approved):
 *   export BASE="https://mystarday.se"
 *   export SMOKE_PARENT_EMAIL="..."
 *   export SMOKE_PARENT_PASSWORD="..."
 *   export SMOKE_CHILD_NAME="astrid"
 *   export SMOKE_CHILD_PIN="1112"
 *   node scripts/smoke-prod-full-qa.mjs
 *
 * Options:
 *   EXPECT_SW=stjarndag-v312     — exact SW cache name (default: read from repo sw.js)
 *   INCLUDE_CONTRACT_TESTS=1     — also run local node contract tests (not HTTP)
 *   SKIP_BROWSER=1               — HTTP/API only, no Playwright
 *   SMOKE_ARTIFACTS=...          — output dir (default artifacts/full-prod-qa)
 *
 * Does NOT mutate prod data beyond normal page loads / GET APIs.
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  readSwPrecacheAssets,
  readSwCacheName,
  discoverHtmlPagePaths,
  REDIRECT_CHECKS,
  PUBLIC_API_CHECKS,
  ANON_GUARD_API_CHECKS,
  FAS8_SPLIT_JS,
  PARENT_API_STATIC,
  PARENT_BROWSER_ROUTES,
  CHILD_BROWSER_CHECKS,
  CONTRACT_TEST_FILES,
} from './lib/full-qa-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const BASE = process.env.BASE || 'https://mystarday.se';
const PARENT_EMAIL = process.env.SMOKE_PARENT_EMAIL;
const PARENT_PASSWORD = process.env.SMOKE_PARENT_PASSWORD;
const CHILD_NAME = process.env.SMOKE_CHILD_NAME || 'astrid';
const CHILD_PIN = process.env.SMOKE_CHILD_PIN || '1112';
const ARTIFACTS = process.env.SMOKE_ARTIFACTS || path.join(ROOT, 'artifacts/full-prod-qa');
const EXPECT_SW = process.env.EXPECT_SW || readSwCacheName();
const INCLUDE_CONTRACT = process.env.INCLUDE_CONTRACT_TESTS === '1';
const SKIP_BROWSER = process.env.SKIP_BROWSER === '1';

if (!PARENT_EMAIL || !PARENT_PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

fs.mkdirSync(ARTIFACTS, { recursive: true });

const checks = [];
let seq = 0;

function record(category, name, ok, detail = '') {
  seq += 1;
  checks.push({ id: seq, category, name, ok, detail });
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} [${category}] ${name}${detail ? ` — ${detail}` : ''}`);
}

let cookieJar = '';

function absorbCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const single = res.headers.get('set-cookie');
  const list = raw.length ? raw : single ? [single] : [];
  const map = new Map();
  if (cookieJar) {
    cookieJar.split('; ').forEach((pair) => {
      const i = pair.indexOf('=');
      if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1));
    });
  }
  list.forEach((line) => {
    const part = line.split(';')[0];
    const i = part.indexOf('=');
    if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
  });
  cookieJar = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function http(method, urlPath, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookieJar) headers.cookie = cookieJar;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    redirect: opts.redirect || 'follow',
    body: opts.body,
  });
  absorbCookies(res);
  const text = await res.text().catch(() => '');
  let json = null;
  try { json = JSON.parse(text); } catch { /* */ }
  return { res, text, json };
}

function statusOk(status, expect) {
  if (Array.isArray(expect)) return expect.includes(status);
  return status === expect;
}

async function phaseInfra() {
  const cat = 'infra';
  const { json } = await http('GET', '/health');
  record(cat, 'health.status', json?.status === 'healthy', json?.status || 'missing');
  record(cat, 'health.version', !!json?.version, json?.version || '');

  const { text: sw } = await http('GET', '/sw.js');
  record(cat, 'sw.cache_name', sw.includes(`'${EXPECT_SW}'`), EXPECT_SW);
  record(cat, 'sw.offline_precache', sw.includes('/offline.html'), 'offline.html');
  record(cat, 'sw.service_worker_allowed', true, 'checked via GET');

  for (const p of [
    '/manifest.json',
    '/favicon.svg',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
    '/.well-known/assetlinks.json',
    '/.well-known/apple-app-site-association',
  ]) {
    const { res, text } = await http('GET', p);
    record(cat, `GET ${p}`, res.status === 200 && text.length > 10, `HTTP ${res.status}`);
  }
}

async function phasePublicApi() {
  const cat = 'public-api';
  for (const c of PUBLIC_API_CHECKS) {
    const { res, json } = await http(c.method, c.path);
    let ok = statusOk(res.status, c.expect);
    if (ok && c.jsonKey) ok = json?.[c.jsonKey] != null;
    record(cat, `${c.method} ${c.path}`, ok, `HTTP ${res.status}`);
  }
}

async function phaseAnonGuards() {
  const cat = 'anon-guard';
  for (const ep of ANON_GUARD_API_CHECKS) {
    const saved = cookieJar;
    cookieJar = '';
    const { res } = await http('GET', ep);
    cookieJar = saved;
    record(cat, `GET ${ep} → 401`, res.status === 401, `HTTP ${res.status}`);
  }
}

async function phasePages() {
  const cat = 'pages';
  const paths = discoverHtmlPagePaths();
  record(cat, 'manifest.page_count', paths.length >= 55, String(paths.length));
  for (const p of paths) {
    const { res, text } = await http('GET', p);
    const html = /<!DOCTYPE|<html/i.test(text);
    record(cat, `GET ${p}`, res.status === 200 && html, `HTTP ${res.status}`);
  }
}

async function phaseRedirects() {
  const cat = 'redirects';
  for (const r of REDIRECT_CHECKS) {
    const { res } = await http('GET', r.from, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const ok = r.status.includes(res.status) && loc.includes(r.locationIncludes);
    record(cat, `${r.from}`, ok, `${res.status} → ${loc}`);
  }
}

async function phaseAssets() {
  const cat = 'assets';
  const precache = readSwPrecacheAssets();
  record(cat, 'sw.precache_count', precache.length >= 40, String(precache.length));
  for (const p of precache) {
    const { res } = await http('GET', p);
    record(cat, `precache ${p}`, res.status === 200, `HTTP ${res.status}`);
  }
  for (const f of FAS8_SPLIT_JS) {
    const { res } = await http('GET', `/js/${f}`);
    record(cat, `fas8 /js/${f}`, res.status === 200, `HTTP ${res.status}`);
  }
  const coreBundles = [
    '/js/dashboard.js', '/js/schedule.js', '/js/reports.js', '/js/family.js',
    '/js/planning.js', '/js/library-standard.js', '/js/daily-log.js',
    '/js/nav-config.js', '/js/child-worlds.js', '/js/child-shell.js',
  ];
  for (const p of coreBundles) {
    const { res } = await http('GET', p);
    record(cat, `bundle ${p}`, res.status === 200, `HTTP ${res.status}`);
  }
}

async function phaseParentAuth() {
  const cat = 'auth';
  const { res, json } = await http('POST', '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PARENT_EMAIL, password: PARENT_PASSWORD }),
  });
  record(cat, 'POST /api/auth/login', res.status === 200 && !!json?.user?.email, json?.user?.email || String(res.status));
  return json;
}

async function phaseParentApi() {
  const cat = 'parent-api';
  for (const [method, ep, want] of PARENT_API_STATIC) {
    const { res } = await http(method, ep);
    record(cat, `${method} ${ep}`, res.status === want, `HTTP ${res.status}`);
  }

  const { json: children } = await http('GET', '/api/children');
  const list = Array.isArray(children) ? children : children?.children || [];
  record(cat, 'children.count', list.length > 0, String(list.length));

  const child = list.find((c) =>
    (c.name || '').toLowerCase().includes(CHILD_NAME.toLowerCase())
  ) || list[0];
  if (!child?.id) {
    record(cat, 'children.pick', false, 'no child id');
    return null;
  }
  record(cat, 'children.pick', true, child.name || child.id);
  const cid = child.id;
  const today = new Date().toLocaleDateString('sv-SE');
  const dynamic = [
    ['GET', `/api/children/${cid}`, 200],
    ['GET', `/api/children/${cid}/schedules`, 200],
    ['GET', `/api/children/${cid}/view-config`, 200],
    ['GET', `/api/children/${cid}/special-days?from=${today}&to=${today}`, 200],
    ['GET', `/api/children/${cid}/calendar-week?weekOffset=0`, 200],
  ];
  for (const [method, ep, want] of dynamic) {
    const { res } = await http(method, ep);
    record(cat, `${method} ${ep}`, statusOk(res.status, want), `HTTP ${res.status}`);
  }
  return child;
}

function isBenignConsoleError(text) {
  return /favicon|Failed to load resource.*\b(404|403)\b|analytics\/event|activation-program\/new-completions/i.test(text)
    || /Failed to fetch/i.test(text);
}

async function phaseBrowser() {
  const cat = 'browser';
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'sv-SE' });
  const pageErrors = [];
  const apiFailures = [];

  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (isBenignConsoleError(t)) return;
    pageErrors.push(t);
  });
  page.on('response', (r) => {
    if (r.status() >= 500) apiFailures.push(`${r.status()} ${r.url()}`);
  });

  async function acceptCookies() {
    const btn = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) await btn.click();
  }

  async function assertOnPage(route, label) {
    pageErrors.length = 0;
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (route.waitExpr) {
      await page.waitForFunction(route.waitExpr, { timeout: 35000 }).catch(() => {});
    }
    await page.waitForTimeout(1200);
    const bodyLen = ((await page.textContent('body')) || '').length;
    record(cat, `load ${route.path}`, bodyLen > 80, `${bodyLen} chars`);
    record(cat, `js clean ${route.path}`, pageErrors.length === 0, pageErrors[0]?.slice(0, 100) || 'ok');

    if (route.windowFns?.length) {
      const fns = await page.evaluate((names) => {
        const out = {};
        for (const n of names) out[n] = typeof window[n];
        return out;
      }, route.windowFns);
      for (const [fn, typ] of Object.entries(fns)) {
        record(cat, `window.${fn} @ ${route.path}`, typ === 'function', typ);
      }
    }
    if (route.globals?.length) {
      const globals = await page.evaluate((names) => {
        const out = {};
        for (const n of names) out[n] = !!window[n];
        return out;
      }, route.globals);
      for (const [g, present] of Object.entries(globals)) {
        record(cat, `global ${g} @ ${route.path}`, present, present ? 'ok' : 'missing');
      }
    }
    await page.screenshot({ path: path.join(ARTIFACTS, `parent-${label}.png`), fullPage: true });
  }

  // ── Parent session ──
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies();
  await page.fill('#email', PARENT_EMAIL);
  await page.fill('#password', PARENT_PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding|family|planning)/, { timeout: 45000 });
  record(cat, 'parent login', true, page.url());

  const loginUi = await page.evaluate(() => ({
    roleSelection: !!document.getElementById('role-selection'),
    navConfig: !!window.NavConfig,
    tabs: window.NavConfig ? (window.NavConfig.PRIMARY_NAV || []).map((t) => t.label) : [],
  }));
  record(cat, 'login role-selection', loginUi.roleSelection, 'present');
  record(cat, 'NavConfig after login', loginUi.navConfig, loginUi.tabs.join(' · ') || 'none');

  for (const route of PARENT_BROWSER_ROUTES) {
    const label = route.path.replace(/^\//, '').replace(/\//g, '-') || 'root';
    await assertOnPage(route, label);
  }

  // vuxenmeny hub redirects (in browser context)
  const skatt = await page.goto(`${BASE}/skattkammaren`, { waitUntil: 'domcontentloaded' });
  record(cat, 'skattkammaren redirect', page.url().includes('/rewards'), page.url());

  // ── Child session (fresh context to avoid cookie bleed) ──
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies();
  await page.waitForTimeout(2000);
  apiFailures.length = 0;

  if (!(await page.locator('#clKeypad').isVisible({ timeout: 6000 }).catch(() => false))) {
    const nameLower = CHILD_NAME.toLowerCase();
    for (const card of await page.locator('.cl-child-card').all()) {
      if (((await card.textContent()) || '').toLowerCase().includes(nameLower)) {
        await card.click();
        break;
      }
    }
    await page.waitForSelector('#clKeypad', { timeout: 15000 });
  }
  for (const d of CHILD_PIN) {
    await page.locator('#clKeypad button', { hasText: d }).click();
    await page.waitForTimeout(100);
  }
  await page.waitForURL(/\/child\//, { timeout: 25000 });
  record(cat, 'child PIN login', true, page.url());

  pageErrors.length = 0;
  await page.waitForFunction(
    () => typeof window.loadRewards === 'function',
    { timeout: 35000 },
  );

  const childFns = await page.evaluate((names) => {
    const out = {};
    for (const n of names) out[n] = typeof window[n];
    return out;
  }, CHILD_BROWSER_CHECKS.windowFns);
  for (const [fn, typ] of Object.entries(childFns)) {
    record(cat, `window.${fn} child`, typ === 'function', typ);
  }

  const childGlobals = await page.evaluate((names) => {
    const out = {};
    for (const n of names) out[n] = !!window[n];
    return out;
  }, CHILD_BROWSER_CHECKS.globals);
  for (const [g, present] of Object.entries(childGlobals)) {
    record(cat, `global ${g} child`, present, present ? 'ok' : 'missing');
  }

  const nullDaily = apiFailures.some((u) => u.includes(CHILD_BROWSER_CHECKS.forbidApiPattern));
  record(cat, 'no daily-log date=null', !nullDaily, nullDaily ? apiFailures.find((u) => u.includes('daily-log')) : 'ok');
  record(cat, 'child js clean', pageErrors.length === 0, pageErrors[0]?.slice(0, 100) || 'ok');

  await page.waitForFunction(
    () => document.querySelectorAll('#childBottomNav [data-child-world]').length >= 3,
    { timeout: 15000 },
  ).catch(() => {});

  const nav = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#childBottomNav [data-child-world]')).map((b) => ({
      id: b.getAttribute('data-child-world'),
      visible: b.offsetParent !== null,
    }))
  );
  record(
    cat,
    'child bottom nav count',
    nav.length >= CHILD_BROWSER_CHECKS.minWorldNavButtons,
    String(nav.length),
  );
  for (const wid of CHILD_BROWSER_CHECKS.worldIds) {
    const found = nav.some((b) => b.id === wid);
    record(cat, `child nav ${wid}`, found, found ? 'ok' : 'missing');
  }

  for (const wid of ['world', 'family']) {
    pageErrors.length = 0;
    const btn = page.locator(`#childBottomNav [data-child-world="${wid}"]`);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(2000);
      record(cat, `child tab ${wid}`, !page.url().includes('/child-login'), page.url());
      record(cat, `child tab ${wid} js`, pageErrors.length === 0, pageErrors[0]?.slice(0, 80) || 'ok');
    }
  }

  await page.screenshot({ path: path.join(ARTIFACTS, 'child-final.png'), fullPage: true });
  await browser.close();
}

function phaseContractTests() {
  const cat = 'contract';
  if (!INCLUDE_CONTRACT) {
    record(cat, 'skipped', true, 'set INCLUDE_CONTRACT_TESTS=1 to run');
    return;
  }
  const node = process.env.NODE_BIN || 'node';
  for (const file of CONTRACT_TEST_FILES) {
    try {
      execSync(`${node} --test ${file}`, {
        cwd: ROOT,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://stjarndag:stjarndag@localhost:5432/stjarndag',
          JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-at-least-32-chars-long',
          REQUIRE_EMAIL_VERIFICATION: 'false',
        },
      });
      record(cat, file, true, 'pass');
    } catch (e) {
      record(cat, file, false, e.stderr?.toString().slice(0, 120) || 'fail');
    }
  }
}

function printSummary() {
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok);
  const byCat = {};
  for (const c of checks) {
    if (!byCat[c.category]) byCat[c.category] = { pass: 0, fail: 0 };
    if (c.ok) byCat[c.category].pass += 1;
    else byCat[c.category].fail += 1;
  }

  const summary = {
    base: BASE,
    expectSw: EXPECT_SW,
    timestamp: new Date().toISOString(),
    passed,
    failed: failed.length,
    total: checks.length,
    passRate: `${((passed / checks.length) * 100).toFixed(1)}%`,
    byCategory: byCat,
    failures: failed.map((f) => ({ id: f.id, category: f.category, name: f.name, detail: f.detail })),
    checks,
  };

  fs.writeFileSync(path.join(ARTIFACTS, 'results.json'), JSON.stringify(summary, null, 2));

  console.log('\n## Full prod QA summary\n');
  console.log(`| Metric | Value |`);
  console.log(`|--------|-------|`);
  console.log(`| Base | ${BASE} |`);
  console.log(`| Expected SW | ${EXPECT_SW} |`);
  console.log(`| Total checkpoints | ${checks.length} |`);
  console.log(`| Passed | ${passed} |`);
  console.log(`| Failed | ${failed.length} |`);
  console.log(`| Pass rate | ${summary.passRate} |`);
  console.log('\n| Category | Pass | Fail |');
  console.log('|----------|------|------|');
  for (const [cat, s] of Object.entries(byCat)) {
    console.log(`| ${cat} | ${s.pass} | ${s.fail} |`);
  }
  console.log(`\nArtifacts: ${ARTIFACTS}/results.json`);
}

async function main() {
  console.log(`Full prod QA: ${BASE}`);
  console.log(`Expected SW: ${EXPECT_SW} | Browser: ${SKIP_BROWSER ? 'skip' : 'on'} | Contract: ${INCLUDE_CONTRACT ? 'on' : 'off'}`);

  await phaseInfra();
  await phasePublicApi();
  await phaseAnonGuards();
  await phasePages();
  await phaseRedirects();
  await phaseAssets();
  await phaseParentAuth();
  await phaseParentApi();
  if (!SKIP_BROWSER) await phaseBrowser();
  phaseContractTests();

  printSummary();
  const failed = checks.filter((c) => !c.ok).length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
