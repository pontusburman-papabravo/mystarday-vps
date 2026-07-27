'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function openLoginWithBlockedScripts(page, baseUrl, blockPatterns) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (blockPatterns.some((p) => url.includes(p))) {
      req.abort();
      return;
    }
    req.continue();
  });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
}

describe('auth entry failsafe (browser)', () => {
  it('reveals login when auth-entry-i18n never boots (no blocking overlay)', async (t) => {
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
      const page = await newPage(browser, 'desktop');
      await openLoginWithBlockedScripts(page, ctx.baseUrl, ['/js/auth-entry-i18n.js']);
      await sleep(6000);
      const state = await page.evaluate(() => ({
        bootstrapped: window.authEntryI18nBootstrapped === true,
        fallbackVisible: (() => {
          const fb = document.getElementById('auth-entry-fallback');
          return fb && !fb.hidden;
        })(),
        pending: document.documentElement.classList.contains('auth-entry-pending'),
      }));
      assert.equal(state.pending, false, 'page should not stay auth-entry-pending forever');
      assert.equal(state.fallbackVisible, false, 'failsafe must not block login with overlay');
      assert.equal(state.bootstrapped, true, 'failsafe should mark bootstrap complete');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('shows fallback when locale bundle fetch fails', async (t) => {
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
      const page = await newPage(browser, 'desktop');
      await openLoginWithBlockedScripts(page, ctx.baseUrl, ['/api/i18n/en-GB', '/api/i18n/sv-SE', '/js/i18n.js']);
      await sleep(6000);
      const state = await page.evaluate(() => ({
        booted: window.authEntryI18nBootstrapped === true,
        fallbackVisible: (() => {
          const fb = document.getElementById('auth-entry-fallback');
          return fb && !fb.hidden;
        })(),
        pending: document.documentElement.classList.contains('auth-entry-pending'),
      }));
      assert.equal(state.pending, false);
      assert.ok(state.booted || state.fallbackVisible, 'bootstrap or failsafe should reveal login');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('reveals page when i18n init throws', async (t) => {
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
      const page = await newPage(browser, 'desktop');
      await page.evaluateOnNewDocument(() => {
        const origAdd = document.addEventListener.bind(document);
        document.addEventListener = function patched(type, listener, opts) {
          if (type === 'DOMContentLoaded' && listener && String(listener).includes('authEntryI18n')) {
            origAdd(type, () => {
              throw new Error('simulated i18n bootstrap failure');
            }, opts);
            return;
          }
          return origAdd(type, listener, opts);
        };
      });
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(page);
      await sleep(6000);
      const pending = await page.evaluate(() => document.documentElement.classList.contains('auth-entry-pending'));
      assert.equal(pending, false);
      const emailVisible = await page.$eval('#email', (el) => {
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none';
      });
      assert.equal(emailVisible, true, 'login form should be visible after bootstrap failure');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});

describe('swedish copy detector unit', () => {
  const { detectSwedishSystemCopy } = require('./helpers/swedish-copy');

  it('flags Swedish system chrome', () => {
    const r = detectSwedishSystemCopy('Logga in\nSpara\nInställningar');
    assert.equal(r.ok, false);
    assert.ok(r.hits.length >= 2);
  });

  it('ignores allowlisted child and activity names', () => {
    const r = detectSwedishSystemCopy('Alex\nBrush teeth\nHome\nPlanning', {
      allowlist: ['Alex', 'Brush teeth'],
    });
    assert.equal(r.ok, true);
  });
});
