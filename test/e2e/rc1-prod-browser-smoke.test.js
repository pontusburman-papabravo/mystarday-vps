'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  selectLoginLocale,
  loginParentEnglish,
} = require('./helpers/puppeteer-browser');

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.RC1_REVIEW_EMAIL;
const password = process.env.RC1_REVIEW_PASSWORD;
const childUser = process.env.RC1_CHILD_USERNAME;
const childPin = process.env.RC1_CHILD_PIN;
const restoreLocale = process.env.RC1_RESTORE_LOCALE || 'sv-SE';

async function isElementVisible(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

async function visibleReportsLinks(page) {
  return page.evaluate(() => {
    const out = [];
    const links = document.querySelectorAll('a[href="/reports"], a[href*="/reports?"]');
    for (const el of links) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) out.push(el.textContent.trim().slice(0, 80));
    }
    return out;
  });
}

async function parentLogin(page, locale) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  if (locale) await selectLoginLocale(page, locale);
  await page.waitForSelector('#email', { visible: true });
  await page.type('#email', email, { delay: 10 });
  await page.type('#password', password, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('button[type="submit"], #loginBtn, [data-testid="login-submit"]'),
  ]);
}

describe('RC-1 prod browser smoke', { skip: !email }, () => {
  let browser;
  let page;

  before(async () => {
    browser = await launchBrowser();
    page = await newPage(browser, 'desktop');
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('service worker advertises current cache generation', async () => {
    const res = await fetch(`${baseUrl}/sw.js`);
    assert.equal(res.status, 200);
    const text = await res.text();
    const m = text.match(/const CACHE_NAME = '(stjarndag-v\d+)'/);
    assert.ok(m, 'CACHE_NAME in sw.js');
    assert.ok(Number(m[1].replace('stjarndag-v', '')) >= 747, 'cache must not regress below v747');
  });

  it('reports UI hidden without reporting component (after access loads)', async () => {
    await parentLogin(page, 'sv-SE');
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window._packageAccess || window._stjarndagFeatures, { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));
    const visible = await visibleReportsLinks(page);
    assert.equal(visible.length, 0, `unexpected visible /reports links: ${visible.join(', ')}`);
    const bannerVisible = await isElementVisible(page, '#activeSharingBanner');
    assert.equal(bannerVisible, false);
    const apiRes = await page.evaluate(async () => {
      const r = await fetch('/api/reports/active-count', { credentials: 'include' });
      return { status: r.status, body: await r.json() };
    });
    assert.equal(apiRes.status, 403);
    assert.equal(apiRes.body.code, 'COMPONENT_MISSING');
    const navRes = await page.evaluate(async () => {
      const r = await fetch('/reports', { redirect: 'manual', credentials: 'include' });
      return { status: r.status, location: r.headers.get('location') };
    });
    assert.equal(navRes.status, 302);
    assert.match(navRes.location || '', /component=reporting/);
  });

  it('parent locale switch sv-SE → en-GB updates primary nav without reload', async () => {
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-locale-value="en-GB"], #localeSwitcher', { timeout: 15000 }).catch(() => {});
    const switched = await page.evaluate(async () => {
      if (window.LocaleSwitcher && LocaleSwitcher.setLocale) {
        await LocaleSwitcher.setLocale('en-GB');
        return true;
      }
      const btn = document.querySelector('[data-locale-value="en-GB"]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    assert.ok(switched, 'locale switch control');
    await page.waitForFunction(() => {
      const nav = document.querySelector('#parentBottomNav, .parent-bottom-nav, [data-parent-magic-nav]');
      if (!nav) return false;
      const text = nav.innerText || '';
      return /Home|Planning|Rewards/i.test(text) && !/^\s*Hem\s*$/m.test(text);
    }, { timeout: 15000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window.I18n && I18n.getCurrentLang && I18n.getCurrentLang() === 'en-GB')
      || document.documentElement.lang === 'en-GB', { timeout: 15000 });
  });

  it('child login shows localized errors (format + wrong pin), then succeeds', async () => {
    await page.goto(`${baseUrl}/child-login`, { waitUntil: 'domcontentloaded' });
    await acceptCookies(page);
    await page.waitForSelector('#pinInput, .cl-pin-input, input[name="pin"]', { timeout: 15000 }).catch(() => {});

    const formatMsg = await page.evaluate(async () => {
      if (typeof window.childLoginErrorFromResponse !== 'function') return null;
      return childLoginErrorFromResponse({ code: 'CHILD_PIN_INVALID_FORMAT' });
    });
    assert.ok(formatMsg && !/PIN-koden måste|Ogiltiga/i.test(formatMsg), formatMsg);

    await page.evaluate(async (user) => {
      const nameInput = document.querySelector('#childNameInput, #manualNameInput, input[name="username"]');
      if (nameInput) nameInput.value = user;
    }, childUser);

    const badPinRes = await page.evaluate(async (user) => {
      const r = await fetch('/api/auth/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user, pin: '12' }),
      });
      return r.json();
    }, childUser);
    assert.equal(badPinRes.code, 'CHILD_PIN_INVALID_FORMAT');

    await page.goto(`${baseUrl}/child-login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async (user, pin) => {
      const r = await fetch('/api/auth/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user, pin }),
      });
      return r.status;
    }, childUser, childPin);
    await page.goto(`${baseUrl}/child/today`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !window.location.pathname.includes('child-login'), { timeout: 20000 });
  });

  it('restore parent locale after smoke', async () => {
    if (restoreLocale === 'en-GB') return;
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async (loc) => {
      if (window.LocaleSwitcher && LocaleSwitcher.setLocale) await LocaleSwitcher.setLocale(loc);
    }, restoreLocale);
  });
});
