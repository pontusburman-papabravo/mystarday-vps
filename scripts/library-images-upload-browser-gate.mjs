#!/usr/bin/env node
/**
 * RC-1 R2 — Library image archive upload chrome (parent en-GB).
 * Local test DB; does not touch allowlisted QA families.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'android-412x915', width: 412, height: 915 },
];

const EN_MARKERS = ['Upload image'];
const ARCHIVE_TITLE_MARKER = 'Image archive';
const SV_LEAK = /Ladda upp bild|Inga bilder ännu|Bild tillagd i bildarkivet/;

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({
    name, value, domain: host, path: '/',
  }));
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.log(JSON.stringify({ pass: false, error: 'puppeteer_missing' }));
    process.exit(2);
  }

  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const { setupTestDb } = require(path.join(ROOT, 'test/helpers/setup.js'));
  const { listenApp, mergeCookies, getSetCookieHeaders } = require(path.join(ROOT, 'test/helpers/http.js'));
  const { createChild } = require(path.join(ROOT, 'test/helpers/auth-session.js'));

  const report = { step: 'library-images-upload-browser-gate', viewports: {}, pass: false };
  const testDb = await setupTestDb();
  if (testDb.skip) {
    console.log(JSON.stringify({ pass: false, error: 'no_database' }));
    process.exit(2);
  }

  const { createApp } = require(path.join(ROOT, 'app.js'));
  const http = await listenApp(createApp);
  const BASE = http.baseUrl;

  try {
    await testDb.query(
      `INSERT INTO app_config (key, value) VALUES ('english_app_global_enabled', 'true')
       ON CONFLICT (key) DO UPDATE SET value = 'true'`
    );
    const email = `libimg-en-${Date.now()}@example.com`;
    const password = 'integration-test-pass-1';
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Parent',
        preferred_locale: 'en-GB',
        country_code: 'SE',
      }),
    });
    if (reg.status !== 201) throw new Error(`register_${reg.status}`);
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.status !== 200) throw new Error(`login_${loginRes.status}`);
    const loginBody = await loginRes.json();
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const session = { cookies, csrfToken: loginBody.csrfToken };
    await testDb.query(
      'UPDATE parent SET onboarding_completed = true WHERE lower(email) = lower($1)',
      [email]
    );
    await createChild(BASE, session);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const criticalConsole = [];

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const t = msg.text().slice(0, 160);
          if (!/favicon|analytics|ResizeObserver|403|Failed to load resource/i.test(t)) criticalConsole.push(t);
        }
      });
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
      for (const c of puppeteerCookies(session.cookies, BASE)) await page.setCookie(c);
      await page.goto(`${BASE}/library#magic-bilder`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('#familyImageUploadBtn', { timeout: 60000 });
      await page.waitForFunction(
        () => typeof window.pt === 'function' && /Upload image/.test(window.pt('library.images.uploadBtn')),
        { timeout: 90000 },
      );
      await page.evaluate(() => {
        if (window.I18n && typeof I18n.apply === 'function') I18n.apply();
        if (window.LibraryImages && typeof LibraryImages.renderGrid === 'function') {
          LibraryImages.renderGrid();
        }
      });
      await page.waitForFunction(
        () => {
          const btn = document.getElementById('familyImageUploadBtn');
          const title = document.querySelector('[data-i18n="library.images.archiveTitle"]');
          return /Upload image/.test(btn?.textContent || '')
            && /Image archive/.test(title?.textContent || '');
        },
        { timeout: 30000 },
      );

      const metrics = await page.evaluate((svLeak) => {
        const block = document.getElementById('familyImageArchive');
        const btn = document.getElementById('familyImageUploadBtn');
        const touchTarget = btn?.closest('label') || btn;
        const title = document.querySelector('[data-i18n="library.images.archiveTitle"]');
        const text = (block?.innerText || '') + (title?.textContent || '');
        const doc = document.documentElement;
        const overflowX = doc.scrollWidth > doc.clientWidth + 2;
        const rectOk = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.width >= 44 && r.height >= 44;
        };
        const re = new RegExp(svLeak.source, svLeak.flags);
        return {
          overflowX,
          touchOk: rectOk(touchTarget),
          enOk: /Upload image/.test(btn?.textContent || '')
            && /Image archive/.test(title?.textContent || ''),
          svOk: !re.test(text),
          uploadText: btn?.textContent || '',
          textSample: text.slice(0, 280),
        };
      }, { source: SV_LEAK.source, flags: SV_LEAK.flags });

      report.viewports[vp.name] = {
        ...metrics,
        pass: !metrics.overflowX && metrics.touchOk && metrics.enOk && metrics.svOk,
      };
      await page.close();
    }

    report.consoleErrors = criticalConsole.length;
    report.pass = report.consoleErrors === 0
      && VIEWPORTS.every((vp) => report.viewports[vp.name]?.pass);
    await browser.close();
    await http.close();
    await testDb.cleanup();
    try {
      const db = require(path.join(ROOT, 'src/lib/db'));
      await db.pool.end();
    } catch { /* ignore */ }
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.pass ? 0 : 1);
  } catch (e) {
    console.log(JSON.stringify({ pass: false, error: e.message }));
    try { await http.close(); } catch { /* ignore */ }
    try { await testDb.cleanup(); } catch { /* ignore */ }
    process.exit(1);
  }
}

main();
