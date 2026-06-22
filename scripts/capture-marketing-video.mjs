#!/usr/bin/env node
/**
 * Mobile marketing walkthrough — Playwright screen recording (9:16).
 *
 * Modes (MARKETING_VIDEO_MODE):
 *   watchable    — ~45s, slower pacing, intro/outro, fewer beats (recommended)
 *   guided-short — ~30s, faster tour with tap hints
 *   full         — longer 50/50 tour without overlays
 *
 * Usage:
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
const MODE = process.env.MARKETING_VIDEO_MODE || 'watchable';
const WATCHABLE = MODE === 'watchable';
const GUIDED = MODE === 'guided-short' || WATCHABLE;

if (!BASE_URL) {
  console.error('Set BASE_URL env var');
  process.exit(1);
}
const REVIEW_EMAIL = process.env.REVIEW_EMAIL;
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD;
const CHILD_NAME = process.env.CHILD_NAME || 'Anna';
const CHILD_PIN = process.env.CHILD_PIN || '4455';

const PARENT_HUB_PAUSE_MS = Number(process.env.PARENT_HUB_PAUSE_MS || 5000);
const CHILD_WORLD_PAUSE_MS = Number(process.env.CHILD_WORLD_PAUSE_MS || 5000);
const GUIDED_HOLD_MS = Number(
  process.env.GUIDED_HOLD_MS || (WATCHABLE ? 4500 : 2000)
);
const GUIDED_PRE_CLICK_MS = Number(
  process.env.GUIDED_PRE_CLICK_MS || (WATCHABLE ? 2800 : 1000)
);
const INTRO_CARD_MS = Number(process.env.INTRO_CARD_MS || (WATCHABLE ? 3500 : 0));
const OUTRO_CARD_MS = Number(process.env.OUTRO_CARD_MS || (WATCHABLE ? 3500 : 0));
const TRANSITION_MS = Number(process.env.TRANSITION_MS || (WATCHABLE ? 2800 : 1500));
const MARKETING_APP_NAME = process.env.MARKETING_APP_NAME || 'Min app';
const MARKETING_OUTRO_CTA = process.env.MARKETING_OUTRO_CTA || (() => {
  try {
    return new URL(BASE_URL).hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
})();
const INCLUDE_ENTRY = process.env.INCLUDE_ENTRY === '1';

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

const GUIDED_PARENT_STEPS = [
  {
    href: '/dashboard',
    label: 'Hem',
    title: '🏠 Hem',
    why: 'Föräldern ser läget — barn, stjärnor och nästa steg.',
    navigateOnly: true,
  },
  {
    href: '/rewards',
    label: 'Belöningar',
    title: '🎁 Belöningar',
    why: 'Stjärnor och skattkammaren — motivation som faktiskt funkar.',
  },
  {
    href: '/family',
    label: 'Familj',
    title: '👨‍👩‍👧 Familj',
    why: 'Barn, vuxna och familjemuseum — allt samlat.',
  },
];

const GUIDED_CHILD_WORLDS = [
  {
    world: 'today',
    title: '☀️ Idag',
    why: 'Barnet ser dagens uppdrag — ett tydligt steg i taget.',
    afterLogin: true,
  },
  {
    world: 'world',
    title: '🏰 Min värld',
    why: 'Skattkammare, trofeer och belöningar — barnets egen värld.',
  },
];

/** Fewer beats = more time to read each caption (watchable mode). */
const WATCHABLE_PARENT_STEPS = [
  {
    href: '/dashboard',
    label: 'Hem',
    title: '🏠 Föräldern',
    why: 'Överblick över barnen, stjärnor och vad som händer idag.',
    navigateOnly: true,
  },
  {
    href: '/rewards',
    label: 'Belöningar',
    title: '🎁 Belöningar',
    why: 'Stjärnor som barnen faktiskt vill jobba för.',
  },
];

const WATCHABLE_CHILD_WORLDS = [
  {
    world: 'today',
    title: '☀️ Barnets dag',
    why: 'Uppdrag med delsteg — ett i taget, utan tjat.',
    afterLogin: true,
  },
  {
    world: 'world',
    title: '🏰 Min värld',
    why: 'Skattkammare och belöningar — barnets egna motivation.',
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function guideOverlayScript() {
  if (window.__mktGuide) return;
  const style = document.createElement('style');
  style.textContent = `
    #mkt-guide-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
    #mkt-guide-caption {
      position: absolute; left: 12px; right: 12px; bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      background: rgba(28, 35, 64, 0.94); color: #fff; border-radius: 16px; padding: 12px 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35); border: 1px solid rgba(245,166,35,0.45);
      font-family: system-ui, -apple-system, sans-serif; opacity: 0; transform: translateY(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #mkt-guide-caption.is-visible { opacity: 1; transform: translateY(0); }
    #mkt-guide-caption .mkt-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
    #mkt-guide-caption .mkt-why { font-size: 13px; line-height: 1.35; color: rgba(255,255,255,0.88); }
    #mkt-guide-caption .mkt-hint {
      margin-top: 8px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase;
      color: #F5A623; font-weight: 600;
    }
    .mkt-ripple {
      position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
      border: 3px solid #F5A623; box-shadow: 0 0 0 6px rgba(245,166,35,0.25);
      animation: mkt-pulse 0.9s ease-out infinite; pointer-events: none;
    }
    .mkt-ripple::after {
      content: ''; position: absolute; inset: 14px; border-radius: 50%; background: rgba(245,166,35,0.35);
    }
    @keyframes mkt-pulse {
      0% { transform: scale(0.9); opacity: 1; }
      100% { transform: scale(1.25); opacity: 0.15; }
    }
    #mkt-guide-titlecard {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(165deg, rgba(15,26,61,0.97) 0%, rgba(74,44,106,0.95) 55%, rgba(168,85,199,0.92) 100%);
      opacity: 0; transition: opacity 0.5s ease; padding: 28px; text-align: center;
    }
    #mkt-guide-titlecard.is-visible { opacity: 1; }
    #mkt-guide-titlecard .mkt-card-title {
      font-family: system-ui, -apple-system, sans-serif; font-weight: 800; font-size: 28px;
      color: #fff; line-height: 1.15; margin-bottom: 12px;
    }
    #mkt-guide-titlecard .mkt-card-sub {
      font-family: system-ui, -apple-system, sans-serif; font-size: 16px; line-height: 1.45;
      color: rgba(255,255,255,0.88); max-width: 300px; margin: 0 auto;
    }
    #mkt-guide-titlecard .mkt-card-cta {
      margin-top: 20px; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase;
      color: #F5A623; font-weight: 700;
    }
  `;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = 'mkt-guide-root';
  root.innerHTML =
    '<div id="mkt-guide-ripples"></div>' +
    '<div id="mkt-guide-titlecard" aria-hidden="true">' +
    '<div><div class="mkt-card-title"></div><div class="mkt-card-sub"></div><div class="mkt-card-cta"></div></div></div>' +
    '<div id="mkt-guide-caption" aria-live="polite">' +
    '<div class="mkt-title"></div><div class="mkt-why"></div><div class="mkt-hint">Tryck här →</div></div>';
  document.documentElement.appendChild(root);

  function ripples() {
    return document.getElementById('mkt-guide-ripples');
  }

  window.__mktGuide = {
    show(title, why, hint) {
      const card = document.getElementById('mkt-guide-titlecard');
      if (card) card.classList.remove('is-visible');
      const cap = document.getElementById('mkt-guide-caption');
      if (!cap) return;
      cap.querySelector('.mkt-title').textContent = title || '';
      cap.querySelector('.mkt-why').textContent = why || '';
      const hintEl = cap.querySelector('.mkt-hint');
      if (hintEl) {
        hintEl.textContent = hint || 'Tryck här →';
        hintEl.style.display = hint === '' ? 'none' : '';
      }
      cap.classList.add('is-visible');
    },
    hide() {
      const cap = document.getElementById('mkt-guide-caption');
      if (cap) cap.classList.remove('is-visible');
      const card = document.getElementById('mkt-guide-titlecard');
      if (card) card.classList.remove('is-visible');
      const r = ripples();
      if (r) r.innerHTML = '';
    },
    showCard(title, subtitle, cta) {
      const cap = document.getElementById('mkt-guide-caption');
      if (cap) cap.classList.remove('is-visible');
      const r = ripples();
      if (r) r.innerHTML = '';
      const card = document.getElementById('mkt-guide-titlecard');
      if (!card) return;
      card.querySelector('.mkt-card-title').textContent = title || '';
      card.querySelector('.mkt-card-sub').textContent = subtitle || '';
      const ctaEl = card.querySelector('.mkt-card-cta');
      if (ctaEl) {
        ctaEl.textContent = cta || '';
        ctaEl.style.display = cta ? '' : 'none';
      }
      card.classList.add('is-visible');
    },
    rippleAt(x, y) {
      const r = ripples();
      if (!r) return;
      r.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'mkt-ripple';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      r.appendChild(el);
    },
    clearRipple() {
      const r = ripples();
      if (r) r.innerHTML = '';
    },
  };
}

function nativeInitScript() {
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    Plugins: {},
  };
  try {
    localStorage.setItem('stjarndag_parent_ui_view', 'magic');
    localStorage.setItem('dash_tour_v1_done', '1');
  } catch (_) {}
  guideOverlayScript();
}

async function acceptCookies(page) {
  const btn = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await btn.click();
    await sleep(400);
  }
}

async function ensureGuide(page) {
  await page.evaluate(guideOverlayScript);
}

async function showGuide(page, title, why, hint) {
  await ensureGuide(page);
  await page.evaluate(
    ({ title, why, hint }) => {
      window.__mktGuide.show(title, why, hint);
      window.__mktGuide.clearRipple();
    },
    { title, why, hint: hint ?? '' }
  );
}

async function hideGuide(page) {
  await page.evaluate(() => {
    if (window.__mktGuide) window.__mktGuide.hide();
  });
}

async function rippleOnLocator(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(
    ({ x, y }) => window.__mktGuide.rippleAt(x, y),
    { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  );
}

async function guidedTap(page, locator, { title, why, hint, preMs, holdMs, force }) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await showGuide(page, title, why, hint ?? 'Tryck här →');
  await rippleOnLocator(page, locator);
  await sleep(preMs ?? GUIDED_PRE_CLICK_MS);
  await locator.click({ force: !!force });
  await sleep(holdMs ?? GUIDED_HOLD_MS);
}

async function showTitleCard(page, title, subtitle, cta) {
  await ensureGuide(page);
  await page.evaluate(
    ({ title, subtitle, cta }) => window.__mktGuide.showCard(title, subtitle, cta),
    { title, subtitle, cta: cta || '' }
  );
}

async function titleBeat(page, title, subtitle, cta, ms) {
  await showTitleCard(page, title, subtitle, cta);
  await sleep(ms);
  await hideGuide(page);
  await sleep(400);
}

async function guidedPause(page, { title, why, hint, ms }) {
  await showGuide(page, title, why, hint ?? '');
  await sleep(ms ?? GUIDED_HOLD_MS);
}

async function loginParentApi(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
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
  await sleep(500);
}

async function ensureParentMagic(page) {
  const ok = await page.evaluate(async () => {
    try {
      localStorage.setItem('stjarndag_parent_ui_view', 'magic');
    } catch (_) {}
    if (window.AppViewMode) {
      if (typeof AppViewMode.initParent === 'function' && !AppViewMode.isReady()) {
        await AppViewMode.initParent();
      }
      if (AppViewMode.isAllowed && AppViewMode.isAllowed()) {
        AppViewMode.setMode('magic', { force: true });
      }
    }
    if (window.ParentMagicShell && typeof ParentMagicShell.refresh === 'function') {
      try {
        ParentMagicShell.refresh();
      } catch (_) {}
    }
    return document.body.classList.contains('parent-magic-view');
  });
  if (!ok) {
    const magicBtn = page.locator('[data-app-view-toggle] [data-view="magic"]');
    if (await magicBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await magicBtn.click();
      await sleep(600);
    }
  }
  await page
    .waitForFunction(() => document.body.classList.contains('parent-magic-view'), {
      timeout: 15000,
    })
    .catch(() => {});
}

async function dismissDashboardTour(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('dash_tour_v1_done', '1');
    } catch (_) {}
    const overlay = document.getElementById('dashTourOverlay');
    if (overlay) overlay.classList.add('hidden');
  });
  const skip = page.locator('#tourSkipBtn');
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.click();
    await sleep(300);
  }
}

async function csrfHeaders(page) {
  return page.evaluate(async () => {
    let csrf = '';
    if (window.Auth) {
      if (typeof Auth.ensureCsrfToken === 'function') await Auth.ensureCsrfToken();
      if (typeof Auth.getCsrfToken === 'function') csrf = Auth.getCsrfToken() || '';
    }
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return headers;
  });
}

async function prepareChildMagicInDb(page) {
  const headers = await csrfHeaders(page);
  const childId = await page.evaluate(
    async ({ childName, headers: hdrs }) => {
      const res = await fetch('/api/children', { credentials: 'include' });
      if (!res.ok) return null;
      const kids = await res.json();
      const wanted = childName.toLowerCase();
      const child =
        kids.find((k) => (k.name || '').toLowerCase() === wanted) ||
        kids.find((k) => (k.name || '').toLowerCase().includes(wanted)) ||
        kids[0];
      if (!child) return null;
      await fetch('/api/children/' + child.id + '/view-config', {
        method: 'PATCH',
        credentials: 'include',
        headers: hdrs,
        body: JSON.stringify({ view_mode: 'new' }),
      });
      try {
        localStorage.setItem('stjarndag_child_ui_view_' + child.id, 'magic');
      } catch (_) {}
      return child.id;
    },
    { childName: CHILD_NAME, headers }
  );
  if (!childId) throw new Error(`Could not find child ${CHILD_NAME} for magic view`);
  return childId;
}

async function tapNavTab(page, href) {
  const link = page.locator(`.native-tab-bar a.tab-item[data-tab-href="${href}"]`);
  if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
    return link;
  }
  await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForParentShell(page);
  await ensureParentMagic(page);
  return page.locator(`.native-tab-bar a.tab-item[data-tab-href="${href}"]`).first();
}

async function sceneGuidedShort(page, childId) {
  const parentSteps = WATCHABLE ? WATCHABLE_PARENT_STEPS : GUIDED_PARENT_STEPS;
  const childSteps = WATCHABLE ? WATCHABLE_CHILD_WORLDS : GUIDED_CHILD_WORLDS;
  console.log(`  → Guided ${WATCHABLE ? 'watchable' : 'short'} (magic + tap hints)`);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForParentShell(page);
  await ensureParentMagic(page);
  await dismissDashboardTour(page);

  if (INTRO_CARD_MS > 0) {
    await titleBeat(
      page,
      MARKETING_APP_NAME,
      'Tydliga rutiner och stjärnor — för hela familjen.',
      'Så funkar appen',
      INTRO_CARD_MS
    );
  }

  for (const step of parentSteps) {
    if (step.href !== '/dashboard') {
      const tab = await tapNavTab(page, step.href);
      await guidedTap(page, tab, {
        title: step.title,
        why: step.why,
      });
    } else {
      await guidedPause(page, {
        title: step.title,
        why: step.why,
        hint: 'Förälderns startvy',
        ms: GUIDED_HOLD_MS,
      });
    }
    console.log(`     · parent ${step.label}`);
  }

  await guidedPause(page, {
    title: WATCHABLE ? '👧 Nu barnet' : '👧 Barnets tur',
    why: WATCHABLE
      ? 'Samma app — men enkelt och tryggt för barn.'
      : 'Samma app — men enklare navigation för barn.',
    hint: '',
    ms: TRANSITION_MS,
  });

  await page.goto(`${BASE_URL}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await sleep(800);

  const childCard = page.locator('.cl-child-card').filter({
    hasText: new RegExp(CHILD_NAME, 'i'),
  });
  const card = (await childCard.count()) > 0 ? childCard.first() : page.locator('.cl-child-card').first();

  await guidedTap(page, card, {
    title: `👋 Välj ${CHILD_NAME}`,
    why: 'Barnet känner igen sin profil — inga konstiga menyer.',
    hint: 'Tryck på profilen',
  });

  await page.waitForSelector('#clKeypad', { timeout: 15000 });
  await showGuide(
    page,
    '🔢 PIN',
    WATCHABLE
      ? 'Barnet loggar in själv — utan att se vuxeninloggning.'
      : 'Enkel kod — barnet kommer in utan vuxeninloggning.',
    WATCHABLE ? '' : 'Skriv PIN'
  );
  await sleep(WATCHABLE ? 2200 : 1000);

  for (const digit of CHILD_PIN.split('')) {
    const btn = page
      .locator(`#clKeypad button[data-action="${digit}"], #clKeypad button:has-text("${digit}")`)
      .first();
    if (!WATCHABLE) await rippleOnLocator(page, btn);
    await btn.click();
    await sleep(WATCHABLE ? 180 : 100);
  }
  await sleep(WATCHABLE ? 1200 : 800);

  await page.waitForURL(/\/child(\/today|\/world|\/family|-dashboard)/, { timeout: 45000 });
  await ensureChildMagic(page, childId);
  await sleep(600);

  for (const step of childSteps) {
    if (step.afterLogin) {
      await guidedPause(page, {
        title: step.title,
        why: step.why,
        hint: 'Barnets bottenmeny',
        ms: GUIDED_HOLD_MS,
      });
    } else {
      const btn = page.locator(`[data-child-world="${step.world}"]`).first();
      await guidedTap(page, btn, {
        title: step.title,
        why: step.why,
      });
    }
    console.log(`     · child ${step.world}`);
  }

  if (OUTRO_CARD_MS > 0) {
    await titleBeat(
      page,
      'Kommer snart ✨',
      'Följ oss för fler uppdateringar — eller skriv upp dig på väntelistan.',
      MARKETING_OUTRO_CTA,
      OUTRO_CARD_MS
    );
  } else {
    await hideGuide(page);
    await sleep(600);
  }
}

async function ensureChildMagic(page, childId) {
  await page.evaluate((id) => {
    try {
      if (id) localStorage.setItem('stjarndag_child_ui_view_' + id, 'magic');
    } catch (_) {}
  }, childId);

  const apply = () =>
    page.evaluate(() => {
      if (window.AppViewMode && AppViewMode.isAllowed && AppViewMode.isAllowed()) {
        AppViewMode.setMode('magic', { force: true });
      }
      if (typeof applyChildViewMode === 'function') applyChildViewMode();
    });

  const magicBtn = page.locator('[data-app-view-toggle] [data-view="magic"]');
  if (await magicBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await magicBtn.click();
    await sleep(700);
  }
  await apply();

  const magicOk = await page
    .waitForFunction(
      () =>
        document.body.classList.contains('child-magic-view') &&
        document.getElementById('childBottomNav') &&
        document.querySelector('[data-child-world]'),
      { timeout: 8000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!magicOk) {
    await page.goto(`${BASE_URL}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1200);
    if (await magicBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await magicBtn.click();
      await sleep(700);
    }
    await apply();
    await page
      .waitForFunction(
        () =>
          document.body.classList.contains('child-magic-view') &&
          document.querySelector('[data-child-world]'),
        { timeout: 15000 }
      )
      .catch(() => {});
  }
}

async function sceneParentMagicNav(page) {
  console.log('  → Parent magic nav');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForParentShell(page);
  await ensureParentMagic(page);
  await dismissDashboardTour(page);
  await sleep(1200);

  const tabs = await page.evaluate(() => {
    if (!window.NavConfig) return [];
    return (window.NavConfig.PRIMARY_NAV || []).map((t) => ({
      href: t.href,
      label: t.label,
    }));
  });

  const order = (tabs.length ? tabs : [
    { href: '/dashboard', label: 'Hem' },
    { href: '/planning', label: 'Planering' },
    { href: '/rewards', label: 'Belöningar' },
    { href: '/family', label: 'Familj' },
  ]).filter((t) => t.href !== '/for-dig');

  for (const tab of order) {
    const link = page.locator(`.native-tab-bar a.tab-item[data-tab-href="${tab.href}"]`);
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
    } else {
      await page.goto(`${BASE_URL}${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForParentShell(page);
      await ensureParentMagic(page);
    }
    await sleep(PARENT_HUB_PAUSE_MS);
    console.log(`     · ${tab.label}`);
  }
}

async function enterChildPin(page) {
  await page.goto(`${BASE_URL}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await sleep(1200);

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
    await sleep(600);
  }

  for (const digit of CHILD_PIN.split('')) {
    const btn = page
      .locator(`#clKeypad button[data-action="${digit}"], #clKeypad button:has-text("${digit}")`)
      .first();
    await btn.click();
    await sleep(120);
  }
  await sleep(1000);
}

async function sceneChildMagicWorlds(page, childId) {
  console.log('  → Child magic worlds');
  await enterChildPin(page);
  await page.waitForURL(/\/child(\/today|\/world|\/family|-dashboard)/, { timeout: 45000 });
  await sleep(1500);
  await ensureChildMagic(page, childId);

  for (const world of ['today', 'world', 'family']) {
    const btn = page.locator(`[data-child-world="${world}"]`).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await sleep(CHILD_WORLD_PAUSE_MS);
      console.log(`     · ${world}`);
    } else {
      const p = world === 'today' ? '/child/today' : `/child/${world}`;
      await page.goto(`${BASE_URL}${p}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await ensureChildMagic(page, childId);
      await sleep(CHILD_WORLD_PAUSE_MS);
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
  const suffix =
    process.env.VIDEO_SUFFIX ||
    (WATCHABLE ? 'watchable' : GUIDED ? 'guided-short' : 'magic-50-50');
  const webmOut = path.join(OUT_DIR, `app-mobile-walkthrough-${suffix}-${stamp}.webm`);
  const mp4Out = path.join(OUT_DIR, `app-mobile-walkthrough-${suffix}-${stamp}.mp4`);

  console.log(`Recording from ${BASE_URL}`);
  console.log(`Mode: ${MODE} → ${mp4Out}`);

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
  let childId = null;

  try {
    await loginParentApi(page);
    childId = await prepareChildMagicInDb(page);

    if (GUIDED) {
      await sceneGuidedShort(page, childId);
    } else {
      if (INCLUDE_ENTRY) {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await acceptCookies(page);
      }
      await sceneParentMagicNav(page);
      await sceneChildMagicWorlds(page, childId);
      await sleep(1200);
    }
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
  const dur = spawnSync(
    'ffprobe',
    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4Out],
    { encoding: 'utf8' }
  );
  console.log(`\n✓ MP4: ${mp4Out} (${(stats.size / 1024 / 1024).toFixed(1)} MB, ${parseFloat(dur.stdout || '0').toFixed(1)}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
