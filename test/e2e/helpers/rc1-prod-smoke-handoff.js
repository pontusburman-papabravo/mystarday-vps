'use strict';

const assert = require('node:assert/strict');

const PRODUCT_BUG = 'PRODUCT BUG FOUND';

function createHandoffDiagnostics() {
  return {
    phase: 'logout',
    logout: null,
    verifyPin: null,
    restoreParent: null,
    pinOverlay: null,
    navigation: null,
    authMe: null,
    finalSession: null,
    finalPath: null,
  };
}

function sanitizeLogoutBody(body) {
  return {
    sessionRestored: body?.sessionRestored === true,
    needsParentPin: body?.needsParentPin === true,
    switchChild: body?.switchChild === true,
    code: body?.code || null,
  };
}

function assertHandoffHttpOk(label, status, allowed = [200]) {
  if (status === 429) {
    const err = new Error(`${PRODUCT_BUG}: ${label} returned 429 (rate-limited handoff path)`);
    err.productBug = true;
    throw err;
  }
  if (!allowed.includes(status)) {
    throw new Error(`${label} unexpected HTTP status ${status} (not a selector issue)`);
  }
}

async function readSessionKind(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return { kind: 'anonymous', status: r.status };
    const me = await r.json();
    if (me.email) return { kind: 'parent', status: r.status, hasUsername: Boolean(me.username) };
    if (me.username) return { kind: 'child', status: r.status };
    return { kind: 'unknown', status: r.status };
  });
}

async function performParentChildHandoff(page, parentPin) {
  const diag = createHandoffDiagnostics();
  page._rc1HandoffDiagnostics = diag;

  await page.waitForFunction(
    () => /\/child(\/today|-dashboard)/.test(window.location.pathname),
    { timeout: 30000 }
  );

  const cookiesBefore = await page.cookies();
  const hasHandoffCookie = cookiesBefore.some((c) => c.name === 'stjarndag_parent_session');
  diag.handoffCookiePresent = hasHandoffCookie;

  const meBefore = await readSessionKind(page);
  diag.sessionBeforeLogout = meBefore.kind;
  assert.equal(meBefore.kind, 'child', 'handoff requires active child session before logout');

  diag.phase = 'logout';
  const logoutResponsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST'
        && new URL(response.url()).pathname === '/api/auth/logout';
    },
    { timeout: 90000 }
  );

  await page.evaluate(() => {
    if (typeof window.childLogout === 'function') {
      void window.childLogout();
      return;
    }
    if (window.Auth && typeof Auth.logout === 'function') {
      void Auth.logout({ childFlow: true });
      return;
    }
    throw new Error('No child logout function available');
  });

  const logoutRes = await logoutResponsePromise;
  const logoutStatus = logoutRes.status();
  let logoutBody = {};
  try {
    logoutBody = await logoutRes.json();
  } catch {
    logoutBody = {};
  }

  const pathAfterLogout = await page.evaluate(() => window.location.pathname);
  diag.logout = {
    status: logoutStatus,
    ...sanitizeLogoutBody(logoutBody),
    pathnameAfterResponse: pathAfterLogout,
  };

  assertHandoffHttpOk('POST /api/auth/logout', logoutStatus, [200]);

  const sessionRestored = logoutBody.sessionRestored === true;
  const needsParentPin = logoutBody.needsParentPin === true;

  if (hasHandoffCookie && !sessionRestored && !needsParentPin) {
    const err = new Error(
      `${PRODUCT_BUG}: POST /api/auth/logout returned 200 with handoff cookie present but `
      + `neither sessionRestored nor needsParentPin (path=${pathAfterLogout})`
    );
    err.productBug = true;
    throw err;
  }

  assert.ok(
    sessionRestored || needsParentPin,
    `logout 200 but missing sessionRestored/needsParentPin (handoffCookie=${hasHandoffCookie}, `
    + `sessionBefore=${meBefore.kind}, body=${JSON.stringify(sanitizeLogoutBody(logoutBody))}, `
    + `path=${pathAfterLogout})`
  );

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
    return diag;
  }

  diag.phase = 'pin_overlay';
  await page.waitForSelector('#ppin-gate-overlay', { visible: true, timeout: 45000 });
  await page.waitForSelector('#ppgo-keypad', { visible: true, timeout: 15000 });
  diag.pinOverlay = { visible: true };

  const verifyPinPromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST'
        && new URL(response.url()).pathname === '/api/family/verify-pin';
    },
    { timeout: 90000 }
  );

  const restoreParentPromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST'
        && new URL(response.url()).pathname === '/api/family/restore-parent-session';
    },
    { timeout: 90000 }
  );

  diag.phase = 'verify_pin';
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

  const verifyRes = await verifyPinPromise;
  const verifyStatus = verifyRes.status();
  let verifyBody = {};
  try {
    verifyBody = await verifyRes.json();
  } catch {
    verifyBody = {};
  }
  diag.verifyPin = {
    status: verifyStatus,
    ok: verifyBody.ok === true,
    gateTokenPresent: Boolean(verifyBody.gateToken),
  };
  assertHandoffHttpOk('POST /api/family/verify-pin', verifyStatus, [200]);
  assert.equal(verifyBody.ok, true, 'verify-pin body.ok must be true');
  assert.ok(verifyBody.gateToken, 'verify-pin must return gateToken');

  diag.phase = 'restore_parent';
  const restoreRes = await restoreParentPromise;
  const restoreStatus = restoreRes.status();
  let restoreBody = {};
  try {
    restoreBody = await restoreRes.json();
  } catch {
    restoreBody = {};
  }
  diag.restoreParent = {
    status: restoreStatus,
    restored: restoreBody.restored === true,
  };
  assertHandoffHttpOk('POST /api/family/restore-parent-session', restoreStatus, [200]);
  assert.equal(restoreBody.restored, true, 'restore-parent-session must return restored:true');

  diag.phase = 'navigation';
  await page.waitForFunction(
    () => /\/(dashboard|planning|family|settings|for-dig)/.test(window.location.pathname),
    { timeout: 90000 }
  );
  diag.navigation = { path: await page.evaluate(() => window.location.pathname) };

  diag.phase = 'auth_me';
  const me = await readSessionKind(page);
  diag.authMe = { kind: me.kind, httpStatus: me.status };
  assert.equal(me.kind, 'parent', 'after restore: /api/auth/me must be parent');
  assert.equal(me.hasUsername, false, 'after restore: child session must be gone');

  diag.finalSession = me.kind;
  diag.finalPath = diag.navigation.path;
  return diag;
}

module.exports = {
  PRODUCT_BUG,
  createHandoffDiagnostics,
  performParentChildHandoff,
};
