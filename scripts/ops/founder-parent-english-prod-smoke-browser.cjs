#!/usr/bin/env node
'use strict';

/**
 * Founder prod smoke — browser (parent/child locale UI, handoff, reload, logout).
 * VPS phases mirror API scenarios 1–4 UI; does not toggle english_app_global.
 */
const puppeteer = require('puppeteer');
const { vpsDb } = require('./founder-smoke-vps.cjs');
const { snapshotsEqual } = require('./founder-smoke-report-lib.cjs');

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

async function enterChildPin(page) {
  await page.waitForSelector('#clKeypad', { visible: true, timeout: 30000 }).catch(() => null);
  if (!(await page.$('#clKeypad'))) return false;
  await page.evaluate((pin) => {
    for (const digit of String(pin)) {
      document.querySelector(`#clKeypad button[data-action="${digit}"]`)?.click();
    }
  }, CHILD_PIN);
  await page
    .waitForFunction(() => /\/child/.test(window.location.pathname), { timeout: 60000 })
    .catch(() => {});
  return (await page.evaluate(() => window.location.pathname)).includes('child');
}

async function childLoginFlow(page) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return enterChildPin(page);
}

async function openSettings(page) {
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() =>
    page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  );
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
      const settingsOk = await openSettings(page);
      const svText = await pageText(page);
      scenarios.browser_sc4_sv_control = {
        pass:
          settingsOk &&
          (/språk/i.test(svText) || /familjeinställningar/i.test(svText)) &&
          !/\bfamily settings\b/i.test(svText),
        settings_reachable: settingsOk,
      };

      if (VPS_ON && familyId) {
        vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
        vpsDb('set', familyId, ['--slug', 'english_app', '--off']);
        await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
        await fillParentLogin(page, EMAIL, PASSWORD);
        await page.waitForFunction(
          () => /\/(dashboard|onboarding|planning)/.test(window.location.pathname),
          { timeout: 90000 }
        );
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
        const childEn = await childLoginFlow(page);
        const childEnText = await pageText(page);
        scenarios.browser_sc2_child_english = {
          pass:
            childEn &&
            (/\btoday\b/i.test(childEnText) || /who are you/i.test(childEnText) || /log in as a child/i.test(childEnText)),
          on_child_path: childEn,
        };

        vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
        await loginParent(page);
        const childSv = await childLoginFlow(page);
        const childSvText = await pageText(page);
        scenarios.browser_sc3_child_separation = {
          pass:
            childSv &&
            (/idag/i.test(childSvText) || /vem är du/i.test(childSvText) || /logga in som barn/i.test(childSvText)),
          on_child_path: childSv,
        };

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
        const handoffChild = await enterChildPin(page).catch(() => false);
        scenarios.browser_handoff = {
          pass:
            handoffSettings &&
            (handoffPath.includes('child-login') || handoffPath.includes('login')) &&
            handoffChild,
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
      }
    }

    const allPass = Object.values(scenarios).every((s) => s.pass === true);
    return {
      part: 'browser',
      base: BASE,
      scenarios,
      browser: { scenarios, pass: allPass },
      ...restoreMeta,
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

module.exports = { runBrowserSmoke };
