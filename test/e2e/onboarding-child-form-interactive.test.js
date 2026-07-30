'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { registerAndLogin } = require('../helpers/auth-session');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  fillParentLogin,
  submitParentLogin,
  VIEWPORTS,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function enableProdSlimSignup(ctx) {
  await ctx.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('activation_signup_slim_v1', true, 'e2e')
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
}

async function loginFreshParent(page, baseUrl, session) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await acceptCookies(page);
  await fillParentLogin(page, session.email, session.password);
  await submitParentLogin(page);
  await page.waitForFunction(
    () => window.location.pathname === '/onboarding',
    { timeout: 30000 }
  );
  await page.waitForFunction(
    () => document.getElementById('spAnswer') || document.getElementById('childName'),
    { timeout: 15000 }
  );
}

function attachErrorCollectors(page, bucket) {
  page.on('pageerror', (err) => bucket.pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && url.includes('/api/') && !url.includes('/api/analytics/')) {
      bucket.failedRequests.push({ status: res.status(), url });
    }
  });
}

async function inspectField(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { selector: sel, exists: false };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const style = window.getComputedStyle(el);
    return {
      selector: sel,
      exists: true,
      disabled: el.disabled,
      readOnly: el.readOnly,
      ariaDisabled: el.getAttribute('aria-disabled'),
      inert: el.inert,
      pointerEvents: style.pointerEvents,
      visibility: style.visibility,
      opacity: style.opacity,
      display: style.display,
      tabIndex: el.tabIndex,
      zIndex: style.zIndex,
      blocksInput: top !== el && !el.contains(top),
      topElementId: top && top.id,
      rectH: rect.height,
    };
  }, selector);
}

async function runSlimChildStepInteraction(page) {
  const nameSel = '#spAnswer';
  await page.waitForSelector(nameSel, { visible: true, timeout: 10000 });
  const nameInspect = await inspectField(page, nameSel);
  assert.equal(nameInspect.exists, true);
  assert.equal(nameInspect.disabled, false);
  assert.equal(nameInspect.pointerEvents, 'auto');
  assert.equal(nameInspect.blocksInput, false);

  await page.click(nameSel);
  await page.keyboard.type('Ella');
  const nameVal = await page.$eval(nameSel, (el) => el.value);
  assert.equal(nameVal, 'Ella');

  await page.click('#spNext');
  await page.waitForSelector('#spBirthdayYear', { visible: true, timeout: 10000 });

  const yearInspect = await inspectField(page, '#spBirthdayYear');
  const monthInspect = await inspectField(page, '#spBirthdayMonth');
  const dayInspect = await inspectField(page, '#spBirthdayDay');
  for (const insp of [yearInspect, monthInspect, dayInspect]) {
    assert.equal(insp.exists, true, insp.selector);
    assert.equal(insp.blocksInput, false, insp.selector);
    assert.notEqual(insp.pointerEvents, 'none', insp.selector);
  }

  const yearOptions = await page.$eval('#spBirthdayYear', (el) => el.options.length);
  assert.ok(yearOptions > 2, 'birthday year select should be populated');

  await page.select('#spBirthdayYear', String(new Date().getFullYear() - 8));
  await page.select('#spBirthdayMonth', '06');
  await page.waitForFunction(() => {
    const day = document.getElementById('spBirthdayDay');
    return day && day.options.length > 1;
  });
  await page.select('#spBirthdayDay', '15');

  const birthday = await page.evaluate(() => {
    const y = document.getElementById('spBirthdayYear').value;
    const m = document.getElementById('spBirthdayMonth').value;
    const d = document.getElementById('spBirthdayDay').value;
    return `${y}-${m}-${d}`;
  });
  assert.match(birthday, /^\d{4}-\d{2}-\d{2}$/);

  await page.click('#spNext');
  await page.waitForSelector('.sp-choice', { visible: true, timeout: 10000 });
  const routineInspect = await inspectField(page, '.sp-choice');
  assert.equal(routineInspect.blocksInput, false);
  await page.click('.sp-choice');
}

async function assertNoOtRecursion(page) {
  const otState = await page.evaluate(() => ({
    otName: window.ot && window.ot.name,
    starter: window.OnboardingStarterPlan && OnboardingStarterPlan.getInitResult(),
    otBody: window.ot ? String(window.ot).slice(0, 80) : '',
  }));
  assert.equal(otState.otName, 'ot', 'window.ot must remain onboarding-i18n translator');
  assert.ok(!otState.otBody.includes('window.ot ? window.ot'), 'window.ot must not be onboarding.js delegator');
  if (otState.starter) assert.notEqual(otState.starter, 'inactive');
}

describe('onboarding child form interactive (prod slim path)', () => {
  for (const viewport of ['mobile', 'desktop']) {
    it(`slim signup: child name + birthday + routine (${viewport}, touch=${VIEWPORTS[viewport].hasTouch})`, async (t) => {
      const ctx = await createE2eContext();
      if (ctx.skip) {
        t.skip(ctx.reason);
        return;
      }
      if (!skipUnlessI18nStack(t)) {
        await ctx.close();
        return;
      }

      await enableProdSlimSignup(ctx);
      const session = await registerAndLogin(ctx.baseUrl);
      const errors = { pageErrors: [], consoleErrors: [], failedRequests: [] };

      const browser = await launchBrowser();
      try {
        const page = await newPage(browser, viewport);
        attachErrorCollectors(page, errors);

        await loginFreshParent(page, ctx.baseUrl, session);
        await sleep(1500);
        await assertNoOtRecursion(page);
        await runSlimChildStepInteraction(page);

        assert.equal(errors.pageErrors.length, 0, `page errors: ${errors.pageErrors.join('; ')}`);
      } finally {
        await browser.close();
        await ctx.close();
      }
    });
  }

  it('service worker registration does not block child fields (mobile)', async (t) => {
    const ctx = await createE2eContext();
    if (ctx.skip) {
      t.skip(ctx.reason);
      return;
    }
    if (!skipUnlessI18nStack(t)) {
      await ctx.close();
      return;
    }

    await enableProdSlimSignup(ctx);
    const session = await registerAndLogin(ctx.baseUrl);
    const browser = await launchBrowser();
    try {
      const page = await newPage(browser, 'mobile');
      await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/sw.js');
          } catch (_) { /* ignore in headless */ }
        }
      });
      await loginFreshParent(page, ctx.baseUrl, session);
      await page.waitForSelector('#spAnswer', { visible: true, timeout: 15000 });
      const insp = await inspectField(page, '#spAnswer');
      assert.equal(insp.exists, true);
      assert.equal(insp.blocksInput, false);
    } finally {
      await browser.close();
      await ctx.close();
    }
  });
});
