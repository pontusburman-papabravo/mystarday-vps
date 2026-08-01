'use strict';

const assert = require('node:assert/strict');
const { HANDOFF_COOKIE, attachHandoffNetworkCapture } = require('./rc1-handoff-network-capture');
const {
  fetchHandoffRowDiagnostic,
  fetchHandoffServerLogs,
} = require('./rc1-handoff-prod-diagnostic');

const PRODUCT_BUG = 'PRODUCT BUG FOUND';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function createHandoffDiagnostics() {
  return {
    phase: 'init',
    canonicalHost: null,
    childLogin: null,
    handoffCookiesBeforeLogout: null,
    logoutUi: null,
    logout: null,
    logoutWire: null,
    verifyPinPicker: null,
    pinOverlay: null,
    navigation: null,
    authMe: null,
    handoffDbBeforeLogout: null,
    handoffDbAfterLogout: null,
    serverHandoffLogs: null,
    classification: null,
    finalSession: null,
    finalPath: null,
  };
}

function sanitizeLogoutBody(body) {
  return {
    sessionRestored: body?.sessionRestored === true,
    needsParentPin: body?.needsParentPin === true,
    switchChild: body?.switchChild === true,
    loggedOut: body?.loggedOut === true,
    handoffAvailable: body?.handoffAvailable === true,
    requiresParentLogin: body?.requiresParentLogin === true,
    code: body?.code || null,
    hasMessage: typeof body?.message === 'string',
  };
}

function sanitizeVerifyPinPickerBody(body) {
  const parent = body?.parent;
  return {
    ok: body?.ok === true,
    code: body?.code || null,
    hasCsrfToken: Boolean(body?.csrfToken),
    parent: parent
      ? {
        hasId: Boolean(parent.id),
        hasEmail: Boolean(parent.email),
        hasFamilyId: Boolean(parent.family_id || parent.familyId),
      }
      : null,
  };
}

function assertHandoffHttpStatus(label, status, { allowed = [200], productBugOn429 = true } = {}) {
  if (status === 429) {
    const err = new Error(`${PRODUCT_BUG}: ${label} returned 429 (rate-limited handoff path)`);
    err.productBug = productBugOn429;
    throw err;
  }
  if (status === 401) {
    throw new Error(`${label} returned 401 (auth failure on handoff path)`);
  }
  if (status === 409) {
    throw new Error(`${label} returned 409 (handoff conflict — check code in diagnostics)`);
  }
  if (status === 500) {
    throw new Error(`${label} returned 500 (server error on handoff path)`);
  }
  if (!allowed.includes(status)) {
    throw new Error(`${label} unexpected HTTP status ${status}`);
  }
}

async function readSessionKind(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return { kind: 'anonymous', status: r.status };
    const me = await r.json();
    if (me.email) {
      return {
        kind: 'parent',
        status: r.status,
        hasUsername: Boolean(me.username),
      };
    }
    if (me.username) return { kind: 'child', status: r.status };
    return { kind: 'unknown', status: r.status };
  });
}

function hostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function assertCanonicalHost(page, expectedBaseUrl) {
  const expectedHost = hostFromUrl(expectedBaseUrl);
  const actualHost = await page.evaluate(() => window.location.host);
  const issues = [];
  if (expectedHost && actualHost !== expectedHost) {
    issues.push(`page host ${actualHost} !== expected ${expectedHost}`);
  }
  if (/^www\./i.test(actualHost) !== /^www\./i.test(expectedHost || '')) {
    issues.push(`www/apex mismatch (page=${actualHost}, expected=${expectedHost})`);
  }
  if (issues.length) {
    const err = new Error(`canonical host check failed: ${issues.join('; ')}`);
    err.hostDiagnostic = { expectedHost, actualHost };
    throw err;
  }
  return { expectedHost, actualHost };
}

function sanitizeCookieMeta(c, pageHost) {
  const expires = c.expires;
  const sessionCookie = expires === -1 || expires === undefined;
  return {
    name: c.name,
    domain: c.domain,
    path: c.path,
    secure: c.secure === true,
    httpOnly: c.httpOnly === true,
    sameSite: c.sameSite || null,
    expires: sessionCookie ? null : expires,
    sessionCookie,
    pageHost,
  };
}

async function auditHandoffCookies(page, expectedBaseUrl) {
  const pageHost = await page.evaluate(() => window.location.host);
  const pageUrl = await page.evaluate(() => window.location.href);
  const isHttps = pageUrl.startsWith('https:');
  const all = await page.cookies();
  const handoff = all.filter((c) => c.name === HANDOFF_COOKIE);
  const meta = handoff.map((c) => sanitizeCookieMeta(c, pageHost));
  const issues = [];
  if (handoff.length > 1) {
    issues.push(`duplicate ${HANDOFF_COOKIE} cookies (${handoff.length})`);
  }
  for (const c of handoff) {
    if (c.secure && !isHttps) {
      issues.push('secure handoff cookie on non-HTTPS page');
    }
    if (c.expires !== -1 && c.expires > 0 && c.expires * 1000 < Date.now()) {
      issues.push('handoff cookie expired');
    }
    const pathOk = !c.path || c.path === '/' || c.path.startsWith('/api');
    if (!pathOk) {
      issues.push(`handoff path may not cover logout: ${c.path}`);
    }
  }
  const expectedHost = hostFromUrl(expectedBaseUrl);
  if (expectedHost && handoff.length) {
    for (const c of handoff) {
      const domain = (c.domain || '').replace(/^\./, '');
      if (domain && !expectedHost.endsWith(domain) && domain !== expectedHost) {
        issues.push(`handoff domain ${c.domain} may not match ${expectedHost}`);
      }
    }
  }
  return { cookies: meta, count: handoff.length, issues };
}

function beginChildLoginInstrumentation(page) {
  const childLoginResponsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST'
        && new URL(response.url()).pathname === '/api/auth/child-login';
    },
    { timeout: 120000 }
  );
  return {
    async finish(networkCapture) {
      let res;
      try {
        res = await childLoginResponsePromise;
      } catch {
        return { status: null, setCookieNames: [], error: 'child_login_response_timeout' };
      }
      const headers = res.headers();
      const rawSetCookie = headers['set-cookie'];
      const setCookieNames = [];
      if (rawSetCookie) {
        const parts = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
        for (const line of parts) {
          setCookieNames.push(String(line).split('=')[0]);
        }
      }
      const wire = networkCapture?.getChildLoginWireCapture?.() || null;
      const names = wire?.setCookieNames?.length ? wire.setCookieNames : setCookieNames;
      return {
        status: res.status(),
        setCookieNames: names,
        hasAccessCookie: names.includes(ACCESS_COOKIE),
        hasRefreshCookie: names.includes(REFRESH_COOKIE),
        hasHandoffCookie: names.includes(HANDOFF_COOKIE),
      };
    },
  };
}

function classifyHandoffFailure(diag) {
  const logout = diag.logout || {};
  const wire = diag.logoutWire || {};
  const logs = diag.serverHandoffLogs;
  const entries = logs?.entries || [];
  const pre = entries.find((e) => e.phase === 'child_logout_pre') || entries[0];
  const post = entries.find((e) => e.phase === 'child_logout_post_consume');

  if (logout.switchChild || wire.switchChildInBody) {
    return 'TEST_UI_CONTRACT_SWITCH_CHILD';
  }
  if (logout.status === 409 && logout.code === 'PARENT_HANDOFF_INVALID') {
    return 'INVALID_HANDOFF_HTTP_409';
  }

  if (
    logout.status === 200
    && !logout.sessionRestored
    && !logout.needsParentPin
    && pre?.handoffCookiePresent === true
    && pre?.handoffOk === true
  ) {
    if (wire.handoffCookieCountOnWire >= 1) {
      if (post?.handoffOk === true) {
        return 'RUNTIME_BUG';
      }
      return 'RUNTIME_BUG_HANDOFF_OK_BUT_WRONG_200_BODY';
    }
    return 'TEST_COOKIE_TRANSPORT_BUG';
  }

  if (logout.loggedOut && !logout.handoffAvailable && !logout.sessionRestored && !logout.needsParentPin) {
    if (wire.handoffCookieCountOnWire === 0) {
      return 'TEST_COOKIE_TRANSPORT_BUG';
    }
    if (!entries.length) {
      return 'TEST_COOKIE_TRANSPORT_OR_CORRELATION_BUG';
    }
    if (pre && pre.handoffCookiePresent === false) {
      return 'TEST_COOKIE_TRANSPORT_BUG';
    }
    if (pre && pre.handoffOk === false) {
      return 'REVIEW_DATA_OR_HANDOFF_ROW_BUG';
    }
    if (pre && pre.handoffOk === true) {
      return 'RUNTIME_BUG';
    }
  }
  if (diag.handoffCookiesBeforeLogout?.issues?.length) {
    return 'TEST_COOKIE_METADATA_BUG';
  }
  return 'HANDOFF_DIAGNOSTIC_INCONCLUSIVE';
}

function logHandoffDiagnosticReport(diag) {
  console.warn('[rc1-handoff-diagnostic]', JSON.stringify({
    canonicalHost: diag.canonicalHost,
    handoffCookiesBeforeLogout: diag.handoffCookiesBeforeLogout,
    childLogin: diag.childLogin,
    logoutUi: diag.logoutUi,
    logout: diag.logout,
    logoutWire: diag.logoutWire,
    serverHandoffLogs: diag.serverHandoffLogs,
    handoffDbBeforeLogout: diag.handoffDbBeforeLogout,
    classification: diag.classification,
  }));
}

async function fillParentPinOverlay(page, parentPin) {
  const digits = String(parentPin).split('');
  for (let i = 0; i < digits.length; i += 1) {
    const filledBefore = await page.evaluate(() => {
      const dots = [...document.querySelectorAll('#ppin-gate-overlay .ppgo-dot')];
      return dots.filter((d) => {
        const bg = d.style.background || '';
        return bg.includes('245, 166, 35') || bg.includes('#F5A623') || bg.includes('rgb(245, 166, 35)');
      }).length;
    });
    await page.evaluate((d) => {
      const kbd = document.querySelector('#ppgo-keypad');
      if (!kbd) throw new Error('PIN keypad missing');
      const btn = [...kbd.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === d);
      if (!btn) throw new Error(`PIN keypad digit ${d} missing`);
      btn.click();
    }, digits[i]);
    await page.waitForFunction(
      (prev) => {
        const dots = [...document.querySelectorAll('#ppin-gate-overlay .ppgo-dot')];
        const filled = dots.filter((d) => {
          const bg = d.style.background || '';
          return bg.includes('245, 166, 35') || bg.includes('#F5A623') || bg.includes('rgb(245, 166, 35)');
        }).length;
        return filled > prev;
      },
      { timeout: 10000 },
      filledBefore
    );
  }
  await page.evaluate(() => {
    const kbd = document.querySelector('#ppgo-keypad');
    if (!kbd) throw new Error('PIN keypad missing at submit');
    const submit = [...kbd.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '✓');
    if (!submit) throw new Error('PIN submit ✓ missing');
    submit.click();
  });
}

async function performParentChildHandoff(page, parentPin, options = {}) {
  const {
    baseUrl = '',
    reviewFamilyId = null,
    networkCapture = null,
    deepDiagnostic = false,
  } = options;

  const diag = createHandoffDiagnostics();
  page._rc1HandoffDiagnostics = diag;

  await page.waitForFunction(
    () => /\/child(\/today|-dashboard)/.test(window.location.pathname),
    { timeout: 30000 }
  );

  if (baseUrl) {
    diag.canonicalHost = await assertCanonicalHost(page, baseUrl);
  }

  diag.handoffCookiesBeforeLogout = await auditHandoffCookies(page, baseUrl);
  if (diag.handoffCookiesBeforeLogout.issues.length && !deepDiagnostic) {
    assert.fail(`handoff cookie audit: ${diag.handoffCookiesBeforeLogout.issues.join('; ')}`);
  }

  const meBefore = await readSessionKind(page);
  diag.sessionBeforeLogout = meBefore.kind;
  assert.equal(meBefore.kind, 'child', 'handoff requires active child session before logout');

  const handoffCookieRows = (await page.cookies()).filter((c) => c.name === HANDOFF_COOKIE);
  const handoffValueForDb = handoffCookieRows[0]?.value || null;
  if (handoffValueForDb) {
    diag.handoffDbBeforeLogout = fetchHandoffRowDiagnostic(handoffValueForDb, reviewFamilyId);
  }

  diag.phase = 'logout';
  const logoutResponsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST'
        && new URL(response.url()).pathname === '/api/auth/logout';
    },
    { timeout: 90000 }
  );

  diag.logoutUi = await page.evaluate(() => ({
    hasChildLogout: typeof window.childLogout === 'function',
    hasAuthLogout: Boolean(window.Auth && typeof Auth.logout === 'function'),
    hasSwitchChildMember: Boolean(window.Auth && typeof Auth.switchChildMember === 'function'),
  }));

  await page.evaluate(() => {
    if (!(window.Auth && typeof Auth.logout === 'function')) {
      throw new Error('Auth.logout missing — diagnostic requires Auth.logout({ childFlow: true })');
    }
    void window.Auth.logout({ childFlow: true });
  });

  const logoutRes = await logoutResponsePromise;
  const logoutStatus = logoutRes.status();
  let logoutBody = {};
  try {
    logoutBody = await logoutRes.json();
  } catch {
    logoutBody = {};
  }

  const sanitizedBody = sanitizeLogoutBody(logoutBody);
  const responseHeaders = logoutRes.headers();
  const correlationFromResponse = responseHeaders['x-request-id'] || responseHeaders['x-request-id'.toUpperCase()] || null;

  diag.logoutWire = networkCapture?.getLogoutWireCapture?.() || null;
  if (diag.logoutWire && !diag.logoutWire.correlationId && correlationFromResponse) {
    diag.logoutWire.correlationId = correlationFromResponse;
  }

  const pathAfterLogout = await page.evaluate(() => window.location.pathname);
  diag.logout = {
    status: logoutStatus,
    ...sanitizedBody,
    body: sanitizedBody,
    pathnameAfterResponse: pathAfterLogout,
    correlationId: diag.logoutWire?.correlationId || correlationFromResponse,
  };

  if (logoutStatus === 409) {
    diag.classification = sanitizedBody.code === 'PARENT_HANDOFF_INVALID'
      ? 'INVALID_HANDOFF_HTTP_409'
      : 'HANDOFF_HTTP_409';
    diag.serverHandoffLogs = fetchHandoffServerLogs(diag.logout.correlationId);
    logHandoffDiagnosticReport(diag);
    assertHandoffHttpStatus('POST /api/auth/logout', logoutStatus, { allowed: [] });
  }
  if (logoutStatus === 500) {
    diag.classification = sanitizedBody.code === 'HANDOFF_CONSUME_FAILED'
      ? 'HANDOFF_CONSUME_FAILED'
      : 'HANDOFF_HTTP_500';
    diag.serverHandoffLogs = fetchHandoffServerLogs(diag.logout.correlationId);
    logHandoffDiagnosticReport(diag);
    assertHandoffHttpStatus('POST /api/auth/logout', logoutStatus, { allowed: [] });
  }

  assertHandoffHttpStatus('POST /api/auth/logout', logoutStatus, { allowed: [200] });

  if (diag.logoutWire) {
    if (diag.logoutWire.switchChildInBody) {
      diag.classification = 'TEST_UI_CONTRACT_SWITCH_CHILD';
      logHandoffDiagnosticReport(diag);
      assert.fail('logout postData must not contain switchChild:true');
    }
  }

  const sessionRestored = sanitizedBody.sessionRestored;
  const needsParentPin = sanitizedBody.needsParentPin;

  if (!sessionRestored && !needsParentPin) {
    if (options.childLogin) {
      diag.childLogin = options.childLogin;
    }
    diag.serverHandoffLogs = fetchHandoffServerLogs(diag.logout.correlationId);
    diag.classification = classifyHandoffFailure(diag);
    if (handoffValueForDb) {
      diag.handoffDbAfterLogout = fetchHandoffRowDiagnostic(handoffValueForDb, reviewFamilyId);
    }
    logHandoffDiagnosticReport(diag);
    if (diag.classification === 'RUNTIME_BUG' || diag.classification === 'RUNTIME_BUG_HANDOFF_OK_BUT_WRONG_200_BODY') {
      const err = new Error(
        `${PRODUCT_BUG}: server saw handoff but logout 200 was plain child logout `
        + `(${JSON.stringify(sanitizedBody)})`
      );
      err.productBug = true;
      throw err;
    }
    assert.fail(
      `logout missing sessionRestored/needsParentPin — classification=${diag.classification} `
      + `body=${JSON.stringify(sanitizedBody)} wireHandoffCount=${diag.logoutWire?.handoffCookieCountOnWire ?? 'n/a'}`
    );
  }

  if (sessionRestored) {
    diag.phase = 'navigation';
    await page.waitForFunction(
      () => /\/(dashboard|planning|family|settings|for-dig)/.test(window.location.pathname),
      { timeout: 90000 }
    );
    diag.navigation = { path: await page.evaluate(() => window.location.pathname) };
    diag.phase = 'auth_me';
    const me = await readSessionKind(page);
    diag.authMe = { kind: me.kind, httpStatus: me.status };
    assert.equal(me.kind, 'parent', 'sessionRestored: /api/auth/me must be parent');
    assert.equal(me.hasUsername, false, 'sessionRestored: child username must not remain');
    diag.finalSession = me.kind;
    diag.finalPath = diag.navigation.path;
    diag.classification = 'SUCCESS_SESSION_RESTORED';
    return diag;
  }

  diag.phase = 'pin_overlay';
  await page.waitForSelector('#ppin-gate-overlay', { visible: true, timeout: 45000 });
  await page.waitForSelector('#ppgo-keypad', { visible: true, timeout: 15000 });
  diag.pinOverlay = { visible: true };

  const verifyPickerPromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST'
        && new URL(response.url()).pathname === '/api/family/verify-pin-picker';
    },
    { timeout: 90000 }
  );

  diag.phase = 'verify_pin_picker';
  await fillParentPinOverlay(page, parentPin);

  const pickerRes = await verifyPickerPromise;
  const pickerStatus = pickerRes.status();
  let pickerBody = {};
  try {
    pickerBody = await pickerRes.json();
  } catch {
    pickerBody = {};
  }
  const sanitizedPicker = sanitizeVerifyPinPickerBody(pickerBody);
  diag.verifyPinPicker = {
    status: pickerStatus,
    ...sanitizedPicker,
  };

  assertHandoffHttpStatus('POST /api/family/verify-pin-picker', pickerStatus, { allowed: [200] });
  assert.equal(pickerBody.ok, true, 'verify-pin-picker body.ok must be true');
  assert.ok(sanitizedPicker.parent?.hasId, 'verify-pin-picker must return parent.id');
  assert.ok(sanitizedPicker.parent?.hasEmail, 'verify-pin-picker must return parent.email');

  diag.phase = 'auth_me';
  const meAfterPicker = await readSessionKind(page);
  diag.authMe = { kind: meAfterPicker.kind, httpStatus: meAfterPicker.status };
  assert.equal(meAfterPicker.kind, 'parent', 'after verify-pin-picker: /api/auth/me must be parent');
  assert.equal(meAfterPicker.hasUsername, false, 'child session must not remain after picker');

  diag.phase = 'navigation';
  await page.waitForFunction(
    () => /\/(dashboard|planning|family|settings|for-dig)/.test(window.location.pathname),
    { timeout: 90000 }
  );
  diag.navigation = { path: await page.evaluate(() => window.location.pathname) };

  diag.finalSession = meAfterPicker.kind;
  diag.finalPath = diag.navigation.path;
  diag.classification = 'SUCCESS_NEEDS_PARENT_PIN';
  return diag;
}

module.exports = {
  PRODUCT_BUG,
  HANDOFF_COOKIE,
  createHandoffDiagnostics,
  sanitizeLogoutBody,
  sanitizeVerifyPinPickerBody,
  assertCanonicalHost,
  auditHandoffCookies,
  beginChildLoginInstrumentation,
  attachHandoffNetworkCapture,
  performParentChildHandoff,
  classifyHandoffFailure,
  logHandoffDiagnosticReport,
};
