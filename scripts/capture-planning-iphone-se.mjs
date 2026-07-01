/**
 * Capture Planering hub at iPhone SE viewport for Jenny-test / fold-check.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = process.env.OUT_DIR || '/opt/cursor/artifacts/screenshots';

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiLogin(page) {
  const email = process.env.PLANNING_QA_EMAIL || 'planning-qa-test@example.com';
  const password = process.env.PLANNING_QA_PASSWORD || 'PlanningQa2026!';
  let login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Planering QA', email, password, termsAccepted: true }),
    });
    if (!reg.ok) throw new Error(`register failed: ${reg.status}`);
    login = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!login.ok) throw new Error(`login failed: ${login.status}`);
  }
  const setCookie = login.headers.getSetCookie ? login.headers.getSetCookie() : [];
  const cookies = setCookie.map((raw) => {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    return { name, value, domain: '127.0.0.1', path: name === 'refresh_token' ? '/api/auth' : '/' };
  });
  await page.setCookie(...cookies);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true });

  await apiLogin(page);
  await page.goto(`${BASE}/planning`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#planningHubMount .magic-hub-section', { timeout: 15000 });
  await sleep(1500);

  const foldCheck = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.magic-hub-section-label')).map((el) => el.textContent.trim());
    const links = Array.from(document.querySelectorAll('[data-hub-link]')).map((el) => ({
      title: el.getAttribute('data-hub-link'),
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
    }));
    const viewportH = window.innerHeight;
    const aboveFold = links.filter((l) => l.top >= 0 && l.bottom <= viewportH).map((l) => l.title);
    const required = ['Bibliotek', 'Veckoschema', 'Kalender'];
    const missing = required.filter((r) => !aboveFold.includes(r));
    return { labels, aboveFold, missing, viewportH, linkCount: links.length };
  });

  const file = path.join(OUT_DIR, 'planning-iphone-se-fold-check.png');
  await page.screenshot({ path: file, fullPage: false });
  console.log(JSON.stringify({ file, foldCheck }, null, 2));

  await browser.close();
  if (foldCheck.missing.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
