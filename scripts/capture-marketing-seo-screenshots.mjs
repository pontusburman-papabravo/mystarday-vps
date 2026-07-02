#!/usr/bin/env node
/**
 * Capture marketing-seo screenshots from a running app (local or staging).
 *
 * Usage:
 *   NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false EMAIL_ENABLED=false npm run dev
 *   node scripts/capture-marketing-seo-screenshots.mjs
 *
 * Env:
 *   BASE_URL          default http://127.0.0.1:3000
 *   OUT_DIR           default public/images/marketing-seo
 *   CHILD_USER        child username (optional — skips child shots if login fails)
 *   CHILD_PIN         child PIN
 *   PARENT_EMAIL      parent email for planning shot (optional)
 *   PARENT_PASSWORD   parent password
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'public/images/marketing-seo');
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCookies(setCookieHeaders) {
  const jar = {};
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : (setCookieHeaders ? [setCookieHeaders] : []);
  for (const h of list) {
    const part = h.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return jar;
}

async function childLogin() {
  const childUser = process.env.CHILD_USER;
  const childPin = process.env.CHILD_PIN;
  if (!childUser || !childPin) return null;
  const res = await fetch(`${BASE}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: childUser, pin: childPin }),
  });
  if (!res.ok) {
    console.warn(`child login failed (${res.status}) — skipping child screenshots`);
    return null;
  }
  return parseCookies(res.headers.getSetCookie ? res.headers.getSetCookie() : []);
}

async function parentLogin() {
  const email = process.env.PARENT_EMAIL;
  const password = process.env.PARENT_PASSWORD;
  if (!email || !password) return null;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.warn(`parent login failed (${res.status}) — skipping parent screenshots`);
    return null;
  }
  return parseCookies(res.headers.getSetCookie ? res.headers.getSetCookie() : []);
}

async function applyCookies(page, cookies) {
  if (!cookies || !Object.keys(cookies).length) return;
  await page.setCookie(
    ...Object.entries(cookies).map(([name, value]) => ({ name, value, url: BASE }))
  );
}

async function capture(page, filename, url, waitSelector, waitMs = 2000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 20000 }).catch(() => {});
  }
  await sleep(waitMs);
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, fullPage: false, type: 'png' });
  console.log(`✓ ${filename}`);
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`App not reachable at ${BASE}/health — start dev server first`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const childCookies = await childLogin();
  if (childCookies) {
    await applyCookies(page, childCookies);
    await capture(page, 'morgonschema-bildstod.png', `${BASE}/child/today`, '#childWorldBg, .child-dashboard, #todayView');
    await capture(page, 'kvallsschema-bildstod.png', `${BASE}/child/today`, '#childWorldBg, .child-dashboard, #todayView');
    await capture(page, 'stjarnor-beloningssystem.png', `${BASE}/child/world`, '.skatt-hub, #skattkammarView, #homeHubMount');
  }

  const parentCookies = await parentLogin();
  if (parentCookies) {
    await applyCookies(page, parentCookies);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await capture(page, 'fardiga-scheman-bildstod.png', `${BASE}/planning`, '#planningHubMount, .magic-hub-section', 2500);
    await capture(page, 'vardagsrutiner-bildstod.png', `${BASE}/`, '.for-dig-card, [data-for-dig], #hemCoachMount', 2500);
  }

  await browser.close();

  if (!childCookies && !parentCookies) {
    console.warn('No credentials — only health check passed. Set CHILD_USER/CHILD_PIN or PARENT_EMAIL/PARENT_PASSWORD.');
    process.exitCode = 1;
  } else {
    console.log(`Screenshots written to ${OUT_DIR}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
