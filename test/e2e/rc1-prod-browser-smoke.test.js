'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launchBrowser, acceptCookies, loginChildFromParentSession } = require('./helpers/puppeteer-browser');
const {
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
  enterParentAppPin,
  triggerChildToParentHandoff,
  waitForParentHandoffComplete,
  assertRc1ChildLocaleContract,
  assertEnglishAppEnabled,
  assertReportsRouteBlocked,
  fetchWithSessionRetry,
  withFamilyLocaleScope,
  readFamilyLocaleSnapshot,
  rc1Sleep,
  rc1TestGapMs,
} = require('./helpers/rc1-prod-smoke-helpers');

function requireSeed(cfg) {
  assert.ok(cfg.email, 'RC1_REVIEW_EMAIL required');
  assert.ok(cfg.password, 'RC1_REVIEW_PASSWORD required');
  assert.ok(cfg.childUsername, 'RC1_CHILD_USERNAME required');
  assert.ok(cfg.childPin, 'RC1_CHILD_PIN required');
  if (cfg.requireHandoff) {
    assert.ok(cfg.parentPin, 'RC1_PARENT_PIN required when RC1_REQUIRE_HANDOFF=true');
  }
  return {
    email: cfg.email,
    password: cfg.password,
    childUsername: cfg.childUsername,
    childPin: cfg.childPin,
    restoreLocaleOverride: cfg.restoreLocaleOverride,
  };
}

const cfg = smokeConfig();
const seed = cfg.email ? requireSeed(cfg) : null;

describe('RC-1 prod browser smoke', { skip: !cfg.email }, () => {
  let browser;

  before(async () => {
    assert.ok(cfg.baseUrl, 'RC1_SMOKE_BASE_URL or E2E_BASE_URL required');
    browser = await launchBrowser();
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('release identity matches RC1_EXPECTED_SHA and RC1_EXPECTED_CACHE', async () => {
    await fetchReleaseIdentity(cfg.baseUrl, cfg.expectedSha, cfg.expectedCache);
  });

  it('parent locale switch via Settings UI (reload + restore original locale)', async () => {
    await rc1Sleep(rc1TestGapMs());
    const { page, close } = await newIsolatedPage(browser, 'desktop');
    try {
      await withDiagnostics(page, 'locale-settings-ui', async () => {
        await loginParent(page, cfg.baseUrl, seed, null);
        await assertEnglishAppEnabled(page);

        await withFamilyLocaleScope(page, cfg.baseUrl, seed, 'locale-settings-ui', async ({ original, setLocale }) => {
          const start = original.preferredLocale || 'sv-SE';
          const toggleFrom = start === 'en-GB' ? 'sv-SE' : start;
          const toggleTo = toggleFrom === 'sv-SE' ? 'en-GB' : 'sv-SE';

          if (start !== toggleFrom) {
            await setLocale(toggleFrom);
          }
          await setLocale(toggleTo);
          if (toggleTo === 'en-GB') {
            await page.goto(`${cfg.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
            await assertPrimaryNavEnglish(page);
          }

          await page.reload({ waitUntil: 'domcontentloaded' });
          const persisted = await readFamilyLocaleSnapshot(page);
          assert.equal(persisted.preferredLocale, toggleTo);
          assert.equal(persisted.i18n, toggleTo);
        });
      });
    } finally {
      await close();
    }
  });

  it('reports UI hidden without reporting component (after package access resolves)', async () => {
    await rc1Sleep(rc1TestGapMs());
    const { page, close } = await newIsolatedPage(browser, 'desktop');
    try {
      await withDiagnostics(page, 'reports-gating', async () => {
        await loginParent(page, cfg.baseUrl, seed, 'sv-SE');
        await page.goto(`${cfg.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
          () => document.documentElement.classList.contains('stjarndag-features-loaded')
            || (window._stjarndagFeatures && window._packageAccess),
          { timeout: 45000 }
        );
        const access = await waitForPackageAccessResolved(page);
        assert.equal(access.reportingHas, false, 'components.reporting.has must be false for review family');

        const visible = await collectVisibleReportsTargets(page);
        assert.equal(visible.length, 0, `visible reports UI: ${JSON.stringify(visible)}`);

        const apiRes = await fetchWithSessionRetry(page, '/api/reports/active-count');
        assert.ok(apiRes.diagnostics, 'retry diagnostics required');
        if (apiRes.diagnostics.count429 >= apiRes.diagnostics.attempts) {
          assert.fail(`reports active-count: all attempts returned 429 (${JSON.stringify(apiRes.diagnostics)})`);
        }
        assert.equal(
          apiRes.status,
          403,
          `reports active-count final status (diagnostics: ${JSON.stringify(apiRes.diagnostics)})`
        );
        assert.equal(apiRes.body.code, 'COMPONENT_MISSING');

        const navRes = await page.evaluate(async () => {
          const r = await fetch('/reports', { redirect: 'manual', credentials: 'include' });
          return { status: r.status, location: r.headers.get('location') };
        });
        if (navRes.status === 302) {
          assert.match(navRes.location || '', /component=reporting|upgrade|access/i);
        } else {
          await assertReportsRouteBlocked(page, cfg.baseUrl);
        }
      });
    } finally {
      await close();
    }
  });

  it('child login i18n, validation codes, and successful child session', async () => {
    await rc1Sleep(rc1TestGapMs());
    const { page, close } = await newIsolatedPage(browser, 'mobile');
    try {
      await withDiagnostics(page, 'child-login', async () => {
        await loginParent(page, cfg.baseUrl, seed, null);

        await withFamilyLocaleScope(page, cfg.baseUrl, seed, 'child-login', async ({ setLocale }) => {
          await setLocale('en-GB');
          await assertRc1ChildLocaleContract(page);

          await page.goto(`${cfg.baseUrl}/child-login`, { waitUntil: 'domcontentloaded' });
          await acceptCookies(page);
          await waitForChildI18nReady(page);

          const childLocale = await page.evaluate(() => (
            typeof window.getChildUiLocale === 'function' ? getChildUiLocale() : null
          ));
          assert.equal(childLocale, 'en-GB', 'child UI locale on login page');

          const formatMsg = await page.evaluate(() => {
            if (typeof window.childLoginErrorFromResponse !== 'function') return null;
            return childLoginErrorFromResponse({ code: 'CHILD_PIN_INVALID_FORMAT' });
          });
          assert.ok(formatMsg, 'childLoginErrorFromResponse after i18n init');
          assert.doesNotMatch(formatMsg, SWEDISH_SERVER_LEAK, formatMsg);
          assert.match(formatMsg, /pin|digit|number|format/i);

          const formatApi = await page.evaluate(async (user) => {
            const r = await fetch('/api/auth/child-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ username: user, pin: '12' }),
            });
            return { status: r.status, body: await r.json() };
          }, seed.childUsername);
          assert.equal(formatApi.status, 400);
          assert.equal(formatApi.body.code, 'CHILD_PIN_INVALID_FORMAT');

          await loginChildFromParentSession(page, cfg.baseUrl, seed);
          await assertChildSession(page);
          const path = await page.evaluate(() => window.location.pathname);
          assert.match(path, /\/child(\/today|-dashboard)/);
        });
      });
    } finally {
      await close();
    }
  });

  if (cfg.requireHandoff) {
    it('parent → child PIN → parental gate restore → parent session', async () => {
      await rc1Sleep(rc1TestGapMs());
      const parentPin = cfg.parentPin;
      const { page, close } = await newIsolatedPage(browser, 'mobile');
      try {
        await withDiagnostics(page, 'parent-child-handoff', async () => {
          await loginParent(page, cfg.baseUrl, seed, null);

          await withFamilyLocaleScope(page, cfg.baseUrl, seed, 'parent-child-handoff', async ({ setLocale }) => {
            await setLocale('en-GB');
            await assertParentSession(page);

            await loginChildFromParentSession(page, cfg.baseUrl, seed);
            await assertChildSession(page);

            await triggerChildToParentHandoff(page);
            await enterParentAppPin(page, parentPin);
            await waitForParentHandoffComplete(page, cfg.baseUrl);

            const childLeak = await page.evaluate(async () => {
              const r = await fetch('/api/auth/me', { credentials: 'include' });
              const me = r.ok ? await r.json() : {};
              return Boolean(me.username && !me.email);
            });
            assert.equal(childLeak, false, 'child session must not remain active after parent restore');
          });
        });
      } finally {
        await close();
      }
    });
  }
});
