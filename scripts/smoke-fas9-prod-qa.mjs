/**
 * Prod QA — Fas 8/9 smoke with parent + child login.
 * Env: BASE, SMOKE_PARENT_EMAIL, SMOKE_PARENT_PASSWORD, SMOKE_CHILD_NAME, SMOKE_CHILD_PIN
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'https://mystarday.se';
const PARENT_EMAIL = process.env.SMOKE_PARENT_EMAIL;
const PARENT_PASSWORD = process.env.SMOKE_PARENT_PASSWORD;
const CHILD_NAME = process.env.SMOKE_CHILD_NAME || 'astrid';
const CHILD_PIN = process.env.SMOKE_CHILD_PIN || '1112';
const ARTIFACTS = process.env.SMOKE_ARTIFACTS || '/workspace/artifacts/fas9-prod-qa';

if (!PARENT_EMAIL || !PARENT_PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

fs.mkdirSync(ARTIFACTS, { recursive: true });
const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function shot(page, name) {
  const f = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: f, fullPage: true });
  return f;
}

async function acceptCookies(page) {
  const btn = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) await btn.click();
}

async function checkPage(page, label, urlPath, checks) {
  const errors = [];
  const onError = (msg) => errors.push(msg);
  page.on('pageerror', onError);
  const cdnReqs = [];
  page.on('request', (req) => {
    if (req.url().includes('cdn.tailwindcss.com')) cdnReqs.push(req.url());
  });

  await page.goto(`${BASE}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await acceptCookies(page);
  await page.waitForTimeout(3000);

  const html = await page.content();
  const usesCdn = html.includes('cdn.tailwindcss.com');
  const usesBuild = html.includes('tailwind.build.css');

  if (usesBuild) pass(`${label}: uses tailwind.build.css`);
  else if (usesCdn) fail(`${label}: still on Tailwind CDN`);
  else fail(`${label}: no tailwind stylesheet detected`);

  if (cdnReqs.length) fail(`${label}: CDN network requests`, cdnReqs.join(', '));
  else pass(`${label}: no CDN requests`);

  for (const [fn, desc] of checks.handlers || []) {
    const ok = await page.evaluate((f) => typeof window[f] === 'function', fn);
    if (ok) pass(`${label}: window.${fn}`, desc);
    else fail(`${label}: window.${fn} missing`, desc);
  }

  if (checks.goldButton) {
    const gold = await page.evaluate(() => {
      const el = document.querySelector('button.bg-gold, .bg-gold, #submitBtn');
      if (!el) return null;
      const bg = getComputedStyle(el).backgroundColor;
      return bg;
    });
    if (gold && gold !== 'rgba(0, 0, 0, 0)' && gold !== 'transparent') {
      pass(`${label}: gold styling present`, gold);
    } else {
      fail(`${label}: gold styling missing or transparent`);
    }
  }

  if (errors.length) fail(`${label}: JS errors`, errors.slice(0, 3).join(' | '));
  else pass(`${label}: no page errors`);

  await shot(page, label.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  page.removeAllListeners('pageerror');
  page.removeAllListeners('request');
}

async function parentLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.fill('#email', PARENT_EMAIL);
  await page.fill('#password', PARENT_PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding|family|planning)/, { timeout: 60000 });
  pass('parent login', page.url());
}

async function childLogin(page) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForTimeout(3000);

  if (!(await page.locator('#clKeypad').isVisible({ timeout: 5000 }).catch(() => false))) {
    const cards = page.locator('.cl-child-card');
    const count = await cards.count();
    let picked = false;
    for (let i = 0; i < count; i++) {
      const t = (await cards.nth(i).textContent()) || '';
      if (t.toLowerCase().includes(CHILD_NAME.toLowerCase())) {
        await cards.nth(i).click();
        picked = true;
        break;
      }
    }
    if (!picked && count > 0) await cards.first().click();
    await page.waitForSelector('#clKeypad', { timeout: 15000 });
  }

  for (const d of CHILD_PIN) {
    await page.locator('#clKeypad button', { hasText: d }).click();
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(3000);
  const err = await page.locator('#clError:not(.hidden)').textContent().catch(() => '');
  if (err?.trim()) fail('child PIN', err.trim());
  else pass('child PIN entered');

  try {
    await page.waitForURL(/\/child(-dashboard|\/today|\/world)?/, { timeout: 25000 });
    pass('child login redirect', page.url());
  } catch {
    fail('child login redirect', page.url());
  }
}

async function main() {
  console.log('Prod QA:', BASE);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'sv-SE' });

  // Unauthenticated pages
  await checkPage(page, 'login', '/login', { goldButton: true, handlers: [] });

  await parentLogin(page);

  await checkPage(page, 'dashboard', '/dashboard', {
    handlers: [
      ['initDragDrop', 'F2g DnD'],
      ['loadTemplates', 'F2e activity modal'],
      ['openGiveStarsModal', 'F2f approvals'],
      ['renderTimeline', 'F2d views'],
      ['loadStarHistory', 'F2c star history'],
    ],
    goldButton: true,
  });

  await checkPage(page, 'schedule', '/schedule', {
    handlers: [
      ['renderSpecialDaysCalendar', 'F3a special days'],
      ['openFillWeekModal', 'F3c fill week'],
      ['openTemplateModal', 'F3b template mode'],
    ],
  });

  await childLogin(page);

  await checkPage(page, 'child-dashboard', '/child-dashboard', {
    handlers: [
      ['loadRewards', 'F3d rewards'],
      ['renderSkattkammaren', 'treasure chamber'],
      ['openGoalPicker', 'goal picker'],
    ],
  });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  console.log(`Pass: ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL: ${f.name} — ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
