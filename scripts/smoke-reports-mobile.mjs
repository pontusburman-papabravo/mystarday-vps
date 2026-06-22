/**
 * Prod smoke: /reports mobile layout — no sidebar links in page header.
 * Env: BASE, SMOKE_PARENT_EMAIL, SMOKE_PARENT_PASSWORD
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE;
const EMAIL = process.env.SMOKE_PARENT_EMAIL;
const PASSWORD = process.env.SMOKE_PARENT_PASSWORD;

if (!BASE || !EMAIL || !PASSWORD) {
  console.error('Set BASE, SMOKE_PARENT_EMAIL, SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const cookieBtn = page.locator('button:has-text("Godkänn alla")');
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) await cookieBtn.click();
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|family|onboarding)/, { timeout: 45000 });

  await page.goto(`${BASE}/reports`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const header = document.querySelector('[data-page-header], .reports-topbar');
    const headerLinks = header ? header.querySelectorAll('a').length : 0;
    const headerUl = header ? header.querySelectorAll('ul').length : 0;
    const bodyText = document.body.innerText || '';
    const dupNavInHeader = header && /Hem/.test(header.innerText) && /Planering/.test(header.innerText);
    return {
      hasHeader: !!header,
      headerLinks,
      headerUl,
      dupNavInHeader,
      hasTabBar: !!document.querySelector('.native-tab-bar'),
      hasSkapaRapport: bodyText.includes('Skapa rapport'),
    };
  });

  console.log(JSON.stringify(state, null, 2));

  let ok = true;
  if (!state.hasHeader) { console.error('FAIL: missing page header'); ok = false; }
  if (state.headerUl > 0) { console.error('FAIL: sidebar ul injected in header'); ok = false; }
  if (state.dupNavInHeader) { console.error('FAIL: duplicate nav in header'); ok = false; }
  if (!state.hasSkapaRapport) { console.error('FAIL: reports content missing'); ok = false; }

  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
