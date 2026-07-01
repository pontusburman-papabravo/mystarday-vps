/**
 * Capture Familj hub at iPhone SE viewport for Jenny-test / fold-check.
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
  const email = process.env.FAMILY_QA_EMAIL || 'family-qa-test@example.com';
  const password = process.env.FAMILY_QA_PASSWORD || 'FamilyQa2026!';
  let login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Family QA', email, password, termsAccepted: true }),
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
    const parts = raw.split(';')[0].split('=');
    const name = parts[0];
    const value = parts.slice(1).join('=');
    return { name, value, url: BASE };
  });
  if (cookies.length) await page.setCookie(...cookies);
  return setCookie.map((raw) => raw.split(';')[0]).join('; ');
}

async function ensureChild(cookieHeader) {
  let jar = cookieHeader;
  function absorb(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const map = new Map();
    if (jar) {
      jar.split('; ').forEach((pair) => {
        const i = pair.indexOf('=');
        if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1));
      });
    }
    raw.forEach((line) => {
      const part = line.split(';')[0];
      const i = part.indexOf('=');
      if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
    });
    jar = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async function apiFetch(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (jar) headers.Cookie = jar;
    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    absorb(res);
    return res;
  }

  const familyRes = await apiFetch('/api/family');
  if (!familyRes.ok) return;
  const family = await familyRes.json();
  if (family.children && family.children.length > 0) return;

  const csrfRes = await apiFetch('/api/auth/csrf-token');
  if (!csrfRes.ok) return;
  const csrfBody = await csrfRes.json();
  const childRes = await apiFetch('/api/children', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfBody.csrfToken,
    },
    body: JSON.stringify({ name: 'Astrid', emoji: '🌟', birthday: '2019-03-15', pin: '4829' }),
  });
  if (!childRes.ok) {
    console.warn('ensureChild failed:', childRes.status, await childRes.text());
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true });

  const cookieHeader = await apiLogin(page);
  await ensureChild(cookieHeader);
  await page.goto(`${BASE}/family`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#familyChildrenSection', { timeout: 15000 });
  await sleep(1500);

  const foldCheck = await page.evaluate(() => {
    const viewportH = window.innerHeight;
    const summary = document.getElementById('familyHubSummary');
    const childCard = document.querySelector('.family-child-card');
    const inviteBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Bjud in förälder'));
    const checks = {
      summaryVisible: summary && summary.textContent.trim().length > 0,
      summaryAboveFold: summary ? summary.getBoundingClientRect().bottom <= viewportH : false,
      childCardAboveFold: childCard ? childCard.getBoundingClientRect().bottom <= viewportH : false,
      inviteAboveFold: inviteBtn ? inviteBtn.getBoundingClientRect().bottom <= viewportH : false,
      childNames: Array.from(document.querySelectorAll('.family-child-card .font-heading')).map((el) => el.textContent.trim()),
      summaryText: summary ? summary.textContent.trim() : '',
      magicHeroHidden: document.getElementById('parentMagicPageMount')?.classList.contains('hidden'),
    };
    checks.jennyPass =
      checks.summaryVisible &&
      checks.childCardAboveFold &&
      checks.inviteAboveFold &&
      checks.childNames.length > 0;
    return checks;
  });

  const file = path.join(OUT_DIR, 'family-iphone-se-fold-check.png');
  await page.screenshot({ path: file, fullPage: false });
  console.log(JSON.stringify({ file, foldCheck }, null, 2));

  await browser.close();
  if (!foldCheck.jennyPass) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
