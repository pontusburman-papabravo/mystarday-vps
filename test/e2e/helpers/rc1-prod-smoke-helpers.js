'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { executeWithPrimaryAndCleanup } = require('../../helpers/rc1-scope-errors');
const { performParentChildHandoff } = require('./rc1-prod-smoke-handoff');

const SWEDISH_SERVER_LEAK = /Ogiltiga värden|Namn krävs|PIN-koden måste|Användarnamn krävs/i;

function smokeConfig() {
  const baseUrl = (process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL || '').replace(/\/$/, '');
  const requireHandoff = process.env.RC1_REQUIRE_HANDOFF !== 'false'
    && process.env.RC1_REQUIRE_HANDOFF !== '0';
  return {
    baseUrl,
    expectedSha: process.env.RC1_EXPECTED_SHA || 'd369dd5726fed42f303b93083ed8842cce49aba3',
    expectedCache: process.env.RC1_EXPECTED_CACHE || 'stjarndag-v748',
    email: process.env.RC1_REVIEW_EMAIL,
    password: process.env.RC1_REVIEW_PASSWORD,
    childUsername: process.env.RC1_CHILD_USERNAME,
    childPin: process.env.RC1_CHILD_PIN,
    parentPin: process.env.RC1_PARENT_PIN || null,
    requireHandoff,
    restoreLocaleOverride: process.env.RC1_RESTORE_LOCALE || null,
  };
}

function localeAuditPath() {
  const dir = path.join(process.cwd(), 'artifacts', 'rc1-prod-smoke');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'locale-audit.jsonl');
}

function rc1Sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rc1TestGapMs() {
  return Number(process.env.RC1_TEST_GAP_MS || 20000);
}

async function enableRc1RequestEconomy(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (
      /google-analytics\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com/i.test(url)
    ) {
      req.abort();
      return;
    }
    req.continue();
  });
}

function logLocaleAudit(entry) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  fs.appendFileSync(localeAuditPath(), `${line}\n`, 'utf8');
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
    if (extra.handoffDiagnostics || page._rc1HandoffDiagnostics) {
      summary.handoffStateMachine = extra.handoffDiagnostics || page._rc1HandoffDiagnostics;
    }
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
  await enableRc1RequestEconomy(page);

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

async function readPreferredLocaleFromApi(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return null;
    const me = await r.json();
    return me.preferred_locale || null;
  });
}

async function selectSettingsLocaleWithEvent(page, locale) {
  const currentApi = await readPreferredLocaleFromApi(page);
  const currentI18n = await page.evaluate(() => (
    window.I18n && typeof I18n.getCurrentLang === 'function' ? I18n.getCurrentLang() : null
  ));
  if (currentApi === locale && currentI18n === locale) {
    return;
  }

  const selector = `[data-locale-switcher-mount] [data-locale-value="${locale}"]`;
  const fallback = `[data-locale-value="${locale}"]`;
  const hasScoped = await page.$(selector);
  const target = hasScoped ? selector : fallback;
  await page.waitForSelector(target, { visible: true, timeout: 30000 });

  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-locale-switcher-mount] [data-locale-value="en-GB"], [data-locale-value="en-GB"]');
    return btn && !btn.disabled;
  }, { timeout: 15000 });

  await page.click(target);
  await page.waitForFunction(
    async (loc) => {
      const pressed = document.querySelector(`[data-locale-value="${loc}"]`);
      if (pressed && pressed.getAttribute('aria-pressed') === 'true') {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (r.ok) {
          const me = await r.json();
          if (me.preferred_locale === loc) return true;
        }
      }
      if (window.I18n && typeof I18n.getCurrentLang === 'function' && I18n.getCurrentLang() === loc) {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (!r.ok) return false;
        const me = await r.json();
        return me.preferred_locale === loc;
      }
      return false;
    },
    { timeout: 60000 },
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
  await rc1Sleep(2500);
  await page.waitForFunction(() => {
    return document.body.classList.contains('parent-magic-page-settings')
      || document.querySelector('[data-locale-switcher-mount]');
  }, { timeout: 60000 });

  const inMagicMenu = await page.evaluate(() => (
    document.body.classList.contains('parent-magic-page-settings')
  ));
  if (inMagicMenu) {
    await page.evaluate(() => {
      if (window.ParentMagicPageHub && typeof ParentMagicPageHub.showSettingsGroup === 'function') {
        ParentMagicPageHub.showSettingsGroup('family');
      } else {
        const btn = document.querySelector('[data-settings-group="family"]');
        if (btn) btn.click();
      }
    });
    await rc1Sleep(800);
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
  await rc1Sleep(600);

  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-locale-switcher-mount] [data-locale-value="en-GB"]')
      || document.querySelector('[data-locale-value="en-GB"]');
    return btn && btn.offsetParent !== null && !btn.disabled && !btn.hidden;
  }, { timeout: 60000 });
}

async function fetchWithSessionRetry(page, url, { maxAttempts = 4 } = {}) {
  const result = await page.evaluate(async (u, attempts) => {
    const diag = { attempts: 0, count429: 0, retryAfterSeconds: null, statuses: [] };
    for (let i = 0; i < attempts; i += 1) {
      diag.attempts += 1;
      const r = await fetch(u, { credentials: 'include' });
      diag.statuses.push(r.status);
      if (r.status === 429) {
        diag.count429 += 1;
        const ra = r.headers.get('Retry-After');
        if (ra && !Number.isNaN(Number(ra))) {
          diag.retryAfterSeconds = Number(ra);
        }
        if (i < attempts - 1) {
          const waitMs = diag.retryAfterSeconds != null
            ? Math.max(1000, diag.retryAfterSeconds * 1000)
            : 1200 * (i + 1);
          await new Promise((res) => setTimeout(res, waitMs));
          continue;
        }
      }
      let body = {};
      try {
        body = await r.json();
      } catch {
        body = {};
      }
      return { status: r.status, body, diagnostics: diag };
    }
    return { status: 429, body: {}, diagnostics: diag };
  }, url, maxAttempts);
  if (result.diagnostics && result.diagnostics.count429 > 0) {
    console.warn(
      `[rc1-smoke] rate-limit: url=${url} attempts=${result.diagnostics.attempts} `
      + `429_count=${result.diagnostics.count429} retry_after=${result.diagnostics.retryAfterSeconds}`
    );
  }
  return result;
}

async function readFamilyLocaleSnapshot(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    const me = r.ok ? await r.json() : {};
    return {
      preferredLocale: me.preferred_locale || null,
      i18n: window.I18n && I18n.getCurrentLang ? I18n.getCurrentLang() : null,
      htmlLang: document.documentElement.lang || null,
    };
  });
}

function assertHtmlLangMatchesLocale(htmlLang, locale) {
  const expected = locale.toLowerCase();
  assert.equal((htmlLang || '').toLowerCase(), expected, `html lang ${htmlLang} vs ${locale}`);
}

async function assertFamilyLocalePersisted(page, locale) {
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
  const snap = await readFamilyLocaleSnapshot(page);
  assert.equal(snap.preferredLocale, locale, 'preferred_locale persisted');
  assert.equal(snap.i18n, locale, 'I18n.getCurrentLang persisted');
  assertHtmlLangMatchesLocale(snap.htmlLang, locale);
  return snap;
}

function settingsAttemptRateLimited(page, attemptStartIndex) {
  const errs = page._rc1Diagnostics?.consoleErrors || [];
  return errs.slice(attemptStartIndex).some((e) => /429|för många/i.test(e));
}

async function setFamilyLocaleViaSettings(page, baseUrl, locale) {
  const attempts = Number(process.env.RC1_LOCALE_SETTINGS_ATTEMPTS || 3);
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    const attemptStart = page._rc1Diagnostics?.consoleErrors?.length ?? 0;
    try {
      await openSettingsFamilyLocale(page, baseUrl);
      await selectSettingsLocaleWithEvent(page, locale);
      return assertFamilyLocalePersisted(page, locale);
    } catch (err) {
      lastErr = err;
      const isRateLimited = settingsAttemptRateLimited(page, attemptStart);
      if (i < attempts - 1 && isRateLimited) {
        const retryAfter = Number(process.env.RC1_SETTINGS_RETRY_AFTER_MS || 65000);
        console.warn(`[rc1-smoke] settings locale retry ${i + 1}/${attempts - 1} after 429 (attempt-local)`);
        await rc1Sleep(retryAfter);
        continue;
      }
      if (i < attempts - 1) {
        await rc1Sleep(3000);
        continue;
      }
    }
  }
  throw lastErr;
}

async function persistFamilyLocaleViaApi(page, locale) {
  await page.evaluate(async (loc) => {
    if (window.Auth && typeof Auth.api === 'function') {
      await Auth.api('/api/family/settings', {
        method: 'PUT',
        body: JSON.stringify({ preferred_locale: loc }),
      });
      const cached = Auth.getUser && Auth.getUser();
      if (cached) {
        cached.preferred_locale = loc;
        try {
          localStorage.setItem(Auth.USER_KEY, JSON.stringify(cached));
        } catch (_) { /* ignore */ }
      }
    }
    if (window.NativeLocaleContract && typeof NativeLocaleContract.applyFamilyLocale === 'function') {
      await NativeLocaleContract.applyFamilyLocale(loc);
    } else if (window.I18n && typeof I18n.init === 'function') {
      await I18n.init(loc);
      document.documentElement.lang = loc;
    }
  }, locale);
  return assertFamilyLocalePersisted(page, locale);
}

async function restoreLocaleViaIsolatedParent(browser, baseUrl, seed, restoreTarget, testName) {
  logLocaleAudit({ test: testName, phase: 'cleanup_started', restoreTarget });
  const { page, close } = await newIsolatedPage(browser, 'desktop');
  try {
    await loginParent(page, baseUrl, seed, null);
    await persistFamilyLocaleViaApi(page, restoreTarget);
    const after = await readFamilyLocaleSnapshot(page);
    assert.equal(after.preferredLocale, restoreTarget, 'isolated parent cleanup locale');
    logLocaleAudit({ test: testName, phase: 'cleanup_passed', ...after, restoreTarget });
  } catch (err) {
    logLocaleAudit({ test: testName, phase: 'cleanup_failed', message: err.message });
    throw err;
  } finally {
    await close();
  }
}

/**
 * Settings UI locale proof — only for the dedicated locale Settings test.
 */
async function withFamilyLocaleScope(browser, page, baseUrl, seed, testName, fn) {
  const original = await readFamilyLocaleSnapshot(page);
  logLocaleAudit({ test: testName, phase: 'before', ...original });
  const restoreTarget = original.preferredLocale || 'sv-SE';

  return executeWithPrimaryAndCleanup({
    onPrimaryFailure: (err) => logLocaleAudit({ test: testName, phase: 'test_failed', message: err.message }),
    fn: () => fn({
      original,
      restoreTarget,
      setLocale: (loc) => setFamilyLocaleViaSettings(page, baseUrl, loc),
    }),
    cleanup: async () => {
      const session = await page.evaluate(async () => {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (!r.ok) return 'anonymous';
        const me = await r.json();
        if (me.email) return 'parent';
        return 'non-parent';
      });
      if (session === 'parent') {
        const now = await readPreferredLocaleFromApi(page);
        if (now !== restoreTarget) {
          await setFamilyLocaleViaSettings(page, baseUrl, restoreTarget);
        }
        const after = await readFamilyLocaleSnapshot(page);
        logLocaleAudit({ test: testName, phase: 'cleanup_passed', ...after, restoreTarget });
        assert.equal(after.preferredLocale, restoreTarget, 'locale restore persisted');
        return;
      }
      await restoreLocaleViaIsolatedParent(browser, baseUrl, seed, restoreTarget, testName);
    },
  });
}

/**
 * API locale fixture for child/handoff — no Settings UI.
 */
async function withFamilyLocaleFixture(browser, page, baseUrl, seed, testName, locale, discardTestContext, fn) {
  const original = await readFamilyLocaleSnapshot(page);
  logLocaleAudit({ test: testName, phase: 'before', ...original });
  const restoreTarget = original.preferredLocale || 'sv-SE';

  await persistFamilyLocaleViaApi(page, locale);

  return executeWithPrimaryAndCleanup({
    onPrimaryFailure: (err) => logLocaleAudit({ test: testName, phase: 'test_failed', message: err.message }),
    fn: () => fn({ original, locale, restoreTarget }),
    cleanup: async () => {
      logLocaleAudit({ test: testName, phase: 'cleanup_started', restoreTarget });
      try {
        await discardTestContext();
        await restoreLocaleViaIsolatedParent(browser, baseUrl, seed, restoreTarget, testName);
      } catch (err) {
        logLocaleAudit({ test: testName, phase: 'cleanup_failed', message: err.message });
        throw err;
      }
    },
  });
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

function smokeFilterMode() {
  const raw = (process.env.RC1_SMOKE_FILTER || '').trim().toLowerCase();
  if (raw === 'handoff') return 'handoff';
  return 'full';
}

module.exports = {
  SWEDISH_SERVER_LEAK,
  smokeConfig,
  logLocaleAudit,
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
  readFamilyLocaleSnapshot,
  setFamilyLocaleViaSettings,
  withFamilyLocaleScope,
  withFamilyLocaleFixture,
  restoreLocaleViaIsolatedParent,
  persistFamilyLocaleViaApi,
  assertEnglishAppEnabled,
  selectSettingsLocaleWithEvent,
  assertReportsRouteBlocked,
  openSettingsFamilyLocale,
  performParentChildHandoff,
  smokeFilterMode,
  executeWithPrimaryAndCleanup,
  rc1Sleep,
  rc1TestGapMs,
  captureFailureDiagnostics,
};
