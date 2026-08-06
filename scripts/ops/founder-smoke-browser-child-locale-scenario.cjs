'use strict';

const { robustParentLogin } = require('./founder-smoke-browser-login.cjs');
const {
  createChildLoginApiCollector,
  waitForChildLoginBootstrap,
  buildChildLoginBootstrapError,
  readChildLoginDomState,
} = require('./founder-smoke-browser-child-bootstrap.cjs');
const { pageText } = require('./founder-smoke-browser-page-text.cjs');
const {
  evaluateChildTodaySessionPass,
  normalizeUsername,
} = require('./founder-smoke-browser-child.cjs');
const { waitChildTodayLocaleContract, sanitizeMe } = require('./founder-smoke-child-today-wait-contract.cjs');

async function cookieHeader(page) {
  const cs = await page.cookies();
  return cs.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function fetchMePage(page, base) {
  const res = await fetch(`${base}/api/auth/me`, {
    headers: { Cookie: await cookieHeader(page) },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

async function verifyChildLocaleViaApi(base, username, pin, expectedLocale, expectedEnglishChild) {
  const res = await fetch(`${base}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status !== 200) {
    return { ok: false, status: res.status, me: null };
  }
  const cookies = [];
  for (const c of res.headers.getSetCookie?.() || []) cookies.push(c.split(';')[0]);
  const h = cookies.join('; ');
  const me = await fetch(`${base}/api/auth/me`, {
    headers: { Cookie: h },
    cache: 'no-store',
  }).then((r) => (r.ok ? r.json() : null));
  const localeOk = me?.child_ui_locale === expectedLocale;
  const flagOk =
    expectedEnglishChild === undefined || me?.english_child_experience_enabled === expectedEnglishChild;
  return {
    ok: localeOk && flagOk,
    status: res.status,
    me: sanitizeMe(me),
  };
}

async function selectExpectedChild(page, expectedUsername) {
  const normExpected = normalizeUsername(expectedUsername);
  await page.waitForSelector('#clKeypad, .cl-child-card', { visible: true, timeout: 10000 }).catch(() => {});
  const hasCard = await page.evaluate((user) => {
    const norm = String(user || '').trim().toLowerCase();
    return [...document.querySelectorAll('.cl-child-card')].some(
      (el) => String(el.getAttribute('data-username') || '').trim().toLowerCase() === norm
    );
  }, normExpected);
  if (hasCard) {
    await page.evaluate((user) => {
      const norm = String(user || '').trim().toLowerCase();
      const card = [...document.querySelectorAll('.cl-child-card')].find(
        (el) => String(el.getAttribute('data-username') || '').trim().toLowerCase() === norm
      );
      card?.click();
    }, normExpected);
    await page.waitForSelector('#clKeypad', { visible: true, timeout: 20000 });
  } else {
    await page.evaluate((user) => {
      if (typeof window.selectChild === 'function') window.selectChild(user);
    }, expectedUsername);
    await page.waitForSelector('#clKeypad', { visible: true, timeout: 20000 }).catch(() => {});
  }
}

/**
 * @param {object} opts
 * @param {import('puppeteer').Browser} opts.browser
 * @param {string} opts.base
 * @param {string} opts.email
 * @param {string} opts.password
 * @param {string} opts.childUser
 * @param {string} opts.childPin
 * @param {'en-GB'|'sv-SE'} opts.expectedChildUiLocale
 * @param {boolean} [opts.expectedEnglishChildExperience]
 * @param {string} [opts.familyId]
 * @param {(familyId: string) => void|Promise<void>} [opts.prepareServerState]
 * @param {string} [opts.scenarioName]
 */
async function runChildLocaleScenarioInFreshContext(opts) {
  const {
    browser,
    base,
    email,
    password,
    childUser,
    childPin,
    expectedChildUiLocale,
    expectedEnglishChildExperience,
    familyId,
    prepareServerState,
    scenarioName,
  } = opts;

  if (familyId && prepareServerState) {
    await prepareServerState(familyId);
  }

  if (familyId) {
    const apiCheck = await verifyChildLocaleViaApi(
      base,
      childUser,
      childPin,
      expectedChildUiLocale,
      expectedEnglishChildExperience
    );
    if (!apiCheck.ok) {
      return {
        pass: false,
        reason: 'CHILD_LOCALE_CONTRACT_NOT_APPLIED',
        scenario: scenarioName,
        failed_step: 'pre_browser_api_child_locale',
        expected_locale: expectedChildUiLocale,
        expected_child_flag: expectedEnglishChildExperience,
        api_child_me: apiCheck.me,
        api_status: apiCheck.status,
      };
    }
  }

  const context = await browser.createBrowserContext();
  const collector = createChildLoginApiCollector();

  try {
    const page = await context.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    const detach = collector.attach(page);

    try {
      await robustParentLogin(page, browser, {
        base,
        email,
        password,
        fetchMe: () => fetchMePage(page, base),
      });

      await page.goto(`${base}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForChildLoginBootstrap(page, { collector });
      await selectExpectedChild(page, childUser);
      await page.evaluate((p) => {
        for (const digit of String(p)) {
          document.querySelector(`#clKeypad button[data-action="${digit}"]`)?.click();
        }
      }, childPin);

      const contract = await waitChildTodayLocaleContract(page, () => fetchMePage(page, base), {
        expectedChildUiLocale,
        expectedEnglishChildExperience,
        expectedUsername: childUser,
      });

      const todayBodyText = await pageText(page);
      const evalResult = evaluateChildTodaySessionPass({
        pathname: contract.dom.pathname,
        me: contract.me,
        expectedUsername: childUser,
        expectedChildUiLocale,
        todayBodyText,
        mainText: contract.visibleCopy.mainText,
        navText: contract.visibleCopy.navText,
        childTodayI18nReady: contract.visibleCopy.child_today_i18n_ready,
        htmlLang: contract.visibleCopy.html_lang,
      });

      return {
        path: contract.dom.pathname,
        me: sanitizeMe(contract.me),
        pass: evalResult.pass === true,
        reason: evalResult.reason,
        scenario: scenarioName,
        fresh_context: true,
        bootstrap_network: collector.snapshot(),
      };
    } catch (e) {
      if (e.code === 'CHILD_LOCALE_CONTRACT_NOT_APPLIED') {
        return {
          pass: false,
          reason: e.code,
          scenario: scenarioName,
          fresh_context: true,
          diagnostics: e.diagnostics,
          bootstrap_network: collector.snapshot(),
        };
      }
      if (e.code === 'FOUNDER_SMOKE_CHILD_LOGIN_BOOTSTRAP_FAILED') {
        return {
          pass: false,
          reason: e.code,
          scenario: scenarioName,
          fresh_context: true,
          bootstrap: e.diagnostics || null,
        };
      }
      return {
        pass: false,
        reason: e.code || e.message,
        scenario: scenarioName,
        fresh_context: true,
        bootstrap_network: collector.snapshot(),
      };
    } finally {
      detach();
    }
  } finally {
    await context.close();
  }
}

function prepareSc4ServerState(vpsDb, familyId) {
  vpsDb('set-locale', familyId, ['--locale', 'sv-SE']);
  vpsDb('set', familyId, ['--slug', 'english_app', '--off']);
  vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
}

function prepareSc2ServerState(vpsDb, familyId) {
  vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
  vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
  vpsDb('set', familyId, ['--slug', 'english_child_experience', '--on']);
}

function prepareSc3ServerState(vpsDb, familyId) {
  vpsDb('set-locale', familyId, ['--locale', 'en-GB']);
  vpsDb('set', familyId, ['--slug', 'english_app', '--on']);
  vpsDb('set', familyId, ['--slug', 'english_child_experience', '--off']);
}

module.exports = {
  runChildLocaleScenarioInFreshContext,
  verifyChildLocaleViaApi,
  prepareSc4ServerState,
  prepareSc2ServerState,
  prepareSc3ServerState,
};
