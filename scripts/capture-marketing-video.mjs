#!/usr/bin/env node
/**
 * Mobile marketing walkthrough — Playwright screen recording (9:16).
 *
 * Usage:
 *   node scripts/capture-marketing-video.mjs
 *   BASE_URL=... REVIEW_EMAIL=... REVIEW_PASSWORD=... node scripts/capture-marketing-video.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'artifacts', 'marketing-video');

const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  console.error('Set BASE_URL env var');
  process.exit(1);
}
const REVIEW_EMAIL = process.env.REVIEW_EMAIL;
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD;
const CHILD_NAME = process.env.CHILD_NAME || 'Anna';
const CHILD_PIN = process.env.CHILD_PIN || '4455';

if (!REVIEW_EMAIL || !REVIEW_PASSWORD) {
  console.error('Set REVIEW_EMAIL and REVIEW_PASSWORD');
  process.exit(1);
}

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const VIEWPORT = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function acceptCookies(page) {
  const btn = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await btn.click();
    await sleep(400);
  }
}

function nativeInitScript() {
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    Plugins: {},
  };
}

async function tap(page, selector, opts = {}) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: opts.timeout || 15000 });
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(opts.preDelay || 200);
  await loc.click({ force: !!opts.force });
  await sleep(opts.postDelay || 600);
}

async function loginParentApi(page) {
  const status = await page.evaluate(
    async ({ email, password }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.user && window.Auth) {
        Auth.setAuth(null, body.user, body.csrfToken, body.expiresAt);
      }
      return { status: res.status, error: body.error || null };
    },
    { email: REVIEW_EMAIL, password: REVIEW_PASSWORD }
  );
  if (status.status !== 200) {
    throw new Error(`Parent API login failed (${status.status}): ${status.error || 'unknown'}`);
  }

  await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return;
    const me = await res.json();
    if (!me.email || !window.Auth) return;
    Auth.setAuth(null, {
      id: me.id,
      email: me.email,
      familyId: me.family_id || me.familyId,
      type: 'parent',
      isAdmin: !!(me.isAdmin || me.is_admin),
      onboarding_completed: me.onboarding_completed !== false,
      account_type: me.account_type,
      preferred_view_mode: me.preferred_view_mode,
    });
  });
}

async function waitForParentShell(page) {
  await page
    .waitForFunction(
      () =>
        document.documentElement.classList.contains('platform-native') ||
        document.documentElement.classList.contains('is-native') ||
        document.querySelector('.native-tab-bar'),
      { timeout: 20000 }
    )
    .catch(() => {});
  await sleep(800);
}

async function sceneEntryFlow(page) {
  console.log('  → Entry welcome flow');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForSelector('#entry-welcome', { state: 'visible', timeout: 20000 });
  await sleep(2200);

  await tap(page, '#entryWelcomeStartBtn', { postDelay: 900 });
  await page.waitForSelector('#role-selection', { state: 'visible', timeout: 10000 });
  await sleep(2200);

  await tap(page, '#parent-role-card', { postDelay: 1200 });
  await page.waitForSelector('#entry-adult-start', { state: 'visible', timeout: 10000 });
  await sleep(2200);
}

async function sceneParentNav(page) {
  console.log('  → Parent menu tour');
  await loginParentApi(page);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForParentShell(page);
  await sleep(2000);

  const tabs = await page.evaluate(() => {
    if (!window.NavConfig) return [];
    return (window.NavConfig.PRIMARY_NAV || []).map((t) => ({
      href: t.href,
      label: t.label,
    }));
  });

  const order = tabs.length
    ? tabs
    : [
        { href: '/dashboard', label: 'Hem' },
        { href: '/planning', label: 'Planering' },
        { href: '/rewards', label: 'Belöningar' },
        { href: '/for-dig', label: 'För dig' },
        { href: '/family', label: 'Familj' },
      ];

  for (const tab of order) {
    const link = page.locator(`.native-tab-bar a.tab-item[data-tab-href="${tab.href}"]`);
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await sleep(2500);
    } else {
      await page.goto(`${BASE_URL}${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForParentShell(page);
      await sleep(2500);
    }
    console.log(`     · ${tab.label}`);
  }
}

async function enterChildPin(page) {
  await page.goto(`${BASE_URL}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await sleep(1500);

  if (!(await page.locator('#clKeypad').isVisible({ timeout: 3000 }).catch(() => false))) {
    const picked = await page.evaluate((childName) => {
      const cards = Array.from(document.querySelectorAll('.cl-child-card'));
      const wanted = childName.toLowerCase();
      const card =
        cards.find((el) => (el.textContent || '').toLowerCase().includes(wanted)) || cards[0];
      if (!card) return false;
      const u = card.getAttribute('data-username');
      if (typeof window.selectChild === 'function' && u) window.selectChild(u);
      else card.click();
      return true;
    }, CHILD_NAME);
    if (!picked) throw new Error(`No child card for ${CHILD_NAME}`);
    await page.waitForSelector('#clKeypad', { timeout: 15000 });
    await sleep(800);
  }

  for (const digit of CHILD_PIN.split('')) {
    const btn = page.locator(`#clKeypad button[data-action="${digit}"], #clKeypad button:has-text("${digit}")`).first();
    await btn.click();
    await sleep(140);
  }
  await sleep(1200);
}

async function sceneChildWorlds(page) {
  console.log('  → Child login + worlds');
  await enterChildPin(page);
  await page.waitForURL(/\/child(\/today|\/world|\/family|-dashboard)/, { timeout: 45000 });
  await sleep(2500);

  const worlds = ['today', 'world', 'family'];
  for (const world of worlds) {
    const btn = page.locator(`[data-child-world="${world}"]`).first();
    if (await btn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await btn.click();
      await sleep(2800);
      console.log(`     · ${world}`);
    }
  }
}

function ffmpegConvert(webmPath, mp4Path) {
  const args = [
    '-y',
    '-i',
    webmPath,
    '-vf',
    'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '30',
    '-movflags',
    '+faststart',
    mp4Path,
  ];
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stderr);
    throw new Error('ffmpeg conversion failed');
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const webmOut = path.join(OUT_DIR, `app-mobile-walkthrough-${stamp}.webm`);
  const mp4Out = path.join(OUT_DIR, `app-mobile-walkthrough-${stamp}.mp4`);

  console.log(`Recording marketing video from ${BASE_URL}`);
  console.log(`Output: ${mp4Out}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    locale: 'sv-SE',
    userAgent: IPHONE_UA,
    viewport: { width: VIEWPORT.width, height: VIEWPORT.height },
    deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: VIEWPORT.width, height: VIEWPORT.height },
    },
  });
  await context.addInitScript(nativeInitScript);

  const page = await context.newPage();

  try {
    await sceneEntryFlow(page);
    await sceneParentNav(page);
    await sceneChildWorlds(page);
    await sleep(1500);
  } catch (err) {
    console.error('Recording error:', err.message);
    await page.screenshot({ path: path.join(OUT_DIR, 'error-frame.png'), fullPage: true });
    throw err;
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (!video) throw new Error('No video recorded');
    const rawPath = await video.path();
    if (rawPath && rawPath !== webmOut && fs.existsSync(rawPath)) {
      fs.renameSync(rawPath, webmOut);
    }
  }

  console.log('Converting to MP4 (1080×1920)…');
  ffmpegConvert(webmOut, mp4Out);

  const stats = fs.statSync(mp4Out);
  console.log(`\n✓ WebM: ${webmOut}`);
  console.log(`✓ MP4:  ${mp4Out} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
