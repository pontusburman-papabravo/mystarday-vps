'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { setFamilyEnglishFlags, clearFamilyEnglishChildFlag } = require('./helpers/i18n-flags');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  selectLoginLocale,
  fillParentLogin,
  submitParentLogin,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('login locale regression (browser + API)', () => {
  it('DB en-GB without explicit login choice stays English', async (t) => {
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
      const page = await newPage(browser, 'desktop');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await fillParentLogin(page, seed.email, seed.password);
      await submitParentLogin(page);
      await sleep(1500);
      const text = await page.evaluate(() => document.body.innerText);
      assert.match(text, /Home|Planning|Rewards|Family/i);
      assert.doesNotMatch(text, /\bPlanering\b|\bBelöningar\b|\bFamilj\b/);
      const fam = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('DB en-GB + explicit sv-SE on login becomes Swedish', async (t) => {
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
      const page = await newPage(browser, 'desktop');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await selectLoginLocale(page, 'sv-SE');
      await fillParentLogin(page, seed.email, seed.password);
      await submitParentLogin(page);
      await sleep(800);
      const fam = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('DB sv-SE + explicit English on login becomes en-GB', async (t) => {
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
      const page = await newPage(browser, 'desktop');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await selectLoginLocale(page, 'en-GB');
      await fillParentLogin(page, seed.email, seed.password);
      await submitParentLogin(page);
      await sleep(800);
      const fam = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('failed login does not change family locale', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }
    if (!skipUnlessI18nStack(t)) {
      await ctx.close();
      return;
    }

    try {
      const seed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
        registerLocale: 'en-GB',
        dbLocale: 'en-GB',
      });
      const before = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      const res = await fetch(`${ctx.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: seed.email,
          password: 'wrong-password',
          preferred_locale: 'sv-SE',
        }),
      });
      assert.equal(res.status, 401);
      const after = await ctx.query('SELECT preferred_locale FROM family WHERE id = $1', [seed.familyId]);
      assert.equal(after.rows[0].preferred_locale, before.rows[0].preferred_locale);
    } finally {
      await ctx.close();
    }
  });
});

describe('english_child_experience flag behavior', () => {
  it('child login stays Swedish child pack when flag is OFF', async (t) => {
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
        childExperience: false,
      });
      await setFamilyEnglishFlags(ctx.query, seed.familyId, { childExperience: false });
      await clearFamilyEnglishChildFlag(ctx.query, seed.familyId);

      const page = await newPage(browser, 'mobile');
      await page.goto(`${ctx.baseUrl}/child-login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await page.waitForFunction(() => {
        const fb = document.getElementById('auth-entry-fallback');
        const ready = window.authEntryI18nBootstrapped || document.querySelector('.cl-child-card, #clProfilePicker, #clNameForm');
        return ready && !(fb && !fb.hidden);
      }, { timeout: 20000 });
      await sleep(1000);
      const heading = await page.evaluate(() => document.body.innerText.slice(0, 500));
      assert.match(heading, /Vem är du|Välj vem du är/i);
      assert.doesNotMatch(heading, /Who are you/i);
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
