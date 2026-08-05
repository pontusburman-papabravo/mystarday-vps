#!/usr/bin/env node
'use strict';

/**
 * Founder prod smoke — browser (locale UI, handoff, reload, logout).
 */
const puppeteer = require('puppeteer');
const { vpsDb } = require('./founder-smoke-vps.cjs');
const { snapshotsEqual } = require('./founder-smoke-report-lib.cjs');
const {
  evaluateChildTodaySessionPass,
  computeBrowserPass,
} = require('./founder-smoke-browser-child.cjs');

const BASE = (process.env.SMOKE_BASE_URL || process.env.PROD_BASE || '').replace(/\/$/, '');
const EMAIL = process.env.FOUNDER_QA_EMAIL;
const PASSWORD = process.env.FOUNDER_QA_PASSWORD;
const CHILD_PIN = process.env.FOUNDER_CHILD_PIN;
let CHILD_USER = process.env.FOUNDER_CHILD_USERNAME;
const VPS_ON = process.env.FOUNDER_SMOKE_VPS === '1';

async function cookieHeader(page) {
  const cs = await page.cookies();
  return cs.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function fetchMe(page) {
  const res = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: await cookieHeader(page) },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fillParentLogin(page, email, password) {
  await page.waitForSelector('#email', { visible: true, timeout: 30000 });
  await page.evaluate((em, pw) => {
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
    if (emailEl) emailEl.value = em;
    if (passEl) passEl.value = pw;
  }, email, password);
  await page.evaluate(() => {
    const form = document.getElementById('loginForm');
    if (form?.requestSubmit) form.requestSubmit();
    else document.getElementById('submitBtn')?.click();
  });
}

async function loginParent(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await fillParentLogin(page, EMAIL, PASSWORD);
  await page.waitForFunction(
    () => /\/(dashboard|onboarding|planning)/.test(window.location.pathname),
    { timeout: 90000 }
  );
}

async function pageText(page) {
  return page.evaluate(() => document.body.innerText || '');
}

async function selectExpectedChild(page, expectedUsername) {
  await page.waitForSelector('#clKeypad, .cl-child-card', { visible: true, timeout: 30000 });
  const hasCard = await page.$(`.cl-child-card[data-username="${expectedUsername}"]`);
  if (hasCard) {
    await page.evaluate((user) => {
      document.querySelector(`.cl-child-card[data-username="${user}"]`)?.click();
    }, expectedUsername);
    await page.waitForSelector('#clKeypad', { visible: true, timeout: 20000 });
  } else {
    await page.evaluate((user) => {
      if (typeof window.selectChild === 'function') window.selectChild(user);
    }, expectedUsername);
    await page.waitForSelector('#clKeypad', { visible: true, timeout: 20000 }).catch(() => {});
  }
}

/**
 * @param {import('puppeteer').Page} page
 * @param {string} expectedUsername
 * @param {'en-GB'|'sv-SE'} expectedChildUiLocale
 * @param {string} [pinOverride]
 */
async function enterChildPin(page, expectedUsername, expectedChildUiLocale, pinOverride) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await selectExpectedChild(page, expectedUsername);

  const pin = pinOverride != null ? pinOverride : CHILD_PIN;
  await page.evaluate((p) => {
    for (const digit of String(p)) {
      document.querySelector(`#clKeypad button[data-action="${digit}"]`)?.click();
    }
  }, pin);

  try {
    await page.waitForFunction(
      () =>
        window.location.pathname === '/child/today' ||
        window.location.pathname.startsWith('/child/dashboard'),
      { timeout: 60000 }
    );
  } catch {
    // stay on login — evaluated below
  }

  const pathname = await page.evaluate(() => window.location.pathname);
  const me = await fetchMe(page);
  const todayBodyText = await pageText(page);
  const evalResult = evaluateChildTodaySessionPass({
    pathname,
    me,
    expectedUsername,
    expectedChildUiLocale,
    todayBodyText,
  });

  return {
    path: pathname,
    me,
    pass: evalResult.pass === true,
    reason: evalResult.reason,
  };
}

async function openSettings(page) {
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  return !(await page.evaluate(() => window.location.pathname)).includes('/login');
}

async function clickLogout(page) {
  await page.evaluate(() => {
    document.getElementById('logoutBtn')?.click();
    document.getElementById('nativeLogoutBtn')?.click();
  });
  await page
    .waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.startsWith('/login'),
      { timeout: 25000 }
    )
    .catch(() => {});
}

async function runBrowserSmoke() {
  if (!EMAIL || !PASSWORD || !CHILD_PIN || !BASE) {
    throw new Error('Missing FOUNDER_QA_* or SMOKE_BASE_URL');
  }
  if (VPS_ON && !process.env.VPS_APP_PATH) {
    throw new Error('FOUNDER_SMOKE_VPS=1 requires VPS_APP_PATH');
  }

  const scenarios = {};
  const browser = await puppeteer.launch({
    headless: process.env.E2E_HEADED === '1' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let familyId = null;
  let snap = null;
  let restoreMeta = null;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    await loginParent(page);
    const me0 = await fetchMe(page);
    familyId = me0?.family_id;
    const astrid = (me0?.children || []).find((c) => /astrid/i.test(c.name));
    if (!CHILD_USER && astrid) CHILD_USER = astrid.username;
    if (!CHILD_USER) throw new Error('child username unknown for browser smoke');

    if (VPS_ON && familyId) snap = vpsDb('snapshot', familyId);

    try {
      const child4 = await enterChildPin(page, CHILD_USER, 'sv-SE');
      scenarios.browser_sc4_sv_control = {
        ...child4,
        pass: child4.pass === true,
      };

      if (VPS_ON && familyId) {
        vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
        vpsDb('set', familyId, ['--slug', 'english_app', '--off']);
        await loginParent(page);
        await openSettings(page);
        const enParentText = await pageText(page);
        scenarios.browser_sc1_parent_english = {
          pass:
            /\bfamily\b/i.test(enParentText) &&
            (/language/i.test(enParentText) || /profile/i.test(enParentText)) &&
            !/familjeinställningar/i.test(enParentText),
        };

        vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
        vpsDb('set', familyId, ['--slug', 'english_child_experience', '--on']);
        const childEn = await enterChildPin(page, CHILD_USER, 'en-GB');
        scenarios.browser_sc2_child_english = childEn;

        vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
        await loginParent(page);
        const childSv = await enterChildPin(page, CHILD_USER, 'sv-SE');
        scenarios.browser_sc3_child_separation = childSv;

        await loginParent(page);
        const handoffSettings = await openSettings(page);
        if (handoffSettings) {
          await page.evaluate(() => document.getElementById('switchUserBtn')?.click());
          await page
            .waitForFunction(
              () => /child-login|login-picker/.test(window.location.pathname),
              { timeout: 20000 }
            )
            .catch(() => {});
        }
        const handoffPath = await page.evaluate(() => window.location.pathname);
        const handoffChild = await enterChildPin(page, CHILD_USER, 'sv-SE');
        scenarios.browser_handoff = {
          pass:
            handoffSettings &&
            (handoffPath.includes('child-login') || handoffPath.includes('login')) &&
            handoffChild.pass === true,
          path: handoffPath,
        };
      } else {
        const vpsRequired = { pass: false, reason: 'FOUNDER_SMOKE_VPS=1 not set' };
        scenarios.browser_sc1_parent_english = { ...vpsRequired };
        scenarios.browser_sc2_child_english = { ...vpsRequired };
        scenarios.browser_sc3_child_separation = { ...vpsRequired };
        scenarios.browser_handoff = { ...vpsRequired };
      }

      await loginParent(page).catch(() => {});
      const logoutSettings = await openSettings(page);
      scenarios.browser_settings_reachable = { pass: logoutSettings };
      if (logoutSettings) {
        await clickLogout(page);
        const afterLogout = await page.evaluate(() => window.location.pathname);
        scenarios.browser_logout = {
          pass: afterLogout === '/' || afterLogout.startsWith('/login'),
          path: afterLogout,
        };
        await page.reload({ waitUntil: 'domcontentloaded' });
        const afterReload = await page.evaluate(() => window.location.pathname);
        scenarios.browser_reload_cache = {
          pass: afterReload === '/' || afterReload.startsWith('/login'),
          path: afterReload,
        };
      } else {
        scenarios.browser_logout = { pass: false, reason: 'settings not reachable' };
        scenarios.browser_reload_cache = { pass: false, reason: 'settings not reachable' };
      }
    } finally {
      if (snap && familyId && VPS_ON) {
        const restored = vpsDb('restore', familyId, snap);
        restoreMeta = {
          restored: restored?.ok === true,
          restore_matches_snapshot:
            restored?.restore_matches_snapshot === true || snapshotsEqual(snap, restored?.after),
        };
      } else if (VPS_ON) {
        restoreMeta = { restored: false, restore_matches_snapshot: false };
      }
    }

    const passBits = computeBrowserPass({ scenarios, restoreMeta, vpsOn: VPS_ON });
    return {
      part: 'browser',
      base: BASE,
      scenarios,
      restore: restoreMeta,
      browser: {
        scenarios,
        scenarios_pass: passBits.scenariosPass,
        restore_pass: passBits.restorePass,
        pass: passBits.pass,
      },
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const report = await runBrowserSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.browser?.pass) process.exit(1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(JSON.stringify({ overall: 'INCOMPLETE', errors: [e.message] }, null, 2));
    process.exit(1);
  });
}

module.exports = { runBrowserSmoke, enterChildPin, selectExpectedChild, evaluateChildTodaySessionPass };
