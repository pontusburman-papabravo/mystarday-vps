'use strict';

const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_NAV_TIMEOUT_MS = 60_000;
const EMAIL_VISIBLE_TIMEOUT_MS = 30_000;
const BODY_TEXT_MAX = 800;

const SECRET_PATTERNS = [
  /password/i,
  /pin/i,
  /authorization/i,
  /cookie/i,
  /bearer\s+/i,
  /csrf/i,
  /token/i,
];

function redactDiagnosticsValue(key, value) {
  if (value == null) return value;
  const s = String(value);
  if (SECRET_PATTERNS.some((re) => re.test(key))) return '[redacted]';
  return s
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]')
    .slice(0, BODY_TEXT_MAX);
}

function sanitizeDiagnostics(diag) {
  const out = {};
  for (const [k, v] of Object.entries(diag || {})) {
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeDiagnostics(item)
          : redactDiagnosticsValue(k, item)
      );
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizeDiagnostics(v);
    } else {
      out[k] = redactDiagnosticsValue(k, v);
    }
  }
  return out;
}

function createAttemptCollector() {
  const consoleErrors = [];
  const failedRequests = [];
  const unauthorizedEndpoints = [];

  function attach(page) {
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text().slice(0, 200));
      }
    };
    const onRequestFailed = (req) => {
      failedRequests.push({
        url: req.url().replace(/([?&])(token|password|pin|csrf)[^&]*/gi, '$1[redacted]'),
        method: req.method(),
      });
    };
    const onResponse = (res) => {
      if (res.status() === 401) {
        const u = res.url();
        if (!u.includes('password') && !u.includes('pin')) {
          unauthorizedEndpoints.push(u.split('?')[0]);
        }
      }
    };
    page.on('console', onConsole);
    page.on('requestfailed', onRequestFailed);
    page.on('response', onResponse);
    return () => {
      page.off('console', onConsole);
      page.off('requestfailed', onRequestFailed);
      page.off('response', onResponse);
    };
  }

  function snapshot() {
    return {
      console_errors: [...consoleErrors].slice(-10),
      failed_requests: [...failedRequests].slice(-10),
      unauthorized_endpoints: [...new Set(unauthorizedEndpoints)].slice(-10),
    };
  }

  function reset() {
    consoleErrors.length = 0;
    failedRequests.length = 0;
    unauthorizedEndpoints.length = 0;
  }

  return { attach, snapshot, reset };
}

async function readLoginPageState(page) {
  const state = await page.evaluate(() => {
    const email = document.getElementById('email');
    const inputs = [...document.querySelectorAll('input')].map((el) => ({
      id: el.id || null,
      name: el.name || null,
      type: el.type || null,
    }));
    return {
      pathname: window.location.pathname,
      title: document.title,
      readyState: document.readyState,
      has_email: Boolean(email),
      has_login_form: Boolean(document.getElementById('loginForm')),
      inputs,
      body_text_snippet: (document.body?.innerText || '').slice(0, 800),
    };
  });
  let swStatus = 'unsupported';
  try {
    swStatus = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported';
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length > 0 ? 'registered' : 'none';
    });
  } catch {
    swStatus = 'unknown';
  }
  return { ...state, service_worker: swStatus };
}

async function clearBrowserSession(page, browser) {
  const client = await page.createCDPSession();
  try {
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
  } catch {
    // CDP may be unavailable in some environments — fall back to cookie API
    const cookies = await page.cookies();
    if (cookies.length) {
      await page.deleteCookie(...cookies);
    }
  } finally {
    await client.detach().catch(() => {});
  }

  await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

/**
 * @param {import('puppeteer').Page} page
 * @param {string} base
 * @param {() => Promise<object|null>} fetchMe
 */
async function ensureAnonymousForLogin(page, base, fetchMe) {
  const me = await fetchMe();
  if (!me || !me.type) return { cleared: false };

  await page.evaluate(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      /* ignore */
    }
  });

  return { cleared: true, had_session_type: me.type };
}

async function navigateToVisibleLoginForm(page, base) {
  const loginUrl = `${base.replace(/\/$/, '')}/login`;
  const response = await page.goto(loginUrl, {
    waitUntil: 'domcontentloaded',
    timeout: LOGIN_NAV_TIMEOUT_MS,
  });
  await page.waitForSelector('#email', { visible: true, timeout: EMAIL_VISIBLE_TIMEOUT_MS });
  const pageState = await readLoginPageState(page);
  return {
    ok: true,
    http_status: response?.status() ?? null,
    final_url: page.url(),
    page: pageState,
  };
}

async function submitParentCredentials(page, email, password) {
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

function buildLoginFailureError(attempts) {
  const err = new Error('parent_login_form_unreachable');
  err.code = 'FOUNDER_SMOKE_LOGIN_FORM_FAILED';
  err.attempts = attempts.map((a) => sanitizeDiagnostics(a));
  err.message = `Waiting for selector \`#email\` failed after ${attempts.length} attempts`;
  return err;
}

/**
 * @param {import('puppeteer').Page} page
 * @param {import('puppeteer').Browser} browser
 * @param {object} opts
 * @param {string} opts.base
 * @param {string} opts.email
 * @param {string} opts.password
 * @param {() => Promise<object|null>} opts.fetchMe
 * @param {object} [opts.deps] — test overrides
 */
async function robustParentLogin(page, browser, opts) {
  const { base, email, password, fetchMe, deps = {} } = opts;
  const attempts = [];
  const collector = createAttemptCollector();
  const detach = collector.attach(page);

  const clearSession = deps.clearBrowserSession || clearBrowserSession;
  const ensureAnonymous =
    deps.ensureAnonymousForLogin ||
    ((p) => ensureAnonymousForLogin(p, base, fetchMe));
  const navigateLogin =
    deps.navigateToVisibleLoginForm ||
    ((p) => navigateToVisibleLoginForm(p, base));
  const submitCreds = deps.submitParentCredentials || submitParentCredentials;
  const waitDashboard =
    deps.waitForParentDashboard ||
    (async (p) => {
      await p.waitForFunction(
        () => /\/(dashboard|onboarding|planning)/.test(window.location.pathname),
        { timeout: 90_000 }
      );
    });

  try {
    for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt += 1) {
      collector.reset();
      if (attempt > 1) {
        await clearSession(page, browser);
      }

      const anon = await ensureAnonymous(page);
      let step = { attempt, phase: 'open_login', session_clear: anon };

      try {
        const nav = await navigateLogin(page);
        step = { ...step, ...nav, network: collector.snapshot() };
        attempts.push(step);

        await submitCreds(page, email, password);
        await waitDashboard(page);
        return { attempts: attempts.length, login_diagnostics: sanitizeDiagnostics(step) };
      } catch (e) {
        let pageState = {};
        try {
          pageState = await readLoginPageState(page);
        } catch {
          pageState = {};
        }
        step = {
          ...step,
          error: e.message,
          http_status: step.http_status ?? null,
          final_url: typeof page.url === 'function' ? page.url() : null,
          page: pageState,
          network: collector.snapshot(),
        };
        attempts.push(step);
        if (attempt < MAX_LOGIN_ATTEMPTS) {
          await clearSession(page, browser);
          continue;
        }
        throw buildLoginFailureError(attempts);
      }
    }
    throw buildLoginFailureError(attempts);
  } finally {
    detach();
  }
}

module.exports = {
  MAX_LOGIN_ATTEMPTS,
  sanitizeDiagnostics,
  createAttemptCollector,
  readLoginPageState,
  clearBrowserSession,
  ensureAnonymousForLogin,
  navigateToVisibleLoginForm,
  robustParentLogin,
  buildLoginFailureError,
};
