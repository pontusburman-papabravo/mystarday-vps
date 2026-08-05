#!/usr/bin/env node
'use strict';

/**
 * Founder prod smoke — browser (locale UI, handoff, reload, logout).
 */
const puppeteer = require('puppeteer');
const { vpsDb } = require('./founder-smoke-vps.cjs');
const { snapshotsEqual } = require('./founder-smoke-report-lib.cjs');
const { robustParentLogin } = require('./founder-smoke-browser-login.cjs');
const {
  evaluateChildTodaySessionPass,
  evaluateParentHandoffRestorePass,
  computeBrowserPass,
} = require('./founder-smoke-browser-child.cjs');
const {
  createChildLoginApiCollector,
  waitForChildLoginBootstrap,
  handoffFromSettingsSwitchUser,
  buildChildLoginBootstrapError,
  readChildLoginDomState,
} = require('./founder-smoke-browser-child-bootstrap.cjs');

const BASE = (process.env.SMOKE_BASE_URL || process.env.PROD_BASE || '').replace(/\/$/, '');
const EMAIL = process.env.FOUNDER_QA_EMAIL;
const PASSWORD = process.env.FOUNDER_QA_PASSWORD;
const CHILD_PIN = process.env.FOUNDER_CHILD_PIN;
const PARENT_PIN = process.env.FOUNDER_PARENT_PIN;
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

async function loginParent(page, browser) {
  await robustParentLogin(page, browser, {
    base: BASE,
    email: EMAIL,
    password: PASSWORD,
    fetchMe: () => fetchMe(page),
  });
}

async function pageText(page) {
  return page.evaluate(() => document.body.innerText || '');
}

async function selectExpectedChild(page, expectedUsername) {
  await page.waitForSelector('#clKeypad, .cl-child-card', { visible: true, timeout: 10000 }).catch(() => {});
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
 * @param {{ pinOverride?: string, navigate?: boolean } | string} [options]
 */
async function enterChildPin(page, expectedUsername, expectedChildUiLocale, options = {}) {
  let pinOverride;
  let navigate = true;
  if (typeof options === 'string') {
    pinOverride = options;
  } else {
    pinOverride = options.pinOverride;
    if (options.navigate === false) navigate = false;
  }

  const collector = createChildLoginApiCollector();
  const detach = collector.attach(page);

  try {
    if (navigate) {
      await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    try {
      await waitForChildLoginBootstrap(page, { collector });
    } catch (e) {
      if (e.code === 'FOUNDER_SMOKE_CHILD_LOGIN_BOOTSTRAP_FAILED') {
        e.diagnostics = { ...(e.diagnostics || {}), navigate, network: collector.snapshot() };
        throw e;
      }
      throw buildChildLoginBootstrapError({
        phase: 'enter_child_pin',
        error: e.message,
        dom: await readChildLoginDomState(page),
        network: collector.snapshot(),
        final_url: page.url(),
        navigate,
      });
    }
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
      bootstrap_network: collector.snapshot(),
    };
  } finally {
    detach();
  }
}

async function enterParentPinOverlay(page) {
  if (!PARENT_PIN) return false;
  await page.waitForSelector('#ppin-gate-overlay', { visible: true, timeout: 15000 }).catch(() => null);
  if (!(await page.$('#ppin-gate-overlay'))) return false;
  await page.evaluate((pin) => {
    const kbd = document.getElementById('ppgo-keypad');
    if (!kbd) return;
    const buttons = [...kbd.querySelectorAll('button')];
    for (const digit of String(pin)) {
      buttons.find((b) => b.textContent.trim() === digit)?.click();
    }
    buttons.find((b) => b.textContent.trim() === '✓')?.click();
  }, PARENT_PIN);
  return true;
}

/** Child logout handoff → parent session without email/password login. */
async function runChildPinScenario(page, expectedUsername, expectedChildUiLocale, options) {
  try {
    const result = await enterChildPin(page, expectedUsername, expectedChildUiLocale, options);
    return { ...result, pass: result.pass === true };
  } catch (e) {
    return {
      pass: false,
      reason: e.code || e.message,
      bootstrap: e.diagnostics || null,
    };
  }
}

async function returnToParentViaChildHandoff(page, expectedEmail, expectedFamilyId) {
  await page.evaluate(() => document.getElementById('logoutBtn')?.click());
  await page
    .waitForFunction(
      () =>
        document.getElementById('ppin-gate-overlay') ||
        /\/(dashboard|planning|settings)/.test(window.location.pathname),
      { timeout: 30000 }
    )
    .catch(() => {});

  if (await page.$('#ppin-gate-overlay')) {
    const entered = await enterParentPinOverlay(page);
    if (!entered) {
      return { pass: false, reason: 'parent_pin_overlay_without_FOUNDER_PARENT_PIN' };
    }
    await page
      .waitForFunction(
        () => /\/(dashboard|planning|settings)/.test(window.location.pathname),
        { timeout: 45000 }
      )
      .catch(() => {});
  }

  const path = await page.evaluate(() => window.location.pathname);
  const onLoginForm = await page.evaluate(() => Boolean(document.getElementById('loginForm')));
  const me = await fetchMe(page);
  const evalResult = evaluateParentHandoffRestorePass({
    me,
    path,
    onLoginForm,
    expectedEmail,
    expectedFamilyId,
  });

  return {
    pass: evalResult.pass === true,
    path,
    parent_me: me ? { type: me.type, email: me.email, family_id: me.family_id } : null,
    reason: evalResult.pass ? undefined : evalResult.reason || 'parent_session_not_restored',
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

    await loginParent(page, browser);
    const me0 = await fetchMe(page);
    familyId = me0?.family_id;
    const astrid = (me0?.children || []).find((c) => /astrid/i.test(c.name));
    if (!CHILD_USER && astrid) CHILD_USER = astrid.username;
    if (!CHILD_USER) throw new Error('child username unknown for browser smoke');

    if (VPS_ON && familyId) snap = vpsDb('snapshot', familyId);

    try {
      const child4 = await runChildPinScenario(page, CHILD_USER, 'sv-SE');
      scenarios.browser_sc4_sv_control = child4;

      if (VPS_ON && familyId) {
        vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
        vpsDb('set', familyId, ['--slug', 'english_app', '--off']);
        await loginParent(page, browser);
        const settingsReachable = await openSettings(page);
        const enMe = await fetchMe(page);
        const enParentText = await pageText(page);
        scenarios.browser_sc1_parent_english = {
          pass:
            settingsReachable === true &&
            enMe?.type === 'parent' &&
            enMe?.preferred_locale === 'en-GB' &&
            /\bfamily\b/i.test(enParentText) &&
            (/language/i.test(enParentText) || /profile/i.test(enParentText)) &&
            !/familjeinställningar/i.test(enParentText),
        };

        vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
        vpsDb('set', familyId, ['--slug', 'english_child_experience', '--on']);
        const childEn = await runChildPinScenario(page, CHILD_USER, 'en-GB');
        scenarios.browser_sc2_child_english = childEn;

        vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
        await loginParent(page, browser);
        const childSv = await runChildPinScenario(page, CHILD_USER, 'sv-SE');
        scenarios.browser_sc3_child_separation = childSv;

        await loginParent(page, browser);
        const handoffSettings = await openSettings(page);
        let handoffNav = { pass: false, reason: 'settings_not_reachable' };
        if (handoffSettings) {
          try {
            handoffNav = await handoffFromSettingsSwitchUser(page, {
              fetchMe: () => fetchMe(page),
              expectedParentEmail: EMAIL,
            });
          } catch (e) {
            handoffNav = {
              pass: false,
              reason: e.code || e.message,
              bootstrap: e.diagnostics || null,
            };
          }
        }
        const handoffPath =
          handoffNav.pathname ||
          (await page.evaluate(() => window.location.pathname));
        const handoffChild = handoffNav.pass
          ? await runChildPinScenario(page, CHILD_USER, 'sv-SE', { navigate: false })
          : {
              pass: false,
              reason: 'handoff_route_or_bootstrap_failed',
              handoff: handoffNav,
            };
        const handoffParent = handoffChild.pass
          ? await returnToParentViaChildHandoff(page, EMAIL, familyId)
          : { pass: false, reason: 'child_handoff_login_failed' };
        scenarios.browser_handoff = {
          pass:
            handoffSettings &&
            handoffNav.pass === true &&
            handoffChild.pass === true &&
            handoffParent.pass === true,
          path: handoffPath,
          handoff_navigation: handoffNav,
          child: handoffChild,
          parent_return: handoffParent,
        };
      } else {
        const vpsRequired = { pass: false, reason: 'FOUNDER_SMOKE_VPS=1 not set' };
        scenarios.browser_sc1_parent_english = { ...vpsRequired };
        scenarios.browser_sc2_child_english = { ...vpsRequired };
        scenarios.browser_sc3_child_separation = { ...vpsRequired };
        scenarios.browser_handoff = { ...vpsRequired };
      }

      await loginParent(page, browser).catch(() => {});
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
