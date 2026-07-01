/**
 * Capture child view screenshots with illustrated backgrounds.
 * Usage: CHILD_USER=ella485 CHILD_PIN=5831 node scripts/capture-child-bg-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = process.env.OUT || '/opt/cursor/artifacts/screenshots';
const childUser = process.env.CHILD_USER || 'ella485';
const childPin = process.env.CHILD_PIN || '5831';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCookies(setCookieHeaders) {
  const jar = {};
  for (const h of setCookieHeaders) {
    const part = h.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return jar;
}

async function childLogin() {
  const res = await fetch(`${BASE}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: childUser, pin: childPin }),
  });
  if (res.status !== 200) throw new Error('child login failed: ' + res.status);
  return parseCookies(res.headers.getSetCookie ? res.headers.getSetCookie() : []);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
  return file;
}

async function main() {
  const cookies = await childLogin();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.setCookie(
    ...Object.entries(cookies).map(([name, value]) => ({ name, value, url: BASE }))
  );

  await page.goto(`${BASE}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#childWorldBg', { timeout: 15000 });
  await sleep(2000);
  await shot(page, 'child-idag-390');

  await page.goto(`${BASE}/child/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.skatt-hub, #homeHubMount, #skattkammarView', { timeout: 15000 });
  await sleep(2500);
  await shot(page, 'child-min-varld-390');

  await page.goto(`${BASE}/child/family`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#familyHallMount, #familyView', { timeout: 15000 });
  await sleep(2500);
  await shot(page, 'child-familj-390');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
