/**
 * Mobile browser smoke — landing nav, FAQ accordion, contact validation.
 * Usage: BASE=http://127.0.0.1:3000 node scripts/smoke-landing-mobile.mjs
 *        BASE=https://mystarday.se node scripts/smoke-landing-mobile.mjs
 */
import { chromium, devices } from 'playwright';

const BASE = (process.env.BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');
const HEADLESS = process.env.HEADLESS !== '0';

const results = [];
let failed = 0;

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, err) {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, detail: msg });
  console.error(`  ✗ ${name} — ${msg}`);
  failed += 1;
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 2500 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(300);
  }
}

async function testHomeMobileNav(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const hamburger = page.locator('#navHamburger');
  const menu = page.locator('#mobileMenu');

  if (!(await hamburger.isVisible())) {
    fail('hamburger visible on mobile', new Error('not visible'));
    return;
  }
  pass('hamburger visible on mobile');

  if (await menu.evaluate((el) => el.classList.contains('is-open'))) {
    fail('mobile menu starts closed', new Error('already open'));
  } else {
    pass('mobile menu starts closed');
  }

  await hamburger.click();
  await page.waitForTimeout(200);

  if (!(await menu.evaluate((el) => el.classList.contains('is-open')))) {
    fail('mobile menu opens on tap', new Error('is-open missing'));
  } else {
    pass('mobile menu opens on tap');
  }

  const signup = menu.locator('a[href="/register"]');
  if (!(await signup.isVisible())) {
    fail('mobile menu signup CTA', new Error('not visible'));
  } else {
    pass('mobile menu signup CTA');
  }

  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(200);

  if (await menu.evaluate((el) => el.classList.contains('is-open'))) {
    fail('mobile menu closes on outside tap', new Error('still open'));
  } else {
    pass('mobile menu closes on outside tap');
  }
}

async function testHomeFaqAccordion(page) {
  await page.goto(`${BASE}/#faq`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const item = page.locator('.faq-item[data-faq="kostnad"]');
  const btn = item.locator('.faq-question');
  await btn.scrollIntoViewIfNeeded();

  if (await item.evaluate((el) => el.classList.contains('is-open'))) {
    fail('FAQ starts collapsed', new Error('kostnad already open'));
  } else {
    pass('FAQ starts collapsed');
  }

  await btn.click();
  await page.waitForTimeout(150);

  if (!(await item.evaluate((el) => el.classList.contains('is-open')))) {
    fail('FAQ expands on tap', new Error('kostnad not open'));
  } else {
    pass('FAQ expands on tap');
  }

  if (await btn.getAttribute('aria-expanded') !== 'true') {
    fail('FAQ aria-expanded', new Error('not true'));
  } else {
    pass('FAQ aria-expanded');
  }

  const other = page.locator('.faq-item[data-faq="adhd-autism"] .faq-question');
  await other.click();
  await page.waitForTimeout(150);

  const onlyOneOpen = await page.evaluate(() => {
    return document.querySelectorAll('.faq-item.is-open').length === 1;
  });
  if (!onlyOneOpen) {
    fail('FAQ single-open behavior', new Error('multiple open'));
  } else {
    pass('FAQ single-open behavior');
  }
}

async function testFaqPage(page) {
  await page.goto(`${BASE}/faq`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const count = await page.locator('.faq-item').count();
  if (count < 10) {
    fail('/faq has full FAQ list', new Error(`only ${count} items`));
  } else {
    pass('/faq has full FAQ list', `${count} items`);
  }

  const first = page.locator('.faq-item').first().locator('.faq-question');
  await first.click();
  await page.waitForTimeout(150);
  if (!(await page.locator('.faq-item').first().evaluate((el) => el.classList.contains('is-open')))) {
    fail('/faq accordion works', new Error('first item not open'));
  } else {
    pass('/faq accordion works');
  }
}

async function testContactValidation(page) {
  await page.goto(`${BASE}/kontakt`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  await page.click('#contactSubmitBtn');
  await page.waitForTimeout(200);

  const errorVisible = await page.locator('#contactError').isVisible();
  const errorText = await page.locator('#contactError').textContent();
  if (!errorVisible || !errorText?.includes('obligatoriska')) {
    fail('contact form empty validation', new Error(errorText || 'no error'));
  } else {
    pass('contact form empty validation');
  }

  await page.fill('#contactName', 'Test');
  await page.fill('#contactEmail', 'not-an-email');
  await page.fill('#contactMessage', 'Hej');
  await page.click('#contactSubmitBtn');
  await page.waitForTimeout(200);

  const emailErr = await page.locator('#contactError').textContent();
  if (!emailErr?.includes('giltig')) {
    fail('contact form email validation', new Error(emailErr || 'no error'));
  } else {
    pass('contact form email validation');
  }
}

async function testLegacyAnchors(page) {
  await page.goto(`${BASE}/#losning`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  try {
    await page.waitForFunction(() => {
      const el = document.getElementById('sa-fungerar-det');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      return r.top < vh * 0.75 && r.bottom > 80;
    }, { timeout: 6000 });
    pass('legacy #losning scrolls to #sa-fungerar-det');
  } catch {
    fail('legacy #losning scrolls to #sa-fungerar-det', new Error('section not in view after 6s'));
  }
}

async function testHeroCta(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const href = await page.locator('[data-track="hero_signup_click"]').first().getAttribute('href');
  if (href !== '/register') {
    fail('hero signup href', new Error(href || 'missing'));
  } else {
    pass('hero signup href');
  }
}

async function testKontaktRedirect(page) {
  await page.goto(`${BASE}/#kontakt`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/\/kontakt/, { timeout: 8000 });
  pass('legacy #kontakt redirects to /kontakt', page.url());
}

console.log(`\n📱 Landing mobile browser QA @ ${BASE}\n`);

const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext({
  ...devices['iPhone 14'],
  locale: 'sv-SE',
});
const page = await context.newPage();

try {
  console.log('🏠 Startsida');
  await testHomeMobileNav(page);
  await testHeroCta(page);
  await testHomeFaqAccordion(page);
  await testLegacyAnchors(page);

  console.log('\n📄 FAQ-sida');
  await testFaqPage(page);

  console.log('\n✉️ Kontakt');
  await testContactValidation(page);
  await testKontaktRedirect(page);
} catch (err) {
  fail('unexpected', err);
} finally {
  await browser.close();
}

console.log(`\n${failed === 0 ? '✅ All browser checks passed' : `❌ ${failed} browser check(s) failed`}\n`);
process.exit(failed ? 1 : 0);
