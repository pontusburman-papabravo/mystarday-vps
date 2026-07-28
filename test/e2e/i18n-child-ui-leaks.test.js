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
} = require('./helpers/puppeteer-browser');

async function waitForChildShellReady(page) {
  await page.waitForFunction(() => {
    const onChildShell = (function (pathname) {
      const p = (pathname || '').replace(/\/$/, '');
      return p === '/child-dashboard' || p.indexOf('/child/') === 0;
    })(window.location.pathname);
    return onChildShell
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
    return nav && nav.getAttribute('data-nav-ready') === 'true';
  }, { timeout: 45000 });
}

async function openSettingsView(page) {
  await page.evaluate(() => {
    if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
      ChildFirstStarMode.exit();
    }
    if (window.ChildLayerRouter && ChildLayerRouter.navigateToLayer) {
      ChildLayerRouter.navigateToLayer('settings');
    }
    if (window.ChildSettingsView && ChildSettingsView.refresh) {
      ChildSettingsView.refresh({ force: true });
    }
  });
  await page.waitForFunction(() => {
    const mount = document.getElementById('settingsViewMount');
    return mount && /My space/i.test((mount.textContent || '').trim());
  }, { timeout: 45000 });
}

async function openCollectionView(page) {
  await page.evaluate(() => {
    if (window.ChildLayerRouter && ChildLayerRouter.navigateToLayer) {
      ChildLayerRouter.navigateToLayer('collection');
    }
    if (window.ChildSamlingView && ChildSamlingView.refresh) {
      ChildSamlingView.refresh({ force: true });
    }
  });
  await page.waitForFunction(() => {
    const title = document.querySelector('.bsp-title');
    return title && /collection/i.test((title.textContent || '').trim());
  }, { timeout: 45000 });
}

async function seedTrophies(query, childId) {
  const defs = [
    ['first_week', 'Första veckan', 'Sju dagar i rad med aktivitet!', '📅', '{"type":"streak","min":7}', 2],
    ['reward_fan', 'Belöningsfantast', 'Fem belöningar inlösta!', '🎉', '{"type":"redemptions","min":5}', 7],
  ];
  for (const row of defs) {
    await query(
      `INSERT INTO achievement_definition (slug, name, description, emoji, unlock_rule, sort_order)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (slug) DO NOTHING`,
      row
    );
  }
  await query(
    `INSERT INTO child_achievement (child_id, achievement_slug)
     VALUES ($1, 'first_week')
     ON CONFLICT DO NOTHING`,
    [childId]
  );
  await query(
    `INSERT INTO child_achievement (child_id, achievement_slug)
     VALUES ($1, 'reward_fan')
     ON CONFLICT DO NOTHING`,
    [childId]
  );
}

describe('i18n child UI leaks — mobile smoke', () => {
  it('(mobile) English chrome for picture style, other days, substeps, trophies', { timeout: 180000 }, async (t) => {
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
      await seedTrophies(ctx.query, seed.childId);

      const page = await newPage(browser, 'mobile');
      await loginParentEnglish(page, ctx.baseUrl, seed, { explicitLocale: true });
      await loginChildFromParentSession(page, ctx.baseUrl, seed);
      await waitForChildShellReady(page);

      // My space — picture style entry
      await openSettingsView(page);
      const settingsText = await getVisibleTextInSelectors(page, ['#settingsViewMount']);
      assert.match(settingsText, /Picture style/i, 'picture style kicker');
      assert.match(settingsText, /Clear pictures/i, 'pictogram pack label');
      assert.doesNotMatch(settingsText, /BILDSTIL|Tydliga bilder/i);
      const settingsAria = await page.evaluate(() => {
        const el = document.querySelector('.bsp-pictogram-entry');
        return el ? el.getAttribute('aria-label') : '';
      });
      assert.match(settingsAria, /Picture style/i, 'picture style aria-label');
      assert.doesNotMatch(settingsAria, /Bildstil/i);

      // Today — other days summary
      await page.evaluate(() => {
        if (window.ChildLayerRouter && ChildLayerRouter.navigateToLayer) {
          ChildLayerRouter.navigateToLayer('today');
        }
      });
      await page.waitForFunction(() => {
        const summary = document.querySelector('#weekNavDetails .child-week-summary');
        return summary && /other days/i.test((summary.textContent || '').trim());
      }, { timeout: 30000 });
      const weekSummary = await page.evaluate(() => {
        const el = document.querySelector('#weekNavDetails .child-week-summary');
        return (el && el.textContent || '').trim();
      });
      assert.match(weekSummary, /Other days/i);
      assert.doesNotMatch(weekSummary, /Andra dagar/i);

      // Schedule chrome — no Swedish substeps label
      const scheduleText = await getVisibleTextInSelectors(page, ['#scheduleView', '#weekNavDetails']);
      assert.doesNotMatch(scheduleText, /\bDelsteg\b/);

      // Collection — localized trophy names
      await openCollectionView(page);
      const collectionText = await getVisibleTextInSelectors(page, ['#collectionView']);
      assert.match(collectionText, /First week/i, 'first_week trophy name');
      assert.match(collectionText, /Reward fan/i, 'reward_fan trophy name');
      assert.doesNotMatch(collectionText, /Första veckan|Belöningsfantast/i);

      const leakScan = detectSwedishSystemCopy(
        [settingsText, weekSummary, scheduleText, collectionText].join('\n'),
        { allowlist: seed.allowlist, context: 'mobile/child-ui-leaks' }
      );
      assert.equal(leakScan.ok, true, leakScan.hits.map((h) => h.match).join(', '));
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
