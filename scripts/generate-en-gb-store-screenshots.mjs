#!/usr/bin/env node
/**
 * en-GB App Store / Play marketing screenshots.
 *
 * 1. Download published Swedish Apple assets (iTunes lookup)
 * 2. Capture real en-GB UI from BASE_URL (Puppeteer + native shell mock)
 * 3. Composite captures into Swedish marketing frames (gold border + headlines)
 *
 * Usage:
 *   PROD_EMAIL=... PROD_PASSWORD=... PROD_USER_CHILD=... PROD_USER_CHILD_PASSWORD=... \
 *     node scripts/generate-en-gb-store-screenshots.mjs
 *
 * Env:
 *   BASE_URL          required app origin (no default)
 *   SKIP_CAPTURE=1    reuse artifacts/store-screenshots/captures/*.png
 *   SKIP_DOWNLOAD=1   skip re-downloading Apple sources
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SRC_APPLE = path.join(ROOT, 'artifacts/store-screenshots/source/apple');
const SRC_GOOGLE = path.join(ROOT, 'artifacts/store-screenshots/source/google');
const CAPTURES = path.join(ROOT, 'artifacts/store-screenshots/captures');
const OUT_APPLE = path.join(ROOT, 'artifacts/store-screenshots/en-GB/apple');
const OUT_PLAY = path.join(ROOT, 'artifacts/store-screenshots/en-GB/google-play');
const OUT_META = path.join(ROOT, 'artifacts/store-screenshots/en-GB');

const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  console.error('BASE_URL is required (e.g. https://your-app.example)');
  process.exit(1);
}
const PARENT_EMAIL = process.env.PROD_EMAIL || process.env.PARENT_EMAIL;
const PARENT_PASSWORD = process.env.PROD_PASSWORD || process.env.PARENT_PASSWORD;
const CHILD_USER = process.env.PROD_USER_CHILD || process.env.CHILD_USER;
const CHILD_PIN = process.env.PROD_USER_CHILD_PASSWORD || process.env.CHILD_PIN;

const W = 1242;
const H = 2688;
const BG = { r: 8, g: 9, b: 30 };
const GOLD = '#F5A623';
const MARKETING_H = 136;
const INNER = { left: 105, top: 146, width: 1014, height: 2438 };

const CAPTURE_VIEWPORT = {
  width: 339,
  height: 813,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const ONLY_SHOTS = (process.env.ONLY_SHOTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function wantShot(id) {
  return !ONLY_SHOTS.length || ONLY_SHOTS.includes(id);
}

/** @type {Array<{id:string,view:string,source:string,path:string,parent?:boolean,child?:boolean,wait?:string,ready?:string,marketing:{title:string,sub:string,svTitle:string,svSub:string}}>} */
const SHOTS = [
  {
    id: '01',
    view: 'Parent home — coach, survey, quick actions',
    source: '01-apple-se.jpg',
    path: '/dashboard',
    parent: true,
    wait: '#parentMagicPageMount, .parent-magic-hub, #homeReadinessMount, #dashboardContent',
    ready: 'parent-i18n-ready',
    marketing: {
      svTitle: 'Lugnare vardagar',
      svSub: 'Se nästa steg utan att hålla allt i huvudet.',
      title: 'Calmer everyday life',
      sub: 'See the next step without holding it all in your head.',
    },
  },
  {
    id: '02',
    view: 'Child today — morning routine step',
    source: '02-apple-se.jpg',
    path: '/child/today',
    child: true,
    wait: '#scheduleView, .child-today-shell',
    ready: 'child-i18n-ready',
    marketing: {
      svTitle: 'Barnet gör själv',
      svSub: 'Tydliga bilder och ett steg i taget.',
      title: 'Children act independently',
      sub: 'Clear pictures, one step at a time.',
    },
  },
  {
    id: '03',
    view: 'Parent planning hub menu',
    source: '03-apple-se.jpg',
    path: '/planning',
    parent: true,
    wait: '.planning-hub, #planningHubMount',
    ready: 'parent-i18n-ready',
    marketing: {
      svTitle: 'Rutiner på några minuter',
      svSub: 'Planera veckan och samla allt på ett ställe.',
      title: 'Routines in minutes',
      sub: 'Plan the week and keep everything in one place.',
    },
  },
  {
    id: '04',
    view: 'Parent rewards hub',
    source: '04-apple-se.jpg',
    path: '/rewards',
    parent: true,
    wait: '.rewards-hub, #rewardsHubMount',
    ready: 'parent-i18n-ready',
    marketing: {
      svTitle: 'Motivation som fungerar',
      svSub: 'Stjärnor gör framsteg synliga.',
      title: 'Motivation that works',
      sub: 'Stars make progress visible.',
    },
  },
  {
    id: '05',
    view: 'Child treasure chest',
    source: '05-apple-se.jpg',
    path: '/child/treasure',
    child: true,
    wait: '#skattkammarView, #treasureViewMount',
    ready: 'child-i18n-ready',
    marketing: {
      svTitle: 'Mål värda att längta till',
      svSub: 'Barnet ser vad stjärnorna leder till.',
      title: 'Goals worth looking forward to',
      sub: 'Children see what the stars lead to.',
    },
  },
  {
    id: '06',
    view: 'Child collection / trophies',
    source: '06-apple-se.jpg',
    path: '/child/collection',
    child: true,
    wait: '#collectionViewMount, #collectionView',
    ready: 'child-i18n-ready',
    extraWaitMs: 5000,
    marketing: {
      svTitle: 'Stolthet som får växa',
      svSub: 'Samla stjärnor, troféer och minnen.',
      title: 'Pride that grows',
      sub: 'Collect stars, trophies and memories.',
    },
  },
  {
    id: '07',
    view: 'Family museum',
    source: '07-apple-se.jpg',
    path: '/family',
    parent: true,
    wait: '#familyMuseumCard, .fm-museum-card',
    ready: 'parent-i18n-ready',
    scrollTo: '#familyMuseumCard',
    marketing: {
      svTitle: 'Fira det ni klarat',
      svSub: 'Se familjens framsteg på ett ställe.',
      title: "Celebrate what you've achieved",
      sub: "See your family's progress in one place.",
    },
  },
  {
    id: '08',
    view: 'Child settings / appearance',
    source: '08-apple-se.jpg',
    path: '/child/settings',
    child: true,
    wait: '#settingsViewMount, #settingsView, .child-settings-shell',
    ready: 'child-i18n-ready',
    marketing: {
      svTitle: 'Anpassat efter barnet',
      svSub: 'Välj tema, bildstil och kortstorlek.',
      title: 'Tailored for your child',
      sub: 'Choose theme, image style and card size.',
    },
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parseCookies(headers) {
  const list = headers.getSetCookie ? headers.getSetCookie() : [];
  const jar = {};
  for (const raw of list) {
    const part = raw.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(jar, headers) {
  return { ...jar, ...parseCookies(headers) };
}

async function apiFetch(path, { method = 'GET', body, cookies = {}, csrf } = {}) {
  const headers = {};
  const ch = cookieHeader(cookies);
  if (ch) headers.Cookie = ch;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers, cookies: mergeCookies(cookies, res.headers) };
}

async function loginParent() {
  if (!PARENT_EMAIL || !PARENT_PASSWORD) {
    throw new Error('PROD_EMAIL and PROD_PASSWORD required');
  }
  const login = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: PARENT_EMAIL, password: PARENT_PASSWORD },
  });
  if (login.status !== 200) {
    throw new Error(`Parent login failed (${login.status}): ${login.json?.error || 'unknown'}`);
  }
  let cookies = login.cookies;
  let csrf = login.json.csrfToken;
  const csrfRes = await apiFetch('/api/auth/csrf-token', { cookies });
  cookies = csrfRes.cookies;
  csrf = csrfRes.json.csrfToken || csrf;
  const me = await apiFetch('/api/auth/me', { cookies });
  cookies = me.cookies;
  const user = me.json?.email ? me.json : login.json.user;
  return { cookies, csrf, user, expiresAt: login.json.expiresAt };
}

async function getLocale(cookies) {
  const res = await apiFetch('/api/family/locale-options', { cookies });
  return res.json?.preferred_locale || 'sv-SE';
}

async function setFamilyLocale(session, locale) {
  const csrfRes = await apiFetch('/api/auth/csrf-token', { cookies: session.cookies });
  session.cookies = csrfRes.cookies;
  session.csrf = csrfRes.json.csrfToken || session.csrf;
  const res = await apiFetch('/api/family/settings', {
    method: 'PUT',
    cookies: session.cookies,
    csrf: session.csrf,
    body: { preferred_locale: locale },
  });
  session.cookies = res.cookies;
  if (res.status !== 200) {
    throw new Error(`Failed to set locale ${locale}: ${res.status} ${JSON.stringify(res.json)}`);
  }
  return res.json;
}

async function loginChild(parentCookies, parentCsrf) {
  if (!CHILD_USER || !CHILD_PIN) {
    throw new Error('PROD_USER_CHILD and PROD_USER_CHILD_PASSWORD required for child shots');
  }
  const res = await apiFetch('/api/auth/child-login', {
    method: 'POST',
    cookies: parentCookies,
    csrf: parentCsrf,
    body: { username: CHILD_USER, pin: CHILD_PIN },
  });
  if (res.status !== 200) {
    throw new Error(`Child login failed (${res.status}): ${res.json?.error || 'unknown'}`);
  }
  return {
    cookies: res.cookies,
    csrf: res.json.csrfToken,
    user: res.json.user,
    expiresAt: res.json.expiresAt,
  };
}

async function downloadAppleSources() {
  fs.mkdirSync(SRC_APPLE, { recursive: true });
  const lookup = await fetch('https://itunes.apple.com/lookup?id=6774493098&country=se');
  const data = await lookup.json();
  const urls = data.results?.[0]?.screenshotUrls || [];
  if (urls.length < 8) throw new Error(`Expected 8 Apple screenshots, got ${urls.length}`);

  const manifest = [];
  for (let i = 0; i < urls.length; i++) {
    const thumbUrl = urls[i];
    const fullUrl = thumbUrl.replace(/\/\d+x\d+bb\.(jpg|png)$/i, '/1242x2688bb.jpg');
    const id = String(i + 1).padStart(2, '0');
    const filename = `${id}-apple-se.jpg`;
    const outPath = path.join(SRC_APPLE, filename);

    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(`Download failed ${fullUrl}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    const meta = await sharp(outPath).metadata();
    manifest.push({
      file: filename,
      source: fullUrl,
      dimensions: `${meta.width}x${meta.height}`,
      sha256: sha256(buf),
    });
    console.log(`↓ Apple ${filename} (${meta.width}×${meta.height})`);
  }
  return manifest;
}

async function downloadGoogleSources() {
  fs.mkdirSync(SRC_GOOGLE, { recursive: true });
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { androidPackageName } = require('../config/store-links.js');
  const pkg = androidPackageName();
  const url = `https://play.google.com/store/apps/details?id=${pkg}&hl=sv&gl=SE`;
  const html = await fetch(url, {
    headers: { 'User-Agent': ANDROID_UA, 'Accept-Language': 'sv-SE' },
  }).then((r) => r.text());

  const manifest = [];
  const iconMatch = html.match(/https:\/\/play-lh\.googleusercontent\.com\/[^"'\s]+/);
  if (iconMatch) {
    const iconUrl = iconMatch[0].replace(/=w\d+-h\d+.*$/, '=w512-h512');
    const buf = Buffer.from(await (await fetch(iconUrl)).arrayBuffer());
    const out = path.join(SRC_GOOGLE, 'app-icon-512.png');
    fs.writeFileSync(out, buf);
    const meta = await sharp(out).metadata();
    manifest.push({
      file: 'app-icon-512.png',
      source: iconUrl,
      dimensions: `${meta.width}x${meta.height}`,
      sha256: sha256(buf),
      note: 'Play public HTML exposes phone screenshots only inside the app; composite output reuses Apple marketing frames at 1080×1920',
    });
    console.log(`↓ Google icon ${meta.width}×${meta.height}`);
  }

  const shotUrls = [...html.matchAll(/https:\/\/play-lh\.googleusercontent\.com\/[^"'\s]+=w\d+-h\d+[^"'\s]*/g)]
    .map((m) => m[0])
    .filter((u) => u.includes('-rw') || u.includes('screenshot'));

  let idx = 0;
  for (const shotUrl of shotUrls.slice(0, 8)) {
    idx += 1;
    const buf = Buffer.from(await (await fetch(shotUrl)).arrayBuffer());
    const meta = await sharp(buf).metadata();
    if (meta.width < 400) continue;
    const filename = `${String(idx).padStart(2, '0')}-google-se.png`;
    fs.writeFileSync(path.join(SRC_GOOGLE, filename), buf);
    manifest.push({ file: filename, source: shotUrl, dimensions: `${meta.width}x${meta.height}`, sha256: sha256(buf) });
  }

  return manifest;
}

async function setupNativeAndroid(page) {
  await page.setUserAgent(ANDROID_UA);
  await page.setViewport(CAPTURE_VIEWPORT);
  await page.evaluateOnNewDocument(() => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: {},
    };
    try {
      sessionStorage.setItem('sd_preferred_locale', 'en-GB');
      localStorage.setItem('sd_preferred_locale', 'en-GB');
      sessionStorage.setItem('sd_english_child_experience', '1');
      localStorage.setItem('sd_english_child_experience', '1');
      sessionStorage.setItem('sd_child_ui_locale', 'en-GB');
      localStorage.setItem('sd_child_ui_locale', 'en-GB');
    } catch (_) { /* ignore */ }
  });
}

async function applyCookies(page, cookies) {
  const entries = Object.entries(cookies).map(([name, value]) => ({ name, value, url: BASE_URL }));
  if (entries.length) await page.setCookie(...entries);
}

function entryDecisionPayload(isChild, targetPath) {
  return {
    destination: isChild ? 'child-home' : 'parent-home',
    viewContext: isChild ? 'child' : 'parent',
    credentialContext: isChild ? 'child' : 'parent',
    deviceMode: 'shared',
    childId: null,
    path: targetPath,
  };
}

async function seedAuthOnNewDocument(page, user, csrfToken, expiresAt, { child = false, path = '/dashboard' } = {}) {
  await page.evaluateOnNewDocument(
    (u, csrf, exp, isChild, targetPath, decision) => {
      try {
        localStorage.setItem('stjarndag_user', JSON.stringify(u));
        if (csrf) localStorage.setItem('stjarndag_csrf', csrf);
        if (exp) localStorage.setItem('stjarndag_token_exp', String(exp));
        sessionStorage.setItem('sd_preferred_locale', 'en-GB');
        localStorage.setItem('sd_preferred_locale', 'en-GB');
        sessionStorage.setItem('sd_english_child_experience', '1');
        localStorage.setItem('sd_english_child_experience', '1');
        sessionStorage.setItem('stjarndag_entry_decision_applied', '1');
        sessionStorage.setItem('stjarndag_entry_decision_v1', JSON.stringify(decision));
        if (isChild) {
          sessionStorage.setItem('sd_child_ui_locale', 'en-GB');
          localStorage.setItem('sd_child_ui_locale', 'en-GB');
        }
      } catch (_) { /* ignore */ }
    },
    user,
    csrfToken,
    expiresAt,
    child,
    path,
    entryDecisionPayload(child, path)
  );
}

async function dismissBlockingUi(page) {
  await page.evaluate(() => {
    const clickIf = (sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    };
    const clickByText = (labels) => {
      for (const label of labels) {
        const btn = Array.from(document.querySelectorAll('button, a, [role="button"]')).find((el) => {
          const t = (el.textContent || '').trim();
          return t === label || t.startsWith(label);
        });
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    };
    clickIf('#dagensNyhetClose');
    clickByText(['✕', '×']);
    clickByText(['Skip', 'Hoppa över']);
    clickByText(['Later', 'Senare', 'Not now', 'Inte nu', 'Close', 'Stäng']);
    clickIf('[data-share-dismiss]');
    clickIf('#onboardingSkipBtn');
    clickIf('#deviceSetupLaterBtn');
    clickIf('#pushPromptLaterBtn');
    clickIf('#parentMagicShareDismiss');
    clickIf('.share-banner-close');
    // Dashboard coach onboarding cards
    clickByText(['Next →', 'Nästa →']);
  });
  await sleep(600);
}

async function dismissAllBlockingUi(page) {
  for (let i = 0; i < 8; i++) {
    const hasOverlay = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const blockers = [
        'Welcome to the dashboard',
        'Välkommen till dashboarden',
        'How should this device be used',
        'Hur ska den här enheten användas',
        'Get push notifications',
        'Få push-notiser',
        'Tipsa en vän',
        'Tell a family',
        'Refer a friend',
      ];
      return blockers.some((b) => text.includes(b));
    });
    if (!hasOverlay) break;
    await dismissBlockingUi(page);
  }
}

async function loginParentInPage(page, session) {
  await applyCookies(page, session.cookies);
  await setupNativeAndroid(page);
  await gotoSafe(page, `${BASE_URL}/dashboard`, null);
  await sleep(1200);
  if ((page.url() || '').includes('/login')) {
    await gotoSafe(page, `${BASE_URL}/dashboard`, null);
    await sleep(1200);
  }
  if ((page.url() || '').includes('/login')) {
    throw new Error('Parent session could not reach /dashboard');
  }
  await hydrateParentAuth(page).catch(() => {});
  await page
    .evaluate(() => {
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
    })
    .catch(() => {});
  await sleep(1500);
}

async function loginChildInPage(page, session) {
  await applyCookies(page, session.cookies);
  await setupNativeAndroid(page);
  await gotoSafe(page, `${BASE_URL}/child/today`, null);
  if ((page.url() || '').includes('/child-login')) {
    throw new Error('Child session could not reach /child/today');
  }
  await sleep(1500);
}

function validateCaptureText(shot, text) {
  const parentMarkers = ['Home', 'Planning', 'Rewards', 'For you', 'Family'];
  const childMarkers = ["Astrid's day", 'My collection', 'Treasure Chest', 'My space'];
  if (shot.parent) {
    if (!parentMarkers.some((m) => text.includes(m))) {
      throw new Error(`Capture ${shot.id} missing parent nav markers. Sample: ${text.slice(0, 240)}`);
    }
    if (childMarkers.some((m) => text.includes(m))) {
      throw new Error(`Capture ${shot.id} looks like child UI inside parent shot`);
    }
  }
  if (shot.child) {
    if (!childMarkers.some((m) => text.includes(m))) {
      throw new Error(`Capture ${shot.id} missing child nav markers`);
    }
    if (text.includes('Push notifications') && shot.path.includes('/child/settings')) {
      throw new Error(`Capture ${shot.id} shows parent settings instead of child My space`);
    }
  }
}

async function waitForReady(page, shot) {
  if (shot.wait) {
    const selectors = shot.wait.split(',').map((s) => s.trim());
    for (const sel of selectors) {
      await page.waitForSelector(sel, { timeout: 25000 }).catch(() => {});
    }
  }
  if (shot.ready) {
    await page
      .evaluate(
        (evt) =>
          new Promise((resolve) => {
            if (document.documentElement.lang === 'en-GB' || document.documentElement.getAttribute('lang') === 'en-GB') {
              resolve(true);
              return;
            }
            const done = () => resolve(true);
            document.addEventListener(evt, done, { once: true });
            setTimeout(done, 8000);
          }),
        shot.ready
      )
      .catch(() => {});
  }
  if (shot.id === '06') {
    await page
      .waitForFunction(
        () => {
          const t = document.body.innerText || '';
          return !t.includes('Opening your collection') && (t.includes('earned') || t.includes('trophies'));
        },
        { timeout: 25000 }
      )
      .catch(() => {});
  }
  if (shot.extraWaitMs) await sleep(shot.extraWaitMs);
  await page
    .waitForFunction(
      () =>
        document.documentElement.classList.contains('platform-native') ||
        document.documentElement.classList.contains('is-native'),
      { timeout: 15000 }
    )
    .catch(() => {});
  if (shot.scrollTo) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, shot.scrollTo);
    await sleep(800);
  }
  await dismissAllBlockingUi(page);
  await sleep(1500);
}

async function hydrateParentAuth(page) {
  await page.evaluate(async () => {
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
        preferred_locale: me.preferred_locale,
      });
    }
    return !!(window.Auth && Auth.isLoggedIn());
  });
}

async function gotoSafe(page, url, relogin) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      if (relogin && (page.url() || '').includes('/login')) {
        await relogin(page);
      }
      await sleep(1000 * attempt);
    }
  }
}

async function captureShot(page, shot, outPath, relogin) {
  await setupNativeAndroid(page);
  await gotoSafe(page, `${BASE_URL}${shot.path}`, relogin);
  if ((page.url() || '').includes('/login')) {
    if (!relogin) throw new Error(`Redirected to login for ${shot.path}`);
    await relogin(page);
    await gotoSafe(page, `${BASE_URL}${shot.path}`, relogin);
    if ((page.url() || '').includes('/login')) {
      throw new Error(`Still on login for ${shot.path}`);
    }
  }
  if (shot.parent) await hydrateParentAuth(page);
  await waitForReady(page, shot);

  const tmp = outPath.replace(/\.png$/, '.raw.png');
  await page.screenshot({ path: tmp, type: 'png', fullPage: false });
  await sharp(tmp)
    .resize(INNER.width, INNER.height, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  fs.unlinkSync(tmp);

  const meta = await sharp(outPath).metadata();
  const textSample = await page.evaluate(() => document.body?.innerText || '');
  validateCaptureText(shot, textSample);
  const swedishLeak =
    /\b(Hem|Planering|Belöningar|För dig|Familj|Skattkammaren|Idag|Inställningar|Veckoschema|Påminnelser|Läs upp|Avsluta aktivitet|VAD\?|NU)\b/.test(
      textSample
    );
  return { meta, swedishLeak, textSample: textSample.slice(0, 200) };
}

async function captureAll(parentSession, childSession) {
  fs.mkdirSync(CAPTURES, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const results = [];
  const parentShots = SHOTS.filter((s) => s.parent && wantShot(s.id));
  const childShots = SHOTS.filter((s) => s.child && wantShot(s.id));

  try {
    if (parentShots.length) {
      const parentCtx = await browser.createBrowserContext();
      const parentPage = await parentCtx.newPage();
      await seedAuthOnNewDocument(parentPage, parentSession.user, parentSession.csrf, parentSession.expiresAt, {
        child: false,
        path: '/dashboard',
      });
      await loginParentInPage(parentPage, parentSession);

      for (const shot of parentShots) {
        const outPath = path.join(CAPTURES, `${shot.id}-capture.png`);
        if (process.env.SKIP_CAPTURE === '1' && fs.existsSync(outPath)) {
          console.log(`↷ reuse capture ${shot.id}`);
          results.push({ id: shot.id, path: outPath, reused: true });
          continue;
        }
        console.log(`📸 capture ${shot.id} ${shot.path}`);
        const info = await captureShot(parentPage, shot, outPath, async (page) => loginParentInPage(page, parentSession));
        console.log(`   ${info.meta.width}×${info.meta.height}${info.swedishLeak ? ' ⚠ Swedish UI leak' : ''}`);
        results.push({ id: shot.id, path: outPath, ...info });
      }
      await parentCtx.close();
    }

    if (childShots.length) {
      const childCtx = await browser.createBrowserContext();
      const childPage = await childCtx.newPage();
      await seedAuthOnNewDocument(childPage, childSession.user, childSession.csrf, childSession.expiresAt, {
        child: true,
        path: '/child/today',
      });
      await loginChildInPage(childPage, childSession);

      for (const shot of childShots) {
        const outPath = path.join(CAPTURES, `${shot.id}-capture.png`);
        if (process.env.SKIP_CAPTURE === '1' && fs.existsSync(outPath)) {
          console.log(`↷ reuse capture ${shot.id}`);
          results.push({ id: shot.id, path: outPath, reused: true });
          continue;
        }
        console.log(`📸 capture ${shot.id} ${shot.path}`);
        const info = await captureShot(childPage, shot, outPath, async (page) => loginChildInPage(page, childSession));
        console.log(`   ${info.meta.width}×${info.meta.height}${info.swedishLeak ? ' ⚠ Swedish UI leak' : ''}`);
        results.push({ id: shot.id, path: outPath, ...info });
      }
      await childCtx.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function marketingSvg(shot) {
  const titleSize = shot.marketing.title.length > 28 ? 62 : 72;
  return Buffer.from(`<svg width="${W}" height="${MARKETING_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgb(${BG.r},${BG.g},${BG.b})"/>
  <text x="95" y="62" font-family="Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${titleSize}" font-weight="800" fill="${GOLD}">${escapeXml(shot.marketing.title)}</text>
  <text x="95" y="112" font-family="Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="400" fill="#FFFFFF">${escapeXml(shot.marketing.sub)}</text>
</svg>`);
}

async function compositeShot(shot) {
  const srcPath = path.join(SRC_APPLE, shot.source);
  const capturePath = path.join(CAPTURES, `${shot.id}-capture.png`);
  const outApple = path.join(OUT_APPLE, `${shot.id}-en-GB.png`);
  const outPlay = path.join(OUT_PLAY, `${shot.id}-en-GB.png`);

  if (!fs.existsSync(capturePath)) {
    throw new Error(`Missing capture for ${shot.id}: ${capturePath}`);
  }

  const captureBuf = await sharp(capturePath).png().toBuffer();
  const marketingBuf = await sharp(marketingSvg(shot)).png().toBuffer();

  // Paint marketing zone on source, then replace inner UI with English capture, then marketing text
  const clearedMarketing = await sharp(srcPath)
    .extract({ left: 0, top: 0, width: W, height: MARKETING_H })
    .toBuffer()
    .then(() =>
      sharp({
        create: { width: W, height: MARKETING_H, channels: 3, background: BG },
      }).png().toBuffer()
    );

  await sharp(srcPath)
    .composite([
      { input: clearedMarketing, left: 0, top: 0 },
      { input: captureBuf, left: INNER.left, top: INNER.top },
      { input: marketingBuf, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outApple);

  await sharp(outApple)
    .resize(1080, 1920, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(outPlay);

  const meta = await sharp(outApple).metadata();
  return { outApple, outPlay, meta };
}

async function buildContactSheet(files, outPath, cols = 2) {
  const images = await Promise.all(
    files.map(async (f) => {
      const buf = await sharp(f).resize(360, 778, { fit: 'contain', background: BG }).png().toBuffer();
      return buf;
    })
  );
  const rows = Math.ceil(images.length / cols);
  const cellW = 380;
  const cellH = 800;
  const sheetW = cols * cellW;
  const sheetH = rows * cellH;
  const composites = images.map((buf, i) => ({
    input: buf,
    left: (i % cols) * cellW + 10,
    top: Math.floor(i / cols) * cellH + 10,
  }));
  const bg = await sharp({
    create: { width: sheetW, height: sheetH, channels: 3, background: BG },
  }).png().toBuffer();
  await sharp(bg).composite(composites).png().toFile(outPath);
}

async function buildSideBySide(outPath) {
  const rows = [];
  for (const shot of SHOTS) {
    const se = path.join(SRC_APPLE, shot.source);
    const en = path.join(OUT_APPLE, `${shot.id}-en-GB.png`);
    const left = await sharp(se).resize(300, 649, { fit: 'contain', background: BG }).png().toBuffer();
    const right = await sharp(en).resize(300, 649, { fit: 'contain', background: BG }).png().toBuffer();
    const row = await sharp({
      create: { width: 620, height: 649, channels: 3, background: BG },
    })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 320, top: 0 }])
      .png()
      .toBuffer();
    rows.push(row);
  }
  const totalH = rows.length * 649;
  const bg = await sharp({
    create: { width: 620, height: totalH, channels: 3, background: BG },
  }).png().toBuffer();
  await sharp(bg)
    .composite(rows.map((r, i) => ({ input: r, left: 0, top: i * 649 })))
    .png()
    .toFile(outPath);
}

async function validateOutput(shot) {
  const srcPath = path.join(SRC_APPLE, shot.source);
  const outPath = path.join(OUT_APPLE, `${shot.id}-en-GB.png`);
  const sm = await sharp(srcPath).metadata();
  const om = await sharp(outPath).metadata();
  const bytes = fs.statSync(outPath).size;
  return {
    id: shot.id,
    sameDimensions: sm.width === om.width && sm.height === om.height,
    src: `${sm.width}x${sm.height}`,
    out: `${om.width}x${om.height}`,
    outBytes: bytes,
    validPng: om.format === 'png',
    reasonableSize: bytes > 50_000 && bytes < 8_000_000,
  };
}

async function main() {
  for (const dir of [SRC_APPLE, SRC_GOOGLE, CAPTURES, OUT_APPLE, OUT_PLAY, OUT_META]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let appleSources = [];
  let googleSources = [];
  if (process.env.SKIP_DOWNLOAD !== '1') {
    appleSources = await downloadAppleSources();
    googleSources = await downloadGoogleSources();
  } else {
    appleSources = await Promise.all(
      SHOTS.map(async (s) => {
        const p = path.join(SRC_APPLE, s.source);
        const buf = fs.readFileSync(p);
        const meta = await sharp(p).metadata();
        return { file: s.source, source: 'cached', dimensions: `${meta.width}x${meta.height}`, sha256: sha256(buf) };
      })
    );
  }

  const session = await loginParent();
  const originalLocale = await getLocale(session.cookies);
  console.log(`Account ${PARENT_EMAIL} locale=${originalLocale} → en-GB for capture`);

  if (originalLocale !== 'en-GB') {
    await setFamilyLocale(session, 'en-GB');
  }

  const childSession = await loginChild(session.cookies, session.csrf);
  // Refresh parent user after locale switch (must carry preferred_locale=en-GB into captures)
  const parentMe = await apiFetch('/api/auth/me', { cookies: session.cookies });
  session.cookies = parentMe.cookies;
  session.user = { ...parentMe.json, preferred_locale: 'en-GB' };
  console.log('Capture locale:', session.user.preferred_locale || parentMe.json?.preferred_locale);

  let captureResults = [];
  try {
    captureResults = await captureAll(session, childSession);
  } finally {
    if (originalLocale !== 'en-GB') {
      await setFamilyLocale(session, originalLocale);
      console.log(`↩ restored family locale to ${originalLocale}`);
    }
  }

  const outputs = [];
  for (const shot of SHOTS) {
    if (!fs.existsSync(path.join(CAPTURES, `${shot.id}-capture.png`))) {
      console.warn(`⚠ skip composite ${shot.id} — no capture`);
      continue;
    }
    const built = await compositeShot(shot);
    const qa = await validateOutput(shot);
    outputs.push({ shot, built, qa });
    console.log(`✓ ${shot.id}-en-GB.png (${qa.out}, ${(qa.outBytes / 1024).toFixed(0)} KB)`);
  }

  const outFiles = outputs.map((o) => o.built.outApple);
  const contact = path.join(OUT_META, 'contact-sheet.png');
  const sideBySide = path.join(OUT_META, 'source-vs-en-GB.png');
  await buildContactSheet(outFiles, contact, 2);
  await buildSideBySide(sideBySide);

  const manifest = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    source_apple: appleSources,
    source_google: googleSources,
    captures: captureResults,
    shots: SHOTS.map((s) => ({
      id: s.id,
      view: s.view,
      marketing: s.marketing,
      marketing_i18n: 'MISSING_I18N (store marketing headlines — derived from Swedish originals + product voice)',
    })),
    outputs: await Promise.all(
      outFiles.map(async (f) => ({
        path: f,
        sha256: sha256(fs.readFileSync(f)),
        ...(await sharp(f).metadata()),
      }))
    ),
    qa: outputs.map((o) => o.qa),
    missing_i18n: [
      'store marketing headlines (8) — not in i18n JSON; English aligned to Swedish store originals',
      'child-seven-questions.js — hardcoded "Läs upp", "Avsluta aktivitet", "VAD?" (TEACCH now-card)',
      'user-created activity/reward names remain Swedish (family data, not i18n)',
    ],
    dimension_validation: outputs.every((o) => o.qa.sameDimensions && o.qa.validPng) ? 'PASS' : 'FAIL',
  };

  fs.writeFileSync(path.join(OUT_META, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nContact sheet:', contact);
  console.log('Side-by-side:', sideBySide);
  console.log('Dimension validation:', manifest.dimension_validation);

  const swedishLeaks = captureResults.filter((c) => c.swedishLeak);
  if (swedishLeaks.length) {
    console.warn('⚠ Possible Swedish UI in captures:', swedishLeaks.map((c) => c.id).join(', '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
