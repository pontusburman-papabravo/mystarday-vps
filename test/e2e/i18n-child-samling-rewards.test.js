'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { detectSwedishSystemCopy } = require('./helpers/swedish-copy');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  ensureBarnetsSamlingLive,
} = require('./helpers/i18n-flags');
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

async function waitForEnglishSamlingNav(page) {
  await page.waitForFunction(() => {
    return document.documentElement.getAttribute('data-barnets-samling') === 'on'
      && window.ChildWorlds
      && ChildWorlds.isConfigured
      && ChildWorlds.isConfigured();
  }, { timeout: 45000 });

  await page.waitForFunction(() => {
    const nav = document.getElementById('childBottomNav');
    if (!nav || nav.getAttribute('data-nav-ready') !== 'true') return false;
    const collectionBtn = nav.querySelector('[data-child-world="collection"]');
    const treasureBtn = nav.querySelector('[data-child-world="treasure"]');
    if (!collectionBtn || !treasureBtn) return false;
    const collectionLabel = (collectionBtn.textContent || '').trim();
    const treasureLabel = (treasureBtn.textContent || '').trim();
    return /collection/i.test(collectionLabel) && /treasure/i.test(treasureLabel);
  }, { timeout: 45000 });
}

async function readChildSessionApis(page, baseUrl) {
  const cookieHeader = (await page.cookies())
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const featuresRes = await fetch(`${baseUrl}/api/features`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
  const features = featuresRes.ok ? await featuresRes.json() : [];
  const me = meRes.ok ? await meRes.json() : null;

  return {
    featureSlugs: (features || []).map((f) => f.slug),
    meType: me && me.type,
    preferredLocale: me && me.preferred_locale,
    englishChildEnabled: me && me.english_child_experience_enabled,
  };
}

async function waitForChildShellReady(page) {
  await page.waitForFunction(() => {
    return /\/child(\/today|-dashboard)/.test(window.location.pathname)
      && window.ChildLayerRouter
      && typeof window.showTab === 'function'
      && window.ChildWorlds
      && ChildWorlds.isConfigured
      && ChildWorlds.isConfigured()
      && document.documentElement.getAttribute('data-barnets-samling') === 'on';
  }, { timeout: 45000 });
}

async function openCollectionView(page) {
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
      ChildLayerRouter.navigateToLayer('collection');
    } else if (typeof window.showTab === 'function') {
      window.showTab('collection');
    }
    if (window.ChildSamlingView && ChildSamlingView.refresh) {
      ChildSamlingView.refresh({ force: true });
    }
  });

  await page.waitForFunction(() => {
    const view = document.getElementById('collectionView');
    const loading = document.getElementById('collectionViewLoading');
    const title = view && view.querySelector('.bsp-title');
    if (!view || view.classList.contains('hidden')) return false;
    if (loading) {
      const loadingStyle = window.getComputedStyle(loading);
      const loadingVisible = !loading.classList.contains('hidden')
        && loadingStyle.display !== 'none'
        && loadingStyle.visibility !== 'hidden';
      if (loadingVisible) return false;
    }
    if (!title) return false;
    return /my collection/i.test((title.textContent || '').trim());
  }, { timeout: 60000 });
}

async function openTreasureView(page) {
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
      ChildLayerRouter.navigateToLayer('treasure');
    } else if (typeof window.showTab === 'function') {
      window.showTab('rewards');
    }
    if (window.ChildTreasureView && ChildTreasureView.refresh) {
      ChildTreasureView.refresh({ force: true });
    } else if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      window.loadRewards({ skipHub: true, force: true });
    }
  });
  await page.waitForFunction(() => {
    const view = document.getElementById('rewardsView');
    const title = document.querySelector('.btp-hero-title');
    if (!view || view.classList.contains('hidden')) return false;
    if (!title) return false;
    return /treasure chest/i.test((title.textContent || '').trim());
  }, { timeout: 30000 });
}

describe('i18n child samling + rewards E2E', () => {
  for (const viewport of viewportsToRun()) {
    it(`(${viewport}) English child sees My collection and Treasure Chest`, { timeout: 180000 }, async (t) => {
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
        const featureRow = await ctx.query(
          `SELECT slug, status FROM features WHERE slug = 'barnets_samling'`
        );
        assert.equal(featureRow.rows.length, 1, 'barnets_samling row must exist after seed');
        assert.equal(featureRow.rows[0].status, 'live');

        const seed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
          registerLocale: 'en-GB',
          dbLocale: 'en-GB',
          childExperience: true,
        });

        await ctx.query(
          `INSERT INTO reward (family_id, name, icon, star_cost, is_active)
           VALUES ($1, 'Movie night', '🎬', 10, true)`,
          [seed.familyId]
        );

        const page = await newPage(browser, viewport);
        await loginParentEnglish(page, ctx.baseUrl, seed, { explicitLocale: true });
        await loginChildFromParentSession(page, ctx.baseUrl, seed);
        await waitForChildShellReady(page);
        await waitForEnglishSamlingNav(page);

        const session = await readChildSessionApis(page, ctx.baseUrl);
        assert.ok(
          session.featureSlugs.includes('barnets_samling'),
          `features API missing barnets_samling: ${session.featureSlugs.join(', ')}`
        );
        assert.equal(session.meType, 'child');
        assert.equal(session.englishChildEnabled, true);

        await openCollectionView(page);
        const collectionText = await getVisibleTextInSelectors(page, ['#collectionView']);
        assert.match(collectionText, /My collection/i, `${viewport}: collection title`);
        assert.match(collectionText, /See what you have collected|Trophy wall|Star medals/i);
        const collectionCopy = detectSwedishSystemCopy(collectionText, {
          allowlist: seed.allowlist,
          context: `${viewport}/child collection view`,
        });
        assert.equal(collectionCopy.ok, true, collectionCopy.hits.map((h) => h.match).join(', '));

        await openTreasureView(page);
        const treasureText = await getVisibleTextInSelectors(page, ['#rewardsView']);
        assert.match(treasureText, /Treasure Chest/i, `${viewport}: treasure title`);
        assert.match(treasureText, /Rewards to save for|Choose what to save for|Movie night/i);
        assert.doesNotMatch(treasureText, /Skattkammaren/i);
        assert.doesNotMatch(treasureText, /Belöningar jag sparat/i);

        const treasureCopy = detectSwedishSystemCopy(treasureText, {
          allowlist: seed.allowlist.concat(['Movie night']),
          context: `${viewport}/child treasure`,
        });
        assert.equal(treasureCopy.ok, true, treasureCopy.hits.map((h) => h.match).join(', '));
      } finally {
        await browser.close();
        await ctx.close();
      }
    });
  }
});
