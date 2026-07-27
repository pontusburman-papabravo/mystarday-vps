'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { detectSwedishSystemCopy } = require('./helpers/swedish-copy');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const { ensureBarnetsSamlingLive } = require('./helpers/i18n-flags');
const {
  launchBrowser,
  newPage,
  getVisibleTextInSelectors,
  loginParentEnglish,
  loginChildFromParentSession,
  VIEWPORTS,
} = require('./helpers/puppeteer-browser');

function viewportsToRun() {
  const raw = process.env.E2E_VIEWPORTS || 'desktop,mobile';
  return raw.split(',').map((s) => s.trim()).filter((v) => VIEWPORTS[v]);
}

function isChildShellPathname(pathname) {
  const p = (pathname || '').replace(/\/$/, '');
  return p === '/child-dashboard' || p.indexOf('/child/') === 0;
}

async function waitForChildShellReady(page) {
  await page.waitForFunction(() => {
    const onChildShell = (function (pathname) {
      const p = (pathname || '').replace(/\/$/, '');
      return p === '/child-dashboard' || p.indexOf('/child/') === 0;
    })(window.location.pathname);
    return onChildShell
      && window.ChildLayerRouter
      && typeof window.showTab === 'function'
      && window.ChildWorlds
      && ChildWorlds.isConfigured
      && ChildWorlds.isConfigured()
      && document.documentElement.getAttribute('data-barnets-samling') === 'on';
  }, { timeout: 45000 });

  await page.waitForFunction(() => {
    return typeof window.getChildUiLocale === 'function'
      && getChildUiLocale() === 'en-GB';
  }, { timeout: 45000 });

  await page.waitForFunction(() => {
    const nav = document.getElementById('childBottomNav');
    if (!nav || nav.getAttribute('data-nav-ready') !== 'true') return false;
    const settingsBtn = nav.querySelector('[data-child-world="settings"]');
    if (!settingsBtn) return false;
    return /my space/i.test((settingsBtn.textContent || '').trim());
  }, { timeout: 45000 });
}

async function openSettingsView(page) {
  await page.waitForFunction(() => {
    return window.ChildLayerRouter
      && typeof window.getChildUiLocale === 'function'
      && getChildUiLocale() === 'en-GB';
  }, { timeout: 45000 });

  await page.evaluate(() => {
    if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
      ChildFirstStarMode.exit();
    }
    if (window.ChildLayerRouter && ChildLayerRouter.navigateToLayer) {
      ChildLayerRouter.navigateToLayer('settings');
    } else if (typeof window.showTab === 'function') {
      window.showTab('settings');
    }
    if (window.ChildSettingsView && ChildSettingsView.refresh) {
      ChildSettingsView.refresh({ force: true });
    }
  });

  await page.waitForFunction(() => {
    const mount = document.getElementById('settingsViewMount');
    const settingsView = document.getElementById('settingsView');
    if (!mount || !settingsView) return false;
    const active = settingsView.getAttribute('data-active') === 'true'
      || !settingsView.classList.contains('hidden');
    const text = (mount.textContent || '').trim();
    return active && /My space/i.test(text) && /Log out/i.test(text);
  }, { timeout: 60000 });
}

describe('i18n child settings + session reload', () => {
  for (const viewport of viewportsToRun()) {
    it(`(${viewport}) English My space survives reload`, { timeout: 180000 }, async (t) => {
      const ctx = await createE2eContext();
      if (ctx.skip) {
        t.skip(ctx.reason);
        return;
      }
      if (!skipUnlessI18nStack(t)) {
        await ctx.close();
        return;
      }

      const browser = await launchBrowser();
      try {
        await ensureBarnetsSamlingLive(ctx.query);
        const seed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
          registerLocale: 'en-GB',
          dbLocale: 'en-GB',
          childExperience: true,
        });

        const page = await newPage(browser, viewport);
        await loginParentEnglish(page, ctx.baseUrl, seed, { explicitLocale: true });
        await loginChildFromParentSession(page, ctx.baseUrl, seed);
        await waitForChildShellReady(page);

        await openSettingsView(page);
        const settingsText = await getVisibleTextInSelectors(page, ['#settingsViewMount', '#settingsView']);
        assert.match(settingsText, /My space/i, `${viewport}: settings title`);
        assert.match(settingsText, /Appearance|Dark mode|Log out/i);
        const settingsCopy = detectSwedishSystemCopy(settingsText, {
          allowlist: seed.allowlist,
          context: `${viewport}/child settings`,
        });
        assert.equal(settingsCopy.ok, true, settingsCopy.hits.map((h) => h.match).join(', '));

        const pathBefore = await page.evaluate(() => window.location.pathname);
        assert.ok(isChildShellPathname(pathBefore), `${viewport}: on child shell before reload`);
        assert.doesNotMatch(pathBefore, /child-login/);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForChildShellReady(page);

        const pathAfter = await page.evaluate(() => window.location.pathname);
        assert.ok(isChildShellPathname(pathAfter), `${viewport}: on child shell after reload`);
        assert.doesNotMatch(pathAfter, /child-login/);

        const meType = await page.evaluate(async () => {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (!res.ok) return null;
          const body = await res.json();
          return body && body.type;
        });
        assert.equal(meType, 'child', `${viewport}: child session after reload`);

        await openSettingsView(page);
        const settingsAfterReload = await getVisibleTextInSelectors(page, ['#settingsViewMount']);
        assert.match(settingsAfterReload, /My space/i, `${viewport}: settings after reload`);
        assert.doesNotMatch(settingsAfterReload, /Mitt utrymme|Mörkt läge/i);
      } finally {
        await browser.close();
        await ctx.close();
      }
    });
  }
});
