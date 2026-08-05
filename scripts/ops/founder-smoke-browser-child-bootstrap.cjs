'use strict';

const { sanitizeDiagnostics } = require('./founder-smoke-browser-login.cjs');

const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 45_000;
const BODY_TEXT_MAX = 800;
const HANDOFF_PATH_RE = /child-login|login-picker/;

const TRACKED_API_PATHS = [
  '/api/auth/login-picker-children',
  '/api/auth/me',
  '/api/auth/child-login',
  '/api/auth/logout',
  '/api/children',
  '/api/family/parent-pin-status',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pathOnly(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url).split('?')[0];
  }
}

function isTrackedApiUrl(url) {
  const p = pathOnly(url);
  return TRACKED_API_PATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

function createChildLoginApiCollector() {
  const apiResponses = [];
  const consoleErrors = [];
  const failedRequests = [];

  function attach(page) {
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text().slice(0, 200));
      }
    };
    const onRequestFailed = (req) => {
      const url = req.url();
      if (!isTrackedApiUrl(url) && !url.includes('/child-login')) return;
      failedRequests.push({
        url: pathOnly(url),
        method: req.method(),
      });
    };
    const onResponse = (res) => {
      const url = res.url();
      if (!isTrackedApiUrl(url)) return;
      apiResponses.push({
        path: pathOnly(url),
        status: res.status(),
        method: res.request().method(),
      });
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
    const byPath = {};
    for (const row of apiResponses) {
      byPath[row.path] = row.status;
    }
    return {
      api_status_by_path: byPath,
      api_responses: [...apiResponses].slice(-20),
      unauthorized_paths: [
        ...new Set(apiResponses.filter((r) => r.status === 401).map((r) => r.path)),
      ],
      server_error_paths: [
        ...new Set(apiResponses.filter((r) => r.status >= 500).map((r) => r.path)),
      ],
      console_errors: [...consoleErrors].slice(-10),
      failed_requests: [...failedRequests].slice(-10),
    };
  }

  function reset() {
    apiResponses.length = 0;
    consoleErrors.length = 0;
    failedRequests.length = 0;
  }

  return { attach, snapshot, reset };
}

async function readChildLoginDomState(page) {
  const dom = await page.evaluate(() => {
    const loadingEl = document.getElementById('clLoading');
    const keypad = document.getElementById('clKeypad');
    const keypadButtons = keypad ? keypad.querySelectorAll('button').length : 0;
    const localeLoader = document.getElementById('auth-entry-locale-loader');
    const fallback = document.getElementById('auth-entry-fallback');
    return {
      pathname: window.location.pathname,
      href: window.location.href.split('?')[0],
      readyState: document.readyState,
      loading_overlay_visible: Boolean(
        loadingEl && loadingEl.classList.contains('visible')
      ),
      locale_loader_present: Boolean(localeLoader),
      auth_entry_fallback_visible: Boolean(
        fallback && !fallback.hidden && fallback.style.display !== 'none'
      ),
      has_keypad_el: Boolean(keypad),
      keypad_visible: Boolean(keypad && keypad.offsetParent !== null),
      keypad_button_count: keypadButtons,
      child_card_count: document.querySelectorAll('.cl-child-card').length,
      step_profiles_active: document.getElementById('clStepProfiles')?.classList.contains('active'),
      step_pin_active: document.getElementById('clStepPin')?.classList.contains('active'),
      no_session_visible: Boolean(
        document.getElementById('clNoSessionState') &&
          !document.getElementById('clNoSessionState').classList.contains('hidden')
      ),
      empty_state_visible: Boolean(
        document.getElementById('clEmptyState') &&
          !document.getElementById('clEmptyState').classList.contains('hidden')
      ),
      body_text_snippet: (document.body?.innerText || '').slice(0, 800),
    };
  });
  return dom;
}

function isChildLoginBootstrapReady(state) {
  if (!state) return false;
  if (state.loading_overlay_visible) return false;
  if (state.child_card_count > 0) return true;
  if (state.keypad_visible && state.keypad_button_count > 0) return true;
  if (state.no_session_visible) return true;
  if (state.empty_state_visible) return true;
  return false;
}

function buildChildLoginBootstrapError(context) {
  const err = new Error('child_login_bootstrap_timeout');
  err.code = 'FOUNDER_SMOKE_CHILD_LOGIN_BOOTSTRAP_FAILED';
  err.diagnostics = sanitizeDiagnostics(context);
  const path = context?.dom?.pathname || 'unknown';
  const loading = context?.dom?.loading_overlay_visible;
  err.message = `Child login bootstrap did not finish (path=${path}, loading_overlay=${loading})`;
  return err;
}

/**
 * @param {import('puppeteer').Page} page
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {ReturnType<typeof createChildLoginApiCollector>} [opts.collector]
 */
async function waitForChildLoginBootstrap(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_BOOTSTRAP_TIMEOUT_MS;
  const collector = opts.collector;
  const readDom = opts.readDom || (() => readChildLoginDomState(page));
  const deadline = Date.now() + timeoutMs;
  let lastDom = null;
  let lastNetwork = collector ? collector.snapshot() : null;

  while (Date.now() < deadline) {
    lastDom = await readDom(page);
    lastNetwork = collector ? collector.snapshot() : lastNetwork;
    if (isChildLoginBootstrapReady(lastDom)) {
      return {
        ok: true,
        dom: lastDom,
        network: lastNetwork,
      };
    }
    if (Date.now() >= deadline) break;
    await sleep(opts.pollMs ?? 200);
  }

  throw buildChildLoginBootstrapError({
    phase: 'wait_bootstrap',
    dom: lastDom,
    network: lastNetwork,
    final_url: typeof page.url === 'function' ? page.url() : null,
  });
}

/**
 * Settings "Byt användare" → child-login handoff (no page.goto).
 * @param {import('puppeteer').Page} page
 * @param {object} opts
 * @param {() => Promise<object|null>} opts.fetchMe
 * @param {string} [opts.expectedParentEmail]
 */
async function handoffFromSettingsSwitchUser(page, opts = {}) {
  const { fetchMe, expectedParentEmail, deps = {} } = opts;
  const collector = deps.collector || createChildLoginApiCollector();
  const detach = collector.attach(page);
  const waitBootstrap = deps.waitForChildLoginBootstrap || waitForChildLoginBootstrap;

  try {
    const parentMe = await fetchMe();
    if (!parentMe || parentMe.type !== 'parent') {
      throw buildChildLoginBootstrapError({
        phase: 'parent_session_before_switch',
        parent_me: parentMe ? { type: parentMe.type } : null,
        network: collector.snapshot(),
      });
    }
    if (
      expectedParentEmail &&
      String(parentMe.email || '').toLowerCase() !== String(expectedParentEmail).toLowerCase()
    ) {
      throw buildChildLoginBootstrapError({
        phase: 'parent_email_mismatch',
        parent_me: { type: parentMe.type, email: '[email]' },
        network: collector.snapshot(),
      });
    }

    const beforePath = await page.evaluate(() => window.location.pathname);
    await Promise.all([
      page
        .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 })
        .catch(() => null),
      page.evaluate(() => document.getElementById('switchUserBtn')?.click()),
    ]);

    const afterPath = await page.evaluate(() => window.location.pathname);
    const handoffRouteOk = HANDOFF_PATH_RE.test(afterPath);

    const result = {
      pass: handoffRouteOk,
      before_path: beforePath,
      pathname: afterPath,
      final_url: page.url(),
      parent_me_before: { type: parentMe.type, family_id: parentMe.family_id },
      handoff_route_ok: handoffRouteOk,
    };

    if (!handoffRouteOk) {
      const dom = await readChildLoginDomState(page);
      throw buildChildLoginBootstrapError({
        phase: 'handoff_route_mismatch',
        expected_path_pattern: 'child-login|login-picker',
        ...result,
        dom,
        network: collector.snapshot(),
      });
    }

    const bootstrap = await waitBootstrap(page, { collector });
    return {
      ...result,
      bootstrap,
      network: collector.snapshot(),
    };
  } finally {
    detach();
  }
}

module.exports = {
  DEFAULT_BOOTSTRAP_TIMEOUT_MS,
  TRACKED_API_PATHS,
  createChildLoginApiCollector,
  readChildLoginDomState,
  isChildLoginBootstrapReady,
  waitForChildLoginBootstrap,
  buildChildLoginBootstrapError,
  handoffFromSettingsSwitchUser,
  HANDOFF_PATH_RE,
};
