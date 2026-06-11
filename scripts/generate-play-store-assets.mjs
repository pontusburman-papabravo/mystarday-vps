#!/usr/bin/env node
/**
 * Google Play assets — mobile Android native appearance (NOT desktop).
 *
 * Play Console requirements:
 * - Feature graphic: PNG/JPEG, 1024×500 px, ≤15 MB
 * - Phone screenshots: 8× PNG/JPEG, 9:16, 320–3840 px, ≤8 MB each
 * - Campaigns: min 1080 px on both width and height (we output 1080×2400)
 *
 * Simulates Capacitor Android WebView:
 * - Narrow viewport + platform-native + bottom tab bar (no sidebar)
 *
 * Usage:
 *   npm run play-store:assets
 *   BASE_URL=https://mystarday.se REVIEW_EMAIL=... REVIEW_PASSWORD=... node scripts/...
 *
 * Output: assets/play-store/out/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'play-store', 'out');

const BASE_URL = (process.env.BASE_URL || 'https://mystarday.se').replace(/\/$/, '');
const REVIEW_EMAIL = process.env.REVIEW_EMAIL || 'review@mystarday.se';
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD || 'AppReview2026!';
const CHILD_NAME = process.env.CHILD_NAME || 'Anna';
const CHILD_PIN = process.env.CHILD_PIN || '4455';

/** Play: 9:16 portrait + campaign min 1080 px on both sides → 1080×1920 */
const SHOT_W = 1080;
const SHOT_H = 1920;

/** Pixel-class phone viewport (resized to exact SHOT_W×SHOT_H after capture) */
const MOBILE = {
  width: 412,
  height: 915,
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
};

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const ONLY_SHOTS = (process.env.ONLY_SHOTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function shotNum(filename) {
  const m = filename.match(/^(\d{2})-/);
  return m ? m[1] : null;
}

function shouldCapture(filename) {
  if (!ONLY_SHOTS.length) return true;
  const n = shotNum(filename);
  return n && ONLY_SHOTS.includes(n);
}

async function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const file of fs.readdirSync(OUT)) {
    const isShot = file.match(/^\d{2}-.*-mobile-1080x\d+\.png$/);
    if (isShot && !shouldCapture(file)) continue;
    if (isShot || file.startsWith('_tmp-')) {
      fs.unlinkSync(path.join(OUT, file));
    }
  }
}

/** Inject Capacitor + Platform before any page script runs (once per page) */
async function setupNativeAndroid(page) {
  await page.setUserAgent(ANDROID_UA);
  await page.setViewport(MOBILE);
  if (page.__nativeAndroidReady) return;
  await page.evaluateOnNewDocument(() => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: {},
    };
  });
  page.__nativeAndroidReady = true;
}

/** Pages using Auth.requireAuth / Auth.isLoggedIn need localStorage — httpOnly cookie alone is not enough */
async function hydrateParentAuth(page) {
  const ok = await page.evaluate(async () => {
    if (window.Auth && Auth.isLoggedIn()) return true;
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const me = await res.json();
    if (!me.email) return false;
    if (window.Auth) {
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
    }
    return !!(window.Auth && Auth.isLoggedIn());
  });
  if (!ok) throw new Error('Failed to hydrate parent Auth in localStorage');
}

async function normalizePhoneScreenshot(filePath) {
  const buf = await sharp(filePath)
    .resize(SHOT_W, SHOT_H, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(buf).toFile(filePath);
  const meta = await sharp(filePath).metadata();
  const bytes = fs.statSync(filePath).size;
  return { width: meta.width, height: meta.height, bytes };
}

async function savePhoneScreenshot(page, filename) {
  const tmp = path.join(OUT, `_tmp-${filename}`);
  const out = path.join(OUT, filename);
  await page.screenshot({ path: tmp, type: 'png', fullPage: false });
  fs.renameSync(tmp, out);
  const info = await normalizePhoneScreenshot(out);
  console.log(`Wrote ${out} (${info.width}×${info.height}, ${(info.bytes / 1024).toFixed(0)} KB)`);
  return out;
}

async function screenshotFeatureGraphic(page) {
  const htmlPath = path.join(ROOT, 'assets/play-store/feature-graphic.html');
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(600);
  const out = path.join(OUT, 'feature-graphic-1024x500.png');
  await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: 1024, height: 500 } });
  const meta = await sharp(out).metadata();
  console.log(`Wrote ${out} (${meta.width}×${meta.height})`);
}

async function loginParent(page) {
  await setupNativeAndroid(page);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(500);

  const status = await page.evaluate(async (email, password) => {
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
  }, REVIEW_EMAIL, REVIEW_PASSWORD);

  if (status.status !== 200) {
    throw new Error(
      `API login failed (${status.status}): ${status.error || 'unknown'}. Check review account on ${BASE_URL}.`
    );
  }

  await hydrateParentAuth(page);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);

  if ((page.url() || '').includes('/login')) {
    throw new Error('Login failed — redirected to login. Check REVIEW_EMAIL/PASSWORD.');
  }
}

async function waitForNativeShell(page) {
  await page
    .waitForFunction(
      () =>
        document.documentElement.classList.contains('platform-native') ||
        document.documentElement.classList.contains('is-native'),
      { timeout: 15000 }
    )
    .catch(() => {});
  await sleep(600);
}

async function waitForPageReady(page, urlPath) {
  if (urlPath === '/library') {
    await page.waitForSelector('#tab-schema-btn', { timeout: 20000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#tab-schema [data-id]').length > 0,
      { timeout: 20000 }
    ).catch(() => {});
  } else if (urlPath === '/family') {
    await page.waitForFunction(
      () => {
        const s = document.getElementById('familyInfoSection');
        return s && !s.classList.contains('hidden');
      },
      { timeout: 20000 }
    );
  } else if (urlPath === '/skattkammaren') {
    await page.waitForFunction(
      () => {
        const chips = document.getElementById('childChips');
        return chips && chips.children.length > 0;
      },
      { timeout: 20000 }
    );
  } else if (urlPath === '/settings') {
    await page.waitForSelector('#familyName', { timeout: 20000 });
    await page.waitForFunction(
      () => (document.getElementById('familyName')?.value || '').length > 0,
      { timeout: 20000 }
    );
  }
}

async function captureMobile(page, filename, urlPath, { waitSelector, requireParent } = {}) {
  if (requireParent) {
    await assertParentSession(page);
    await hydrateParentAuth(page);
  }
  await setupNativeAndroid(page);
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if ((page.url() || '').includes('/login')) {
    await loginParent(page);
    await hydrateParentAuth(page);
    await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await waitForNativeShell(page);
  await waitForPageReady(page, urlPath);
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 15000 }).catch(() => {});
  }
  await sleep(1500);
  const finalUrl = page.url() || '';
  if (finalUrl.includes('/login')) {
    throw new Error(`Still on login when capturing ${filename} — auth not hydrated`);
  }
  await savePhoneScreenshot(page, filename);
  console.log('  ←', urlPath);
}

async function loginChildViaUi(page) {
  await page.goto(`${BASE_URL}/child-login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('.cl-child-card', { timeout: 20000 });
  await sleep(1000);

  const username = await page.evaluate((childName) => {
    const cards = Array.from(document.querySelectorAll('.cl-child-card'));
    const wanted = childName.toLowerCase();
    const card =
      cards.find((el) => (el.textContent || '').toLowerCase().includes(wanted)) || cards[0];
    if (!card) return null;
    const u = card.getAttribute('data-username');
    if (typeof window.selectChild === 'function' && u) window.selectChild(u);
    else card.click();
    return u;
  }, CHILD_NAME);
  if (!username) throw new Error(`No child card found for ${CHILD_NAME}`);

  await page.waitForSelector('#clKeypad', { timeout: 10000 });
  for (const digit of CHILD_PIN.split('')) {
    await page.click(`#clKeypad button[data-action="${digit}"]`);
    await sleep(150);
  }
  await sleep(800);

  await page.waitForFunction(
    () =>
      window.location.pathname.includes('child-dashboard') &&
      document.getElementById('childName') &&
      document.getElementById('childName').textContent !== 'Mitt schema',
    { timeout: 35000 }
  );
  const name = await page.$eval('#childName', (el) => el.textContent);
  console.log('Child login via UI:', name.trim());
  return { ok: true, via: 'ui', name: name.trim() };
}

async function assertParentSession(page) {
  const ok = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const me = await res.json();
    return me.type === 'parent' || !!me.email;
  });
  if (!ok) {
    console.warn('Parent session missing — logging in again');
    await loginParent(page);
  }
}

async function restoreParentAfterChild(page) {
  await page.evaluate(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  });
  await loginParent(page);
}

async function captureChildScreens(page) {
  await setupNativeAndroid(page);
  await loginChildViaUi(page);
  await sleep(1500);
  await savePhoneScreenshot(page, '03-barnvy-mobile-1080x1920.png');
  console.log('  ← /child-dashboard (barnschema)');

  await page.goto(`${BASE_URL}/child-dashboard#rewards`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page
    .waitForFunction(
      () => {
        const view = document.getElementById('skattkammarView');
        return view && !view.classList.contains('hidden') && view.offsetHeight > 0;
      },
      { timeout: 20000 }
    )
    .catch(() => {});
  await sleep(2000);
  await savePhoneScreenshot(page, '04-skattkammaren-barn-mobile-1080x1920.png');
  console.log('  ← /child-dashboard#rewards');

  await restoreParentAfterChild(page);
}

async function captureDesktopComparison(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(async (email, password) => {
    await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }, REVIEW_EMAIL, REVIEW_PASSWORD);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1000);
  const out = path.join(OUT, '_INTERNAL-desktop-do-not-upload.png');
  await page.screenshot({ path: out, type: 'png' });
  await page.close();
  console.log('Wrote', out, '(internal — sidebar layout, do NOT upload to Play)');
}

async function validateOutputs() {
  const feature = path.join(OUT, 'feature-graphic-1024x500.png');
  const fm = await sharp(feature).metadata();
  const fBytes = fs.statSync(feature).size;
  if (fm.width !== 1024 || fm.height !== 500) {
    throw new Error(`Feature graphic must be 1024×500, got ${fm.width}×${fm.height}`);
  }
  if (fBytes > 15 * 1024 * 1024) {
    throw new Error(`Feature graphic exceeds 15 MB (${fBytes} bytes)`);
  }

  const shots = fs
    .readdirSync(OUT)
    .filter((f) => f.match(/^\d{2}-.*-mobile-1080x1920\.png$/))
    .sort();

  if (shots.length !== 8) {
    throw new Error(`Expected 8 phone screenshots, found ${shots.length}: ${shots.join(', ')}`);
  }

  for (const file of shots) {
    const p = path.join(OUT, file);
    const m = await sharp(p).metadata();
    const bytes = fs.statSync(p).size;
    const ratio = m.width / m.height;
    const isPortrait916 = Math.abs(ratio - 9 / 16) < 0.02;

    if (m.width < 1080 || m.height < 1080) {
      throw new Error(`${file}: below 1080 px campaign minimum (${m.width}×${m.height})`);
    }
    if (m.width < 320 || m.height < 320 || m.width > 3840 || m.height > 3840) {
      throw new Error(`${file}: outside 320–3840 px bounds (${m.width}×${m.height})`);
    }
    if (!isPortrait916) {
      throw new Error(`${file}: aspect ratio ${m.width}:${m.height} is not ~9:16`);
    }
    if (bytes > 8 * 1024 * 1024) {
      throw new Error(`${file}: exceeds 8 MB (${bytes} bytes)`);
    }
  }

  console.log(`\n✓ Validation OK: feature ${fm.width}×${fm.height}, ${shots.length} phone shots`);
}

const PHONE_SHOTS = [
  { file: '01-foralder-dashboard-mobile-1080x1920.png', path: '/dashboard', requireParent: true },
  { file: '02-schema-mobile-1080x1920.png', path: '/schedule', requireParent: true },
  // 03–04 captured in captureChildScreens()
  { file: '05-bibliotek-mobile-1080x1920.png', path: '/library', requireParent: true },
  { file: '06-familj-mobile-1080x1920.png', path: '/family', requireParent: true },
  {
    file: '07-skattkammaren-foralder-mobile-1080x1920.png',
    path: '/skattkammaren',
    requireParent: true,
    waitSelector: 'main, .skatt-page, #app',
  },
  {
    file: '08-installningar-mobile-1080x1920.png',
    path: '/settings',
    requireParent: true,
    waitSelector: '#settingsForm, main, h1',
  },
];

async function main() {
  await ensureOut();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();

  const need01 = shouldCapture(PHONE_SHOTS[0].file);
  const need02 = shouldCapture(PHONE_SHOTS[1].file);
  const need03 = shouldCapture('03-barnvy-mobile-1080x1920.png');
  const need04 = shouldCapture('04-skattkammaren-barn-mobile-1080x1920.png');
  const needParentBatch = PHONE_SHOTS.some((s) => shouldCapture(s.file));

  try {
    if (!ONLY_SHOTS.length) await screenshotFeatureGraphic(page);

    console.log('\nLogging in as', REVIEW_EMAIL, `(child: ${CHILD_NAME} / ${CHILD_PIN}) on`, BASE_URL);
    await loginParent(page);

    if (need01) await captureMobile(page, PHONE_SHOTS[0].file, PHONE_SHOTS[0].path, PHONE_SHOTS[0]);
    if (need02) await captureMobile(page, PHONE_SHOTS[1].file, PHONE_SHOTS[1].path, PHONE_SHOTS[1]);
    if (need03 || need04) await captureChildScreens(page);
    for (const shot of PHONE_SHOTS.slice(2)) {
      if (shouldCapture(shot.file)) {
        await captureMobile(page, shot.file, shot.path, shot);
      }
    }

    if (!ONLY_SHOTS.length) await captureDesktopComparison(browser);
    await validateOutputs();
  } finally {
    await browser.close();
  }

  console.log('\n✅ Upload to Play Console:');
  console.log('   Funktionsbild: feature-graphic-1024x500.png (1024×500 PNG)');
  console.log('   Telefon (8 st, 1080×1920, 9:16):');
  for (const shot of [
    '01-foralder-dashboard-mobile-1080x1920.png',
    '02-schema-mobile-1080x1920.png',
    '03-barnvy-mobile-1080x1920.png',
    '04-skattkammaren-barn-mobile-1080x1920.png',
    '05-bibliotek-mobile-1080x1920.png',
    '06-familj-mobile-1080x1920.png',
    '07-skattkammaren-foralder-mobile-1080x1920.png',
    '08-installningar-mobile-1080x1920.png',
  ]) {
    console.log('   ', shot);
  }
  console.log('\n⚠️  Use MOBILE shots only — not _INTERNAL-desktop-*');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
