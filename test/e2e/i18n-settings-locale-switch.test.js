'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { setFamilyEnglishFlags } = require('./helpers/i18n-flags');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  selectLoginLocale,
  fillParentLogin,
  submitParentLogin,
  parentLogout,
  selectSettingsLocale,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loginSwedishFamily(page, baseUrl, seed) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  await selectLoginLocale(page, 'sv-SE');
  await fillParentLogin(page, seed.email, seed.password);
  await submitParentLogin(page);
  await sleep(1200);
}

async function openSettingsFamilyGroup(page, baseUrl) {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await page.waitForFunction(() => {
    return document.body.classList.contains('parent-magic-page-settings')
      || document.querySelector('[data-locale-switcher-mount]');
  }, { timeout: 30000 });

  const inMagicMenu = await page.evaluate(() =>
    document.body.classList.contains('parent-magic-page-settings')
  );
  if (inMagicMenu) {
    await page.evaluate(() => {
      if (window.ParentMagicPageHub && typeof ParentMagicPageHub.showSettingsGroup === 'function') {
        ParentMagicPageHub.showSettingsGroup('family');
      } else {
        const btn = document.querySelector('[data-settings-group="family"]');
        if (btn) btn.click();
      }
    });
    await sleep(800);
  }

  await page.evaluate(() => {
    if (window.LocaleSwitcher && typeof LocaleSwitcher.autoMount === 'function') {
      LocaleSwitcher.autoMount();
    }
  });

  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-locale-value="en-GB"]');
    return btn && btn.offsetParent !== null;
  }, { timeout: 30000 });
}

describe('settings locale switch E2E', () => {
  it('sv-SE → en-GB → reload → logout shows English login', async (t) => {
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
        registerLocale: 'sv-SE',
        dbLocale: 'sv-SE',
      });
      await setFamilyEnglishFlags(ctx.query, seed.familyId, { englishApp: true });

      const page = await newPage(browser, 'desktop');
      await loginSwedishFamily(page, ctx.baseUrl, seed);
      await openSettingsFamilyGroup(page, ctx.baseUrl);

      await selectSettingsLocale(page, 'en-GB');
      await sleep(1000);

      let fam = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      assert.equal(fam.rows[0].preferred_locale, 'en-GB');

      const familySectionText = await page.evaluate(() => {
        const mount = document.querySelector('[data-locale-switcher-mount]');
        const section = mount ? mount.closest('section') : null;
        return section ? section.innerText : document.body.innerText;
      });
      assert.match(familySectionText, /Language|English/i);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1500);
      if (await page.evaluate(() => document.body.classList.contains('parent-magic-page-settings'))) {
        await page.evaluate(() => {
          if (window.ParentMagicPageHub && typeof ParentMagicPageHub.showSettingsGroup === 'function') {
            ParentMagicPageHub.showSettingsGroup('family');
          }
        });
        await sleep(500);
      }
      const familySectionAfterReload = await page.evaluate(() => {
        const mount = document.querySelector('[data-locale-switcher-mount]');
        const section = mount ? mount.closest('section') : null;
        return section ? section.innerText : '';
      });
      assert.match(familySectionAfterReload, /Language|English/i);

      await parentLogout(page);
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await sleep(2000);
      const loginText = await page.evaluate(() => document.body.innerText);
      assert.match(loginText, /Get started|I already have an account|Sign in/i);
      assert.doesNotMatch(loginText, /\bKom igång\b/);
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('en-GB → sv-SE → reload → logout shows Swedish login', async (t) => {
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
      await setFamilyEnglishFlags(ctx.query, seed.familyId, { englishApp: true });

      const page = await newPage(browser, 'desktop');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await selectLoginLocale(page, 'en-GB');
      await fillParentLogin(page, seed.email, seed.password);
      await submitParentLogin(page);
      await sleep(1200);

      await openSettingsFamilyGroup(page, ctx.baseUrl);
      await selectSettingsLocale(page, 'sv-SE');
      await sleep(1000);

      let fam = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      assert.equal(fam.rows[0].preferred_locale, 'sv-SE');

      const familySectionText = await page.evaluate(() => {
        const mount = document.querySelector('[data-locale-switcher-mount]');
        const section = mount ? mount.closest('section') : null;
        return section ? section.innerText : document.body.innerText;
      });
      assert.match(familySectionText, /Språk|Svenska/i);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1500);
      if (await page.evaluate(() => document.body.classList.contains('parent-magic-page-settings'))) {
        await page.evaluate(() => {
          if (window.ParentMagicPageHub && typeof ParentMagicPageHub.showSettingsGroup === 'function') {
            ParentMagicPageHub.showSettingsGroup('family');
          }
        });
        await sleep(500);
      }
      const familySectionAfterReload = await page.evaluate(() => {
        const mount = document.querySelector('[data-locale-switcher-mount]');
        const section = mount ? mount.closest('section') : null;
        return section ? section.innerText : '';
      });
      assert.match(familySectionAfterReload, /Språk|Svenska/i);

      await parentLogout(page);
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await sleep(2000);
      const loginText = await page.evaluate(() => document.body.innerText);
      assert.match(loginText, /Kom igång|Jag har redan konto|Logga in/i);
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
