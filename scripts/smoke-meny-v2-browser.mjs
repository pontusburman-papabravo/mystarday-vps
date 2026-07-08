/**
 * Browser smoke: vuxenmeny v2 + barnmeny v2
 * Credentials: scripts/lib/qa-test-accounts.mjs (defaults on localhost).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { resolveSmokeCredentials } from './lib/qa-test-accounts.mjs';

const smoke = resolveSmokeCredentials();
const BASE = smoke.base;
const PARENT_EMAIL = smoke.parentEmail;
const PARENT_PASSWORD = smoke.parentPassword;
const CHILD_NAME = smoke.childName;
const CHILD_PIN = smoke.childPin;

if (!PARENT_EMAIL || !PARENT_PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD (required on prod base URL)');
  process.exit(1);
}

const ARTIFACTS = process.env.SMOKE_ARTIFACTS || '/workspace/artifacts/meny-v2-smoke';
fs.mkdirSync(ARTIFACTS, { recursive: true });

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, err) {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, detail: msg });
  console.error(`✗ ${name} — ${msg}`);
}

async function screenshot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 2500 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(400);
  }
}

async function parentLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.fill('#email', PARENT_EMAIL);
  await page.fill('#password', PARENT_PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding|family|planning)/, { timeout: 45000 });
  await screenshot(page, '01-parent-after-login');
  pass('parent login', page.url());
}

async function smokeParentNav(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForTimeout(2500);

  const navInfo = await page.evaluate(() => {
    const navConfig = !!window.NavConfig;
    const tabs = window.NavConfig
      ? (window.NavConfig.PRIMARY_NAV || []).map((t) => t.label || t.id)
      : [];
    const bottom = document.getElementById('nativeTabBarMount');
    const sidebar = document.getElementById('sidebar');
    return {
      navConfig,
      tabs,
      hasBottomNav: !!(bottom && bottom.innerHTML.trim()),
      hasSidebar: !!sidebar,
      bodySnippet: (document.body.innerText || '').slice(0, 200),
    };
  });

  if (!navInfo.navConfig) throw new Error('NavConfig missing on dashboard');
  pass('vuxen NavConfig loaded', navInfo.tabs.join(' · ') || 'no tabs');

  const hubChecks = [
    { path: '/planning', label: 'Planering', selector: 'h1, [data-hub="planning"]' },
    { path: '/rewards', label: 'Belöningar', selector: 'h1, [data-hub="rewards"]' },
    { path: '/family', label: 'Familj', selector: 'h1, #familyContent, body' },
  ];

  for (const hub of hubChecks) {
    await page.goto(`${BASE}${hub.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    if (!text || text.length < 80) throw new Error(`${hub.path} body too short`);
    pass(`vuxen hub ${hub.label}`, hub.path);
    await screenshot(page, `02-parent-${hub.label.toLowerCase()}`);
  }

  // skattkammaren redirect for parent
  const skattRes = await page.goto(`${BASE}/skattkammaren`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const skattUrl = page.url();
  if (!skattUrl.includes('/rewards')) {
    throw new Error(`/skattkammaren did not redirect to /rewards (got ${skattUrl})`);
  }
  pass('vuxen skattkammaren → rewards redirect', skattUrl);
}

async function enterChildPin(page) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForTimeout(2500);
  await screenshot(page, '03-child-login');

  if (await page.locator('#clKeypad').isVisible({ timeout: 5000 }).catch(() => false)) {
    pass('child auto PIN step', 'single-child picker skipped');
  } else {
    const nameLower = CHILD_NAME.toLowerCase();
    const card = page.locator('.cl-child-card').filter({
      has: page.locator(`text=/${CHILD_NAME}/i`),
    });
    if (await card.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await card.first().click();
    } else if (await page.locator('.cl-child-card').first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const cards = await page.locator('.cl-child-card').all();
      let picked = false;
      for (const c of cards) {
        const t = (await c.textContent()) || '';
        if (t.toLowerCase().includes(nameLower)) {
          await c.click();
          picked = true;
          break;
        }
      }
      if (!picked) await page.locator('.cl-child-card').first().click();
    } else {
      const manual = page.locator('#clManualNameForm');
      if (await manual.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.fill('#clManualNameInput', CHILD_NAME);
        await page.click('#clManualNameForm button[type="submit"]');
      } else {
        throw new Error('No child picker, manual form, or PIN keypad');
      }
    }
    await page.waitForSelector('#clKeypad', { timeout: 15000 });
  }

  for (const digit of CHILD_PIN) {
    await page.locator('#clKeypad button', { hasText: digit }).click();
    await page.waitForTimeout(100);
  }
}

async function smokeChildWorlds(page) {
  await enterChildPin(page);
  await page.waitForURL(/\/child\/(today|world|family)|\/child-dashboard/, { timeout: 45000 });
  await page.waitForTimeout(2500);

  const url = page.url();
  if (!url.includes('/child/today') && !url.includes('/child-dashboard')) {
    throw new Error(`Expected /child/today after PIN, got ${url}`);
  }
  pass('child PIN login', url);
  await screenshot(page, '04-child-today');

  const worlds = await page.evaluate(() => {
    const v2 = !!(window.ChildWorlds && window.ChildWorlds.V2_ENABLED);
    const nav = document.getElementById('childBottomNav');
    const buttons = nav
      ? Array.from(nav.querySelectorAll('[data-child-world]')).map((b) => ({
          world: b.getAttribute('data-child-world'),
          label: (b.textContent || '').trim(),
        }))
      : [];
    return { v2, buttons, pathname: window.location.pathname };
  });

  if (!worlds.v2) throw new Error('ChildWorlds.V2_ENABLED not active');
  if (worlds.buttons.length < 3) {
    throw new Error(`Expected 3 world tabs, got ${JSON.stringify(worlds.buttons)}`);
  }
  pass('barn 3-world nav', worlds.buttons.map((b) => b.label).join(' · '));

  const worldRoutes = [
    { world: 'world', path: '/child/world', label: 'Min värld' },
    { world: 'family', path: '/child/family', label: 'Mina personer' },
  ];

  for (const wr of worldRoutes) {
    const navBtn = page.locator(`[data-child-world="${wr.world}"]`);
    if (await navBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await navBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE}${wr.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
    }
    const state = await page.evaluate(() => ({
      pathname: window.location.pathname,
      onLogin: window.location.pathname === '/child-login',
    }));
    if (state.onLogin) throw new Error(`Session lost navigating to ${wr.path}`);
    if (!state.pathname.includes(wr.path) && wr.world !== 'world') {
      // Tab click may keep /child/today with hash — accept tabKey routing
      const tabOk = await page.evaluate((worldId) => {
        const btn = document.querySelector('[data-child-world="' + worldId + '"].is-active');
        return !!btn;
      }, wr.world);
      if (!tabOk) throw new Error(`Navigate ${wr.path} failed — at ${state.pathname}`);
    }
    pass(`barn world ${wr.world}`, state.pathname);
    await screenshot(page, `05-child-${wr.world}`);
  }

  // System menu mount (vuxenikon)
  const sysMenu = await page.evaluate(() => !!document.getElementById('childSystemIconBtn'));
  if (!sysMenu) throw new Error('childSystemIconBtn not mounted');
  pass('barn system menu button', 'present');
}

async function smokeChildRoutesHttp() {
  const checks = [
    ['/child-dashboard', '/child/today'],
    ['/today', '/child/today'],
    ['/universe', '/child/world'],
  ];
  for (const [from, to] of checks) {
    const res = await fetch(`${BASE}${from}`, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    if (!loc.includes(to)) {
      throw new Error(`HTTP ${from} → expected ${to}, got ${res.status} ${loc}`);
    }
    pass(`HTTP redirect ${from}`, loc);
  }
}

async function main() {
  console.log(`Smoke base: ${BASE}`);
  await smokeChildRoutesHttp();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    locale: 'sv-SE',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    await parentLogin(page);
    await smokeParentNav(page);
    await smokeChildWorlds(page);
  } catch (err) {
    fail('meny smoke', err);
    await screenshot(page, 'error-smoke');
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(ARTIFACTS, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\nArtifacts: ${ARTIFACTS}`);
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);

  if (failed.length) {
    console.error('Failed:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
  console.log('All smoke checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
