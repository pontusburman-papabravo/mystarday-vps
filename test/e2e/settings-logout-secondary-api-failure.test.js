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

describe('settings logout E2E', () => {
  it('logout POST succeeds when /api/account/notifications returns 500', async (t) => {
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
    let browser;
    try {
      browser = await launchBrowser();
      const page = await newPage(browser);

      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await acceptCookies(page);
      await fillParentLogin(page, session.email, session.password);
      await submitParentLogin(page);

      let notificationsIntercepted = false;
      let logoutRequested = false;

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/account/notifications') && req.method() === 'GET') {
          notificationsIntercepted = true;
          req.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'simulated failure' }),
          });
          return;
        }
        if (url.includes('/api/auth/logout') && req.method() === 'POST') {
          logoutRequested = true;
        }
        req.continue();
      });

      await page.goto(`${ctx.baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(
        page.url().includes('/login'),
        false,
        `browser login did not authorize /settings: ${page.url()}`
      );

      await page.waitForFunction(
        () => document.body.dataset.criticalAccountActionsBound === 'true'
          && document.getElementById('logoutBtn'),
        { timeout: 20000 }
      );

      const logoutNav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
      await page.evaluate(() => {
        document.getElementById('logoutBtn').click();
      });
      await logoutNav;

      assert.match(new URL(page.url()).pathname, /^\/(login)?$/);
      assert.equal(notificationsIntercepted, true);
      assert.equal(logoutRequested, true);
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });
});
