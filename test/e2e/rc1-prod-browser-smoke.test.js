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
  openSettingsFamilyLocale,
  assertRc1ChildLocaleContract,
  assertEnglishAppEnabled,
  selectSettingsLocaleWithEvent,
  assertReportsRouteBlocked,
  fetchWithSessionRetry,
  ensureFamilyLocale,
} = require('./helpers/rc1-prod-smoke-helpers');

function requireSeed(cfg) {
  assert.ok(cfg.email, 'RC1_REVIEW_EMAIL required');
  assert.ok(cfg.password, 'RC1_REVIEW_PASSWORD required');
  assert.ok(cfg.childUsername, 'RC1_CHILD_USERNAME required');
  assert.ok(cfg.childPin, 'RC1_CHILD_PIN required');
  return {
    email: cfg.email,
    password: cfg.password,
    childUsername: cfg.childUsername,
    childPin: cfg.childPin,
  };
}

describe('RC-1 prod browser smoke', { skip: !process.env.RC1_REVIEW_EMAIL }, () => {
  const cfg = smokeConfig();
  const seed = requireSeed(cfg);
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

  it('reports UI hidden without reporting component (after package access resolves)', async () => {
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
        if (access.kliniskFeature) {
          assert.equal(
            access.reportingHas,
            false,
            'klinisk_rapportering ON must not expose reporting without package component'
          );
        }

        const visible = await collectVisibleReportsTargets(page);
        assert.equal(visible.length, 0, `visible reports UI: ${JSON.stringify(visible)}`);

        const apiRes = await fetchWithSessionRetry(page, '/api/reports/active-count');
        assert.equal(apiRes.status, 403, `reports active-count status (body: ${JSON.stringify(apiRes.body)})`);
        assert.equal(apiRes.body.code, 'COMPONENT_MISSING');

        const navRes = await page.evaluate(async () => {
          const r = await fetch('/reports', { redirect: 'manual', credentials: 'include' });
          return { status: r.status, type: r.type, location: r.headers.get('location') };
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

  it('parent locale switch via Settings UI (sv-SE → en-GB, reload, restore)', async () => {
    const { page, close } = await newIsolatedPage(browser, 'desktop');
    try {
      await withDiagnostics(page, 'locale-settings-ui', async () => {
        await loginParent(page, cfg.baseUrl, seed, 'sv-SE');
        await assertEnglishAppEnabled(page);
        await ensureFamilyLocale(page, cfg.baseUrl, 'sv-SE');
        await openSettingsFamilyLocale(page, cfg.baseUrl);

        await selectSettingsLocaleWithEvent(page, 'en-GB');
        await page.goto(`${cfg.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.native-tab-bar .tab-label, #parentBottomNav .tab-label, #sidebar', { timeout: 30000 });
        const htmlLang = await page.evaluate(() => document.documentElement.lang);
        assert.match(htmlLang, /^en-gb$/i, 'documentElement.lang after switch');
        await assertPrimaryNavEnglish(page);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
          () => window.I18n && I18n.getCurrentLang && I18n.getCurrentLang() === 'en-GB',
          { timeout: 25000 }
        );
        const persisted = await page.evaluate(async () => {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          const me = r.ok ? await r.json() : {};
          return {
            preferredLocale: me.preferred_locale,
            htmlLang: document.documentElement.lang,
            i18n: window.I18n && I18n.getCurrentLang ? I18n.getCurrentLang() : null,
          };
        });
        assert.equal(persisted.i18n, 'en-GB');
        assert.match(persisted.htmlLang, /^en-gb$/i);
        assert.equal(persisted.preferredLocale, 'en-GB');

        if (cfg.restoreLocale !== 'en-GB') {
          await openSettingsFamilyLocale(page, cfg.baseUrl);
          await selectSettingsLocaleWithEvent(page, cfg.restoreLocale);
          await page.waitForFunction(
            (loc) => window.I18n && I18n.getCurrentLang && I18n.getCurrentLang() === loc,
            { timeout: 20000 },
            cfg.restoreLocale
          );
        }
      });
    } finally {
      await close();
    }
  });

  it('child login i18n, validation codes, and successful child session', async () => {
    const { page, close } = await newIsolatedPage(browser, 'mobile');
    try {
      await withDiagnostics(page, 'child-login', async () => {
        await loginParent(page, cfg.baseUrl, seed, 'sv-SE');
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
        await page.waitForFunction(() => {
          const main = document.getElementById('childMain') || document.getElementById('todayView');
          return main && !window.location.pathname.includes('child-login');
        }, { timeout: 30000 });
      });
    } finally {
      await close();
    }
  });
});

if (process.env.RC1_PARENT_PIN) {
  describe('RC-1 prod parent/child handoff', { skip: !process.env.RC1_REVIEW_EMAIL }, () => {
    const cfg = smokeConfig();
    const seed = requireSeed(cfg);
    let browser;

    before(async () => {
      assert.ok(cfg.baseUrl, 'RC1_SMOKE_BASE_URL or E2E_BASE_URL required');
      browser = await launchBrowser();
    });

    after(async () => {
      if (browser) await browser.close();
    });

    it('parent → child PIN → parental gate restore → parent session', async () => {
      const parentPin = process.env.RC1_PARENT_PIN;
      const { page, close } = await newIsolatedPage(browser, 'mobile');
      try {
        await withDiagnostics(page, 'parent-child-handoff', async () => {
          await loginParent(page, cfg.baseUrl, seed, cfg.restoreLocale);
          await assertParentSession(page);

          await loginChildFromParentSession(page, cfg.baseUrl, seed);
          await assertChildSession(page);

          await page.evaluate(async () => {
            if (window.Auth && typeof Auth.logout === 'function') {
              await Auth.logout();
            }
          });

          await enterParentAppPin(page, parentPin);

          await page.waitForFunction(
            () => /\/(dashboard|planning|family|settings)/.test(window.location.pathname),
            { timeout: 60000 }
          );
          const restored = await assertParentSession(page);
          assert.ok(restored.email, 'parent session after handoff');
          await page.goto(`${cfg.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(
            () => /\/(dashboard|planning|family)/.test(window.location.pathname),
            { timeout: 30000 }
          );
          const childLeak = await page.evaluate(async () => {
            const r = await fetch('/api/auth/me', { credentials: 'include' });
            const me = r.ok ? await r.json() : {};
            return Boolean(me.username && !me.email);
          });
          assert.equal(childLeak, false, 'child session must not remain active after parent restore');
        });
      } finally {
        await close();
      }
    });
  });
}
