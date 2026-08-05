'use strict';

const { pageText } = require('./founder-smoke-browser-page-text.cjs');
const {
  CHILD_TODAY_READY_ATTR,
  collectChildTodayCanonicalVisibleTextInPage,
} = require('./founder-smoke-browser-child-today-visible.cjs');

const SETTINGS_READY_ATTR = 'parentI18nReady';
const SETTINGS_ROOT_SELECTOR = 'main[data-settings-root]';
const DEFAULT_SETTINGS_I18N_TIMEOUT_MS = 45000;

/**
 * @param {import('puppeteer').Page} page
 * @param {{ timeoutMs?: number }} [opts]
 */
async function waitForSettingsParentI18n(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_SETTINGS_I18N_TIMEOUT_MS;
  try {
    await page.waitForFunction(
      (attr) => document.documentElement.dataset[attr] === 'true',
      { timeout: timeoutMs },
      SETTINGS_READY_ATTR
    );
  } catch (error) {
    const diagnostics = await collectSettingsPageDiagnostics(page);
    const err = new Error('settings_parent_i18n_ready_timeout');
    err.code = 'FOUNDER_SMOKE_SETTINGS_I18N_TIMEOUT';
    err.diagnostics = diagnostics;
    throw err;
  }
}

/**
 * @param {import('puppeteer').Page} page
 */
async function collectSettingsPageDiagnostics(page) {
  const probe = await page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel);
    const titleEl = document.querySelector('[data-i18n="settings.title"]');
    const saveEl = document.querySelector('[data-i18n="settings.family.save"]');
    const body = document.body;
    const bodySnippet = body
      ? String(body.innerText || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 280)
      : '';
    return {
      pathname: window.location.pathname,
      readyState: document.readyState,
      html_lang: document.documentElement.lang || '',
      parent_i18n_ready: document.documentElement.dataset.parentI18nReady === 'true',
      settings_root_present: Boolean(root),
      settings_title_text: titleEl ? String(titleEl.textContent || '').trim() : '',
      family_save_text: saveEl ? String(saveEl.textContent || '').trim() : '',
      body_text_snippet: bodySnippet,
      swedish_leaks: {
        familjeinställningar: /familjeinställningar/i.test(bodySnippet),
        spara_familjeinställningar: /spara familjeinställningar/i.test(bodySnippet),
      },
    };
  }, SETTINGS_ROOT_SELECTOR);

  return probe;
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ timeoutMs?: number, expectedChildUiLocale?: 'en-GB'|'sv-SE' }} [opts]
 */
async function waitForChildTodaySurface(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 45000;
  const expected = opts.expectedChildUiLocale || 'sv-SE';

  await page.waitForFunction(
    () =>
      window.location.pathname === '/child/today' ||
      window.location.pathname.startsWith('/child/dashboard'),
    { timeout: timeoutMs }
  );

  await page.waitForSelector('#childMainHeader', { timeout: timeoutMs });
  await page.waitForSelector('#childBottomNav', { timeout: timeoutMs });

  await page
    .waitForFunction(
      (readyAttr) => document.documentElement.dataset[readyAttr] === 'true',
      { timeout: timeoutMs },
      CHILD_TODAY_READY_ATTR
    )
    .catch(() => null);

  if (expected === 'en-GB') {
    await page
      .waitForFunction(
        () => {
          const lang = (document.documentElement.lang || '').toLowerCase();
          if (!lang.startsWith('en')) return false;
          const header = document.querySelector('#childMainHeader');
          const nav = document.querySelector('#childBottomNav');
          if (!header || !nav) return false;
          const mainT = header.innerText || '';
          const focus = document.querySelector('#todayFocusMount');
          const focusT = focus && !focus.classList.contains('hidden') ? focus.innerText || '' : '';
          const combinedMain = (mainT + '\n' + focusT).trim();
          const navT = nav.innerText || '';
          const main =
            /\bmission\b/i.test(combinedMain) ||
            /\bnow\b/i.test(combinedMain) ||
            /\bnext\b/i.test(combinedMain);
          const navOk =
            /\btreasure chest\b/i.test(navT) ||
            /\bmy collection\b/i.test(navT) ||
            /\bmy world\b/i.test(navT) ||
            /\bmy people\b/i.test(navT) ||
            /\btoday\b/i.test(navT);
          return main && navOk;
        },
        { timeout: timeoutMs }
      )
      .catch(() => null);
  } else {
    await page
      .waitForFunction(
        () => {
          const lang = (document.documentElement.lang || '').toLowerCase();
          if (!lang.startsWith('sv')) return false;
          const header = document.querySelector('#childMainHeader');
          const nav = document.querySelector('#childBottomNav');
          const t = ((header && header.innerText) || '') + '\n' + ((nav && nav.innerText) || '');
          return (
            /\bidag\b/i.test(t) ||
            /\bmorgon\b/i.test(t) ||
            /\bdaglig logg\b/i.test(t) ||
            /\bnu:\s/i.test(t) ||
            /\bsenare:\s/i.test(t)
          );
        },
        { timeout: timeoutMs }
      )
      .catch(() => null);
  }
}

/**
 * @param {import('puppeteer').Page} page
 */
async function collectChildTodayVisibleCopy(page) {
  return page.evaluate(collectChildTodayCanonicalVisibleTextInPage);
}

module.exports = {
  SETTINGS_ROOT_SELECTOR,
  waitForSettingsParentI18n,
  collectSettingsPageDiagnostics,
  waitForChildTodaySurface,
  collectChildTodayVisibleCopy,
  pageText,
};
