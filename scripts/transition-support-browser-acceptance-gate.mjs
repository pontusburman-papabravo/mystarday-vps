#!/usr/bin/env node
/**
 * Extra stöd — browser acceptance (transition UI) on local test DB + ephemeral family.
 * Does not mutate allowlisted QA families. Mirrors live acceptance viewports (390×844, 412×915).
 *
 * Usage: node scripts/transition-support-browser-acceptance-gate.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'android-412x915', width: 412, height: 915 },
];

/** Console noise that is never a gate failure (never blanket-ignore HTTP 403). */
const CONSOLE_ERROR_IGNORE = [
  /analytics/i,
  /favicon/i,
  /ResizeObserver/i,
  /client-log/i,
];

/** If a 403 appears in console, only these request targets are non-fatal. */
const CONSOLE_403_URL_ALLOWLIST = [
  /\/api\/analytics\//,
];

function isIgnorableConsoleError(text) {
  if (CONSOLE_ERROR_IGNORE.some((re) => re.test(text))) return true;
  if (/Failed to load resource: the server responded with a status of 403/i.test(text)) {
    return CONSOLE_403_URL_ALLOWLIST.some((re) => re.test(text));
  }
  return false;
}

function stockholmTimePlusMinutes(offsetMin) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute').value, 10);
  let total = hour * 60 + minute + offsetMin;
  total %= 24 * 60;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function jarToCookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({
    name,
    value,
    domain: host,
    path: '/',
  }));
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.log(JSON.stringify({ pass: false, error: 'puppeteer_missing' }));
    process.exit(2);
  }

  // pragma: allowlist secret
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { registerAndLogin, createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const { hashPassword } = require(path.join(ROOT, 'src/lib/hash'));
  const { seedBildstodPr3Features } = require(path.join(ROOT, 'test/helpers/bildstod-pr3-features.js'));
  const grantCore = require(path.join(ROOT, 'scripts/lib/qa-extra-stod-grant-core.cjs'));
  const db = require(path.join(ROOT, 'src/lib/db'));
  const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

  const report = { step: 'transition-support-browser-gate', viewports: {}, pass: false };

  const testDb = await setupTestDb();
  if (testDb.skip) {
    console.log(JSON.stringify({ pass: false, error: 'no_database' }));
    process.exit(2);
  }

  const { createApp } = require(path.join(ROOT, 'app.js'));
  const http = await listenApp(createApp);
  const BASE = http.baseUrl;

  let snap = null;
  let familyId = null;
  let logItemId = null;
  let logId = null;
  let tplId = null;
  let username = null;
  const pin = '4321';

  try {
    await seedBildstodPr3Features(testDb);
    const session = await registerAndLogin(BASE);
    const me = await (await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    })).json();
    familyId = me.family_id;
    const childId = await createChild(BASE, session);
    username = `tsb${Date.now()}`;
    await testDb.query(
      'UPDATE child SET username = $1, pin = $2, transition_lead_minutes = $3::jsonb, show_now_next = true WHERE id = $4',
      [username, await hashPassword(pin), JSON.stringify([5, 3]), childId]
    );

    snap = await grantCore.readPackageSnapshot(testDb, familyId, [childId]);
    await grantCore.applyTemporaryGrant(testDb, familyId);

    const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
    const tplRes = await testDb.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'Transition QA', '⭐', 1, 0, 'user') RETURNING id`,
      [familyId]
    );
    tplId = tplRes.rows[0].id;
    await testDb.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logInsert = await testDb.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    logId = logInsert.rows[0].id;
    const start = stockholmTimePlusMinutes(3);
    const end = stockholmTimePlusMinutes(25);
    const itemInsert = await testDb.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section, start_time, end_time)
       VALUES ($1, $2, 'Transition QA', '⭐', 1, 0, 'morgon', $3, $4) RETURNING id`,
      [logId, tplId, start, end]
    );
    logItemId = itemInsert.rows[0].id;

    const logRes = await fetch(`${BASE}/api/children/${childId}/daily-log?date=${dateStr}`, {
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });
    const logBody = await logRes.json();
    if (!logBody.items?.length) throw new Error('daily_log_empty');

    const loginRes = await fetch(`${BASE}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    if (loginRes.status !== 200) throw new Error(`child_login_${loginRes.status}`);
    let childJar = {};
    for (const h of getSetCookieHeaders(loginRes)) {
      childJar = mergeCookies(childJar, [h]);
    }

    const accessRes = await fetch(`${BASE}/api/subscription/access`, {
      headers: { Cookie: jarToCookieHeader(childJar) },
    });
    const accessBody = await accessRes.json();
    report.child_access_status = accessRes.status;
    report.features_transition_support = accessBody.features?.transition_support === true;
    if (!report.features_transition_support) throw new Error('child_access_false');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const consoleErrors = [];
    const criticalConsole = [];

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const t = msg.text().slice(0, 160);
          consoleErrors.push(t);
          if (!isIgnorableConsoleError(t)) {
            criticalConsole.push(t);
          }
        }
      });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      await page.evaluateOnNewDocument(() => {
        document.documentElement.style.fontSize = '125%';
      });
      for (const c of puppeteerCookies(childJar, BASE)) await page.setCookie(c);
      await page.goto(`${BASE}/child/today`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('.now-card', { timeout: 25000 }).catch(() => null);
      const probe = await page.evaluate(async () => {
        let transition_support = null;
        try {
          const res = await fetch('/api/subscription/access', { credentials: 'include' });
          const json = res.ok ? await res.json() : null;
          transition_support = json?.features?.transition_support === true;
        } catch { /* ignore */ }
        return {
          transition_support,
          hasTransitionScript: typeof window.TransitionSupport !== 'undefined',
          hasInline: !!document.querySelector('.transition-inline'),
          nowText: document.querySelector('.now-card')?.innerText?.slice(0, 120) || '',
        };
      });
      report[`probe_${vp.name}`] = probe;
      await new Promise((r) => setTimeout(r, 2000));
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflowX = doc.scrollWidth > doc.clientWidth + 2;
        const transition = document.querySelector('.transition-inline');
        const rect = transition?.getBoundingClientRect();
        const touchOk = !transition || (rect.width >= 44 && rect.height >= 24);
        const text = transition?.textContent?.trim() || '';
        return { overflowX, hasTransition: !!transition, touchOk, textLen: text.length };
      });
      const shotDir = path.join(ROOT, 'artifacts');
      fs.mkdirSync(shotDir, { recursive: true });
      await page.screenshot({
        path: path.join(shotDir, `transition-support-${vp.name}.png`),
        omitBackground: true,
      });
      report.viewports[vp.name] = {
        ...metrics,
        pass: !metrics.overflowX && metrics.touchOk && metrics.hasTransition && metrics.textLen > 0,
      };
      await page.close();
    }
    await browser.close();

    report.consoleErrors = criticalConsole.length;
    report.critical_console_samples = criticalConsole.slice(0, 3);
    report.pass = report.features_transition_support
      && report.consoleErrors === 0
      && Object.values(report.viewports).every((v) => v.pass);
  } finally {
    if (logItemId && logId && tplId) {
      await testDb.query('DELETE FROM daily_log_item WHERE id = $1', [logItemId]);
      await testDb.query('DELETE FROM daily_log WHERE id = $1', [logId]);
      await testDb.query('DELETE FROM activity_template WHERE id = $1', [tplId]);
    }
    if (snap && familyId) {
      await grantCore.restorePackageSnapshot(testDb, familyId, snap);
    }
    await http.close();
    await testDb.cleanup();
    try { await db.pool.end(); } catch { /* ignore */ }
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ pass: false, error: e.message }));
  process.exit(1);
});
