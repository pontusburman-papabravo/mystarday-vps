/**
 * Fas 8 prod browser smoke — dashboard / schedule / child-dashboard split modules.
 * Credentials: scripts/lib/qa-test-accounts.mjs (SMOKE_* env overrides).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { resolveSmokeCredentials } from './lib/qa-test-accounts.mjs';

const smoke = resolveSmokeCredentials();
const BASE = process.env.BASE || smoke.base;
const PARENT_EMAIL = smoke.parentEmail;
const PARENT_PASSWORD = smoke.parentPassword;
const CHILD_NAME = smoke.childName;
const CHILD_PIN = smoke.childPin;

if (!BASE || !PARENT_EMAIL || !PARENT_PASSWORD) {
  console.error('Set BASE, SMOKE_PARENT_EMAIL, SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

const ARTIFACTS = process.env.SMOKE_ARTIFACTS || '/workspace/artifacts/fas8-smoke';
fs.mkdirSync(ARTIFACTS, { recursive: true });

const pageErrors = [];
const consoleErrors = [];
let activeLabel = '';

function attachErrorListeners(page) {
  page.on('pageerror', (err) => {
    if (!activeLabel) return;
    pageErrors.push({ label: activeLabel, type: 'pageerror', message: err.message });
    console.error(`[${activeLabel}] pageerror:`, err.message);
  });
  page.on('console', (msg) => {
    if (!activeLabel || msg.type() !== 'error') return;
    const text = msg.text();
    // Benign: missing favicons, blocked analytics, 403/404 on optional assets
    if (/favicon|Failed to load resource.*\b(404|403)\b/i.test(text)) return;
    // Navigation aborts in-flight fetches when leaving a page
    if (/Failed to fetch|TypeError: Failed to fetch/i.test(text)) return;
    consoleErrors.push({ label: activeLabel, type: 'console.error', message: text });
    console.error(`[${activeLabel}] console.error:`, text);
  });
}

async function withSection(page, label, fn) {
  activeLabel = label;
  try {
    return await fn();
  } finally {
    activeLabel = '';
  }
}

async function shot(page, name) {
  const f = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: f, fullPage: true });
  console.log('screenshot:', f);
  return f;
}

async function acceptCookies(page) {
  const btn = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) await btn.click();
}

function assertFunctions(present, required, context) {
  const missing = required.filter((fn) => present[fn] !== 'function');
  if (missing.length) {
    throw new Error(`${context}: missing window.* functions: ${missing.join(', ')}`);
  }
  console.log(`✓ ${context}:`, required.join(', '));
}

async function parentLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.fill('#email', PARENT_EMAIL);
  await page.fill('#password', PARENT_PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding|family|planning)/, { timeout: 45000 });
  console.log('✓ parent login →', page.url());
}

async function checkDashboard(page) {
  return withSection(page, 'dashboard', async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => typeof window.initDragDrop === 'function' && typeof window.loadTemplates === 'function',
    { timeout: 45000 },
  );

  const fns = await page.evaluate(() => ({
    initDragDrop: typeof window.initDragDrop,
    loadTemplates: typeof window.loadTemplates,
    renderTimeline: typeof window.renderTimeline,
    openGiveStarsModal: typeof window.openGiveStarsModal,
    openCopyDayModal: typeof window.openCopyDayModal,
    loadStarHistory: typeof window.loadStarHistory,
  }));
  assertFunctions(fns, [
    'initDragDrop',
    'loadTemplates',
    'renderTimeline',
    'openGiveStarsModal',
    'openCopyDayModal',
    'loadStarHistory',
  ], 'dashboard');

  await shot(page, 'dashboard');
  });
}

async function checkSchedule(page) {
  return withSection(page, 'schedule', async () => {
  await page.goto(`${BASE}/schedule`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => typeof window.renderSpecialDaysCalendar === 'function',
    { timeout: 30000 },
  );

  const fns = await page.evaluate(() => ({
    renderSpecialDaysCalendar: typeof window.renderSpecialDaysCalendar,
    openTemplateModal: typeof window.openTemplateModal,
    openFillWeekModal: typeof window.openFillWeekModal,
  }));
  assertFunctions(fns, [
    'renderSpecialDaysCalendar',
    'openTemplateModal',
    'openFillWeekModal',
  ], 'schedule');

  await shot(page, 'schedule');
  });
}

async function childLogin(page) {
  return withSection(page, 'child-dashboard', async () => {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  await page.waitForTimeout(4000);

  if (!(await page.locator('#clKeypad').isVisible({ timeout: 8000 }).catch(() => false))) {
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
    if (!picked) throw new Error('No child card for ' + CHILD_NAME);
    await page.waitForSelector('#clKeypad', { timeout: 15000 });
  }

  for (const d of CHILD_PIN) {
    await page.locator('#clKeypad button', { hasText: d }).click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(3000);

  const err = await page.locator('#clError:not(.hidden), .cl-error:visible').textContent().catch(() => '');
  if (err?.trim()) throw new Error('Child PIN error: ' + err.trim());

  await page.waitForURL(/\/child(-dashboard|\/today|\/world)?/, { timeout: 20000 });
  console.log('✓ child login →', page.url());

  await page.waitForFunction(
    () => typeof window.loadRewards === 'function',
    { timeout: 30000 },
  );

  const fns = await page.evaluate(() => ({
    loadRewards: typeof window.loadRewards,
    renderSkattkammaren: typeof window.renderSkattkammaren,
    openGoalPicker: typeof window.openGoalPicker,
  }));
  assertFunctions(fns, ['loadRewards', 'renderSkattkammaren', 'openGoalPicker'], 'child-dashboard');

  await shot(page, 'child-dashboard');
  });
}

async function main() {
  console.log('Fas 8 prod smoke:', BASE);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'sv-SE' });
  attachErrorListeners(page);

  await parentLogin(page);
  await checkDashboard(page);
  await checkSchedule(page);
  await childLogin(page);

  await browser.close();

  const dashErrs = [...pageErrors, ...consoleErrors];
  if (dashErrs.length) {
    console.error('JS errors collected:', JSON.stringify(dashErrs, null, 2));
    process.exit(1);
  }

  console.log('Fas 8 prod smoke passed.');
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
