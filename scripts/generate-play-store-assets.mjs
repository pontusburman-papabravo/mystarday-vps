#!/usr/bin/env node
/**
 * Google Play assets — Android WebView (native tab bar, not desktop sidebar).
 *
 * Play Console:
 * - Feature graphic: 1024×500 PNG, ≤15 MB
 * - Phone: 8× 1080×1920 (9:16), 320–3840 px
 * - Tablet 7": 8× 1080×1920 (9:16), 320–3840 px
 * - Tablet 10": 8× 1440×2560 (9:16), 1080–7680 px
 *
 * Usage:
 *   npm run play-store:assets
 *   PROFILES=tablet-7,tablet-10 ONLY_SHOTS=05,06 node scripts/...
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

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Viewport width stays <768 to avoid desktop sidebar in native shell */
const PROFILES = {
  phone: {
    label: 'Telefon',
    outDir: OUT,
    shotW: 1080,
    shotH: 1920,
    suffix: 'mobile-1080x1920',
    minDim: 320,
    maxDim: 3840,
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  },
  'tablet-7': {
    label: 'Surfplatta 7"',
    outDir: path.join(OUT, 'tablet-7'),
    shotW: 1080,
    shotH: 1920,
    suffix: 'tablet-7-1080x1920',
    minDim: 320,
    maxDim: 3840,
    viewport: { width: 600, height: 1067, deviceScaleFactor: 1.8, isMobile: true, hasTouch: true },
  },
  'tablet-10': {
    label: 'Surfplatta 10"',
    outDir: path.join(OUT, 'tablet-10'),
    shotW: 1440,
    shotH: 2560,
    suffix: 'tablet-10-1440x2560',
    minDim: 1080,
    maxDim: 7680,
    // Same native-mobile viewport as phone; upscale to 1440×2560 for Play 10" specs
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  },
};

const ACTIVE_PROFILES = (process.env.PROFILES || 'phone,tablet-7,tablet-10')
  .split(',')
  .map((s) => s.trim())
  .filter((id) => PROFILES[id]);

const ONLY_SHOTS = (process.env.ONLY_SHOTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const SHOT_DEFS = [
  { num: '01', slug: 'foralder-dashboard', path: '/dashboard', requireParent: true },
  { num: '02', slug: 'schema', path: '/schedule', requireParent: true },
  { num: '03', slug: 'barnvy', path: '/child-dashboard', child: true },
  { num: '04', slug: 'skattkammaren-barn', path: '/child-dashboard#rewards', child: true },
  { num: '05', slug: 'bibliotek', path: '/library', requireParent: true },
  { num: '06', slug: 'familj', path: '/family', requireParent: true },
  { num: '07', slug: 'skattkammaren-foralder', path: '/skattkammaren', requireParent: true },
  { num: '08', slug: 'installningar', path: '/settings', requireParent: true },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shotFilename(num, slug, profile) {
  return `${num}-${slug}-${profile.suffix}.png`;
}

function shotNum(filename) {
  const m = filename.match(/^(\d{2})-/);
  return m ? m[1] : null;
}

function shouldCapture(num) {
  if (!ONLY_SHOTS.length) return true;
  return ONLY_SHOTS.includes(num);
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const id of ACTIVE_PROFILES) {
    fs.mkdirSync(PROFILES[id].outDir, { recursive: true });
  }
}

function cleanStaleShots() {
  for (const id of ACTIVE_PROFILES) {
    const profile = PROFILES[id];
    const dir = profile.outDir;
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      const isShot = file.match(/^\d{2}-.*\.png$/) && !file.startsWith('_');
      if (!isShot) continue;
      if (!shouldCapture(shotNum(file))) continue;
      if (ACTIVE_PROFILES.length === 1 || file.includes(profile.suffix)) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }
  for (const file of fs.readdirSync(OUT)) {
    if (file.startsWith('_tmp-')) fs.unlinkSync(path.join(OUT, file));
  }
}

async function setupNativeAndroid(page, profile) {
  await page.setUserAgent(ANDROID_UA);
  await page.setViewport(profile.viewport);
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

async function normalizeScreenshot(filePath, profile) {
  const buf = await sharp(filePath)
    .resize(profile.shotW, profile.shotH, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(buf).toFile(filePath);
  const meta = await sharp(filePath).metadata();
  const bytes = fs.statSync(filePath).size;
  return { width: meta.width, height: meta.height, bytes };
}

async function saveScreenshot(page, filename, profile) {
  const tmp = path.join(profile.outDir, `_tmp-${filename}`);
  const out = path.join(profile.outDir, filename);
  await page.screenshot({ path: tmp, type: 'png', fullPage: false });
  fs.renameSync(tmp, out);
  const info = await normalizeScreenshot(out, profile);
  console.log(`  Wrote ${out} (${info.width}×${info.height}, ${(info.bytes / 1024).toFixed(0)} KB)`);
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

async function loginParent(page, profile) {
  await setupNativeAndroid(page, profile);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
    throw new Error(`API login failed (${status.status}): ${status.error || 'unknown'}`);
  }

  await hydrateParentAuth(page);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  if ((page.url() || '').includes('/login')) {
    throw new Error('Login failed — redirected to login');
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
  const base = urlPath.split('#')[0];
  if (base === '/library') {
    await page.waitForSelector('#tab-schema-btn, #tab-schema, .tab-pane', { timeout: 20000 }).catch(() => {});
    await page
      .waitForFunction(() => document.querySelectorAll('#tab-schema [data-id]').length > 0, {
        timeout: 20000,
      })
      .catch(() => {});
  } else if (base === '/family') {
    await page
      .waitForFunction(
        () => {
          const s = document.getElementById('familyInfoSection');
          return s && !s.classList.contains('hidden');
        },
        { timeout: 25000 }
      )
      .catch(() => {});
  } else if (base === '/skattkammaren') {
    await page
      .waitForFunction(
        () => {
          const chips = document.getElementById('childChips');
          return chips && chips.children.length > 0;
        },
        { timeout: 25000 }
      )
      .catch(() => {});
  } else if (base === '/settings') {
    await page.waitForSelector('#familyName', { timeout: 25000 }).catch(() => {});
    await page
      .waitForFunction(
        () => (document.getElementById('familyName')?.value || '').length > 0,
        { timeout: 25000 }
      )
      .catch(() => {});
  } else if (base === '/child-dashboard' && urlPath.includes('#rewards')) {
    await page
      .waitForFunction(
        () => {
          const view = document.getElementById('skattkammarView');
          return view && !view.classList.contains('hidden') && view.offsetHeight > 0;
        },
        { timeout: 20000 }
      )
      .catch(() => {});
  } else if (base === '/child-dashboard') {
    await page.waitForFunction(
      () => {
        const name = document.getElementById('childName');
        return name && name.textContent && name.textContent !== 'Mitt schema';
      },
      { timeout: 25000 }
    );
  }
}

async function assertParentSession(page, profile) {
  const ok = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const me = await res.json();
    return me.type === 'parent' || !!me.email;
  });
  if (!ok) {
    console.warn('Parent session missing — re-login');
    await loginParent(page, profile);
  }
}

async function capturePage(page, shot, profile) {
  if (!shouldCapture(shot.num)) return;

  const filename = shotFilename(shot.num, shot.slug, profile);
  if (shot.requireParent) {
    await assertParentSession(page, profile);
    await hydrateParentAuth(page);
  }

  await setupNativeAndroid(page, profile);
  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  if ((page.url() || '').includes('/login')) {
    await loginParent(page, profile);
    await hydrateParentAuth(page);
    await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  await waitForNativeShell(page);
  await waitForPageReady(page, shot.path);
  await sleep(1500);

  const finalUrl = page.url() || '';
  if (finalUrl.includes('/login')) {
    await loginParent(page, profile);
    await hydrateParentAuth(page);
    await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForNativeShell(page);
    await waitForPageReady(page, shot.path);
    await sleep(1500);
    if ((page.url() || '').includes('/login')) {
      throw new Error(`Still on login for ${filename}`);
    }
  }

  await saveScreenshot(page, filename, profile);
  console.log('    ←', shot.path);
}

async function loginChildViaUi(page) {
  await page.goto(`${BASE_URL}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
  if (!username) throw new Error(`No child card for ${CHILD_NAME}`);

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
  console.log('  Child login:', (await page.$eval('#childName', (el) => el.textContent)).trim());
}

async function captureProfile(page, profile) {
  console.log(`\n── ${profile.label} (${profile.shotW}×${profile.shotH}) ──`);

  const parentShots = SHOT_DEFS.filter((s) => s.requireParent && shouldCapture(s.num));
  const childShots = SHOT_DEFS.filter((s) => s.child && shouldCapture(s.num));

  if (parentShots.length || childShots.length) {
    await loginParent(page, profile);
  }

  // Parent pages first — avoids broken session after child logout
  for (const shot of parentShots) {
    await capturePage(page, shot, profile);
  }

  if (!childShots.length) return;

  await setupNativeAndroid(page, profile);
  await loginChildViaUi(page);

  if (shouldCapture('03')) {
    await sleep(1500);
    await saveScreenshot(page, shotFilename('03', 'barnvy', profile), profile);
    console.log('    ← /child-dashboard');
  }

  if (shouldCapture('04')) {
    await page.goto(`${BASE_URL}/child-dashboard#rewards`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPageReady(page, '/child-dashboard#rewards');
    await sleep(2000);
    await saveScreenshot(page, shotFilename('04', 'skattkammaren-barn', profile), profile);
    console.log('    ← /child-dashboard#rewards');
  }
}

async function validateProfile(profile) {
  const shots = fs
    .readdirSync(profile.outDir)
    .filter((f) => f.match(/^\d{2}-.*\.png$/) && f.includes(profile.suffix))
    .sort();

  if (shots.length !== 8) {
    throw new Error(`${profile.label}: expected 8 shots, found ${shots.length}`);
  }

  for (const file of shots) {
    const p = path.join(profile.outDir, file);
    const m = await sharp(p).metadata();
    const bytes = fs.statSync(p).size;
    const ratio = m.width / m.height;
    const is916 = Math.abs(ratio - 9 / 16) < 0.02;

    if (m.width !== profile.shotW || m.height !== profile.shotH) {
      throw new Error(`${file}: expected ${profile.shotW}×${profile.shotH}, got ${m.width}×${m.height}`);
    }
    if (m.width < profile.minDim || m.height < profile.minDim || m.width > profile.maxDim || m.height > profile.maxDim) {
      throw new Error(`${file}: outside ${profile.minDim}–${profile.maxDim} px bounds`);
    }
    if (!is916) throw new Error(`${file}: not 9:16`);
    if (bytes > 8 * 1024 * 1024) throw new Error(`${file}: exceeds 8 MB`);
  }

  console.log(`✓ ${profile.label}: 8 screenshots OK (${profile.shotW}×${profile.shotH})`);
}

async function validateOutputs() {
  if (ACTIVE_PROFILES.includes('phone') && !ONLY_SHOTS.length) {
    const feature = path.join(OUT, 'feature-graphic-1024x500.png');
    const fm = await sharp(feature).metadata();
    if (fm.width !== 1024 || fm.height !== 500) {
      throw new Error(`Feature graphic must be 1024×500, got ${fm.width}×${fm.height}`);
    }
  }
  for (const id of ACTIVE_PROFILES) {
    await validateProfile(PROFILES[id]);
  }
}

async function main() {
  ensureDirs();
  cleanStaleShots();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  page.__nativeAndroidReady = false;

  try {
    if (!ONLY_SHOTS.length && ACTIVE_PROFILES.includes('phone')) {
      await screenshotFeatureGraphic(page);
    }

    console.log('Account:', REVIEW_EMAIL, `| child: ${CHILD_NAME} / ${CHILD_PIN} |`, BASE_URL);

    for (const id of ACTIVE_PROFILES) {
      page.__nativeAndroidReady = false;
      await captureProfile(page, PROFILES[id]);
    }

    await validateOutputs();
  } finally {
    await browser.close();
  }

  console.log('\n✅ Play Console upload paths:');
  console.log('   Funktionsbild: out/feature-graphic-1024x500.png');
  console.log('   Telefon:       out/*-mobile-1080x1920.png (8 st)');
  console.log('   Surfplatta 7":  out/tablet-7/*-tablet-7-1080x1920.png (8 st)');
  console.log('   Surfplatta 10": out/tablet-10/*-tablet-10-1440x2560.png (8 st)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
