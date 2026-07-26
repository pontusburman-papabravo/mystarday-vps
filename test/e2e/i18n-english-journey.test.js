'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { detectSwedishSystemCopy } = require('./helpers/swedish-copy');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  selectLoginLocale,
  getParentShellChromeText,
  getParentHomeHubText,
  getVisibleChromeText,
  parentLogout,
  fillParentLogin,
  submitParentLogin,
  enterChildPin,
  VIEWPORTS,
} = require('./helpers/puppeteer-browser');

const PARENT_HUBS = [
  { path: '/dashboard', label: 'Home', expectText: /Home|Welcome|Good (morning|afternoon|evening)/i },
  { path: '/daily-log', label: 'Today', expectText: /Today/i },
  { path: '/planning', label: 'Planning', expectText: /Planning/i },
  { path: '/rewards', label: 'Rewards', expectText: /Rewards/i },
  { path: '/family', label: 'Family', expectText: /Family/i },
  { path: '/settings', label: 'Settings', expectText: /Settings/i },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function viewportsToRun() {
  const raw = process.env.E2E_VIEWPORTS || 'desktop,mobile';
  return raw.split(',').map((s) => s.trim()).filter((v) => VIEWPORTS[v]);
}

async function assertNoSwedishChrome(page, allowlist, context) {
  const text = await getParentShellChromeText(page);
  const result = detectSwedishSystemCopy(text, { allowlist, context });
  assert.equal(
    result.ok,
    true,
    `${context}: Swedish system copy detected: ${result.hits.map((h) => h.match).join(', ')}`
  );
}

async function loginParentEnglish(page, baseUrl, seed, { explicitLocale = true } = {}) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  if (explicitLocale) {
    await selectLoginLocale(page, 'en-GB');
    const submitText = await page.$eval('#submitBtn', (el) => el.textContent.trim());
    assert.match(submitText, /Sign in/i, 'login submit should be English after locale switch');
  }
  await fillParentLogin(page, seed.email, seed.password);
  await submitParentLogin(page);
}

describe('i18n English journey E2E', () => {
  for (const viewport of viewportsToRun()) {
    it(`main journey (${viewport}) — explicit English login through parent + child surfaces`, async (t) => {
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
        const seed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
          registerLocale: 'en-GB',
          dbLocale: 'en-GB',
        });
        const page = await newPage(browser, viewport);

        await loginParentEnglish(page, ctx.baseUrl, seed, { explicitLocale: true });

        const fam = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
        assert.equal(fam.rows[0].preferred_locale, 'en-GB');

        for (const hub of PARENT_HUBS) {
          await page.goto(`${ctx.baseUrl}${hub.path}`, { waitUntil: 'domcontentloaded' });
          await sleep(2000);
          await assertNoSwedishChrome(page, seed.allowlist, `${viewport}/${hub.label}`);
          if (hub.path === '/dashboard') {
            const homeText = await getParentHomeHubText(page);
            const homeCopy = detectSwedishSystemCopy(homeText, {
              allowlist: seed.allowlist,
              context: `${viewport}/home hub`,
            });
            assert.equal(
              homeCopy.ok,
              true,
              `${viewport}/home hub: Swedish system copy detected: ${homeCopy.hits.map((h) => h.match).join(', ')}`
            );
            assert.match(homeText, /Next step|Good (morning|afternoon|evening)|Hello/i);
          }
          const bodyText = await page.evaluate(() => document.body.innerText);
          assert.match(bodyText, hub.expectText, `${hub.label} should show English heading/nav`);
        }

        await page.reload({ waitUntil: 'domcontentloaded' });
        await sleep(1500);
        await assertNoSwedishChrome(page, seed.allowlist, `${viewport}/reload`);

        await parentLogout(page);
        await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
        await acceptCookies(page);
        await fillParentLogin(page, seed.email, seed.password);
        await submitParentLogin(page);
        await sleep(1500);
        const famAfter = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
        assert.equal(famAfter.rows[0].preferred_locale, 'en-GB');
        await assertNoSwedishChrome(page, seed.allowlist, `${viewport}/re-login`);

        await page.goto(`${ctx.baseUrl}/child-login`, { waitUntil: 'domcontentloaded' });
        await acceptCookies(page);
        await sleep(2000);
        await page.waitForSelector(`[data-username="${seed.childUsername}"]`, { timeout: 30000 });
        await page.evaluate((username) => {
          const card = document.querySelector(`[data-username="${username}"]`);
          if (card) card.click();
        }, seed.childUsername);
        await page.waitForFunction(() => {
          const greeting = document.getElementById('clPinGreeting');
          return greeting && (greeting.textContent || '').length > 0;
        }, { timeout: 15000 });
        await enterChildPin(page, seed.childPin);
        await sleep(2500);
        const childText = await getVisibleChromeText(page);
        const childCopy = detectSwedishSystemCopy(childText, {
          allowlist: seed.allowlist,
          context: `${viewport}/child dashboard`,
        });
        assert.equal(childCopy.ok, true, `${viewport}/child: ${childCopy.hits.map((h) => h.match).join(', ')}`);

        const completed = await page.evaluate(() => {
          const card = document.querySelector('.activity-card:not(.done)');
          if (!card) return false;
          const btn = card.querySelector('.photo-activity-card__check, .activity-card__check, button');
          if (btn) btn.click();
          return true;
        });
        if (completed) {
          await sleep(2000);
          const toast = await page.evaluate(() => {
            const el = document.querySelector('.toast, [role="status"]');
            return el ? el.textContent : document.body.innerText.slice(0, 500);
          });
          assert.doesNotMatch(toast, /Bra jobbat|Klart!/i);
        }
      } finally {
        await browser.close();
        await ctx.close();
      }
    });
  }
});

describe('i18n English journey — cache reload', () => {
  it('cold context login stays English after reload (no stale sv auth HTML)', async (t) => {
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
      const seed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
        registerLocale: 'en-GB',
        dbLocale: 'en-GB',
      });
      void seed;
      const page = await newPage(browser, 'desktop');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await selectLoginLocale(page, 'en-GB');
      const html1 = await page.content();
      assert.doesNotMatch(html1, /Logga in/);
      assert.match(html1, /auth-entry-failsafe|auth-entry-i18n/);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await selectLoginLocale(page, 'en-GB');
      const submitText = await page.$eval('#submitBtn', (el) => el.textContent.trim());
      assert.match(submitText, /Sign in/i);

      const swPath = path.join(__dirname, '../../public/sw.js');
      const swSrc = fs.readFileSync(swPath, 'utf8');
      const cacheMatch = swSrc.match(/const CACHE_NAME = '([^']+)'/);
      assert.ok(cacheMatch, 'sw.js should declare CACHE_NAME');
      assert.ok(cacheMatch[1].length > 0, 'cache version should be set');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
