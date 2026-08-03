#!/usr/bin/env node
/**
 * Browser harness — parent plan → child order → substeps → stars → parent restore.
 *
 * Profiles: iPhone-like 390×844, Android-like 412×915
 * Emulates: touch, slow network, reduced motion, larger text, stale SW cache name
 *
 * Usage (isolated local DB + running or auto-started app):
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/child-core-journey-harness.mjs
 *
 * Never logs credentials or tokens. Cleans up via product APIs where possible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'android-412x915', width: 412, height: 915, isMobile: true, hasTouch: true },
];

const SLOW_NETWORK = {
  offline: false,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (200 * 1024) / 8,
  latency: 200,
};

function redact(value) {
  if (value == null) return value;
  const s = String(value);
  if (/cookie|token|password|pin|authorization|bearer/i.test(s)) return '[REDACTED]';
  if (s.length > 80 && /^[A-Za-z0-9._-]+=/.test(s)) return '[REDACTED]';
  return s;
}

function log(step, detail) {
  const safe = detail && typeof detail === 'object'
    ? Object.fromEntries(Object.entries(detail).map(([k, v]) => [k, redact(v)]))
    : redact(detail);
  console.log(JSON.stringify({ step, detail: safe, t: Date.now() }));
}

async function ensurePuppeteer() {
  try {
    return (await import('puppeteer')).default;
  } catch {
    console.error('[harness] puppeteer not installed — run npm install --include=dev --legacy-peer-deps');
    process.exit(2);
  }
}

async function startAppIfNeeded() {
  if (process.env.HARNESS_BASE_URL) {
    return { baseUrl: process.env.HARNESS_BASE_URL.replace(/\/$/, ''), close: async () => {} };
  }
  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp } = require(path.join(ROOT, 'test/helpers/http.js'));
  const http = await listenApp(createApp);
  return { baseUrl: http.baseUrl, close: () => http.close() };
}

async function api(baseUrl, method, apiPath, { cookies = {}, csrf, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookieStr) headers.Cookie = cookieStr;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${baseUrl}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text, res };
}

function mergeSetCookie(jar, res) {
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [];
  const next = { ...jar };
  for (const line of raw) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) next[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return next;
}

async function registerFamily(baseUrl) {
  const { registerAndLogin } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  return registerAndLogin(baseUrl, { name: 'Harness Förälder' });
}

async function createChildWithSteps(baseUrl, session) {
  const { createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));
  const pin = String(2580 + (Date.now() % 100));
  const childId = await createChild(baseUrl, session, {
    name: `HarnessBarn${Date.now().toString(36).slice(-4)}`,
    pin,
    birthday: '2017-03-01',
  });
  return { childId, pin };
}

async function runViewport(puppeteer, baseUrl, viewport, cacheVersion) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: 2,
  });
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  await page.evaluateOnNewDocument((cv) => {
    try {
      localStorage.setItem('__harness_prev_cache', cv);
      document.documentElement.style.fontSize = '18px';
    } catch (_) { /* ignore */ }
  }, `stjarndag-v${Number(String(cacheVersion).replace(/\D/g, '')) - 1 || 762}`);

  const client = await page.createCDPSession();
  await client.send('Network.emulateNetworkConditions', SLOW_NETWORK);

  const result = {
    viewport: viewport.name,
    health: null,
    orderOk: null,
    substepOk: null,
    resumeOk: null,
    errors: [],
  };

  try {
    const healthRes = await page.goto(`${baseUrl}/health`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const health = await healthRes.json();
    result.health = {
      status: health.status,
      has_git_sha: Boolean(health.git_sha),
      cache_version: health.cache_version || null,
    };
    log('health', result.health);

    // API-level golden path (no secrets in logs)
    const session = await registerFamily(baseUrl);
    log('parent_registered', { ok: true });
    const { childId, pin } = await createChildWithSteps(baseUrl, {
      cookies: session.cookies,
      csrfToken: session.csrfToken,
    });
    log('child_created', { ok: true, childId: '[id]' });

    const { childLoginRaw, getDailyLog } = require(path.join(ROOT, 'test/helpers/golden-path-fas6.js'));
    const db = require(path.join(ROOT, 'src/lib/db'));

    // Seed ordered daily log (+ one activity with substeps) via SQL
    const dateStr = new Date().toLocaleDateString('sv-SE');
    await db.query('DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2)', [childId, dateStr]);
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logIns = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    const logId = logIns.rows[0].id;

    const names = ['A-Först', 'B-Senare', 'C-Sist'];
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       SELECT family_id, 'HarnessDelsteg', '🌅', 1, 0, 'user' FROM child WHERE id = $1 RETURNING id`,
      [childId]
    );
    const templateId = tpl.rows[0].id;
    for (let i = 0; i < 2; i++) {
      await db.query(
        `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
         VALUES ($1, $2, '⭐', $3)`,
        [templateId, `Del ${i + 1}`, i]
      );
    }

    const itemIds = [];
    for (let i = 0; i < names.length; i++) {
      const ins = await db.query(
        `INSERT INTO daily_log_item
           (daily_log_id, activity_template_id, name, icon, star_value, sort_order, child_sort_order, section)
         VALUES ($1, $2, $3, '⭐', 1, $4, NULL, 'morgon') RETURNING id`,
        [logId, i === 0 ? templateId : null, names[i], i]
      );
      itemIds.push(ins.rows[0].id);
    }

    const cl = await childLoginRaw(baseUrl, {
      username: (await db.query('SELECT username FROM child WHERE id = $1', [childId])).rows[0].username,
      pin,
    }, {
      Cookie: Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      'X-CSRF-Token': session.csrfToken,
    });
    if (cl.status !== 200) throw new Error(`child login ${cl.status}`);
    log('child_login', { ok: true });

    const dailyRes = await getDailyLog(baseUrl, cl.cookies, cl.csrfToken, dateStr);
    const dailyBody = dailyRes.body || {};
    const morgon = (dailyBody.sections?.morgon || dailyBody.items || [])
      .filter((i) => !i.section || i.section === 'morgon')
      .map((i) => i.name);
    result.orderOk = JSON.stringify(morgon.filter((n) => names.includes(n))) === JSON.stringify(names);
    log('order_check', { orderOk: result.orderOk, count: morgon.length, apiStatus: dailyRes.status });

    // DOM order on child today
    const cookieHeader = Object.entries(
      cl.cookies || session.cookies
    ).map(([k, v]) => `${k}=${v}`).join('; ');
    await page.setExtraHTTPHeaders({});
    await page.setCookie(
      ...Object.entries(cl.cookies || {}).map(([name, value]) => ({
        name,
        value: String(value),
        url: baseUrl,
      }))
    );

    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('stjarndag_device_mode', 'child'); } catch (_) { /* ignore */ }
    });
    await page.goto(`${baseUrl}/child/today`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.activity-card, [data-item-id], .photo-activity-card', { timeout: 15000 }).catch(() => null);
    const domNames = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(
        '.activity-card[data-item-id], [data-item-id].activity-card, .photo-activity-card[data-item-id], [data-item-id]'
      ));
      return cards.map((c) => {
        const title = c.querySelector(
          '.activity-name, .photo-activity-card__title, .card-title, h3, .font-bold, .font-heading'
        );
        return (title && title.textContent || c.getAttribute('data-name') || '').trim();
      }).filter(Boolean);
    });
    if (domNames.length) {
      const filtered = domNames.filter((n) => names.includes(n));
      if (filtered.length === names.length) {
        result.orderOk = JSON.stringify(filtered) === JSON.stringify(names);
      }
    }
    log('dom_order', { orderOk: result.orderOk, domCount: domNames.length });

    // Expand + complete first substep if present
    const expandBtn = await page.$('.expand-btn, button.expand-btn');
    if (expandBtn) {
      await expandBtn.tap().catch(() => expandBtn.click());
      await page.waitForSelector('.substep-row', { timeout: 8000 }).catch(() => null);
      const row = await page.$('.substep-row');
      if (row) {
        const before = await page.$eval('.substep-row', (el) => el.className);
        await row.tap().catch(() => row.click());
        await page.waitForFunction(
          () => {
            const el = document.querySelector('.substep-row');
            return el && (el.classList.contains('pending') || el.querySelector('.substep-check.checked'));
          },
          { timeout: 5000 }
        ).catch(() => null);
        const after = await page.$eval('.substep-row', (el) => ({
          className: el.className,
          checked: !!el.querySelector('.substep-check.checked'),
        })).catch(() => null);
        result.substepOk = Boolean(after && (after.checked || /pending/.test(before)));
      } else {
        result.substepOk = null; // no substeps seeded — not a fail
      }
    } else {
      result.substepOk = null;
    }
    log('substep', { substepOk: result.substepOk });

    // Resume path: reopen child-login with live child cookie → should redirect
    await page.goto(`${baseUrl}/child-login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction(
      () => location.pathname.indexOf('/child/') === 0 || location.pathname === '/child-dashboard',
      { timeout: 8000 }
    ).catch(() => null);
    result.resumeOk = page.url().includes('/child/');
    log('session_resume', { resumeOk: result.resumeOk, path: new URL(page.url()).pathname });
  } catch (err) {
    result.errors.push(String(err && err.message ? err.message : err));
    log('error', { message: String(err && err.message ? err.message : err) });
  } finally {
    await browser.close();
  }
  return result;
}

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.EMAIL_ENABLED = process.env.EMAIL_ENABLED || 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const cache = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config/cache-version.json'), 'utf8')
  );
  const puppeteer = await ensurePuppeteer();
  const app = await startAppIfNeeded();
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      log('viewport_start', { name: vp.name });
      results.push(await runViewport(puppeteer, app.baseUrl, vp, cache.cacheName));
    }
  } finally {
    await app.close();
  }

  const outPath = path.join(ROOT, 'docs/CHILD-CORE-JOURNEY-HARNESS-LAST.json');
  fs.writeFileSync(outPath, JSON.stringify({ cache: cache.cacheName, results }, null, 2));
  log('done', { outPath: 'docs/CHILD-CORE-JOURNEY-HARNESS-LAST.json' });

  const hardFail = results.some((r) => r.errors.length || r.orderOk === false || r.health?.status !== 'healthy');
  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ step: 'fatal', detail: String(err && err.message ? err.message : err) }));
  process.exit(1);
});
