/**
 * WEB/PWA preview only — NOT for App Store upload (looks like mobile Safari, not native).
 * For App Store: use Xcode Simulator + Cmd+S — see docs/app-store-screenshots/NATIVE-CAPTURE.md
 *
 * If used internally: outputs 1284×2778 (one of Apple's accepted sizes:
 * 1242×2688, 1284×2778, 2688×1242, 2778×1284 — NOT 1290×2796).
 *
 *   npx playwright install chromium   # once
 *   node scripts/capture-app-store-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = (process.env.APP_REVIEW_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const EMAIL = process.env.APP_REVIEW_EMAIL;
const PASSWORD = process.env.APP_REVIEW_PASSWORD;
const CHILD_NAME = process.env.APP_REVIEW_CHILD_NAME || 'Anna';
const CHILD_PIN = process.env.APP_REVIEW_CHILD_PIN;

if (!BASE || !EMAIL || !PASSWORD || !CHILD_PIN) {
  console.error('Set APP_REVIEW_BASE_URL (or BASE_URL), APP_REVIEW_EMAIL, APP_REVIEW_PASSWORD, APP_REVIEW_CHILD_PIN');
  process.exit(1);
}
const CHILD_NAME = 'Anna';
const CHILD_PIN = '4455';

/** 428×926 logical @ 3× → 1284×2778 (App Store Connect accepted) */
const VIEWPORT = { width: 428, height: 926 };
const DEVICE_SCALE = 3;

const OUT_DIR = path.join(process.cwd(), 'docs/app-store-screenshots/iphone-6.5');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, type: 'png', fullPage: false });
  console.log(`saved: ${file}`);
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(400);
  }
}

async function loginParent(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function enterChildPin(page) {
  const card = page.locator('.cl-child-card').first();
  if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
    await card.click();
  } else {
    const manual = page.locator('#clManualNameForm');
    if (await manual.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('#clManualNameInput', CHILD_NAME);
      await page.click('#clManualNameForm button[type="submit"]');
    } else {
      await page.evaluate(async (childName) => {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const me = await res.json();
        const child = (me.children || []).find((c) =>
          (c.name || '').toLowerCase() === childName.toLowerCase()
        ) || me.children?.[0];
        if (!child?.username) throw new Error('No child on review account');
        localStorage.setItem('stjarndag_known_children', JSON.stringify([{
          username: child.username,
          name: child.name || childName,
          emoji: child.emoji || '🌟',
          avatar_url: child.avatar_url || null,
          familyId: me.familyId || me.family_id || null,
          lastLoginAt: Date.now(),
        }]));
      }, CHILD_NAME);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.cl-child-card').first().click();
    }
  }

  await page.waitForSelector('#clKeypad', { timeout: 15000 });
  for (const digit of CHILD_PIN) {
    await page.locator('#clKeypad button', { hasText: digit }).click();
    await page.waitForTimeout(100);
  }
  await page.waitForURL(/\/child-dashboard/, { timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function waitForSkattHub(page) {
  await page.waitForSelector('.skatt-house-scene, .skatt-room-door', { timeout: 20000 });
  await page.waitForFunction(() => !document.getElementById('skattEntrance'), { timeout: 8000 })
    .catch(() => page.waitForTimeout(2500));
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    locale: 'sv-SE',
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  await loginParent(page);
  await shot(page, '01-parent-dashboard.png');

  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await shot(page, '02-child-picker.png');

  await enterChildPin(page);

  await page.waitForSelector('#tabSchedule', { timeout: 15000 });
  await shot(page, '03-child-idag.png');

  await page.click('#tabRewards');
  await waitForSkattHub(page);
  await shot(page, '04-child-skattkammaren.png');

  await page.click('#tabFamily');
  await page.waitForSelector('#familyView[data-active="true"], .cfh-title', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, '05-child-familj.png');

  await browser.close();
  console.log(`Done — ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
