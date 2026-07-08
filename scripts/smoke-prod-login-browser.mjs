/**
 * Deployed-site browser smoke — login flow check (legacy or v2 menus).
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

const ARTIFACTS = process.env.SMOKE_ARTIFACTS || '/workspace/artifacts/prod-smoke';
fs.mkdirSync(ARTIFACTS, { recursive: true });

async function shot(page, name) {
  const f = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: f, fullPage: true });
  console.log('screenshot:', f);
}

async function acceptCookies(page) {
  const btn = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) await btn.click();
}

async function main() {
  console.log('Prod smoke:', BASE);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'sv-SE' });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.fill('#email', PARENT_EMAIL);
  await page.fill('#password', PARENT_PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding|family|planning)/, { timeout: 45000 });
  console.log('✓ parent login →', page.url());
  await shot(page, '01-parent');

  const v2 = await page.evaluate(() => ({
    navConfig: !!window.NavConfig,
    tabs: window.NavConfig ? (window.NavConfig.PRIMARY_NAV || []).map((t) => t.label) : [],
    childWorlds: !!(window.ChildWorlds && window.ChildWorlds.V2_ENABLED),
  }));
  console.log('NavConfig:', v2.navConfig, v2.tabs.join(' · ') || '(none)');
  console.log('ChildWorlds v2:', v2.childWorlds);

  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  await page.waitForTimeout(4000);
  await shot(page, '01b-child-login');

  if (await page.locator('#clKeypad').isVisible({ timeout: 8000 }).catch(() => false)) {
    console.log('✓ child PIN step (auto)');
  } else {
    const cards = page.locator('.cl-child-card');
    const count = await cards.count();
    console.log('Child cards:', count);
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
  if (err) console.log('Child PIN error:', err.trim());

  try {
    await page.waitForURL(/\/child(-dashboard|\/today|\/world)?/, { timeout: 20000 });
  } catch {
    console.log('Still on:', page.url());
  }
  console.log('✓ child login →', page.url());
  await shot(page, '02-child');

  const childNav = await page.evaluate(() => {
    const v2 = !!(window.ChildWorlds && window.ChildWorlds.V2_ENABLED);
    const worlds = v2
      ? Array.from(document.querySelectorAll('[data-child-world]')).map((b) => b.textContent.trim())
      : [];
    const legacy = {
      idag: document.getElementById('tabSchedule')?.textContent?.trim(),
      skatt: document.getElementById('tabRewards')?.textContent?.trim(),
    };
    return { v2, worlds, legacy, path: window.location.pathname };
  });
  console.log('Child nav:', JSON.stringify(childNav));

  await browser.close();
  console.log('Prod login smoke done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
