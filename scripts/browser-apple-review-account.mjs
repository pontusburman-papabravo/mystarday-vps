/**
 * Browser E2E: Apple Review account on mystarday.se
 * - Registers review@mystarday.se if missing
 * - Completes onboarding (Anna, 2018-09-08, skola + helg, PIN 4455)
 * - Verifies parent dashboard + child PIN login
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'https://mystarday.se';
const EMAIL = 'review@mystarday.se';
const PASSWORD = 'AppReview2026!';
const PARENT_NAME = 'Review Tester';
const CHILD_NAME = 'Anna';
const CHILD_BIRTHDAY = { year: '2018', month: '09', day: '08' };
const CHILD_PIN = '4455';

const ARTIFACTS = '/workspace/artifacts/apple-review-browser';
fs.mkdirSync(ARTIFACTS, { recursive: true });

async function screenshot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`screenshot: ${file}`);
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(500);
  }
}

async function registerIfNeeded(page) {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await acceptCookies(page);
  await screenshot(page, '01-register');

  const formVisible = await page.locator('#registerForm').isVisible().catch(() => false);
  if (!formVisible) {
    console.log('Register form not visible — trying login');
    return false;
  }

  await page.fill('#name', PARENT_NAME);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await page.check('#termsAccepted');

  await page.click('#submitBtn');
  await page.waitForTimeout(4000);

  const err = page.locator('#registerError:not(.hidden) #registerErrorText');
  if (await err.isVisible().catch(() => false)) {
    const msg = await err.textContent();
    console.log(`Register message: ${msg}`);
    if (msg && (msg.includes('finns redan') || msg.includes('already'))) {
      return false;
    }
    throw new Error(`Registration failed: ${msg}`);
  }

  try {
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
    await screenshot(page, '02-after-register');
    return true;
  } catch {
    console.log('No redirect after register — account likely exists');
    return false;
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await acceptCookies(page);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 });
  await screenshot(page, '03-after-login');
}

async function completeOnboarding(page) {
  if (!page.url().includes('/onboarding')) {
    console.log('Not on onboarding — skip wizard');
    return;
  }

  await page.waitForSelector('#templateGroupGrid .day-pref-card', { timeout: 20000 });

  await page.fill('#childName', CHILD_NAME);
  await page.selectOption('#childBirthdayYear', CHILD_BIRTHDAY.year);
  await page.selectOption('#childBirthdayMonth', CHILD_BIRTHDAY.month);
  await page.selectOption('#childBirthdayDay', CHILD_BIRTHDAY.day);

  // Emoji 🌟
  await page.locator('.emoji-btn', { hasText: '🌟' }).first().click();

  // School schedule for ~7 years
  const skola = page.locator('.day-pref-card[data-pref="skola"]');
  if (await skola.count()) {
    await skola.click();
  } else {
    await page.locator('.day-pref-card').first().click();
  }

  await screenshot(page, '04-onboarding-step1');
  await page.click('#step1Btn');
  await page.waitForTimeout(2000);

  // Weekend modal
  const weekendYes = page.locator('#weekendYesBtn');
  if (await weekendYes.isVisible().catch(() => false)) {
    await weekendYes.click();
    await page.waitForTimeout(2000);
  }

  // Step 2 view type
  await page.click('#step2vBtn');
  await page.waitForTimeout(1500);

  // Step 3 confirm schedule
  await page.click('#step3Btn');
  await page.waitForTimeout(1500);

  // Step 4 rewards — pick first reward card
  await page.waitForSelector('#rewardGrid .reward-card', { timeout: 15000 });
  await page.locator('#rewardGrid .reward-card').first().click();
  await page.click('#step4Btn');
  await page.waitForTimeout(2000);

  // Step 5 — set PIN 4455
  await page.click('button:has-text("Välj egen PIN-kod")');
  await page.waitForSelector('#pinD1');
  for (let i = 0; i < 4; i++) {
    await page.fill(`#pinD${i + 1}`, CHILD_PIN[i]);
  }
  await page.click('#savePinBtn');
  await page.waitForTimeout(1500);
  await screenshot(page, '05-onboarding-pin');

  await page.click('button:has-text("Nästa →")');

  // Step 6 complete
  await page.click('#step6Btn');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  await screenshot(page, '06-dashboard');
}

async function verifyDashboard(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForTimeout(4000);
  const body = await page.textContent('body');
  if (!body.includes('Anna')) {
    throw new Error('Dashboard does not show child Anna');
  }
  console.log('OK: Dashboard shows Anna');
  await screenshot(page, '07-dashboard-verify');
}

async function enterChildPin(page) {
  await page.waitForSelector('#clKeypad', { timeout: 15000 });
  for (const digit of CHILD_PIN) {
    await page.locator('#clKeypad button', { hasText: digit }).click();
    await page.waitForTimeout(120);
  }
}

async function openChildPinStep(page) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await screenshot(page, '08-child-login');

  const childCard = page.locator('.cl-child-card').first();
  if (await childCard.isVisible({ timeout: 8000 }).catch(() => false)) {
    await childCard.click();
    console.log('OK: Selected child from picker');
    return;
  }

  const manualForm = page.locator('#clManualNameForm');
  if (await manualForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.fill('#clManualNameInput', CHILD_NAME);
    await page.click('#clManualNameForm button[type="submit"]');
    console.log('OK: Manual child name entry');
    return;
  }

  // Parent session may exist but picker empty — seed known_children then reload
  const seeded = await page.evaluate(async (childName) => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const me = await res.json();
    const child = (me.children || []).find((c) =>
      (c.name || '').toLowerCase() === childName.toLowerCase()
    ) || me.children?.[0];
    if (!child?.username) return false;
    const entry = [{
      username: child.username,
      name: child.name || childName,
      emoji: child.emoji || '🌟',
      avatar_url: child.avatar_url || null,
      familyId: me.familyId || me.family_id || null,
      lastLoginAt: Date.now(),
    }];
    localStorage.setItem('stjarndag_known_children', JSON.stringify(entry));
    return true;
  }, CHILD_NAME);

  if (seeded) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cl-child-card', { timeout: 10000 });
    await page.locator('.cl-child-card').first().click();
    console.log('OK: Seeded known_children and selected child');
    return;
  }

  throw new Error('Could not open child PIN step — no picker, manual form, or parent children');
}

async function verifyChildPin(page) {
  await openChildPinStep(page);
  await enterChildPin(page);
  await page.waitForURL(/\/child-dashboard/, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, '09-child-view');
  console.log('OK: Child dashboard reached');
}

async function verifyChildThreeTabs(page) {
  await page.waitForSelector('#tabSchedule', { timeout: 15000 });
  const tabs = await page.evaluate(() => ({
    idag: document.getElementById('tabSchedule')?.textContent?.trim() || '',
    skatt: document.getElementById('tabRewards')?.textContent?.trim() || '',
    familj: document.getElementById('tabFamily')?.textContent?.trim() || '',
  }));

  if (!tabs.idag.includes('Idag') || !tabs.skatt.includes('Skattkammaren') || !tabs.familj.includes('Familj')) {
    throw new Error(`3-tab nav missing: ${JSON.stringify(tabs)}`);
  }
  console.log('OK: 3-tab nav present (Idag · Skattkammaren · Familj)');
  await screenshot(page, '10-child-today-tab');

  await page.click('#tabRewards');
  await page.waitForTimeout(1500);
  await screenshot(page, '11-child-skatt-tab');
  console.log('OK: Skattkammaren tab opened');

  await page.click('#tabFamily');
  await page.waitForTimeout(1500);
  await screenshot(page, '12-child-family-tab');
  const familyBody = await page.textContent('#familyView');
  if (!familyBody || familyBody.length < 20) {
    throw new Error('Family tab did not render content');
  }
  console.log('OK: Familj tab rendered');
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    locale: 'sv-SE',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  const registered = await registerIfNeeded(page);
  if (!registered) {
    await login(page);
  }

  await completeOnboarding(page);
  await verifyDashboard(page);
  await verifyChildPin(page);
  await verifyChildThreeTabs(page);

  await browser.close();
  console.log('Done — review account verified on production.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
