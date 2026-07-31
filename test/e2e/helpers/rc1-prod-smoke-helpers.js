'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const SWEDISH_SERVER_LEAK = /Ogiltiga värden|Namn krävs|PIN-koden måste|Användarnamn krävs/i;

function smokeConfig() {
  const baseUrl = (process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL || '').replace(/\/$/, '');
  return {
    baseUrl,
    expectedSha: process.env.RC1_EXPECTED_SHA || 'd369dd5726fed42f303b93083ed8842cce49aba3',
    expectedCache: process.env.RC1_EXPECTED_CACHE || 'stjarndag-v748',
    email: process.env.RC1_REVIEW_EMAIL,
    password: process.env.RC1_REVIEW_PASSWORD,
    childUsername: process.env.RC1_CHILD_USERNAME,
    childPin: process.env.RC1_CHILD_PIN,
    parentPin: process.env.RC1_PARENT_PIN || null,
    restoreLocale: process.env.RC1_RESTORE_LOCALE || 'sv-SE',
  };
}

function artifactsDir(testName) {
  const safe = String(testName).replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
  const dir = path.join(
    process.cwd(),
    'artifacts',
    'rc1-prod-smoke',
    new Date().toISOString().replace(/[:.]/g, '-'),
    safe
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function captureFailureDiagnostics(page, testName, extra = {}) {
  const dir = artifactsDir(testName);
  const diag = page._rc1Diagnostics || {};
  const summary = {
    testName,
    url: '',
    title: '',
    locale: null,
    sessionKind: 'unknown',
    consoleErrors: diag.consoleErrors || [],
    pageErrors: diag.pageErrors || [],
    failedRequests: diag.failedRequests || [],
    ...extra,
  };

  try {
    summary.url = page.url();
    summary.title = await page.title();
    summary.locale = await page.evaluate(() => ({
      htmlLang: document.documentElement.lang,
      i18n: window.I18n && I18n.getCurrentLang ? I18n.getCurrentLang() : null,
      childUi: typeof window.getChildUiLocale === 'function' ? window.getChildUiLocale() : null,
    }));
    summary.sessionKind = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (!r.ok) return 'anonymous';
        const me = await r.json();
        if (me.username && !me.email) return 'child';
        if (me.email) return 'parent';
        return 'unknown';
      } catch {
        return 'anonymous';
      }
    });
    summary.navLabels = await page.evaluate(() => {
      const labels = [];
      document.querySelectorAll('.native-tab-bar .tab-label, #parentBottomNav .tab-label').forEach((el) => {
        const t = (el.textContent || '').trim();
        if (t) labels.push(t);
      });
      return labels;
    });
    if (extra.expectedSha || extra.actualSha || extra.expectedCache || extra.actualCache) {
      summary.releaseIdentity = {
        expectedSha: extra.expectedSha,
        actualSha: extra.actualSha,
        expectedCache: extra.expectedCache,
        actualCache: extra.actualCache,
      };
    }

    await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true });
    const html = await page.content();
    fs.writeFileSync(path.join(dir, 'page.html'), html.slice(0, 500000), 'utf8');
    fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  } catch (err) {
    fs.writeFileSync(path.join(dir, 'capture-error.txt'), String(err.message || err), 'utf8');
  }
  return dir;
}

async function withDiagnostics(page, testName, fn, extra = {}) {
  try {
    await fn();
  } catch (err) {
    const dir = await captureFailureDiagnostics(page, testName, extra);
    err.message = `${err.message}\n[rc1-smoke artifacts: ${dir}]`;
    throw err;
  }
}

async function newIsolatedPage(browser, viewportName = 'desktop') {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const { VIEWPORTS } = require('./puppeteer-browser');
  const vp = VIEWPORTS[viewportName] || VIEWPORTS.desktop;
  await page.setViewport(vp);
  page.setDefaultTimeout(Number(process.env.E2E_TIMEOUT_MS || 45000));
  page.setDefaultNavigationTimeout(Number(process.env.E2E_NAV_TIMEOUT_MS || 60000));

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });
  page._rc1Diagnostics = { consoleErrors, pageErrors, failedRequests };

  async function close() {
    await context.close();
  }
  return { page, context, close };
}

async function fetchReleaseIdentity(baseUrl, expectedSha, expectedCache) {
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'healthy');
  assert.equal(health.git_sha, expectedSha, 'health git_sha mismatch');

  const swRes = await fetch(`${baseUrl}/sw.js`);
  assert.equal(swRes.status, 200);
  const swText = await swRes.text();
  const m = swText.match(/const CACHE_NAME = '(stjarndag-v\d+)'/);
  assert.ok(m, 'CACHE_NAME missing in sw.js');
  assert.equal(m[1], expectedCache, 'active CACHE_NAME mismatch');

  const childI18nRes = await fetch(`${baseUrl}/js/child-app-i18n.js`);
  assert.equal(childI18nRes.status, 200);
  const childI18nSrc = await childI18nRes.text();
  assert.match(childI18nSrc, /childLoginErrorFromResponse/);
  assert.doesNotMatch(childI18nSrc, /return data\.error \|\|/);

  return { health, cacheName: m[1] };
}

async function loginParent(page, baseUrl, seed, locale) {
  const {
    acceptCookies,
    waitForAuthEntryReady,
    selectLoginLocale,
    fillParentLogin,
    submitParentLogin,
  } = require('./puppeteer-browser');

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  await waitForAuthEntryReady(page);
  if (locale) await selectLoginLocale(page, locale);
  await fillParentLogin(page, seed.email, seed.password);
  await submitParentLogin(page);

  await page.waitForFunction(() => {
    return window.Auth && typeof Auth.getCsrfToken === 'function' && Boolean(Auth.getCsrfToken());
  }, { timeout: 20000 });

  const me = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return { ok: false, status: r.status };
    const body = await r.json();
    return { ok: true, email: body.email, hasChildUsername: Boolean(body.username) };
  });
  assert.equal(me.ok, true, `parent /api/auth/me failed: ${me.status}`);
  assert.ok(me.email, 'expected parent email on /api/auth/me');
  assert.equal(me.hasChildUsername, false, 'parent session must not be child');
}

async function waitForPackageAccessResolved(page) {
  await page.waitForFunction(async () => {
    try {
      if (window.fetchPackageAccess) {
        const access = await window.fetchPackageAccess();
        return access && access.components && Object.prototype.hasOwnProperty.call(access.components, 'reporting');
      }
      return window._packageAccess
        && window._packageAccess.components
        && Object.prototype.hasOwnProperty.call(window._packageAccess.components, 'reporting');
    } catch {
      return false;
    }
  }, { timeout: 45000 });
  return page.evaluate(async () => {
    const access = window._packageAccess
      || (window.fetchPackageAccess ? await window.fetchPackageAccess() : null);
    const features = window._stjarndagFeatures || {};
    return {
      reportingHas: !!(access && access.components && access.components.reporting && access.components.reporting.has),
      kliniskFeature: features.klinisk_rapportering === true,
      access,
    };
  });
}

async function collectVisibleReportsTargets(page) {
  return page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      return true;
    }
    function isFocusableClickable(el) {
      if (!isVisible(el)) return false;
      const tabIndex = el.tabIndex;
      if (tabIndex < 0 && el.getAttribute('tabindex') === '-1') return false;
      return true;
    }
    const out = [];
    const selectors = [
      'a[href="/reports"]',
      'a[href*="/reports?"]',
      '[data-component="reporting"]',
      '#activeSharingBanner',
      '[data-parent-magic-nav] a[href*="reports"]',
      '.native-tab-bar a[href*="reports"]',
      '#parentBottomNav a[href*="reports"]',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        if (!isVisible(el)) return;
        out.push({
          selector: sel,
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 60),
          focusable: isFocusableClickable(el),
        });
      });
    }
    return out;
  });
}

async function assertParentSession(page) {
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return { ok: false, status: r.status };
    const body = await r.json();
    return {
      ok: true,
      email: body.email,
      type: body.type,
      hasChildUsername: Boolean(body.username && !body.email),
      preferredLocale: body.preferred_locale,
      englishChild: body.english_child_experience_enabled,
    };
  });
  assert.equal(me.ok, true, `parent /api/auth/me failed: ${me.status}`);
  assert.ok(me.email, 'expected parent email on /api/auth/me');
  assert.equal(me.hasChildUsername, false, 'session must be parent, not child');
  return me;
}

async function assertChildSession(page) {
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return { ok: false, status: r.status };
    const body = await r.json();
    return {
      ok: true,
      username: body.username,
      type: body.type,
      hasEmail: Boolean(body.email),
    };
  });
  assert.equal(me.ok, true, `child /api/auth/me failed: ${me.status}`);
  assert.ok(me.username, 'expected child username on /api/auth/me');
  assert.equal(me.hasEmail, false, 'child session must not expose parent email');
  return me;
}

async function waitForChildI18nReady(page) {
  await page.waitForFunction(() => {
    return document.documentElement.getAttribute('data-child-i18n-ready') === '1'
      || (typeof window.getChildUiLocale === 'function' && typeof window.cpt === 'function');
  }, { timeout: 30000 });
  await page.evaluate(() => new Promise((resolve) => {
    if (document.documentElement.getAttribute('data-child-i18n-ready') === '1') {
      resolve();
      return;
    }
    document.addEventListener('child-i18n-ready', () => resolve(), { once: true });
    setTimeout(resolve, 500);
  }));
}

async function assertPrimaryNavEnglish(page) {
  await page.waitForFunction(() => {
    const labels = [];
    document.querySelectorAll('.native-tab-bar .tab-label, #parentBottomNav .tab-label, #sidebar a').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (t) labels.push(t);
    });
    if (labels.length < 2) return false;
    const joined = labels.join('|');
    return /Home|Planning|Rewards|Family|For you|Schedule/i.test(joined);
  }, { timeout: 20000 });
  const labels = await page.evaluate(() => {
    return [...document.querySelectorAll('.native-tab-bar .tab-label, #parentBottomNav .tab-label, #sidebar a')]
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean);
  });
  const joined = labels.join(' ');
  assert.doesNotMatch(joined, /\bHem\b|\bPlanering\b|\bBelöningar\b|\bFamilj\b/, `Swedish primary nav labels: ${joined}`);
}

async function assertEnglishAppEnabled(page) {
  const state = await page.evaluate(async () => {
    const r = await fetch('/api/family/locale-options', { credentials: 'include' });
    if (!r.ok) return { ok: false, status: r.status };
    const opts = await r.json();
    return { ok: opts.english_app_enabled === true, opts };
  });
  assert.equal(state.ok, true, `english_app_enabled (locale-options: ${JSON.stringify(state)})`);
}

async function ensureFamilyLocale(page, baseUrl, locale) {
  const current = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return null;
    const me = await r.json();
    return me.preferred_locale;
  });
  if (current === locale) return;
  await openSettingsFamilyLocale(page, baseUrl);
  await selectSettingsLocaleWithEvent(page, locale);
}

async function selectSettingsLocaleWithEvent(page, locale) {
  const selector = `[data-locale-switcher-mount] [data-locale-value="${locale}"]`;
  const fallback = `[data-locale-value="${locale}"]`;
  const hasScoped = await page.$(selector);
  const target = hasScoped ? selector : fallback;
  await page.waitForSelector(target, { visible: true, timeout: 30000 });
  await page.evaluate((sel) => {
    const btn = document.querySelector(sel);
    if (btn) btn.click();
  }, target);
  await new Promise((r) => setTimeout(r, 1200));
  await page.waitForFunction(
    async (loc) => {
      if (window.I18n && typeof I18n.getCurrentLang === 'function' && I18n.getCurrentLang() === loc) {
        return true;
      }
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      if (!r.ok) return false;
      const me = await r.json();
      return me.preferred_locale === loc;
    },
    { timeout: 45000 },
    locale
  );
}

async function assertReportsRouteBlocked(page, baseUrl) {
  await page.goto(`${baseUrl}/reports`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => !/\/reports\/?$/.test(window.location.pathname.replace(/\/$/, ''))
      || /component=reporting|upgrade|access|subscription|paywall/i.test(window.location.href),
    { timeout: 20000 }
  );
}

async function openSettingsFamilyLocale(page, baseUrl) {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.waitForFunction(() => {
    return document.body.classList.contains('parent-magic-page-settings')
      || document.querySelector('[data-locale-switcher-mount]');
  }, { timeout: 30000 });

  const inMagicMenu = await page.evaluate(() => (
    document.body.classList.contains('parent-magic-page-settings')
  ));
  if (inMagicMenu) {
    await page.evaluate(() => {
      if (window.ParentMagicPageHub) {
        if (typeof ParentMagicPageHub.tagSettingsSections === 'function') {
          ParentMagicPageHub.tagSettingsSections();
        }
        if (typeof ParentMagicPageHub.showSettingsGroup === 'function') {
          ParentMagicPageHub.showSettingsGroup('family');
        }
      }
    });
    await new Promise((r) => setTimeout(r, 800));
  } else {
    await page.evaluate(() => {
      if (window.ParentMagicPageHub && typeof ParentMagicPageHub.showSettingsGroup === 'function') {
        ParentMagicPageHub.showSettingsGroup('family');
      }
    });
  }

  await page.evaluate(async () => {
    const mount = document.querySelector('[data-magic-settings-content="family"] [data-locale-switcher-mount]')
      || document.querySelector('[data-locale-switcher-mount]');
    if (mount && window.LocaleSwitcher && typeof LocaleSwitcher.mount === 'function') {
      await LocaleSwitcher.mount(mount);
    } else if (window.LocaleSwitcher && typeof LocaleSwitcher.autoMount === 'function') {
      LocaleSwitcher.autoMount();
    }
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-locale-switcher-mount] [data-locale-value="en-GB"]')
      || document.querySelector('[data-locale-value="en-GB"]');
    return btn && btn.offsetParent !== null && !btn.disabled && !btn.hidden;
  }, { timeout: 45000 });
}

async function fetchWithSessionRetry(page, url, { maxAttempts = 4 } = {}) {
  return page.evaluate(async (u, attempts) => {
    for (let i = 0; i < attempts; i += 1) {
      const r = await fetch(u, { credentials: 'include' });
      if (r.status === 429 && i < attempts - 1) {
        await new Promise((res) => setTimeout(res, 1200 * (i + 1)));
        continue;
      }
      let body = {};
      try {
        body = await r.json();
      } catch {
        body = {};
      }
      return { status: r.status, body };
    }
    return { status: 429, body: {} };
  }, url, maxAttempts);
}

async function fetchLoginPickerContext(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/login-picker-children', { credentials: 'include' });
    return r.ok ? await r.json() : { hasSession: false };
  });
}

async function assertRc1ChildLocaleContract(page) {
  const picker = await fetchLoginPickerContext(page);
  assert.equal(picker.hasSession, true, 'parent session required for child locale contract');
  assert.equal(
    picker.english_child_experience_enabled,
    true,
    'RC-1 prod smoke requires english_child_experience_enabled on review family (release config)'
  );
  const { resolveChildUiLocale } = require('../../../src/lib/child-ui-locale');
  const expected = resolveChildUiLocale(picker.preferred_locale, picker.english_child_experience_enabled);
  assert.equal(
    picker.child_ui_locale,
    expected,
    'login-picker child_ui_locale must match server resolver'
  );
  assert.equal(
    expected,
    'en-GB',
    'RC-1 expects review family preferred_locale en-GB with english_child_experience ON'
  );
  return picker;
}

async function enterParentAppPin(page, pin) {
  await page.waitForSelector('#ppin-gate-overlay, #ppin-overlay', { visible: true, timeout: 20000 });
  const digits = String(pin).split('');
  for (const digit of digits) {
    await page.evaluate((d) => {
      const overlay = document.getElementById('ppin-gate-overlay') || document.getElementById('ppin-overlay');
      if (!overlay) return;
      const kbd = overlay.querySelector('#ppgo-keypad, #ppin-keypad');
      if (!kbd) return;
      const buttons = [...kbd.querySelectorAll('button')];
      const btn = buttons.find((b) => (b.textContent || '').trim() === d);
      if (btn) btn.click();
    }, digit);
    await new Promise((r) => setTimeout(r, 80));
  }
  await page.evaluate(() => {
    const overlay = document.getElementById('ppin-gate-overlay') || document.getElementById('ppin-overlay');
    if (!overlay) return;
    const kbd = overlay.querySelector('#ppgo-keypad, #ppin-keypad');
    if (!kbd) return;
    const submit = [...kbd.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '✓');
    if (submit) submit.click();
  });
  await page.waitForFunction(
    () => !document.getElementById('ppin-gate-overlay') && !document.getElementById('ppin-overlay'),
    { timeout: 30000 }
  );
}

module.exports = {
  SWEDISH_SERVER_LEAK,
  smokeConfig,
  withDiagnostics,
  newIsolatedPage,
  fetchReleaseIdentity,
  loginParent,
  waitForPackageAccessResolved,
  collectVisibleReportsTargets,
  waitForChildI18nReady,
  assertPrimaryNavEnglish,
  assertParentSession,
  assertChildSession,
  assertRc1ChildLocaleContract,
  fetchWithSessionRetry,
  fetchLoginPickerContext,
  ensureFamilyLocale,
  assertEnglishAppEnabled,
  selectSettingsLocaleWithEvent,
  assertReportsRouteBlocked,
  openSettingsFamilyLocale,
  enterParentAppPin,
  captureFailureDiagnostics,
};
