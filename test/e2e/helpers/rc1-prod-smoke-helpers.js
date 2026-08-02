'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { executeWithPrimaryAndCleanup } = require('../../helpers/rc1-scope-errors');
const handoffModule = require('./rc1-prod-smoke-handoff');
const { performParentChildHandoff } = handoffModule;
const {
  LOCALE_CLASSIFICATIONS,
  LocaleHarnessError,
  isLocaleFullySynchronized,
  isApiLocaleSynchronized,
  isDeterministicLocaleFailure,
  allowsSingleMountRecovery,
  sanitizeLocaleSwitcherDiagnostics,
  sanitizeSettingsNetworkEvidence,
  LOCALE_SWITCHER_DOM_PROBE,
} = require('./rc1-locale-settings-harness');

const SWEDISH_SERVER_LEAK = /Ogiltiga värden|Namn krävs|PIN-koden måste|Användarnamn krävs/i;

const { RC1_QA_CHILD_USERNAME } = require('../../../test/support/rc1-qa-fixture');

function smokeConfig() {
  const baseUrl = (process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL || '').replace(/\/$/, '');
  const requireHandoff = process.env.RC1_REQUIRE_HANDOFF !== 'false'
    && process.env.RC1_REQUIRE_HANDOFF !== '0';
  const qaFamilyId = (process.env.RC1_QA_FAMILY_ID || '').trim() || null;
  return {
    baseUrl,
    expectedSha: process.env.RC1_EXPECTED_SHA,
    expectedCache: process.env.RC1_EXPECTED_CACHE,
    email: process.env.RC1_QA_EMAIL || process.env.RC1_REVIEW_EMAIL,
    password: process.env.RC1_QA_PASSWORD || process.env.RC1_REVIEW_PASSWORD,
    childUsername: process.env.RC1_CHILD_USERNAME || RC1_QA_CHILD_USERNAME,
    childPin: process.env.RC1_CHILD_PIN,
    parentPin: process.env.RC1_PARENT_PIN || null,
    qaFamilyId,
    qaFixtureMode: process.env.RC1_USE_QA_FIXTURE !== '0',
    requireHandoff,
    restoreLocaleOverride: process.env.RC1_RESTORE_LOCALE || null,
  };
}

async function assertRc1QaFamilyId(page, expectedFamilyId) {
  assert.ok(expectedFamilyId, 'RC1_QA_FAMILY_ID required for automated RC-1 smoke');
  const actual = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return null;
    const me = await r.json();
    return me.family_id || me.familyId || null;
  });
  assert.equal(actual, expectedFamilyId, 'logged-in family must match RC1_QA_FAMILY_ID');
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
  const result = await fetchWithSessionRetry(page, '/api/family/locale-options');
  const opts = result.body || {};
  const ok = result.status === 200 && opts.english_app_enabled === true;
  assert.equal(
    ok,
    true,
    `english_app_enabled (locale-options: status=${result.status}, opts=${JSON.stringify(opts)})`
  );
}

async function readPreferredLocaleFromApi(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return null;
    const me = await r.json();
    return me.preferred_locale || null;
  });
}

async function collectLocaleDomDiagnostics(page, requestedLocale, startLocale, timeoutPhase) {
  const dom = await page.evaluate(LOCALE_SWITCHER_DOM_PROBE);
  const apiLocale = await readPreferredLocaleFromApi(page);
  return sanitizeLocaleSwitcherDiagnostics({
    requestedLocale,
    startLocale,
    currentApiLocale: apiLocale,
    currentI18nLocale: dom.i18n,
    pagePath: dom.pagePath,
    mountCount: dom.mountCount,
    buttons: dom.buttons,
    timeoutPhase,
  });
}

async function attachLocaleSettingsNetworkWatch(page, requestedLocale) {
  const state = {
    settingsRequestSent: false,
    settingsResponse: null,
    rateLimited429: false,
    retryAfterSeconds: null,
  };
  const onResponse = async (response) => {
    const url = response.url();
    if (!/\/api\/family\/settings/.test(url) || response.request().method() !== 'PUT') {
      return;
    }
    state.settingsRequestSent = true;
    const status = response.status();
    if (status === 429) {
      state.rateLimited429 = true;
      const ra = response.headers()['retry-after'];
      if (ra && !Number.isNaN(Number(ra))) {
        state.retryAfterSeconds = Number(ra);
      }
    }
    let preferredLocaleUpdated = false;
    if (status >= 200 && status < 300) {
      try {
        const mePreferred = await page.evaluate(async () => {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          if (!r.ok) return null;
          const me = await r.json();
          return me.preferred_locale || null;
        });
        preferredLocaleUpdated = mePreferred === requestedLocale;
      } catch {
        preferredLocaleUpdated = false;
      }
    }
    state.settingsResponse = sanitizeSettingsNetworkEvidence({
      status,
      preferredLocaleUpdated,
      requestedLocale,
    });
  };
  page.on('response', onResponse);
  return {
    state,
    detach() {
      page.off('response', onResponse);
    },
  };
}

async function waitForLocaleChangedEvent(page, locale, timeoutMs = 60000) {
  return page.evaluate(
    (loc, ms) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        document.removeEventListener('locale-changed', onLocale);
        reject(new Error('locale-changed timeout'));
      }, ms);
      function onLocale(ev) {
        if (ev.detail && ev.detail.locale === loc) {
          clearTimeout(timer);
          document.removeEventListener('locale-changed', onLocale);
          resolve(true);
        }
      }
      document.addEventListener('locale-changed', onLocale);
    }),
    locale,
    timeoutMs
  );
}

async function readLocaleSnapshotFromPage(page) {
  const snap = await readFamilyLocaleSnapshot(page);
  return snap;
}

async function selectSettingsLocaleWithEvent(page, locale, { startLocale = null, afterRemount = false } = {}) {
  const startSnap = await readLocaleSnapshotFromPage(page);
  const effectiveStart = startLocale || startSnap.preferredLocale;

  if (isLocaleFullySynchronized(startSnap, locale)) {
    return {
      classification: afterRemount
        ? LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT
        : LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI,
      skippedClick: true,
    };
  }

  if (isApiLocaleSynchronized(startSnap, locale)
    && startSnap.i18n !== locale) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await rc1Sleep(1500);
    const afterReload = await readLocaleSnapshotFromPage(page);
    if (isLocaleFullySynchronized(afterReload, locale)) {
      return {
        classification: LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI,
        skippedClick: true,
        reloadedForUiSync: true,
      };
    }
    const diag = await collectLocaleDomDiagnostics(
      page,
      locale,
      effectiveStart,
      'locale_ui_state_not_synchronized'
    );
    throw new LocaleHarnessError(
      LOCALE_CLASSIFICATIONS.LOCALE_UI_STATE_NOT_SYNCHRONIZED,
      `API locale ${locale} but UI/I18n not synchronized after reload`,
      diag
    );
  }

  const networkWatch = await attachLocaleSettingsNetworkWatch(page, locale);

  try {
    await page.waitForFunction(
      (loc) => {
        const mount = document.querySelector('[data-locale-switcher-mount]');
        const button = mount
          ? mount.querySelector(`[data-locale-value="${loc}"]`)
          : document.querySelector(`[data-locale-value="${loc}"]`);
        return Boolean(button && button.offsetParent !== null && !button.hidden);
      },
      { timeout: 30000 },
      locale
    );
  } catch {
    networkWatch.detach();
    const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'target_button_found');
    throw new LocaleHarnessError(
      LOCALE_CLASSIFICATIONS.LOCALE_TARGET_NOT_FOUND,
      `Locale target not found: ${locale}`,
      diag
    );
  }

  try {
    await page.waitForFunction(
      (loc) => {
        const mount = document.querySelector('[data-locale-switcher-mount]');
        const button = mount
          ? mount.querySelector(`[data-locale-value="${loc}"]`)
          : document.querySelector(`[data-locale-value="${loc}"]`);
        return Boolean(button && button.offsetParent !== null && !button.hidden && !button.disabled);
      },
      { timeout: 15000 },
      locale
    );
  } catch {
    const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'target_button_enabled');
    const snap = await readLocaleSnapshotFromPage(page);
    networkWatch.detach();
    if (isLocaleFullySynchronized(snap, locale)) {
      return {
        classification: afterRemount
          ? LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT
          : LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI,
        skippedClick: true,
      };
    }
    throw new LocaleHarnessError(
      LOCALE_CLASSIFICATIONS.LOCALE_TARGET_DISABLED,
      `Locale target disabled: ${locale}`,
      diag
    );
  }

  try {
    const settingsPutPromise = page.waitForResponse(
      (response) => /\/api\/family\/settings/.test(response.url())
        && response.request().method() === 'PUT',
      { timeout: 45000 }
    );

    const syncPromise = page.waitForFunction(
      async (loc) => {
        const htmlOk = (document.documentElement.lang || '').toLowerCase() === loc.toLowerCase();
        const i18nOk = window.I18n
          && typeof I18n.getCurrentLang === 'function'
          && I18n.getCurrentLang() === loc;
        if (!i18nOk || !htmlOk) return false;
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (!r.ok) return false;
        const me = await r.json();
        return me.preferred_locale === loc;
      },
      { timeout: 45000 },
      locale
    );

    const clicked = await page.evaluate((loc) => {
      const mount = document.querySelector('[data-locale-switcher-mount]');
      const btn = mount
        ? mount.querySelector(`[data-locale-value="${loc}"]`)
        : document.querySelector(`[data-locale-value="${loc}"]`);
      if (!btn || btn.disabled || btn.hidden || btn.offsetParent === null) {
        return { ok: false, disabled: Boolean(btn && btn.disabled) };
      }
      btn.scrollIntoView({ block: 'center', inline: 'nearest' });
      btn.click();
      return { ok: true };
    }, locale);

    if (!clicked.ok) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'target_button_enabled');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_TARGET_DISABLED,
        `Locale target not clickable: ${locale}`,
        diag
      );
    }

    let putResponse;
    try {
      putResponse = await settingsPutPromise;
    } catch (putErr) {
      const snap = await readLocaleSnapshotFromPage(page);
      if (isLocaleFullySynchronized(snap, locale)) {
        return {
          classification: afterRemount
            ? LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT
            : LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI,
          skippedClick: false,
          network: { status: 200, preferredLocaleUpdated: true, requestedLocale: locale },
        };
      }
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'settings_request_sent');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_REQUEST_NOT_SENT,
        putErr.message || 'No PUT /api/family/settings observed after locale click',
        diag
      );
    }

    const putStatus = putResponse.status();
    networkWatch.state.settingsRequestSent = true;
    networkWatch.state.settingsResponse = sanitizeSettingsNetworkEvidence({
      status: putStatus,
      preferredLocaleUpdated: putStatus >= 200 && putStatus < 300,
      requestedLocale: locale,
    });
    if (putStatus === 429) {
      networkWatch.state.rateLimited429 = true;
      const ra = putResponse.headers()['retry-after'];
      if (ra && !Number.isNaN(Number(ra))) {
        networkWatch.state.retryAfterSeconds = Number(ra);
      }
    }

    if (putStatus < 200 || putStatus >= 300) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'settings_response_received');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_API_FAILED,
        `Settings API failed with status ${putStatus}`,
        { ...diag, network: networkWatch.state.settingsResponse }
      );
    }

    try {
      await syncPromise;
    } catch (syncErr) {
      const finalSnap = await readLocaleSnapshotFromPage(page);
      if (isApiLocaleSynchronized(finalSnap, locale) && finalSnap.i18n !== locale) {
        const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'i18n_locale_updated');
        throw new LocaleHarnessError(
          LOCALE_CLASSIFICATIONS.LOCALE_API_UPDATED_UI_NOT_UPDATED,
          syncErr.message || 'API preferred_locale updated but I18n did not follow',
          diag
        );
      }
      throw syncErr;
    }

    await rc1Sleep(300);

    const finalSnap = await readLocaleSnapshotFromPage(page);
    if (networkWatch.state.rateLimited429) {
      const err = new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_API_FAILED,
        'Settings locale API returned 429',
        {
          ...(await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'settings_response_received')),
          network: {
            ...networkWatch.state.settingsResponse,
            requestedLocale: locale,
          },
          rateLimited429: true,
          retryAfterSeconds: networkWatch.state.retryAfterSeconds,
        }
      );
      err.rateLimited429 = true;
      err.retryAfterSeconds = networkWatch.state.retryAfterSeconds;
      throw err;
    }

    if (!networkWatch.state.settingsRequestSent) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'settings_request_sent');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_REQUEST_NOT_SENT,
        'No PUT /api/family/settings observed after locale click',
        diag
      );
    }

    const apiStatus = networkWatch.state.settingsResponse?.status;
    if (apiStatus && (apiStatus < 200 || apiStatus >= 300)) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'settings_response_received');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_API_FAILED,
        `Settings API failed with status ${apiStatus}`,
        { ...diag, network: { ...networkWatch.state.settingsResponse, requestedLocale: locale } }
      );
    }

    if (isApiLocaleSynchronized(finalSnap, locale) && finalSnap.i18n !== locale) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'i18n_locale_updated');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_API_UPDATED_UI_NOT_UPDATED,
        'API preferred_locale updated but I18n did not follow',
        diag
      );
    }

    if (!isApiLocaleSynchronized(finalSnap, locale) && finalSnap.i18n === locale) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'api_preferred_locale_updated');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_UI_UPDATED_API_NOT_UPDATED,
        'I18n updated but API preferred_locale did not persist',
        diag
      );
    }

    if (!isLocaleFullySynchronized(finalSnap, locale)) {
      const diag = await collectLocaleDomDiagnostics(page, locale, effectiveStart, 'i18n_locale_updated');
      throw new LocaleHarnessError(
        LOCALE_CLASSIFICATIONS.LOCALE_API_UPDATED_UI_NOT_UPDATED,
        'Locale switch did not reach fully synchronized state',
        diag
      );
    }

    return {
      classification: afterRemount
        ? LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT
        : LOCALE_CLASSIFICATIONS.SUCCESS_LOCALE_SETTINGS_UI,
      network: { ...networkWatch.state.settingsResponse, requestedLocale: locale },
    };
  } finally {
    networkWatch.detach();
  }
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
    const familyPane = document.querySelector('[data-magic-settings-content="family"]');
    const familyOk = !familyPane || familyPane.offsetParent !== null;
    const mount = document.querySelector('[data-locale-switcher-mount]');
    if (!mount || mount.offsetParent === null) return false;
    const en = mount.querySelector('[data-locale-value="en-GB"]');
    const sv = mount.querySelector('[data-locale-value="sv-SE"]');
    return familyOk
      && Boolean(en && sv && en.offsetParent !== null && sv.offsetParent !== null);
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
  const startSnap = await readFamilyLocaleSnapshot(page);
  let mountRecoveryUsed = false;
  let lastErr;

  const runOnce = async (afterRemount) => {
    await openSettingsFamilyLocale(page, baseUrl);
    await selectSettingsLocaleWithEvent(page, locale, {
      startLocale: startSnap.preferredLocale,
      afterRemount,
    });
    return assertFamilyLocalePersisted(page, locale);
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await runOnce(mountRecoveryUsed);
    } catch (err) {
      lastErr = err;
      const classification = err.classification || null;

      if (err.rateLimited429) {
        const waitMs = err.retryAfterSeconds != null
          ? Math.max(1000, err.retryAfterSeconds * 1000)
          : Number(process.env.RC1_SETTINGS_RETRY_AFTER_MS || 65000);
        console.warn(`[rc1-smoke] settings locale 429 retry (retry-after ${err.retryAfterSeconds})`);
        await rc1Sleep(waitMs);
        continue;
      }

      if (isDeterministicLocaleFailure(classification)) {
        throw err;
      }

      if (allowsSingleMountRecovery(classification) && !mountRecoveryUsed) {
        mountRecoveryUsed = true;
        await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
        await rc1Sleep(2000);
        continue;
      }

      if (!mountRecoveryUsed && classification === LOCALE_CLASSIFICATIONS.LOCALE_SWITCHER_NOT_MOUNTED) {
        mountRecoveryUsed = true;
        await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
        await rc1Sleep(2000);
        continue;
      }

      throw err;
    }
  }
  throw lastErr;
}

async function assertFamilyLocaleApiOnly(page, locale) {
  await page.waitForFunction(
    async (loc) => {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      if (!r.ok) return false;
      const me = await r.json();
      return me.preferred_locale === loc;
    },
    { timeout: 30000 },
    locale
  );
  const snap = await readFamilyLocaleSnapshot(page);
  assert.equal(snap.preferredLocale, locale, 'preferred_locale persisted (API)');
  return snap;
}

async function persistFamilyLocaleViaApi(page, locale, { strictUi = false } = {}) {
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
  if (strictUi) {
    return assertFamilyLocalePersisted(page, locale);
  }
  return assertFamilyLocaleApiOnly(page, locale);
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
          await persistFamilyLocaleViaApi(page, restoreTarget);
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
    'RC-1 prod smoke requires english_child_experience_enabled on QA fixture (release config)'
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
    'RC-1 expects QA family preferred_locale en-GB with english_child_experience ON'
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
  assertRc1QaFamilyId,
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
  attachHandoffNetworkCapture: handoffModule.attachHandoffNetworkCapture,
  beginChildLoginInstrumentation: handoffModule.beginChildLoginInstrumentation,
  assertCanonicalHost: handoffModule.assertCanonicalHost,
  auditHandoffCookies: handoffModule.auditHandoffCookies,
  smokeFilterMode,
  executeWithPrimaryAndCleanup,
  rc1Sleep,
  rc1TestGapMs,
  captureFailureDiagnostics,
};
