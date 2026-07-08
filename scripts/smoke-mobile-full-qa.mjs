#!/usr/bin/env node
/**
 * Mobile QA smoke — docs/QA-mobil-fullstandig-protokoll.md v1.2
 *
 * QA_MODE=full  (default) — full regression subset + Z contracts
 * QA_MODE=gate  — Release Gate §0 automated rows only
 *
 * Usage:
 *   npm run qa:mobile-gate
 *   npm run qa:mobile-full
 *
 * Demo (synlig mobil):
 *   SMOKE_HEADED=1 SMOKE_SLOW_MS=60 npm run qa:mobile-full
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MOBILE_VIEWPORT,
  AUTO_IDS,
  FULL_AUTO_IDS,
  REDIRECT_CHECKS,
  PARENT_ROUTES,
  GATE_PARENT_ROUTES,
  PUBLIC_ROUTES,
  Z14_BUNDLES,
} from './lib/mobile-qa-checkpoints.mjs';
import {
  GATE_IDS,
  GATE_ID_SET,
  GATE_MANUAL_IDS,
  GATE_AUTO_IDS,
  Z_IDS,
} from './lib/qa-gate-ids.mjs';
import {
  runParentDailyLogGate,
  runMultiChildStatsGate,
  runPlanningHubGate,
  runZ14BundleGate,
  runChildCompleteGate,
  runChildRedeemGate,
  runParentApproveGate,
} from './lib/mobile-qa-gate-flows.mjs';
import { resolveSmokeCredentials } from './lib/qa-test-accounts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const QA_MODE = process.env.QA_MODE === 'gate' ? 'gate' : 'full';
const smoke = resolveSmokeCredentials();
const BASE = smoke.base;
const PARENT_EMAIL = smoke.parentEmail;
const PARENT_PASSWORD = smoke.parentPassword;
const CHILD_NAME = smoke.childName;
const CHILD_PIN = smoke.childPin;
const CHILD2_NAME = smoke.child2Name;
const CHILD2_PIN = smoke.child2Pin;
const ARTIFACTS = process.env.SMOKE_ARTIFACTS || path.join(ROOT, 'artifacts/mobile-full-qa');
const HEADED = process.env.SMOKE_HEADED === '1' || process.env.SMOKE_HEADED === 'true';
const SLOW_MS = Number(process.env.SMOKE_SLOW_MS || (HEADED ? 60 : 0)) || 0;

if (!PARENT_EMAIL || !PARENT_PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD (required on prod base URL)');
  process.exit(1);
}

fs.mkdirSync(ARTIFACTS, { recursive: true });

const checks = [];
const pageErrors = [];
let childrenCache = [];

function shouldRecord(id) {
  if (QA_MODE === 'full') return true;
  return GATE_ID_SET.has(id) || id.startsWith('Z');
}

function record(id, name, ok, detail = '') {
  if (!shouldRecord(id)) return;
  checks.push({ id, name, ok, detail, ts: new Date().toISOString() });
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
}

let cookieJar = '';

function absorbCookies(res, jarRef = { value: cookieJar }) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const single = res.headers.get('set-cookie');
  const list = raw.length ? raw : single ? [single] : [];
  const map = new Map();
  if (jarRef.value) {
    jarRef.value.split('; ').forEach((pair) => {
      const i = pair.indexOf('=');
      if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1));
    });
  }
  list.forEach((line) => {
    const part = line.split(';')[0];
    const i = part.indexOf('=');
    if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
  });
  jarRef.value = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  cookieJar = jarRef.value;
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

function findChild(name) {
  return childrenCache.find((c) => (c.name || '').toLowerCase() === name.toLowerCase());
}

function isBenignError(text) {
  return /favicon|Failed to load resource|analytics\/event|navigator\.vibrate|vibration|Failed to fetch/i.test(text);
}

async function acceptCookies(page) {
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#cb-banner .cb-btn-accept')
      || [...document.querySelectorAll('button')].find((b) => /Godkänn alla/i.test(b.textContent || ''));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (clicked) await new Promise((r) => setTimeout(r, 400));
}

async function phaseInfra() {
  const { json } = await http('GET', '/health');
  record('A01', 'GET /health', json?.status === 'healthy', json?.status || 'missing');

  if (QA_MODE === 'full') {
    const { res: mRes, text: manifest } = await http('GET', '/manifest.json');
    const { res: iconRes } = await http('GET', '/icon-192.png');
    const manifestOk = mRes.status === 200 && /Stjärn|stjärn|mystarday/i.test(manifest);
    const iconOk = iconRes.status === 200;
    record('A02', 'PWA manifest + ikon', manifestOk && iconOk, `manifest=${mRes.status} icon=${iconRes.status}`);

    const { text: sw } = await http('GET', '/sw.js');
    record('A03', 'GET /sw.js', sw.includes('CACHE_NAME') && sw.includes('STATIC_ASSETS'), 'sw.js ok');
  }

  await http('POST', '/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PARENT_EMAIL, password: PARENT_PASSWORD }),
  });
  record('A05', 'POST /api/auth/login (seed parent)', cookieJar.includes('access_token') || cookieJar.length > 10, 'session set');

  const { json: children } = await http('GET', '/api/children');
  childrenCache = Array.isArray(children) ? children : children?.children || [];
  record('A06', 'GET /api/children ≥2', childrenCache.length >= 2, String(childrenCache.length));

  for (const [id, spec] of [
    ['A07', { name: CHILD_NAME, pin: CHILD_PIN }],
    ['A08', { name: CHILD2_NAME, pin: CHILD2_PIN }],
  ]) {
    const saved = cookieJar;
    cookieJar = '';
    const { res, json } = await http('POST', '/api/auth/child-login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: spec.name.toLowerCase(), pin: spec.pin }),
    });
    cookieJar = saved;
    record(id, `POST child-login ${spec.name}`, res.status === 200, json?.name || String(res.status));
  }

  if (QA_MODE === 'full') {
    await runZ14BundleGate({ http, record, bundles: Z14_BUNDLES });
  }
}

async function phasePublicRoutes(page) {
  const routes = QA_MODE === 'gate'
    ? PUBLIC_ROUTES.filter((r) => r.id === 'B03')
    : PUBLIC_ROUTES;

  for (const route of routes) {
    pageErrors.length = 0;
    const res = await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (route.id === 'B01' || route.id === 'B02' || route.id === 'B03') await acceptCookies(page);
    const bodyLen = await page.evaluate(() => (document.body.innerText || '').length);
    if (route.id === 'B03') {
      record('O01', 'Barnlogin-sida laddar', res.status() === 200 && bodyLen > 20, `${bodyLen} chars`);
    } else {
      record(route.id, `GET ${route.path}`, res.status() === 200 && bodyLen > 20, `${bodyLen} chars`);
    }
    if (route.id === 'B03' && QA_MODE === 'full') {
      await acceptCookies(page);
      const hidden = await page.evaluate(() => {
        const b = document.getElementById('cb-banner');
        return !b || b.offsetParent === null || getComputedStyle(b).display === 'none';
      });
      record('B04', 'Cookie-banner stängd', hidden, hidden ? 'ok' : 'still visible');
    }
  }
}

async function phaseRedirects() {
  if (QA_MODE === 'gate') return;
  for (const r of REDIRECT_CHECKS) {
    if (r.id === 'L14' || r.browserOnly) continue;
    const { res } = await http('GET', r.from, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const ok = [301, 302, 303, 307, 308].includes(res.status) && loc.includes(r.locationIncludes);
    record(r.id, `redirect ${r.from}`, ok, `${res.status} → ${loc}`);
  }
}

async function parentLogin(page) {
  pageErrors.length = 0;
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForSelector('#email');
  await page.type('#email', PARENT_EMAIL, { delay: SLOW_MS ? 20 : 0 });
  await page.type('#password', PARENT_PASSWORD, { delay: SLOW_MS ? 20 : 0 });
  await page.click('#submitBtn');
  await page.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 45000 });
  if (page.url().includes('/onboarding')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
  }
  const url = page.url();
  record('C01', 'Förälder UI-login', !url.includes('/login'), url);

  const loginUi = await page.evaluate(() => ({
    roleSelection: !!document.getElementById('role-selection'),
    navConfig: !!window.NavConfig,
    tabs: window.NavConfig ? (window.NavConfig.PRIMARY_NAV || []).map((t) => t.label) : [],
  }));
  record('C02', 'Rollväljare dold', !loginUi.roleSelection, loginUi.roleSelection ? 'synlig' : 'ok');
  record('Z01', 'NavConfig + primärnav', loginUi.navConfig && loginUi.tabs.length === 5,
    loginUi.tabs.join(' · ') || 'none');
  record('C04', 'Primärnav 5 flikar', loginUi.tabs.length === 5, String(loginUi.tabs.length));

  if (QA_MODE === 'full') {
    const { json: me } = await http('GET', '/api/auth/me');
    const email = me?.email || me?.user?.email || '';
    const { res: refreshRes } = await http('POST', '/api/auth/refresh');
    record('C05', 'GET /api/auth/me + refresh', !!email && refreshRes.status === 200,
      `${email || 'no email'} refresh=${refreshRes.status}`);
  }
}

async function phaseParentRoutes(page) {
  const routeList = QA_MODE === 'gate' ? GATE_PARENT_ROUTES : PARENT_ROUTES;
  const seen = new Set();
  let u01Ok = true;
  let u02Ok = true;

  for (const route of routeList) {
    if (seen.has(route.id)) continue;
    seen.add(route.id);
    pageErrors.length = 0;
    const res = await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (route.waitExpr) {
      await page.waitForFunction(route.waitExpr, { timeout: 35000 }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 800));
    const status = res.status();
    const bodyLen = await page.evaluate(() => (document.body.innerText || '').length);
    const ok = route.allow403
      ? (status === 200 || status === 403) && bodyLen > 20
      : status === 200 && bodyLen > 40;
    record(route.id, `load ${route.path}`, ok, `HTTP ${status}, ${bodyLen} chars`);

    const jsClean = pageErrors.filter((e) => !isBenignError(e)).length === 0;
    u02Ok = u02Ok && jsClean;
    if (QA_MODE === 'full') {
      record('U02', `js clean ${route.path}`, jsClean, pageErrors[0]?.slice(0, 80) || 'ok');
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    u01Ok = u01Ok && overflow;
    if (QA_MODE === 'full') {
      record('U01', `no horizontal scroll ${route.path}`, overflow, overflow ? 'ok' : 'overflow');
    }

    await page.screenshot({
      path: path.join(ARTIFACTS, `parent-${route.id}-${route.path.replace(/\//g, '-') || 'root'}.png`),
      fullPage: true,
    }).catch(() => {});
  }

  if (QA_MODE === 'gate') {
    record('U01', 'Ingen horisontell scroll (förälder)', u01Ok, u01Ok ? 'ok' : 'overflow');
    record('U02', 'Inga JS-crash (förälder)', u02Ok, u02Ok ? 'ok' : pageErrors[0]?.slice(0, 80) || 'error');
  }

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const dash = await page.evaluate((names) => {
    const lower = (document.body.innerText || '').toLowerCase();
    return {
      initDragDrop: typeof window.initDragDrop === 'function',
      loadStarHistory: typeof window.loadStarHistory === 'function',
      renderSpecialDaysCalendar: typeof window.renderSpecialDaysCalendar === 'function',
      bothChildren: names.every((n) => lower.includes(n.toLowerCase())),
      handoff: !!document.querySelector('[data-action="child-login"], a[href*="child-login"], .parent-handoff-primary'),
      notifLink: !!document.querySelector('a[href="/notifications"]'),
    };
  }, [CHILD_NAME, CHILD2_NAME]);
  record('D02', 'Barnkort båda barn', dash.bothChildren, `${CHILD_NAME}+${CHILD2_NAME}`);
  record('Z02', 'initDragDrop', dash.initDragDrop, dash.initDragDrop ? 'function' : 'missing');
  record('Z03', 'loadStarHistory', dash.loadStarHistory, dash.loadStarHistory ? 'function' : 'missing');
  record('Z04', 'renderSpecialDaysCalendar', dash.renderSpecialDaysCalendar, dash.renderSpecialDaysCalendar ? 'function' : 'missing');
  record('D11', 'Handoff child-login', dash.handoff, dash.handoff ? 'ok' : 'missing link');
  if (QA_MODE === 'full') {
    record('D14', 'Notis-länk header', dash.notifLink, '');
  }

  await page.goto(`${BASE}/schedule`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.openTemplateModal === 'function', { timeout: 20000 }).catch(() => {});
  const sched = await page.evaluate(() => ({
    template: typeof window.openTemplateModal === 'function',
    fill: typeof window.openFillWeekModal === 'function',
    scheduleCore: !!(window.ScheduleCore || window.DAYS || typeof window.fmtTime === 'function'),
  }));
  record('Z05', 'ScheduleCore / helpers', sched.scheduleCore, sched.scheduleCore ? 'ok' : 'missing');
  record('Z06', 'Schema modaler', sched.template && sched.fill,
    `template=${sched.template} fill=${sched.fill}`);

  if (QA_MODE === 'full') {
    await page.goto(`${BASE}/library`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));
    const lib = await page.evaluate(() => ({
      hub: !!window.LibraryMagicHub,
      standard: !!document.querySelector('[data-library-section="standard"]'),
      mine: !!document.querySelector('[data-library-section="mine"]'),
    }));
    record('Z07', 'LibraryMagicHub', lib.hub, lib.hub ? 'ok' : 'missing');
    record('H01', 'library sections', lib.standard && lib.mine, `std=${lib.standard} mine=${lib.mine}`);
  }

  await page.goto(`${BASE}/family`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const famText = await page.evaluate(() => document.body.innerText || '');
  record('K02', 'Familj listar båda barn', [CHILD_NAME, CHILD2_NAME].every((n) => famText.toLowerCase().includes(n.toLowerCase())), '');

  const astrid = findChild(CHILD_NAME);
  if (astrid?.id) {
    await page.goto(`${BASE}/family/child/${encodeURIComponent(astrid.id)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));
    record('L01', 'Barnprofil Astrid', page.url().includes('/family/child/'), page.url());
    record('L02', 'Barnprofil overview', page.url().includes('/family/child/'), '');
  } else {
    const childLink = await page.evaluate((name) => {
      const links = [...document.querySelectorAll('a[href*="/family/child/"]')];
      return links.some((a) => (a.textContent || '').toLowerCase().includes(name.toLowerCase()));
    }, CHILD_NAME);
    if (childLink) {
      await page.evaluate((name) => {
        const links = [...document.querySelectorAll('a[href*="/family/child/"]')];
        const link = links.find((a) => (a.textContent || '').toLowerCase().includes(name.toLowerCase()));
        if (link) link.click();
      }, CHILD_NAME);
      await page.waitForFunction(() => location.pathname.includes('/family/child/'), { timeout: 15000 }).catch(() => {});
      record('L01', 'Barnprofil Astrid', page.url().includes('/family/child/'), page.url());
      record('L02', 'Barnprofil overview', page.url().includes('/family/child/'), '');
    }
  }

  if (QA_MODE === 'full') {
    await page.goto(`${BASE}/skattkammaren`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    record('I02', 'skattkammaren → rewards', page.url().includes('/rewards'), page.url());

    const first = childrenCache[0];
    if (first?.id) {
      await page.goto(`${BASE}/child-settings?id=${encodeURIComponent(first.id)}`, { waitUntil: 'domcontentloaded' });
      record('L14', 'child-settings redirect', page.url().includes('/family/child/') && page.url().includes('tab=setup'), page.url());
    }

    const apis = [
      ['I11', '/api/rewards/pending-requests', [200, 204]],
      ['J08', '/api/for-dig/goals', [200]],
      ['N14', '/api/notifications/unread-count', [200]],
      ['T09', '/api/children', [200]],
    ];
    for (const [id, ep, wants] of apis) {
      const { res } = await http('GET', ep);
      record(id, `GET ${ep}`, wants.includes(res.status), `HTTP ${res.status}`);
    }

    if (first?.id) {
      await page.goto(`${BASE}/daily-log?childId=${encodeURIComponent(first.id)}`, { waitUntil: 'domcontentloaded' });
      record('F14', 'daily-log childId deep link', page.url().includes('childId'), page.url());
      const today = new Date().toLocaleDateString('sv-SE');
      await page.goto(`${BASE}/daily-log?date=${today}`, { waitUntil: 'domcontentloaded' });
      record('F15', 'daily-log date deep link', page.url().includes('date='), page.url());
    }
  }

  await runPlanningHubGate({ page, record, BASE });
  await runParentDailyLogGate({
    http,
    record,
    astrid: findChild(CHILD_NAME),
    erik: findChild(CHILD2_NAME),
  });
  await runMultiChildStatsGate({
    http,
    record,
    astrid: findChild(CHILD_NAME),
    erik: findChild(CHILD2_NAME),
  });
}

async function parentLogout(page) {
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  const loggedOut = await page.evaluate(() => {
    if (window.Auth && typeof window.Auth.logout === 'function') {
      window.Auth.logout();
      return 'auth';
    }
    const btn = document.getElementById('logoutBtn') || document.getElementById('nativeLogoutBtn');
    if (btn) { btn.click(); return 'btn'; }
    return '';
  });
  if (loggedOut) {
    await page.waitForFunction(() => location.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
  }
  record('C10', 'Logga ut → /login', page.url().includes('/login'), page.url());
}

async function enterChildPin(page, childName, pin, label) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await new Promise((r) => setTimeout(r, 2000));

  const onPinStep = await page.evaluate(() => document.getElementById('clStepPin')?.classList.contains('active'));
  if (!onPinStep) {
    const entered = await page.evaluate((name) => {
      const list = document.getElementById('clChildList');
      const items = list ? [...list.querySelectorAll('button, li, .cl-child-card, [data-child-id]')] : [];
      const match = items.find((el) => (el.textContent || '').toLowerCase().includes(name.toLowerCase()));
      if (match) { match.click(); return 'list'; }
      const noSession = document.getElementById('clNoSessionState');
      if (noSession && !noSession.classList.contains('hidden')) {
        const input = document.getElementById('clManualNameInput');
        if (input) {
          input.value = name;
          document.getElementById('clManualNameForm')?.requestSubmit();
          return 'manual';
        }
      }
      const notMe = document.getElementById('clNotMeBtn');
      if (notMe && !notMe.closest('.hidden')) {
        notMe.click();
        const input = document.getElementById('clManualNameInput');
        if (input) {
          input.value = name;
          document.getElementById('clManualNameForm')?.requestSubmit();
          return 'not-me-manual';
        }
      }
      return '';
    }, childName);
    if (!entered) throw new Error(`Could not select child ${childName}`);
    await page.waitForFunction(
      () => document.getElementById('clStepPin')?.classList.contains('active'),
      { timeout: 20000 },
    );
  } else {
    const greeting = await page.evaluate(() => (document.getElementById('clPinGreeting')?.textContent || '').toLowerCase());
    if (greeting && !greeting.includes(childName.toLowerCase())) {
      await page.evaluate(() => {
        if (typeof window.clBackToProfiles === 'function') window.clBackToProfiles();
        else document.getElementById('clPinBackProfiles')?.click();
      });
      await new Promise((r) => setTimeout(r, 800));
      return enterChildPin(page, childName, pin, label);
    }
  }

  await page.waitForSelector('#clKeypad button[data-action]', { timeout: 15000 });
  for (const d of pin) {
    await page.evaluate((digit) => {
      document.querySelector(`#clKeypad button[data-action="${digit}"]`)?.click();
    }, d);
    await new Promise((r) => setTimeout(r, SLOW_MS ? 120 : 120));
  }
  await new Promise((r) => setTimeout(r, 2500));
  await page.waitForFunction(() => /\/child(\/|$)/.test(location.pathname), { timeout: 35000 });
  record(label, `child PIN ${childName}`, true, page.url());
}

async function phaseChild(browser, parentPage) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const nullDateRequests = [];
  page.on('request', (req) => {
    const u = req.url();
    if (/daily-log\?date=null/i.test(u)) nullDateRequests.push(u);
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isBenignError(msg.text())) pageErrors.push(msg.text());
  });

  if (QA_MODE === 'full') record('O01', 'child-login sida', true, 'fresh context');
  await enterChildPin(page, CHILD_NAME, CHILD_PIN, 'O03');

  const childBoot = await page.evaluate(() => ({
    worlds: !!window.ChildWorlds,
    worldCount: window.ChildWorlds?.CHILD_WORLDS?.length || 0,
    loadRewards: typeof window.loadRewards === 'function',
    coalescedLoadDay: typeof window.coalescedLoadDay === 'function',
    navCount: document.querySelectorAll('#childBottomNav [data-child-world]').length,
    overflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
    switchBtn: !!document.getElementById('switchChildBtn'),
    systemMenu: !!document.querySelector('[data-child-system-menu], #childSystemMenuBtn, button[aria-label*="Förälder"]'),
    logoutBtn: !!document.getElementById('logoutBtn'),
  }));

  record('Z08', 'ChildWorlds', childBoot.worlds && childBoot.worldCount >= 3,
    `worlds=${childBoot.worldCount || '?'}`);
  record('Z09', 'Child bottennav ≥3', childBoot.navCount >= 3, String(childBoot.navCount));
  record('Z10', 'coalescedLoadDay', childBoot.coalescedLoadDay, childBoot.coalescedLoadDay ? 'function' : 'missing');
  record('Z11', 'loadRewards', childBoot.loadRewards, childBoot.loadRewards ? 'function' : 'missing');
  record('Z13', 'Child header controls', childBoot.switchBtn && (childBoot.systemMenu || childBoot.logoutBtn), '');
  record('P01', 'Landning child/today', page.url().includes('/child/today') || page.url().includes('/child'), page.url());

  if (QA_MODE === 'gate') {
    record('U01', 'Ingen horisontell scroll (barn)', childBoot.overflow, childBoot.overflow ? 'ok' : 'overflow');
    const childJsClean = pageErrors.filter((e) => !isBenignError(e)).length === 0;
    record('U02', 'Inga JS-crash (barn)', childJsClean, childJsClean ? 'ok' : pageErrors[0]?.slice(0, 80) || 'error');
  } else {
    record('U01', 'child no horizontal scroll', childBoot.overflow, '');
  }

  await runChildCompleteGate({ page, record, SLOW_MS });

  for (const wid of ['world', 'family']) {
    pageErrors.length = 0;
    const clicked = await page.evaluate((worldId) => {
      const btn = document.querySelector(`#childBottomNav [data-child-world="${worldId}"]`);
      if (btn) { btn.click(); return true; }
      return false;
    }, wid);
    if (!clicked) await page.goto(`${BASE}/child/${wid}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));
    record(wid === 'world' ? 'Q01' : 'R01', `child tab ${wid}`, !page.url().includes('/child-login'), page.url());
  }

  const redeemOk = await runChildRedeemGate({ page, record, BASE, SLOW_MS });

  record('Z12', 'Inga daily-log?date=null', nullDateRequests.length === 0,
    nullDateRequests[0] || 'ok');

  if (QA_MODE === 'full') {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));
    record('S10', 'Barn blockeras från dashboard', !page.url().includes('/dashboard') || page.url().includes('/child'), page.url());
  }

  await page.screenshot({ path: path.join(ARTIFACTS, 'child-astrid-final.png'), fullPage: true }).catch(() => {});

  await ctx.close();

  const ctx2 = await browser.createBrowserContext();
  const page2 = await ctx2.newPage();
  await enterChildPin(page2, CHILD2_NAME, CHILD2_PIN, 'O06');
  await page2.screenshot({ path: path.join(ARTIFACTS, 'child-erik-final.png'), fullPage: true }).catch(() => {});
  await ctx2.close();

  if (redeemOk && parentPage) {
    await parentPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await parentPage.waitForSelector('#email');
    await parentPage.type('#email', PARENT_EMAIL, { delay: 0 });
    await parentPage.type('#password', PARENT_PASSWORD, { delay: 0 });
    await parentPage.click('#submitBtn');
    await parentPage.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 45000 });
    await runParentApproveGate({ page: parentPage, record, BASE, SLOW_MS });
  } else if (shouldRecord('I03')) {
    record('I03', 'Godkänn inlösning (UI)', false, redeemOk === null ? 'ingen redeem' : 'skipped');
  }
}

function buildGateSummary() {
  const gateChecks = checks.filter((c) => GATE_AUTO_IDS.includes(c.id) || (c.id.startsWith('Z') && GATE_ID_SET.has(c.id)));
  const gateAutomatedIds = new Set(gateChecks.map((c) => c.id));
  const gateFailed = gateChecks.filter((c) => !c.ok);
  const gatePassed = gateChecks.filter((c) => c.ok).length;
  return {
    mode: QA_MODE,
    totalGateIds: GATE_IDS.length,
    manualGateIds: GATE_MANUAL_IDS,
    automatedTarget: GATE_AUTO_IDS.length,
    automatedRun: gateChecks.length,
    passed: gatePassed,
    failed: gateFailed.length,
    passRate: gateChecks.length ? `${((gatePassed / gateChecks.length) * 100).toFixed(1)}%` : '0%',
    failures: gateFailed.map((f) => ({ id: f.id, name: f.name, detail: f.detail })),
    missingAutomated: GATE_AUTO_IDS.filter((id) => !gateAutomatedIds.has(id)),
    manualPending: GATE_MANUAL_IDS,
  };
}

function writeReport(summary) {
  fs.writeFileSync(path.join(ARTIFACTS, 'results.json'), JSON.stringify(summary, null, 2));
  if (summary.gate) {
    fs.writeFileSync(path.join(ARTIFACTS, 'gate-results.json'), JSON.stringify(summary.gate, null, 2));
  }

  const failRows = summary.failures.map((f) => `| ${f.id} | ${f.name} | ${f.detail} |`).join('\n');
  const gateSection = summary.gate ? `
## Release Gate (§0)

| Metric | Värde |
|--------|-------|
| Gate auto pass rate | ${summary.gate.passRate} (${summary.gate.passed}/${summary.gate.automatedRun}) |
| Manuella kvar | ${summary.gate.manualPending.join(', ')} |
| Saknade auto-ID | ${summary.gate.missingAutomated.join(', ') || '—'} |
` : '';

  const md = `# QA Mobil — Automatiserad rapport

**Datum:** ${summary.timestamp}  
**BASE:** ${summary.base}  
**Läge:** ${summary.mode}  
**Viewport:** ${summary.viewport.width}×${summary.viewport.height}  
**Pass rate:** ${summary.passRate} (${summary.passed}/${summary.totalAutomated})

## Sammanfattning

| Metric | Värde |
|--------|-------|
| Automatiserade punkter | ${summary.totalAutomated} |
| ✅ Pass | ${summary.passed} |
| ❌ Fail | ${summary.failed} |
| Protokoll | v1.2 — ${summary.mode === 'gate' ? 'Release Gate' : 'Full regression subset'} |
${gateSection}
## Underkännanden

| ID | Test | Detalj |
|----|------|--------|
${failRows || '| — | Inga | — |'}

## Nästa steg

1. ${summary.mode === 'gate' ? 'Kör manuella Gate-rader i `docs/QA-mobil-release-gate-runbook.md`' : 'Kör manuella punkter ([M]) från protokollet'}
2. Fyll i §5 sign-off i protokollet
3. Bifoga screenshots från \`${ARTIFACTS}/\`

---
*Genererad av scripts/smoke-mobile-full-qa.mjs*
`;
  fs.writeFileSync(path.join(ARTIFACTS, 'rapport.md'), md);
}

async function main() {
  console.log(`\n📱 Mobile QA (${QA_MODE}) — ${BASE}`);
  console.log(`Viewport: ${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height} | Headed: ${HEADED}\n`);

  await phaseInfra();
  await phaseRedirects();

  const browser = await puppeteer.launch({
    headless: !HEADED,
    slowMo: SLOW_MS,
    args: HEADED ? ['--window-size=420,900'] : ['--no-sandbox'],
    defaultViewport: {
      ...MOBILE_VIEWPORT,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isBenignError(msg.text())) pageErrors.push(msg.text());
  });

  await phasePublicRoutes(page);
  await parentLogin(page);
  await phaseParentRoutes(page);
  await phaseChild(browser, page);
  await parentLogout(page);

  await browser.close();

  const automatedIds = new Set(checks.map((c) => c.id));
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok);

  const summary = {
    base: BASE,
    mode: QA_MODE,
    viewport: MOBILE_VIEWPORT,
    timestamp: new Date().toISOString(),
    protocolDoc: 'docs/QA-mobil-fullstandig-protokoll.md',
    protocolVersion: '1.2',
    totalProtocolPoints: 225,
    totalAutomated: checks.length,
    expectedAutoIds: QA_MODE === 'gate' ? GATE_AUTO_IDS.length : FULL_AUTO_IDS.length,
    passed,
    failed: failed.length,
    passRate: checks.length ? `${((passed / checks.length) * 100).toFixed(1)}%` : '0%',
    failures: failed.map((f) => ({ id: f.id, name: f.name, detail: f.detail })),
    checks,
    missingAutoIds: (QA_MODE === 'gate' ? GATE_AUTO_IDS : FULL_AUTO_IDS).filter((id) => !automatedIds.has(id)),
    gate: QA_MODE === 'gate' ? buildGateSummary() : buildGateSummary(),
  };

  writeReport(summary);

  console.log('\n## Mobile QA summary\n');
  console.log(`Mode: ${QA_MODE}`);
  console.log(`Pass: ${passed}/${checks.length} (${summary.passRate})`);
  if (QA_MODE === 'gate') {
    console.log(`Gate auto: ${summary.gate.passed}/${summary.gate.automatedRun} (${summary.gate.passRate})`);
    console.log(`Gate manual pending: ${GATE_MANUAL_IDS.join(', ')}`);
  }
  console.log(`Artifacts: ${ARTIFACTS}/`);

  const exitFailures = QA_MODE === 'gate'
    ? summary.gate.failures
    : failed;

  if (exitFailures.length) {
    console.log('\nFailures:');
    for (const f of exitFailures) console.log(`  ${f.id}: ${f.name} — ${f.detail}`);
  }

  process.exit(exitFailures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
