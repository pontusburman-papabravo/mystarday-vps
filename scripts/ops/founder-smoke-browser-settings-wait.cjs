'use strict';

const { pageText } = require('./founder-smoke-browser-page-text.cjs');

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

  if (expected === 'en-GB') {
    await page
      .waitForFunction(
        () => {
          const body = document.body;
          if (!body) return false;
          const t = body.innerText || '';
          const main =
            /\bmission\b/i.test(t) || /\bnow\b/i.test(t) || /\bnext\b/i.test(t);
          const nav =
            /\btreasure chest\b/i.test(t) ||
            /\bmy collection\b/i.test(t) ||
            /\bmy world\b/i.test(t) ||
            /\bmy people\b/i.test(t);
          const lang = (document.documentElement.lang || '').toLowerCase();
          return main && (nav || (/\bnow\b/i.test(t) && /\bnext\b/i.test(t))) && lang.startsWith('en');
        },
        { timeout: timeoutMs }
      )
      .catch(() => null);
  } else {
    await page
      .waitForFunction(
        () => {
          const body = document.body;
          if (!body) return false;
          const t = body.innerText || '';
          return /\bidag\b/i.test(t) || /\bmorgon\b/i.test(t) || /\bdaglig logg\b/i.test(t);
        },
        { timeout: timeoutMs }
      )
      .catch(() => null);
  }
}

module.exports = {
  SETTINGS_ROOT_SELECTOR,
  waitForSettingsParentI18n,
  collectSettingsPageDiagnostics,
  waitForChildTodaySurface,
  pageText,
};
