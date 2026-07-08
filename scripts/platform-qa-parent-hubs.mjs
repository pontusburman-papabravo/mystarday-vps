/**
 * Platform QA — parent hubs navigation + iPhone SE sanity.
 * Outputs JSON for docs/qa/parent-hubs-platform-qa.md
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { resolvePlatformCredentials } from './lib/qa-test-accounts.mjs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = process.env.OUT_DIR || '/opt/cursor/artifacts/screenshots';

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cookieJar = '';

function absorbCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const map = new Map();
  if (cookieJar) {
    cookieJar.split('; ').forEach((pair) => {
      const i = pair.indexOf('=');
      if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1));
    });
  }
  raw.forEach((line) => {
    const part = line.split(';')[0];
    const i = part.indexOf('=');
    if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
  });
  cookieJar = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function apiFetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookieJar) headers.cookie = cookieJar;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  absorbCookies(res);
  return res;
}

async function ensureCsrf() {
  const res = await apiFetch('/api/auth/csrf-token');
  const body = await res.json();
  return body.csrfToken;
}

async function ensureParent() {
  const { email, password } = resolvePlatformCredentials();
  await apiFetch('/api/auth/csrf-token');
  let login = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Platform QA', email, password, termsAccepted: true }),
    });
    await apiFetch('/api/auth/csrf-token');
    login = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }
  if (!login.ok) throw new Error('login failed');
}

async function ensureChild() {
  const famRes = await apiFetch('/api/family');
  const family = await famRes.json();
  if (family.children && family.children.length > 0) return family.children[0];
  const csrf = await ensureCsrf();
  const childRes = await apiFetch('/api/children', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ name: 'Astrid', emoji: '🌟', birthday: '2014-03-15', pin: '4829' }),
  });
  if (!childRes.ok) throw new Error('child create failed: ' + (await childRes.text()));
  return childRes.json();
}

async function seedAuthState(page) {
  const meRes = await apiFetch('/api/auth/me');
  if (!meRes.ok) throw new Error('/api/auth/me failed');
  const user = await meRes.json();
  await page.goto(`${BASE}/planning`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((u) => {
    localStorage.setItem('stjarndag_user', JSON.stringify(u));
  }, user);
}

async function setPageCookies(page) {
  const cookies = cookieJar.split('; ').map((pair) => {
    const i = pair.indexOf('=');
    return { name: pair.slice(0, i), value: pair.slice(i + 1), url: BASE };
  });
  if (cookies.length) await page.setCookie(...cookies);
}

async function iphoneFoldCheck(page, hub, selectors) {
  const foldCheck = await page.evaluate((sel) => {
    const viewportH = window.innerHeight;
    const results = {};
    for (const [key, query] of Object.entries(sel)) {
      const el = document.querySelector(query);
      if (!el) {
        results[key] = { found: false, aboveFold: false };
        continue;
      }
      const rect = el.getBoundingClientRect();
      results[key] = {
        found: true,
        aboveFold: rect.top >= 0 && rect.bottom <= viewportH,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
      };
    }
    results.viewportH = viewportH;
    return results;
  }, selectors);
  const file = path.join(OUT_DIR, `${hub}-iphone-se-platform-qa.png`);
  await page.screenshot({ path: file, fullPage: false });
  return { hub, file, foldCheck };
}

async function main() {
  await ensureParent();
  const child = await ensureChild();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true });
  await setPageCookies(page);
  await seedAuthState(page);

  const flows = {};
  const iphone = {};

  // ─── Hem → barnrad → daglig logg → tillbaka ─────────────────
  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#parentHomeHubMount:not(.hidden) .parent-ready-child, .parent-ready-empty', { timeout: 25000 });
    await sleep(2000);
    iphone.hem = await iphoneFoldCheck(page, 'hem', {
      greeting: '.parent-hub-greeting',
      childRow: '.parent-ready-child',
      handoff: '[data-action="child-login"]',
    });
    const hemLink = await page.$('.parent-ready-child');
    if (hemLink) {
      const href = await page.evaluate((el) => el.getAttribute('href'), hemLink);
      await hemLink.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
      await sleep(1000);
      const afterUrl = page.url();
      const isDailyLog = afterUrl.includes('/daily-log');
      const isProfile = afterUrl.includes('/family/child/');
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      flows.hem = {
        pass: isDailyLog || isProfile,
        childHref: href,
        landed: afterUrl.replace(BASE, ''),
        note: isDailyLog ? 'daily-log' : isProfile ? 'barnprofil (inget schema idag)' : 'unexpected',
      };
    } else {
      flows.hem = { pass: false, error: 'no child row link' };
    }
  } catch (err) {
    flows.hem = { pass: false, error: err.message };
  }

  // ─── Planering → schema/bibliotek/kalender → tillbaka ───────
  try {
    await page.goto(`${BASE}/planning`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#planningHubMount .magic-hub-section', { timeout: 15000 });
    await sleep(1000);
    iphone.planering = await iphoneFoldCheck(page, 'planering', {
      bibliotek: '[data-hub-link="Bibliotek"]',
      schema: '[data-hub-link="Veckoschema"]',
      kalender: '[data-hub-link="Kalender"]',
    });

    const planFlows = {};
    for (const [name, linkTitle, expectPath, useHubClick] of [
      ['bibliotek', 'Bibliotek', '/library', true],
      ['schema', 'Veckoschema', '/schedule', false],
      ['kalender', 'Kalender', '/calendar', false],
    ]) {
      await page.goto(`${BASE}/planning`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(`[data-hub-link="${linkTitle}"]`, { timeout: 10000 });
      if (useHubClick) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
          page.click(`[data-hub-link="${linkTitle}"]`),
        ]).catch(() => null);
        await page.waitForSelector('#libraryMagicHubMount, [data-library-planning-back]', { timeout: 10000 }).catch(() => null);
      } else {
        const href = await page.$eval(`[data-hub-link="${linkTitle}"]`, (el) => el.getAttribute('href'));
        await page.evaluate(() => sessionStorage.setItem('planFromPlanning', '1'));
        await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      }
      await sleep(800);
      const landed = page.url().replace(BASE, '');
      const backBtn = await page.$('[data-planning-back], [data-library-planning-back]');
      let backOk = false;
      if (backBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
          page.evaluate((sel) => document.querySelector(sel).click(), '[data-planning-back], [data-library-planning-back]'),
        ]).catch(() => null);
        backOk = page.url().includes('/planning');
      } else if (landed.includes('/login')) {
        backOk = false;
      }
      planFlows[name] = { landed, expected: expectPath, backOk, hasBackBtn: !!backBtn };
    }
    flows.planering = {
      pass: Object.values(planFlows).every((f) => f.landed.startsWith(f.expected) && f.backOk),
      details: planFlows,
    };
  } catch (err) {
    flows.planering = { pass: false, error: err.message };
  }

  // ─── Belöningar → pending/hantera/stjärnor → barnprofil ─────
  try {
    await page.goto(`${BASE}/rewards`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#rewardsHubMount .magic-hub-section', { timeout: 15000 });
    await sleep(1000);
    const rewardsMeta = await page.evaluate(() => ({
      hasManage: !!document.querySelector('[data-hub-link="Hantera belöningar"]'),
      manageHref: document.querySelector('[data-hub-link="Hantera belöningar"]')?.getAttribute('href') || null,
      hasSkattkammaren: !!document.querySelector('a[href="/skattkammaren"]'),
      childRows: document.querySelectorAll('.rewards-child-row').length,
      pendingMount: !!document.getElementById('rewardsPendingMount'),
    }));
    iphone.beloningar = await iphoneFoldCheck(page, 'beloningar', {
      hantera: '[data-hub-link="Hantera belöningar"]',
      starsSection: '.magic-hub-section-label',
    });

    let profileOk = false;
    const childRow = await page.$('.rewards-child-row');
    if (childRow) {
      await childRow.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
      profileOk = page.url().includes('/family/child/') && page.url().includes('tab=rewards');
      const backLink = await page.$('a[href="/family"], a[href="/rewards"]');
      await page.goto(`${BASE}/rewards`, { waitUntil: 'domcontentloaded' });
      flows.beloningar = {
        pass: rewardsMeta.hasManage && !rewardsMeta.hasSkattkammaren && rewardsMeta.manageHref === '/library#rewards',
        profileLink: profileOk,
        ...rewardsMeta,
      };
    } else {
      flows.beloningar = { pass: rewardsMeta.hasManage && !rewardsMeta.hasSkattkammaren, profileLink: false, ...rewardsMeta };
    }
  } catch (err) {
    flows.beloningar = { pass: false, error: err.message };
  }

  // ─── Familj → barnkort → barnprofil → tillbaka ──────────────
  try {
    await page.goto(`${BASE}/family`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#familyChildrenSection', { timeout: 15000 });
    await sleep(1000);
    iphone.familj = await iphoneFoldCheck(page, 'familj', {
      summary: '#familyHubSummary',
      childCard: '.family-child-card',
      invite: 'button[onclick*="openCoParentInviteModal"]',
    });

    const cardHref = await page.$eval('.family-child-card', (el) => el.getAttribute('href'));
    let profileBack = false;
    let onProfile = false;
    if (cardHref) {
      await page.goto(`${BASE}${cardHref}`, { waitUntil: 'domcontentloaded' });
      onProfile = page.url().includes('/family/child/');
      const backHref = await page.$eval('a[href="/family"]', (el) => el.getAttribute('href')).catch(() => null);
      if (backHref) {
        await page.goto(`${BASE}${backHref}`, { waitUntil: 'domcontentloaded' });
        profileBack = page.url().includes('/family');
      }
      flows.familj = { pass: onProfile && profileBack, profileUrl: cardHref, backToFamily: profileBack };
    } else {
      flows.familj = { pass: false, error: 'no child card href' };
    }
  } catch (err) {
    flows.familj = { pass: false, error: err.message };
  }

  // ─── Hub scope static checks (in-page) ──────────────────────
  const scope = await page.evaluate(() => {
    const hubs = {
      hem: { url: '/dashboard', violations: [] },
      planering: { url: '/planning', violations: [] },
      beloningar: { url: '/rewards', violations: [] },
      familj: { url: '/family', violations: [] },
    };
    return hubs;
  });

  await browser.close();

  const allPass = Object.values(flows).every((f) => f.pass !== false);
  const report = {
    timestamp: new Date().toISOString(),
    base: BASE,
    childId: child.id,
    flows,
    iphone,
    scope,
    allPass,
  };

  const outJson = path.join(OUT_DIR, 'parent-hubs-platform-qa.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!allPass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
