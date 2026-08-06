'use strict';

const {
  CHILD_TODAY_READY_ATTR,
  collectChildTodayCanonicalVisibleTextInPage,
} = require('./founder-smoke-browser-child-today-visible.cjs');
const {
  evaluateChildTodaySessionPass,
} = require('./founder-smoke-browser-child.cjs');

const DEFAULT_STEP_TIMEOUT_MS = 45000;
const POLL_MS = 250;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function contractError(step, diagnostics) {
  const err = new Error('CHILD_LOCALE_CONTRACT_NOT_APPLIED');
  err.code = 'CHILD_LOCALE_CONTRACT_NOT_APPLIED';
  err.diagnostics = { failed_step: step, ...diagnostics };
  return err;
}

async function readDomSignals(page) {
  return page.evaluate((readyAttr) => {
    const html = document.documentElement;
    return {
      pathname: window.location.pathname,
      body_present: Boolean(document.body),
      html_lang: html.lang || '',
      childTodayI18nReady: html.dataset[readyAttr] === 'true',
      childTodayI18nLocale: html.dataset.childTodayI18nLocale || '',
    };
  }, CHILD_TODAY_READY_ATTR);
}

/**
 * @param {import('puppeteer').Page} page
 * @param {() => Promise<object|null>} fetchMe
 * @param {{ expectedChildUiLocale: 'en-GB'|'sv-SE', expectedEnglishChildExperience?: boolean, timeoutMs?: number }} opts
 */
async function waitChildTodayLocaleContract(page, fetchMe, opts) {
  const expectedLocale = opts.expectedChildUiLocale;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  let lastMe = null;
  let lastDom = null;
  let lastCopy = null;

  const remaining = () => Math.max(0, deadline - Date.now());

  // Step: pathname
  try {
    await page.waitForFunction(
      () =>
        window.location.pathname === '/child/today' ||
        window.location.pathname.startsWith('/child/dashboard'),
      { timeout: remaining() }
    );
  } catch {
    lastDom = await readDomSignals(page).catch(() => null);
    throw contractError('pathname_child_today', {
      expected_locale: expectedLocale,
      pathname: lastDom?.pathname ?? null,
      last_me: sanitizeMe(lastMe),
    });
  }

  // Step: auth me child + locale (+ optional english_child_experience flag)
  while (Date.now() < deadline) {
    lastMe = await fetchMe();
    if (
      lastMe?.type === 'child' &&
      lastMe.child_ui_locale === expectedLocale &&
      (opts.expectedEnglishChildExperience === undefined ||
        lastMe.english_child_experience_enabled === opts.expectedEnglishChildExperience)
    ) {
      break;
    }
    await sleep(POLL_MS);
  }
  if (
    !lastMe ||
    lastMe.type !== 'child' ||
    lastMe.child_ui_locale !== expectedLocale ||
    (opts.expectedEnglishChildExperience !== undefined &&
      lastMe.english_child_experience_enabled !== opts.expectedEnglishChildExperience)
  ) {
    throw contractError('auth_me_child_locale', {
      expected_locale: expectedLocale,
      actual_locale: lastMe?.child_ui_locale ?? null,
      expected_child_flag: opts.expectedEnglishChildExperience,
      actual_child_flag: lastMe?.english_child_experience_enabled ?? null,
      me_type: lastMe?.type ?? null,
      pathname: (await readDomSignals(page).catch(() => ({}))).pathname,
    });
  }

  // Step: body
  try {
    await page.waitForFunction(() => Boolean(document.body), { timeout: remaining() });
  } catch {
    throw contractError('document_body', {
      expected_locale: expectedLocale,
      last_me: sanitizeMe(lastMe),
    });
  }

  await page.waitForSelector('#childMainHeader', { timeout: remaining() }).catch(() => null);
  await page.waitForSelector('#childBottomNav', { timeout: remaining() }).catch(() => null);

  // Step: i18n ready + html lang (locale-bound when dataset present)
  const langPrefix = expectedLocale.toLowerCase().startsWith('en') ? 'en' : 'sv';
  try {
    await page.waitForFunction(
      (readyAttr, expectedLoc, prefix) => {
        const html = document.documentElement;
        if (html.dataset[readyAttr] !== 'true') return false;
        const readyLocale = (html.dataset.childTodayI18nLocale || '').toLowerCase();
        if (readyLocale && readyLocale !== expectedLoc.toLowerCase()) {
          const readyPrefix = readyLocale.startsWith('en') ? 'en' : readyLocale.startsWith('sv') ? 'sv' : '';
          const expPrefix = expectedLoc.toLowerCase().startsWith('en') ? 'en' : 'sv';
          if (readyPrefix && readyPrefix !== expPrefix) return false;
        }
        const lang = (html.lang || '').toLowerCase();
        return lang.startsWith(prefix);
      },
      { timeout: remaining() },
      CHILD_TODAY_READY_ATTR,
      expectedLocale,
      langPrefix
    );
  } catch {
    lastDom = await readDomSignals(page).catch(() => null);
    throw contractError('i18n_ready_and_lang', {
      expected_locale: expectedLocale,
      html_lang: lastDom?.html_lang ?? null,
      childTodayI18nReady: lastDom?.childTodayI18nReady ?? null,
      childTodayI18nLocale: lastDom?.childTodayI18nLocale ?? null,
      last_me: sanitizeMe(lastMe),
    });
  }

  // Step: visible copy markers
  const copyDeadline = Date.now() + remaining();
  const pathname = await page.evaluate(() => window.location.pathname);
  while (Date.now() < copyDeadline) {
    lastCopy = await page.evaluate(collectChildTodayCanonicalVisibleTextInPage);
    const evalProbe = evaluateChildTodaySessionPass({
      pathname,
      me: lastMe,
      expectedUsername: opts.expectedUsername,
      expectedChildUiLocale: expectedLocale,
      mainText: lastCopy.mainText,
      navText: lastCopy.navText,
      childTodayI18nReady: lastCopy.child_today_i18n_ready,
      htmlLang: lastCopy.html_lang,
    });
    if (evalProbe.pass) {
      return {
        me: lastMe,
        visibleCopy: lastCopy,
        dom: await readDomSignals(page),
      };
    }
    await sleep(POLL_MS);
  }

  lastDom = await readDomSignals(page).catch(() => null);
  throw contractError('visible_main_nav_copy', {
    expected_locale: expectedLocale,
    main_copy_snippet: String(lastCopy?.mainText || '').slice(0, 120),
    nav_copy_snippet: String(lastCopy?.navText || '').slice(0, 120),
    html_lang: lastDom?.html_lang ?? null,
    childTodayI18nReady: lastDom?.childTodayI18nReady ?? null,
    childTodayI18nLocale: lastDom?.childTodayI18nLocale ?? null,
    last_me: sanitizeMe(lastMe),
    pathname: lastDom?.pathname ?? null,
  });
}

function sanitizeMe(me) {
  if (!me) return null;
  return {
    type: me.type,
    child_ui_locale: me.child_ui_locale,
    english_child_experience_enabled: me.english_child_experience_enabled,
    username: me.username,
    family_id: me.family_id,
  };
}

module.exports = {
  waitChildTodayLocaleContract,
  contractError,
  sanitizeMe,
  DEFAULT_STEP_TIMEOUT_MS,
};
