#!/usr/bin/env node
/**
 * Mobile full QA — automated subset of docs/QA-mobil-fullstandig-protokoll.md (~72 checkpoints).
 *
 * Usage:
 *   export BASE="http://127.0.0.1:3000"
 *   export SMOKE_PARENT_EMAIL="qa.mobil@test.stjarndag.local"
 *   export SMOKE_PARENT_PASSWORD="QaMobilTest2026!Secure"
 *   node scripts/seed-smoke-family.mjs
 *   node scripts/smoke-mobile-full-qa.mjs
 *
 * Demo (synlig mobil):
 *   SMOKE_HEADED=1 SMOKE_SLOW_MS=60 node scripts/smoke-mobile-full-qa.mjs
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MOBILE_VIEWPORT,
  AUTO_IDS,
  REDIRECT_CHECKS,
  PARENT_ROUTES,
  PUBLIC_ROUTES,
} from './lib/mobile-qa-checkpoints.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const PARENT_EMAIL = process.env.SMOKE_PARENT_EMAIL;
const PARENT_PASSWORD = process.env.SMOKE_PARENT_PASSWORD;
const CHILD_NAME = process.env.SMOKE_CHILD_NAME || 'Astrid';
const CHILD_PIN = process.env.SMOKE_CHILD_PIN || '4829';
const CHILD2_NAME = process.env.SMOKE_CHILD2_NAME || 'Erik';
const CHILD2_PIN = process.env.SMOKE_CHILD2_PIN || '7391';
const ARTIFACTS = process.env.SMOKE_ARTIFACTS || path.join(ROOT, 'artifacts/mobile-full-qa');
const HEADED = process.env.SMOKE_HEADED === '1' || process.env.SMOKE_HEADED === 'true';
const SLOW_MS = Number(process.env.SMOKE_SLOW_MS || (HEADED ? 60 : 0)) || 0;

if (!PARENT_EMAIL || !PARENT_PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

fs.mkdirSync(ARTIFACTS, { recursive: true });

const checks = [];
const pageErrors = [];

function record(id, name, ok, detail = '') {
  checks.push({ id, name, ok, detail, ts: new Date().toISOString() });
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
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

  const { res: mRes, text: manifest } = await http('GET', '/manifest.json');
  record('A02', 'GET /manifest.json', mRes.status === 200 && /Stjärn|stjärn|mystarday/i.test(manifest), `HTTP ${mRes.status}`);

  const { text: sw } = await http('GET', '/sw.js');
  record('A03', 'GET /sw.js', sw.includes('CACHE_NAME') && sw.includes('STATIC_ASSETS'), 'sw.js ok');

  const { res: iconRes } = await http('GET', '/icon-192.png');
  record('A04', 'GET /icon-192.png', iconRes.status === 200, `HTTP ${iconRes.status}`);

  await http('POST', '/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PARENT_EMAIL, password: PARENT_PASSWORD }),
  });
  record('A05', 'POST /api/auth/login (seed parent)', cookieJar.includes('access_token') || cookieJar.length > 10, 'session set');

  const { json: children } = await http('GET', '/api/children');
  const list = Array.isArray(children) ? children : children?.children || [];
  record('A06', 'GET /api/children ≥2', list.length >= 2, String(list.length));

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
}

async function phasePublicRoutes(page) {
  for (const route of PUBLIC_ROUTES) {
    pageErrors.length = 0;
    const res = await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (route.id === 'B01' || route.id === 'B02' || route.id === 'B03') await acceptCookies(page);
    const bodyLen = await page.evaluate(() => (document.body.innerText || '').length);
    record(route.id, `GET ${route.path}`, res.status() === 200 && bodyLen > 20, `${bodyLen} chars`);
    if (route.id === 'B04') {
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
    bottomNav: !!document.getElementById('nativeTabBarMount')?.innerHTML?.trim(),
  }));
  record('C02', 'Rollväljare dold', !loginUi.roleSelection, loginUi.roleSelection ? 'synlig' : 'ok');
  record('C03', 'NavConfig laddad', loginUi.navConfig, loginUi.tabs.join(' · ') || 'none');
  record('C04', 'Primärnav 5 flikar', loginUi.tabs.length === 5, String(loginUi.tabs.length));

  const { json: me } = await http('GET', '/api/auth/me');
  record('C05', 'GET /api/auth/me', !!me?.email || !!me?.user?.email, me?.email || me?.user?.email || '');

  const { res: refreshRes } = await http('POST', '/api/auth/refresh');
  record('C06', 'POST /api/auth/refresh', refreshRes.status === 200, `HTTP ${refreshRes.status}`);
}

async function phaseParentRoutes(page) {
  const seen = new Set();
  for (const route of PARENT_ROUTES) {
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
    record('U02', `js clean ${route.path}`, pageErrors.filter((e) => !isBenignError(e)).length === 0,
      pageErrors[0]?.slice(0, 80) || 'ok');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    record('U01', `no horizontal scroll ${route.path}`, overflow, overflow ? 'ok' : 'overflow');

    await page.screenshot({
      path: path.join(ARTIFACTS, `parent-${route.id}-${route.path.replace(/\//g, '-') || 'root'}.png`),
      fullPage: true,
    }).catch(() => {});
  }

  // Dashboard-specific checks
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const dash = await page.evaluate((names) => {
    const lower = (document.body.innerText || '').toLowerCase();
    return {
      initDragDrop: typeof window.initDragDrop === 'function',
      loadStarHistory: typeof window.loadStarHistory === 'function',
      renderSpecialDaysCalendar: typeof window.renderSpecialDaysCalendar === 'function',
      bothChildren: names.every((n) => lower.includes(n.toLowerCase())),
      handoff: !!document.querySelector('a[href*="child-login"]'),
      notifLink: !!document.querySelector('a[href="/notifications"]'),
    };
  }, [CHILD_NAME, CHILD2_NAME]);
  record('D02', 'Barnkort båda barn', dash.bothChildren, `${CHILD_NAME}+${CHILD2_NAME}`);
  record('D04', 'initDragDrop', dash.initDragDrop, dash.initDragDrop ? 'function' : 'missing');
  record('D05', 'loadStarHistory', dash.loadStarHistory, dash.loadStarHistory ? 'function' : 'missing');
  record('D08', 'renderSpecialDaysCalendar', dash.renderSpecialDaysCalendar, dash.renderSpecialDaysCalendar ? 'function' : 'missing');
  record('D11', 'Handoff child-login', dash.handoff, dash.handoff ? 'ok' : 'missing link');
  record('D14', 'Notis-länk header', dash.notifLink, '');

  // Schedule modals
  await page.goto(`${BASE}/schedule`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.openTemplateModal === 'function', { timeout: 20000 }).catch(() => {});
  const sched = await page.evaluate(() => ({
    template: typeof window.openTemplateModal === 'function',
    fill: typeof window.openFillWeekModal === 'function',
  }));
  record('G10', 'openTemplateModal', sched.template, sched.template ? 'function' : 'missing');
  record('G11', 'openFillWeekModal', sched.fill, sched.fill ? 'function' : 'missing');

  // Library hub
  await page.goto(`${BASE}/library`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const lib = await page.evaluate(() => ({
    hub: !!window.LibraryMagicHub,
    standard: !!document.querySelector('[data-library-section="standard"]'),
    mine: !!document.querySelector('[data-library-section="mine"]'),
  }));
  record('H12', 'LibraryMagicHub', lib.hub, lib.hub ? 'ok' : 'missing');
  record('H01', 'library sections', lib.standard && lib.mine, `std=${lib.standard} mine=${lib.mine}`);

  // Family + child profile
  await page.goto(`${BASE}/family`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const famText = await page.evaluate(() => document.body.innerText || '');
  record('K02', 'Familj listar båda barn', [CHILD_NAME, CHILD2_NAME].every((n) => famText.toLowerCase().includes(n.toLowerCase())), '');

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

  // Skattkammaren redirect (client-side deep link on some builds — accept rewards URL)
  await page.goto(`${BASE}/skattkammaren`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  record('I02', 'skattkammaren → rewards', page.url().includes('/rewards'), page.url());

  // child-settings redirect (needs real child id from API)
  const { json: children } = await http('GET', '/api/children');
  const list = Array.isArray(children) ? children : children?.children || [];
  const first = list[0];
  if (first?.id) {
    await page.goto(`${BASE}/child-settings?id=${encodeURIComponent(first.id)}`, { waitUntil: 'domcontentloaded' });
    record('L14', 'child-settings redirect', page.url().includes('/family/child/') && page.url().includes('tab=setup'), page.url());
  }

  // API checks
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

  // Deep links
  if (first?.id) {
    await page.goto(`${BASE}/daily-log?childId=${encodeURIComponent(first.id)}`, { waitUntil: 'domcontentloaded' });
    record('F14', 'daily-log childId deep link', page.url().includes('childId'), page.url());
    const today = new Date().toLocaleDateString('sv-SE');
    await page.goto(`${BASE}/daily-log?date=${today}`, { waitUntil: 'domcontentloaded' });
    record('F15', 'daily-log date deep link', page.url().includes('date='), page.url());
  }

  // Logout
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find((el) => /logga ut/i.test(el.textContent || ''));
    if (btn) btn.click();
  });
  await page.waitForFunction(() => location.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
  record('C10', 'Logga ut', page.url().includes('/login'), page.url());
}

async function enterChildPin(page, childName, pin, label) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await new Promise((r) => setTimeout(r, 1500));

  if (!(await page.$('#clKeypad'))) {
    const picked = await page.evaluate((name) => {
      const cards = [...document.querySelectorAll('.cl-child-card')];
      const card = cards.find((c) => (c.textContent || '').toLowerCase().includes(name.toLowerCase()));
      if (card) { card.click(); return true; }
      if (cards[0]) { cards[0].click(); return true; }
      return false;
    }, childName);
    if (!picked) throw new Error(`No child card for ${childName}`);
    await page.waitForSelector('#clKeypad', { timeout: 15000 });
  }

  for (const d of pin) {
    await page.evaluate((digit) => {
      const btn = [...document.querySelectorAll('#clKeypad button')].find((b) => b.textContent.trim() === digit);
      if (btn) btn.click();
    }, d);
    await new Promise((r) => setTimeout(r, SLOW_MS ? 120 : 80));
  }
  await new Promise((r) => setTimeout(r, 2000));
  await page.waitForFunction(() => /\/child(\/|$)/.test(location.pathname), { timeout: 25000 });
  record(label, `child PIN ${childName}`, true, page.url());
}

async function phaseChild(page) {
  pageErrors.length = 0;
  await enterChildPin(page, CHILD_NAME, CHILD_PIN, 'O03');

  const childBoot = await page.evaluate(() => ({
    worlds: !!window.ChildWorlds,
    loadRewards: typeof window.loadRewards === 'function',
    coalescedLoadDay: typeof window.coalescedLoadDay === 'function',
    navCount: document.querySelectorAll('#childBottomNav [data-child-world]').length,
    navIds: [...document.querySelectorAll('#childBottomNav [data-child-world]')].map((b) => b.getAttribute('data-child-world')),
    overflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
  }));
  record('O09', 'ChildWorlds global', childBoot.worlds, '');
  record('P12', 'coalescedLoadDay', childBoot.coalescedLoadDay === true, childBoot.coalescedLoadDay ? 'function' : 'missing');
  record('Q11', 'loadRewards', childBoot.loadRewards === true, childBoot.loadRewards ? 'function' : 'missing');
  record('O10', 'Bottennav ≥3', childBoot.navCount >= 3, String(childBoot.navCount));
  record('P01', 'Landning child/today', page.url().includes('/child/today') || page.url().includes('/child'), page.url());
  record('U01', 'child no horizontal scroll', childBoot.overflow, '');

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

  // Header controls
  const header = await page.evaluate(() => ({
    switchBtn: !!document.getElementById('switchChildBtn'),
    systemMenu: !!document.querySelector('[data-child-system-menu], #childSystemMenuBtn, button[aria-label*="Förälder"]'),
    logoutBtn: !!document.getElementById('logoutBtn'),
  }));
  record('S08', 'Byt barn-knapp', header.switchBtn, '');
  record('S09', 'Förälder/logout kontroller', header.systemMenu || header.logoutBtn, '');

  // Block parent route in child mode
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1500));
  record('S10', 'Barn blockeras från dashboard', !page.url().includes('/dashboard') || page.url().includes('/child'), page.url());

  await page.screenshot({ path: path.join(ARTIFACTS, 'child-astrid-final.png'), fullPage: true }).catch(() => {});

  // Second child login
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded' });
  await enterChildPin(page, CHILD2_NAME, CHILD2_PIN, 'O06');
  await page.screenshot({ path: path.join(ARTIFACTS, 'child-erik-final.png'), fullPage: true }).catch(() => {});
}

function writeReport(summary) {
  fs.writeFileSync(path.join(ARTIFACTS, 'results.json'), JSON.stringify(summary, null, 2));

  const failRows = summary.failures.map((f) => `| ${f.id} | ${f.name} | ${f.detail} |`).join('\n');
  const md = `# QA Mobil — Automatiserad rapport

**Datum:** ${summary.timestamp}  
**BASE:** ${summary.base}  
**Viewport:** ${summary.viewport.width}×${summary.viewport.height}  
**Pass rate:** ${summary.passRate} (${summary.passed}/${summary.totalAutomated})

## Sammanfattning

| Metric | Värde |
|--------|-------|
| Automatiserade punkter | ${summary.totalAutomated} |
| ✅ Pass | ${summary.passed} |
| ❌ Fail | ${summary.failed} |
| Manuella kvar ([M]) | ${200 - summary.totalAutomated} |

## Underkännanden

| ID | Test | Detalj |
|----|------|--------|
${failRows || '| — | Inga | — |'}

## Nästa steg

1. Kör manuella punkter ([M]) från \`docs/QA-mobil-fullstandig-protokoll.md\`
2. Fyll i §5 sign-off i protokollet
3. Bifoga screenshots från \`${ARTIFACTS}/\`

---
*Genererad av scripts/smoke-mobile-full-qa.mjs*
`;
  fs.writeFileSync(path.join(ARTIFACTS, 'rapport.md'), md);
}

async function main() {
  console.log(`\n📱 Mobile Full QA — ${BASE}`);
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
  await phaseChild(page);

  await browser.close();

  const automatedIds = new Set(checks.map((c) => c.id));
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok);

  const summary = {
    base: BASE,
    viewport: MOBILE_VIEWPORT,
    timestamp: new Date().toISOString(),
    protocolDoc: 'docs/QA-mobil-fullstandig-protokoll.md',
    totalProtocolPoints: 200,
    totalAutomated: checks.length,
    expectedAutoIds: AUTO_IDS.length,
    passed,
    failed: failed.length,
    passRate: `${((passed / checks.length) * 100).toFixed(1)}%`,
    failures: failed.map((f) => ({ id: f.id, name: f.name, detail: f.detail })),
    checks,
    missingAutoIds: AUTO_IDS.filter((id) => !automatedIds.has(id)),
  };

  writeReport(summary);

  console.log('\n## Mobile QA summary\n');
  console.log(`Pass: ${passed}/${checks.length} (${summary.passRate})`);
  console.log(`Artifacts: ${ARTIFACTS}/`);
  console.log(`Rapport: ${ARTIFACTS}/rapport.md`);

  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  ${f.id}: ${f.name} — ${f.detail}`);
  }

  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
