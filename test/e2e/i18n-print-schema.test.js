'use strict';

/**
 * E2E: localized print-schema page chrome + preview HTML for en-GB and sv-SE families.
 * PDF bytes are generated client-side (html2canvas + jsPDF); we verify preview system copy,
 * filename helper, and preserved user content instead of application/pdf responses.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { detectSwedishSystemCopy } = require('./helpers/swedish-copy');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  fillParentLogin,
  submitParentLogin,
  parentLogout,
  VIEWPORTS,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('i18n print-schema E2E', () => {
  it('en-GB family gets English chrome and preview; sv-SE family keeps Swedish PDF copy (desktop)', async (t) => {
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
      const enSeed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
        registerLocale: 'en-GB',
        dbLocale: 'en-GB',
        childName: 'Alex',
      });

      const page = await newPage(browser, 'desktop');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await fillParentLogin(page, enSeed.email, enSeed.password);
      await submitParentLogin(page);
      await page.waitForFunction(() => location.pathname !== '/login', { timeout: 30000 });
      await sleep(1500);

      await page.goto(`${ctx.baseUrl}/print-schema`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const h1 = document.querySelector('h1');
        return h1 && /Create PDF|Skapa PDF/.test(h1.textContent);
      }, { timeout: 20000 });

      const heading = await page.$eval('h1', (el) => el.textContent.trim());
      assert.match(heading, /Create PDF/i);

      const createBtn = await page.$eval('#printBtn', (el) => el.textContent.trim());
      assert.match(createBtn, /Create PDF/i);

      await page.click('#previewBtn');
      await page.waitForFunction(() => {
        const mount = document.getElementById('previewMount');
        return mount && mount.textContent.includes('Schedule');
      }, { timeout: 30000 });

      const previewText = await page.$eval('#previewMount', (el) => el.textContent);
      assert.match(previewText, /Schedule/);
      assert.match(previewText, /Alex/);
      assert.doesNotMatch(previewText, /1 vecka/);

      const svCopy = detectSwedishSystemCopy(previewText, {
        allowlist: enSeed.allowlist,
        context: 'en-GB print preview',
      });
      assert.equal(svCopy.ok, true, `Swedish system copy in en preview: ${svCopy.hits.map((h) => h.match).join(', ')}`);

      const filename = await page.evaluate(() => {
        return window.PrintSchemaCore.buildPdfFilename('Alex', false);
      });
      assert.match(filename, /^my-starday-weekly-schedule-alex-\d{4}-\d{2}-\d{2}\.pdf$/);

      const intlFilenames = await page.evaluate(() => {
        const core = window.PrintSchemaCore;
        return {
          asa: core.buildPdfFilename('Åsa', false),
          elodie: core.buildPdfFilename('Élodie', false),
          jose: core.buildPdfFilename('José', false),
          cjk: core.buildPdfFilename('李', false),
        };
      });
      assert.match(intlFilenames.asa, /^my-starday-weekly-schedule-åsa-/);
      assert.match(intlFilenames.elodie, /^my-starday-weekly-schedule-élodie-/);
      assert.match(intlFilenames.jose, /^my-starday-weekly-schedule-josé-/);
      assert.match(intlFilenames.cjk, /^my-starday-weekly-schedule-child-/);

      await parentLogout(page);

      const svSeed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
        registerLocale: 'sv-SE',
        dbLocale: 'sv-SE',
        childName: 'Saga',
      });

      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await fillParentLogin(page, svSeed.email, svSeed.password);
      await submitParentLogin(page);
      await page.waitForFunction(() => location.pathname !== '/login', { timeout: 30000 });
      await sleep(1500);

      await page.goto(`${ctx.baseUrl}/print-schema`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const h1 = document.querySelector('h1');
        return h1 && /Skapa PDF/.test(h1.textContent);
      }, { timeout: 20000 });

      await page.click('#previewBtn');
      await page.waitForFunction(() => {
        const mount = document.getElementById('previewMount');
        return mount && mount.textContent.includes('Schema');
      }, { timeout: 30000 });

      const svPreview = await page.$eval('#previewMount', (el) => el.textContent);
      assert.match(svPreview, /Schema/);
      assert.match(svPreview, /1 vecka/);
      assert.match(svPreview, /Saga/);

      const svFilename = await page.evaluate(() => {
        return window.PrintSchemaCore.buildPdfFilename('Saga', false);
      });
      assert.match(svFilename, /^min-stjarndag-veckoschema-saga-\d{4}-\d{2}-\d{2}\.pdf$/);
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
