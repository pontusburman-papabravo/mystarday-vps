'use strict';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNavigationOrDetachedContextError(error) {
  const msg = String(error && error.message ? error.message : error || '');
  return (
    /Execution context was destroyed/i.test(msg) ||
    /Cannot find context/i.test(msg) ||
    /Target closed/i.test(msg) ||
    /detached Frame/i.test(msg) ||
    /Navigating frame was detached/i.test(msg)
  );
}

function readBodyInnerTextSync() {
  const body = typeof document !== 'undefined' ? document.body : null;
  return body ? body.innerText || '' : '';
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ timeoutMs?: number, retries?: number }} [opts]
 */
async function pageText(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const retries = opts.retries ?? 3;
  const timeoutPerAttempt = Math.max(2000, Math.floor(timeoutMs / retries));

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await page.waitForFunction(
        () => typeof document !== 'undefined' && Boolean(document.body),
        { timeout: timeoutPerAttempt }
      );
      const result = await page.evaluate(readBodyInnerTextSync);
      if (result) return result;
    } catch (error) {
      if (!isNavigationOrDetachedContextError(error)) throw error;
    }
    await delay(150 * (attempt + 1));
  }

  try {
    return await page.evaluate(readBodyInnerTextSync);
  } catch (error) {
    if (isNavigationOrDetachedContextError(error)) return '';
    throw error;
  }
}

module.exports = {
  delay,
  isNavigationOrDetachedContextError,
  readBodyInnerTextSync,
  pageText,
};
