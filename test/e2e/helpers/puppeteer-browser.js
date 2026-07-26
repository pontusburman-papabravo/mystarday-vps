'use strict';

const puppeteer = require('puppeteer');

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

async function launchBrowser() {
  return puppeteer.launch({
    headless: process.env.E2E_HEADED === '1' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: null,
  });
}

async function newPage(browser, viewportName = 'desktop') {
  const page = await browser.newPage();
  const vp = VIEWPORTS[viewportName] || VIEWPORTS.desktop;
  await page.setViewport(vp);
  page.setDefaultTimeout(Number(process.env.E2E_TIMEOUT_MS || 45000));
  page.setDefaultNavigationTimeout(Number(process.env.E2E_NAV_TIMEOUT_MS || 60000));
  return page;
}

async function acceptCookies(page) {
  await page.evaluate(() => {
    const btn = document.querySelector('#cb-banner .cb-btn-accept, button.cb-btn-accept');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function waitForAuthEntryReady(page) {
  await page.waitForFunction(() => {
    const pending = document.documentElement.classList.contains('auth-entry-pending');
    const booted = window.authEntryI18nBootstrapped === true;
    const fallback = document.getElementById('auth-entry-fallback');
    const fallbackVisible = fallback && !fallback.hidden;
    return booted || fallbackVisible || !pending;
  }, { timeout: 15000 });
}

async function selectLoginLocale(page, locale) {
  await waitForAuthEntryReady(page);
  const selector = `[data-locale-value="${locale}"]`;
  await page.waitForSelector(selector, { visible: true, timeout: 15000 });
  await page.evaluate((loc) => {
    sessionStorage.setItem('sd_preferred_locale', loc);
    sessionStorage.setItem('sd_locale_explicit_choice', '1');
  }, locale);
  await page.click(selector);
  await page.waitForFunction((loc) => {
    const btn = document.querySelector(`[data-locale-value="${loc}"]`);
    const pressed = btn && btn.getAttribute('aria-pressed') === 'true';
    const choice = window.LoginLocale && LoginLocale.getPreAuthLocaleChoice
      ? LoginLocale.getPreAuthLocaleChoice() === loc
      : sessionStorage.getItem('sd_preferred_locale') === loc;
    return pressed || choice;
  }, { timeout: 12000 }, locale);
  await new Promise((r) => setTimeout(r, 500));
}

async function getVisibleChromeText(page) {
  return page.evaluate(() => {
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG']);
    const chunks = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent || '').trim();
        if (t) chunks.push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (skip.has(node.tagName)) return;
      const el = node;
      if (el.hidden || el.getAttribute('aria-hidden') === 'true') return;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (el.matches('input, textarea')) {
        const ph = el.getAttribute('placeholder');
        if (ph) chunks.push(ph);
        return;
      }
      for (const child of el.childNodes) walk(child);
    };
    walk(document.body);
    return chunks.join('\n');
  });
}

/** Parent shell chrome: bottom nav, header, primary headings — not activity grids. */
async function getParentShellChromeText(page) {
  return page.evaluate(() => {
    const roots = [
      '#parentBottomNav',
      '#parentNavHeader',
      '.parent-nav-header',
      '.parent-magic-header',
      'header[role="banner"]',
      'h1',
      '.magic-page-title',
      '.page-title',
      '#parentNavSidebar',
    ];
    const chunks = [];
    for (const sel of roots) {
      document.querySelectorAll(sel).forEach((el) => {
        const t = (el.innerText || el.textContent || '').trim();
        if (t) chunks.push(t);
      });
    }
    if (chunks.length === 0) {
      return (document.querySelector('h1')?.innerText || document.title || '').trim();
    }
    return chunks.join('\n');
  });
}

async function clearSessionCookies(page) {
  const client = await page.createCDPSession();
  await client.send('Network.clearBrowserCookies');
}

async function parentLogout(page) {
  try {
    await page.evaluate(async () => {
      if (window.Auth && typeof Auth.logout === 'function') {
        await Auth.logout();
      } else {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      }
    });
  } catch (_) {
    /* ignore */
  }
  await clearSessionCookies(page);
}

async function ensureParentLoginVisible(page) {
  await page.waitForFunction(() => {
    const section = document.getElementById('parent-login-section');
    const email = document.getElementById('email');
    if (!section || !email) return false;
    const style = window.getComputedStyle(section);
    return style.display !== 'none' && email.offsetParent !== null;
  }, { timeout: 15000 });
}

async function fillParentLogin(page, email, password) {
  await ensureParentLoginVisible(page);
  await page.waitForSelector('#email', { visible: true });
  await page.evaluate((em, pw) => {
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
    if (emailEl) emailEl.value = em;
    if (passEl) passEl.value = pw;
  }, email, password);
}

async function submitParentLogin(page) {
  await page.evaluate(() => {
    const form = document.getElementById('loginForm');
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      const btn = document.getElementById('submitBtn');
      if (btn) btn.click();
    }
  });
  await page.waitForFunction(
    () => /\/(dashboard|onboarding|family|planning|daily-log)/.test(window.location.pathname),
    { timeout: 90000 }
  );
}

async function enterChildPin(page, pin) {
  await page.waitForSelector('#clKeypad', { visible: true, timeout: 20000 });
  await page.evaluate((digits) => {
    for (const digit of String(digits)) {
      const btn = document.querySelector(`#clKeypad button[data-action="${digit}"]`);
      if (btn) btn.click();
    }
  }, pin);
  await page.waitForFunction(
    () => /\/child(\/today|-dashboard)/.test(window.location.pathname),
    { timeout: 45000 }
  );
}

module.exports = {
  VIEWPORTS,
  launchBrowser,
  newPage,
  acceptCookies,
  waitForAuthEntryReady,
  selectLoginLocale,
  getVisibleChromeText,
  getParentShellChromeText,
  clearSessionCookies,
  parentLogout,
  fillParentLogin,
  submitParentLogin,
  enterChildPin,
};
