'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  waitForAuthEntryReady,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function openRegister(page, baseUrl, { blockPatterns = [] } = {}) {
  if (blockPatterns.length) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (blockPatterns.some((p) => url.includes(p))) {
        req.abort();
        return;
      }
      req.continue();
    });
  }
  await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  await waitForAuthEntryReady(page);
  await page.waitForFunction(() => {
    const loading = document.getElementById('loadingState');
    return loading && loading.classList.contains('hidden');
  }, { timeout: 15000 });
}

async function inspectNameField(page) {
  return page.evaluate(() => {
    const name = document.getElementById('name');
    if (!name) return { exists: false };
    const rect = name.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const formCard = document.getElementById('formCard');
    return {
      exists: true,
      hidden: name.classList.contains('hidden') || name.closest('.hidden') !== null,
      disabled: name.disabled,
      readOnly: name.readOnly,
      pointerEvents: window.getComputedStyle(name).pointerEvents,
      formCardPointerEvents: formCard ? window.getComputedStyle(formCard).pointerEvents : null,
      topElementId: top && top.id,
      topElementTag: top && top.tagName,
      blocksInput: top !== name && !name.contains(top),
      pending: document.documentElement.classList.contains('auth-entry-pending'),
      fallbackVisible: (() => {
        const fb = document.getElementById('auth-entry-fallback');
        return fb && !fb.hidden;
      })(),
    };
  });
}

async function typeInName(page, value) {
  await page.click('#name', { delay: 30 });
  await page.keyboard.type(value);
  return page.evaluate(() => document.getElementById('name')?.value || '');
}

describe('register form interactive (mobile)', () => {
  it('allows typing before language or country are confirmed', async (t) => {
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
      const page = await newPage(browser, 'mobile');
      await openRegister(page, ctx.baseUrl, {
        blockPatterns: ['/api/market/registration-gates', '/api/analytics/'],
      });

      const before = await inspectNameField(page);
      assert.equal(before.exists, true, 'name input should exist');
      assert.equal(before.hidden, false, 'name input should be visible');
      assert.equal(before.pointerEvents, 'auto', 'name input must accept pointer events');
      assert.notEqual(before.formCardPointerEvents, 'none', 'form card must not block input');
      assert.equal(before.pending, false, 'auth-entry-pending must clear');
      assert.equal(before.fallbackVisible, false, 'fallback overlay must stay hidden');

      const typed = await typeInName(page, 'Lillemor');
      assert.equal(typed, 'Lillemor', 'typed value should appear in name field');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('stays interactive when i18n bootstrap is blocked', async (t) => {
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
      const page = await newPage(browser, 'mobile');
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await openRegister(page, ctx.baseUrl, {
        blockPatterns: ['/js/auth-entry-i18n.js', '/api/i18n/'],
      });
      await sleep(2000);

      const state = await inspectNameField(page);
      assert.equal(state.pending, false, 'page should fail open without i18n bootstrap');
      assert.equal(state.fallbackVisible, false, 'fallback must not block register');
      assert.equal(state.pointerEvents, 'auto');

      const typed = await typeInName(page, 'Test');
      assert.equal(typed, 'Test');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });

  it('fills all required fields after language and country selection', async (t) => {
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
      const page = await newPage(browser, 'mobile');
      await openRegister(page, ctx.baseUrl);

      await page.click('[data-locale-choice="sv-SE"]');
      await sleep(500);
      await page.waitForSelector('#countryChoiceSelect', { visible: true, timeout: 10000 });
      await page.select('#countryChoiceSelect', 'SE');
      await sleep(300);

      await page.click('#name');
      await page.keyboard.type('Lillemor');
      await page.click('#email');
      await page.keyboard.type('hedinlillemor@gmail.com');
      await page.click('#password');
      await page.keyboard.type('testpass123');
      await page.click('#confirmPassword');
      await page.keyboard.type('testpass123');

      const values = await page.evaluate(() => ({
        name: document.getElementById('name')?.value,
        email: document.getElementById('email')?.value,
        password: document.getElementById('password')?.value,
        confirmPassword: document.getElementById('confirmPassword')?.value,
      }));

      assert.equal(values.name, 'Lillemor');
      assert.equal(values.email, 'hedinlillemor@gmail.com');
      assert.equal(values.password, 'testpass123');
      assert.equal(values.confirmPassword, 'testpass123');
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
