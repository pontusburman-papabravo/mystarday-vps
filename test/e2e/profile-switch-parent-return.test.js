'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createE2eContext } = require('./helpers/e2e-context');
const { registerAndLogin, createChild } = require('../helpers/auth-session');
const { cookieHeader, getSetCookieHeaders, mergeCookies } = require('../helpers/http');
const { hashPassword } = require('../../src/lib/hash');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  fillParentLogin,
  submitParentLogin,
} = require('./helpers/puppeteer-browser');

const { FLAG_KEY: TRUSTED_FLAG } = require('../../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../../src/lib/family-device-daily-ux-flags');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function injectCookies(page, baseUrl, cookies) {
  const origin = new URL(baseUrl).origin;
  const entries = Object.entries(cookies || {}).filter(([, value]) => value != null && value !== '');
  for (const [name, value] of entries) {
    await page.setCookie({
      name,
      value: String(value),
      url: origin + '/',
    });
  }
}

async function loginParentWithTrustedDevice(page, baseUrl, session, deviceCookies) {
  await bootstrapBrowserParent(page, baseUrl, session, deviceCookies);
}

async function enableFamilyDeviceFlags(ctx) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG, 'adult_privilege_v1']) {
    await ctx.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'e2e')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function enrollShared(ctx, session) {
  const res = await fetch(`${ctx.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'e2e shared' }),
  });
  assert.equal(res.status, 201, await res.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function setParentPin(ctx, session, pin, currentPin) {
  const body = { pin, confirmPin: pin };
  if (currentPin) body.currentPin = currentPin;
  const res = await fetch(`${ctx.baseUrl}/api/family/set-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200, await res.text());
}

async function seedDailyUxFamily(ctx) {
  const session = await registerAndLogin(ctx.baseUrl, { name: 'Pontus' });
  await ctx.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [session.email]);
  await createChild(ctx.baseUrl, session, { name: 'Astrid', emoji: '⭐' });
  await createChild(ctx.baseUrl, session, { name: 'Anna', emoji: '🌸' });
  await setParentPin(ctx, session, '4321');
  const deviceCookies = await enrollShared(ctx, session);
  return { session, deviceCookies };
}

async function bootstrapBrowserParent(page, baseUrl, session, deviceCookies) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await injectCookies(page, baseUrl, { ...session.cookies, ...deviceCookies });
  const meOk = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const me = await res.json();
    return me && me.type === 'parent' && !!me.id;
  });
  assert.equal(meOk, true, 'browser must have authenticated parent session from injected cookies');
}

async function loginParentInBrowser(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await fillParentLogin(page, email, password);
  await submitParentLogin(page);
  await sleep(800);
}

async function activateChildSessionViaApi(page, baseUrl, session, deviceCookies, childUsername, childPin) {
  const res = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader({ ...session.cookies, ...deviceCookies }),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ username: childUsername, pin: childPin }),
  });
  assert.equal(res.status, 200, await res.text());
  let cookies = { ...session.cookies, ...deviceCookies };
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  await injectCookies(page, baseUrl, cookies);
  const childMe = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    return r.ok ? r.json() : null;
  });
  assert.equal(childMe && childMe.type, 'child', 'child session must be active in browser');
}

async function openProfilePickerSwitch(page) {
  await page.evaluate(() => {
    try {
      sessionStorage.setItem('stjarndag_family_device_daily_ux_v1', '1');
      sessionStorage.setItem('stjarndag_family_device_entry_v1', '1');
      sessionStorage.setItem('stjarndag_entry_profile_count', '3');
    } catch (_) { /* ignore */ }
    if (window.DeviceMode && DeviceMode.enterChild) DeviceMode.enterChild();
    window.location.replace('/child/profile-picker?switch=1');
  });
  await page.waitForFunction(() => {
    return document.querySelectorAll('.cpp-profile-card').length >= 3
      && document.querySelector('.cpp-profile-card-parent');
  }, { timeout: 20000 });
}

async function tapAdultCard(page) {
  const card = await page.$('.cpp-profile-card-parent');
  assert.ok(card, 'adult profile card must exist');
  await card.click();
}

async function waitForParentShell(page) {
  await page.waitForFunction(() => {
    const p = window.location.pathname;
    const err = document.getElementById('cppError');
    const errOn = err && err.classList.contains('visible');
    if (errOn) return true;
    return p !== '/child/profile-picker' && p !== '/login' && p.indexOf('/child-login') !== 0;
  }, { timeout: 20000 });
}

async function assertLeftPickerWithoutGenericError(page) {
  const state = await page.evaluate(() => ({
    path: window.location.pathname,
    error: (document.getElementById('cppError') || {}).textContent || '',
    errorVisible: !!(document.getElementById('cppError') && document.getElementById('cppError').classList.contains('visible')),
  }));
  if (state.errorVisible) {
    assert.notEqual(
      state.error,
      'Kunde inte logga in som vuxen. Försök igen.',
      'generic adult login failure must not appear'
    );
  }
  assert.equal(state.errorVisible, false, state.error);
  assert.notEqual(state.path, '/child/profile-picker', `still on picker: ${state.path}`);
}

describe('profile switch parent return E2E', () => {
  it('Test A: authenticated parent → Byt profil → adult restores without generic error', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }

    let browser;
    try {
      await enableFamilyDeviceFlags(ctx);
      const { session, deviceCookies } = await seedDailyUxFamily(ctx);

      browser = await launchBrowser();
      const page = await newPage(browser, 'mobile');
      await loginParentWithTrustedDevice(page, ctx.baseUrl, session, deviceCookies);
      await openProfilePickerSwitch(page);
      await tapAdultCard(page);
      await waitForParentShell(page);
      await assertLeftPickerWithoutGenericError(page);
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });

  it('Test B: change PIN → Byt profil → adult restores without generic error', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }

    let browser;
    try {
      await enableFamilyDeviceFlags(ctx);
      const { session, deviceCookies } = await seedDailyUxFamily(ctx);
      await setParentPin(ctx, session, '9876', '4321');

      browser = await launchBrowser();
      const page = await newPage(browser, 'mobile');
      await loginParentWithTrustedDevice(page, ctx.baseUrl, session, deviceCookies);
      await openProfilePickerSwitch(page);
      await tapAdultCard(page);
      await waitForParentShell(page);
      await assertLeftPickerWithoutGenericError(page);
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });

  it('Test C: parent → child → Byt profil → adult requires PIN then restores', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }

    let browser;
    try {
      await enableFamilyDeviceFlags(ctx);
      const { session, deviceCookies } = await seedDailyUxFamily(ctx);
      const childRow = await ctx.query(
        'SELECT username FROM child c JOIN parent p ON p.family_id = c.family_id WHERE LOWER(p.email) = $1 ORDER BY c.name LIMIT 1',
        [session.email.toLowerCase()]
      );
      const childUsername = childRow.rows[0].username;
      const childPinHash = await hashPassword('2580');
      await ctx.query('UPDATE child SET pin = $1 WHERE username = $2', [childPinHash, childUsername]);

      browser = await launchBrowser();
      const page = await newPage(browser, 'mobile');
      await loginParentWithTrustedDevice(page, ctx.baseUrl, session, deviceCookies);
      await activateChildSessionViaApi(page, ctx.baseUrl, session, deviceCookies, childUsername, '2580');
      await openProfilePickerSwitch(page);
      await tapAdultCard(page);

      await page.waitForSelector('#adult-pin-gate-overlay', { timeout: 10000 });
      for (const digit of '4321') {
        await page.evaluate((d) => {
          const btns = [...document.querySelectorAll('#adult-pin-gate-overlay button')];
          const btn = btns.find((b) => b.textContent.trim() === d);
          if (!btn) throw new Error('digit button missing ' + d);
          btn.click();
        }, digit);
      }

      await page.waitForFunction(() => {
        const p = window.location.pathname;
        return p === '/home' || p === '/dashboard' || p === '/' || p.indexOf('/family/') === 0;
      }, { timeout: 20000 });
      const err = await page.evaluate(() => (document.getElementById('cppError') || {}).textContent || '');
      assert.equal(err, '');
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });

  it('Test D: wrong PIN still surfaces explicit error (not silent success)', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }

    let browser;
    try {
      await enableFamilyDeviceFlags(ctx);
      const { session, deviceCookies } = await seedDailyUxFamily(ctx);
      const childRow = await ctx.query(
        'SELECT username FROM child c JOIN parent p ON p.family_id = c.family_id WHERE LOWER(p.email) = $1 ORDER BY c.name LIMIT 1',
        [session.email.toLowerCase()]
      );
      const childUsername = childRow.rows[0].username;
      const childPinHash = await hashPassword('2580');
      await ctx.query('UPDATE child SET pin = $1 WHERE username = $2', [childPinHash, childUsername]);

      browser = await launchBrowser();
      const page = await newPage(browser, 'mobile');
      await loginParentWithTrustedDevice(page, ctx.baseUrl, session, deviceCookies);
      await activateChildSessionViaApi(page, ctx.baseUrl, session, deviceCookies, childUsername, '2580');
      await openProfilePickerSwitch(page);
      await tapAdultCard(page);
      await page.waitForSelector('#adult-pin-gate-overlay', { timeout: 10000 });
      for (const digit of '0000') {
        await page.evaluate((d) => {
          const btns = [...document.querySelectorAll('#adult-pin-gate-overlay button')];
          const btn = btns.find((b) => b.textContent.trim() === d);
          if (btn) btn.click();
        }, digit);
      }

      await page.waitForFunction(() => {
        const err = document.getElementById('cppError');
        return err && err.classList.contains('visible') && err.textContent.indexOf('Fel PIN') !== -1;
      }, { timeout: 15000 });
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });
});

describe('profile picker mobile grid layout E2E', () => {
  async function assertTwoColumnGrid(page, width) {
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.cpp-profile-card')];
      if (cards.length < 3) return { ok: false, reason: 'need 3 cards' };
      const rects = cards.map((c) => c.getBoundingClientRect());
      const grid = document.querySelector('.cpp-picker-grid');
      const cols = grid ? window.getComputedStyle(grid).gridTemplateColumns : '';
      return {
        ok: true,
        cols,
        sameRow12: Math.abs(rects[0].top - rects[1].top) < 4,
        differentCol12: Math.abs(rects[0].left - rects[1].left) > 20,
        row3Below: rects[2].top > rects[0].top + 40,
        width3Similar: Math.abs(rects[2].width - rects[0].width) < 8,
        noSpan3: rects[2].width < rects[0].width * 1.35,
      };
    });
    assert.equal(layout.ok, true, layout.reason || 'layout probe failed');
    assert.match(layout.cols, /\d/);
    assert.equal(layout.sameRow12, true, `cards 1+2 not same row at ${width}px`);
    assert.equal(layout.differentCol12, true, `cards 1+2 same column at ${width}px`);
    assert.equal(layout.row3Below, true, `card 3 not on row 2 at ${width}px`);
    assert.equal(layout.width3Similar, true, `card 3 width mismatch at ${width}px`);
    assert.equal(layout.noSpan3, true, `card 3 spans full row at ${width}px`);
  }

  it('layout: 2 columns at 320, 390, and 430 px', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }

    let browser;
    try {
      await enableFamilyDeviceFlags(ctx);
      const { session, deviceCookies } = await seedDailyUxFamily(ctx);

      browser = await launchBrowser();
      const page = await newPage(browser, 'mobile');
      await loginParentWithTrustedDevice(page, ctx.baseUrl, session, deviceCookies);
      await openProfilePickerSwitch(page);

      for (const width of [320, 390, 430]) {
        await assertTwoColumnGrid(page, width);
      }
    } finally {
      if (browser) await browser.close();
      await ctx.close();
    }
  });
});
