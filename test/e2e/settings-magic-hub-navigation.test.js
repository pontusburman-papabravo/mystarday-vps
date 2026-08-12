'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createE2eContext } = require('./helpers/e2e-context');
const { registerAndLogin } = require('../helpers/auth-session');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  fillParentLogin,
  submitParentLogin,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('settings magic hub navigation E2E', () => {
  it('preserves Familj group when /api/family resolves after user opens it', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }

    const session = await registerAndLogin(ctx.baseUrl);
    await ctx.query(
      'UPDATE parent SET onboarding_completed = true WHERE email = $1',
      [session.email]
    );

    let releaseFamily;
    const familyGate = new Promise((resolve) => {
      releaseFamily = resolve;
    });
    let familyRequested = false;

    let browser;
    try {
      browser = await launchBrowser();
      const page = await newPage(browser);

      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await acceptCookies(page);
      await fillParentLogin(page, session.email, session.password);
      await submitParentLogin(page);
      await sleep(800);

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/family') && req.method() === 'GET') {
          familyRequested = true;
          familyGate.then(() => req.continue());
          return;
        }
        req.continue();
      });

      await page.goto(`${ctx.baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(page.url().includes('/login'), false, `expected authenticated /settings, got ${page.url()}`);

      await page.waitForFunction(() => {
        return !!document.querySelector('[data-settings-group="family"]');
      }, { timeout: 35000 });

      const earlyMenuCopy = await page.evaluate(() => {
        const mount = document.getElementById('parentMagicPageMount');
        return mount ? mount.innerText : '';
      });
      assert.match(earlyMenuCopy, /Familj/);
      assert.doesNotMatch(earlyMenuCopy, /settings\.groups\./);

      await page.evaluate(() => {
        const btn = document.querySelector('[data-settings-group="family"]');
        if (!btn) throw new Error('family group button missing');
        btn.click();
      });

      await page.waitForFunction(() => {
        return document.body.classList.contains('magic-settings-in-group')
          && window.ParentMagicPageHub
          && ParentMagicPageHub.getActiveSettingsGroup() === 'family';
      }, { timeout: 10000 });

      releaseFamily();
      await page.waitForFunction(() => {
        const input = document.getElementById('familyName');
        return input && input.value !== undefined;
      }, { timeout: 15000 });

      await sleep(1200);
      await page.evaluate(() => {
        if (window.ParentMagicPageHub && ParentMagicPageHub.ensureSettingsChrome) {
          ParentMagicPageHub.ensureSettingsChrome({ preserveNavigation: true });
        }
      });
      await sleep(100);

      const afterReinforce = await page.evaluate(() => ({
        inGroup: document.body.classList.contains('magic-settings-in-group'),
        activeGroup: window.ParentMagicPageHub && ParentMagicPageHub.getActiveSettingsGroup
          ? ParentMagicPageHub.getActiveSettingsGroup()
          : null,
        familySectionVisible: (() => {
          const sec = document.querySelector('[data-magic-settings-content="family"]');
          return !!(sec && !sec.classList.contains('hidden'));
        })(),
        rootMenuVisible: (() => {
          const menu = document.querySelector('.magic-settings-menu');
          if (!menu) return false;
          return window.getComputedStyle(menu).display !== 'none';
        })(),
        mountEmpty: (() => {
          const mount = document.getElementById('parentMagicPageMount');
          return !mount || !mount.innerHTML.trim();
        })(),
      }));

      assert.equal(afterReinforce.inGroup, true, 'Familj group should stay open after delayed bootstrap');
      assert.equal(afterReinforce.activeGroup, 'family');
      assert.equal(afterReinforce.familySectionVisible, true);
      assert.equal(afterReinforce.rootMenuVisible, false);
      assert.equal(afterReinforce.mountEmpty, false);

      await page.evaluate(() => {
        const back = document.querySelector('[data-settings-back]');
        if (!back) throw new Error('settings back button missing');
        back.click();
      });

      await page.waitForFunction(() => {
        return !document.body.classList.contains('magic-settings-in-group')
          && !!document.querySelector('.magic-settings-menu [data-settings-group="family"]');
      }, { timeout: 10000 });

      const rootCount = await page.evaluate(() => {
        return document.querySelectorAll('.magic-settings-menu [data-settings-group]').length;
      });
      assert.ok(rootCount >= 4, 'root settings menu should show group cards after back');
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });
});
