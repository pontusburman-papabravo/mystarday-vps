'use strict';

/**
 * Trusted Device activation alignment — child session is real child access.
 * Matrix A–I. Does not redefine P0 or Journey child_logged_in.
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { ensureActivationState } = require('../src/lib/activation-p0');
const {
  enableFirstStarMode,
  disableFirstStarMode,
  countStarterItemsForChildDay,
  clockLocalDateStr,
} = require('./helpers/golden-path-fas6.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function enableTrustedDeviceFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY]
  );
}

async function familyIdForEmail(db, email) {
  const row = await db.query('SELECT family_id FROM parent WHERE email = $1', [email]);
  return row.rows[0].family_id;
}

async function activationState(db, familyId) {
  const row = await db.query(
    `SELECT child_access_completed_at FROM family_activation_state WHERE family_id = $1`,
    [familyId]
  );
  return row.rows[0] || null;
}

async function waitForChildAccess(db, familyId, { timeoutMs = 4000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await activationState(db, familyId);
    if (state && state.child_access_completed_at) return state;
    await new Promise((r) => setTimeout(r, 40));
  }
  return activationState(db, familyId);
}

async function sessionStartedSources(db, familyId) {
  const rows = await db.query(
    `SELECT metadata->>'source' AS source
     FROM analytics_events
     WHERE family_id = $1 AND event_type = 'child_session_started'
     ORDER BY created_at ASC`,
    [familyId]
  );
  return rows.rows.map((r) => r.source);
}

async function childLoggedInCount(db, familyId) {
  const row = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_milestones
     WHERE family_id = $1 AND milestone = 'child_logged_in'`,
    [familyId]
  );
  return row.rows[0].n;
}

async function clearTodayItems(db, childId, dateStr) {
  await db.query(
    `DELETE FROM daily_log_item dli
     USING daily_log dl
     WHERE dli.daily_log_id = dl.id AND dl.child_id = $1 AND dl.date = $2::date`,
    [childId, dateStr]
  );
}

function takeDeviceCookie(res, jar = {}) {
  let next = { ...jar };
  for (const header of getSetCookieHeaders(res)) {
    next = mergeCookies(next, [header]);
  }
  return next;
}

async function enrollChildDevice(http, session, childId) {
  const res = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ child_id: childId, platform: 'web', label: 'Test tablet' }),
  });
  const text = await res.text();
  assert.equal(res.status, 201, text);
  return takeDeviceCookie(res, session.cookies);
}

async function enrollSharedDevice(http, session) {
  const res = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'Shared tablet' }),
  });
  const text = await res.text();
  assert.equal(res.status, 201, text);
  const cookies = takeDeviceCookie(res, session.cookies);
  delete cookies.access_token;
  delete cookies.refresh_token;
  return cookies;
}

async function establishChildToday(http, sessionRes) {
  let cookies = {};
  for (const header of getSetCookieHeaders(sessionRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const csrfRes = await fetch(`${http.baseUrl}/api/auth/csrf-token`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  for (const header of getSetCookieHeaders(csrfRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const csrfBody = await csrfRes.json();
  const token = csrfBody.csrfToken || csrfBody.token;
  return fetch(`${http.baseUrl}/api/me/child-access-completed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(cookies),
      'X-CSRF-Token': token,
    },
    body: JSON.stringify({ today_established: true, source: 'trusted_device', platform: 'ios' }),
  });
}

async function restoreChild(http, deviceCookies) {
  return fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
    },
  });
}

test('A: trusted child restore records child_access with safe source and is idempotent', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrustedDeviceFlag(db);
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'Elsa', emoji: '🦊' });
    const deviceCookies = await enrollChildDevice(http, session, childId);

    assert.equal((await activationState(db, familyId)).child_access_completed_at, null);
    assert.equal(await childLoggedInCount(db, familyId), 0);

    const restoreRes = await restoreChild(http, deviceCookies);
    const restoreText = await restoreRes.text();
    assert.equal(restoreRes.status, 200, restoreText);
    const restoreBody = JSON.parse(restoreText);
    assert.equal(restoreBody.ok, true);
    assert.equal(restoreBody.user.type, 'child');
    assert.equal(restoreBody.user.id, childId);

    const todayRes = await establishChildToday(http, restoreRes);
    assert.equal(todayRes.status, 200, await todayRes.text());
    const first = await waitForChildAccess(db, familyId);
    assert.ok(first.child_access_completed_at);
    assert.equal(await childLoggedInCount(db, familyId), 0);

    await new Promise((r) => setTimeout(r, 80));
    const sources = await sessionStartedSources(db, familyId);
    assert.ok(sources.includes('trusted_device_restore'), JSON.stringify(sources));

    const again = await restoreChild(http, deviceCookies);
    assert.equal(again.status, 200);
    const second = await activationState(db, familyId);
    assert.equal(
      String(second.child_access_completed_at),
      String(first.child_access_completed_at)
    );
    assert.equal(await childLoggedInCount(db, familyId), 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('B: revoked device restore does not record child_access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrustedDeviceFlag(db);
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'Bo', emoji: '🐻' });
    const deviceCookies = await enrollChildDevice(http, session, childId);

    const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const listBody = await listRes.json();
    const deviceId = listBody.devices[0].id;
    const revokeRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    assert.equal(revokeRes.status, 200);

    const restoreRes = await restoreChild(http, deviceCookies);
    assert.equal(restoreRes.status, 401);
    assert.equal((await activationState(db, familyId)).child_access_completed_at, null);
    assert.equal(await childLoggedInCount(db, familyId), 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('C: unauthorized child select does not record child_access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrustedDeviceFlag(db);
    const session = await registerAndLogin(http.baseUrl);
    const other = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    await ensureActivationState(familyId);
    await createChild(http.baseUrl, session, { name: 'Alma', emoji: '🦊' });
    await createChild(http.baseUrl, session, { name: 'Nils', emoji: '🐻' });
    const foreignChild = await createChild(http.baseUrl, other, { name: 'Fremling', emoji: '🐼' });
    const deviceCookies = await enrollSharedDevice(http, session);

    const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
      body: JSON.stringify({ child_id: foreignChild }),
    });
    assert.equal(selectRes.status, 403);
    const body = await selectRes.json();
    assert.equal(body.code, 'CHILD_ACCESS_DENIED');
    assert.equal((await activationState(db, familyId)).child_access_completed_at, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('D+E: shared picker required; child device restores default child', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrustedDeviceFlag(db);
    const sharedSession = await registerAndLogin(http.baseUrl);
    const sharedFamily = await familyIdForEmail(db, sharedSession.email);
    await ensureActivationState(sharedFamily);
    const childA = await createChild(http.baseUrl, sharedSession, { name: 'Alma', emoji: '🦊' });
    await createChild(http.baseUrl, sharedSession, { name: 'Bo', emoji: '🐻' });
    const sharedCookies = await enrollSharedDevice(http, sharedSession);

    const sharedRestore = await restoreChild(http, sharedCookies);
    const sharedText = await sharedRestore.text();
    assert.equal(sharedRestore.status, 200, sharedText);
    const sharedBody = JSON.parse(sharedText);
    assert.equal(sharedBody.ok, false);
    assert.equal(sharedBody.code, 'SHARED_PICKER_REQUIRED');
    assert.ok(Array.isArray(sharedBody.allowed_children));
    assert.ok(sharedBody.allowed_children.length >= 2);
    assert.equal((await activationState(db, sharedFamily)).child_access_completed_at, null);

    const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: sharedCookies.trusted_device }),
      },
      body: JSON.stringify({ child_id: childA }),
    });
    const selectText = await selectRes.text();
    assert.equal(selectRes.status, 200, selectText);
    const selectBody = JSON.parse(selectText);
    assert.equal(selectBody.ok, true);
    assert.equal(selectBody.user.id, childA);
    const selectToday = await establishChildToday(http, selectRes);
    assert.equal(selectToday.status, 200, await selectToday.text());
    const afterSelect = await waitForChildAccess(db, sharedFamily);
    assert.ok(afterSelect.child_access_completed_at);
    await new Promise((r) => setTimeout(r, 80));
    const sources = await sessionStartedSources(db, sharedFamily);
    assert.ok(sources.includes('trusted_device_select_child'), JSON.stringify(sources));

    const childSession = await registerAndLogin(http.baseUrl);
    const childFamily = await familyIdForEmail(db, childSession.email);
    await ensureActivationState(childFamily);
    const onlyChild = await createChild(http.baseUrl, childSession, { name: 'Saga', emoji: '🌟' });
    const childDevice = await enrollChildDevice(http, childSession, onlyChild);
    const childRestore = await restoreChild(http, childDevice);
    const childBody = JSON.parse(await childRestore.text());
    assert.equal(childRestore.status, 200);
    assert.equal(childBody.ok, true);
    assert.equal(childBody.user.id, onlyChild);
    const childToday = await establishChildToday(http, childRestore);
    assert.equal(childToday.status, 200, await childToday.text());
    assert.ok((await waitForChildAccess(db, childFamily)).child_access_completed_at);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('F: PIN child-login still records child_access and is unchanged without Trusted Device', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'Pinne', emoji: '🔑' });
    const pinHash = await hashPassword('2468');
    await db.query(
      `UPDATE child SET username = $1, pin = $2 WHERE id = $3`,
      [`pinchild${Date.now()}`, pinHash, childId]
    );
    const usernameRow = await db.query('SELECT username FROM child WHERE id = $1', [childId]);

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameRow.rows[0].username, pin: '2468' }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.user.type, 'child');
    assert.equal((await activationState(db, familyId)).child_access_completed_at, null);
    const pinToday = await establishChildToday(http, loginRes);
    assert.equal(pinToday.status, 200, await pinToday.text());
    assert.ok((await waitForChildAccess(db, familyId)).child_access_completed_at);
    const deadline = Date.now() + 4000;
    let sources = [];
    while (Date.now() < deadline) {
      sources = await sessionStartedSources(db, familyId);
      if (sources.includes('child_login')) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(sources.includes('child_login'), JSON.stringify(sources));
    assert.equal(loginRes.status, 200);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('G: First Star starter on trusted session is idempotent and non-fatal', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrustedDeviceFlag(db);
    await enableFirstStarMode(db);
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'Stjärna', emoji: '⭐' });
    const dateStr = clockLocalDateStr('Europe/Stockholm');
    await db.query(
      `DELETE FROM weekly_schedule_item
       WHERE weekly_schedule_id IN (SELECT id FROM weekly_schedule WHERE child_id = $1)`,
      [childId]
    );
    await db.query(`DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1)`, [childId]);
    await db.query(`DELETE FROM daily_log WHERE child_id = $1`, [childId]);
    await clearTodayItems(db, childId, dateStr);
    const deviceCookies = await enrollChildDevice(http, session, childId);

    const restoreRes = await restoreChild(http, deviceCookies);
    assert.equal(restoreRes.status, 200);
    assert.equal(await countStarterItemsForChildDay(db, childId, dateStr), 1);

    const again = await restoreChild(http, deviceCookies);
    assert.equal(again.status, 200);
    assert.equal(await countStarterItemsForChildDay(db, childId, dateStr), 1);

    await disableFirstStarMode(db);
    const session2 = await registerAndLogin(http.baseUrl);
    const family2 = await familyIdForEmail(db, session2.email);
    await ensureActivationState(family2);
    const child2 = await createChild(http.baseUrl, session2, { name: 'Off', emoji: '🌙' });
    const cookies2 = await enrollChildDevice(http, session2, child2);
    const offRestore = await restoreChild(http, cookies2);
    assert.equal(offRestore.status, 200);
    const offBody = JSON.parse(await offRestore.text());
    assert.equal(offBody.ok, true);
    const offToday = await establishChildToday(http, offRestore);
    assert.equal(offToday.status, 200, await offToday.text());
    assert.ok((await waitForChildAccess(db, family2)).child_access_completed_at);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

describe('H: Home arbitration — Journey handoff can be the one primary action', () => {
  function loadOrchestrator(extraWindow) {
    const mounts = {};
    function makeEl(id, html, hidden) {
      const classes = new Set(hidden ? ['hidden'] : []);
      mounts[id] = {
        id,
        innerHTML: html || '',
        classList: {
          contains: (c) => classes.has(c),
          add: (c) => { classes.add(c); },
          remove: (c) => { classes.delete(c); },
        },
        querySelector(sel) {
          const htmlNow = this.innerHTML || '';
          if (sel.includes('journey-coach-card') && htmlNow.includes('journey-coach-card')) return {};
          if (sel.includes('engine-coach-card') && htmlNow.includes('engine-coach-card')) return {};
          if (sel.includes('activation-fs-coach') && htmlNow.includes('activation-fs-coach')) return {};
          if (sel.includes('[role="region"]') && htmlNow.includes('role="region"')) return {};
          return null;
        },
      };
    }
    makeEl('journeyCoachMount', '<div class="journey-coach-card" role="region"></div>', false);
    makeEl('activationFirstSuccessCoachMount', '', true);
    makeEl('engineCoachMount', '<div class="engine-coach-card" role="region"></div>', false);
    const windowObj = Object.assign({
      __journeyCoachLastContext: {
        priority: 'handoff',
        recommended_experiences: ['handoff_to_child'],
      },
    }, extraWindow || {});
    const sandbox = {
      window: windowObj,
      document: { getElementById: (id) => mounts[id] || null },
      HomeReadiness: windowObj.HomeReadiness,
      EngineClient: windowObj.EngineClient,
    };
    sandbox.window.document = sandbox.document;
    vm.runInNewContext(read('public/js/home-primary-action.js'), sandbox);
    return { HomePrimaryAction: sandbox.window.HomePrimaryAction, mounts };
  }

  it('Journey handoff wins and hides the equivalent Engine show-child coach', () => {
    const { HomePrimaryAction, mounts } = loadOrchestrator();
    const result = HomePrimaryAction.apply();
    assert.equal(result.winner, 'journey');
    assert.equal(mounts.journeyCoachMount.classList.contains('hidden'), false);
    assert.equal(mounts.engineCoachMount.classList.contains('hidden'), true);
    assert.equal(mounts.activationFirstSuccessCoachMount.classList.contains('hidden'), true);
  });

  it('non-handoff Journey coach still wins over Engine', () => {
    const { HomePrimaryAction, mounts } = loadOrchestrator({
      __journeyCoachLastContext: {
        priority: 'coach',
        recommended_experiences: ['coach_consistency'],
      },
    });
    const result = HomePrimaryAction.apply();
    assert.equal(result.winner, 'journey');
    assert.equal(mounts.engineCoachMount.classList.contains('hidden'), true);
  });

  it('readiness ok_items still blocks coaches', () => {
    const readiness = { getLoadOutcome: () => 'ok_items' };
    const { HomePrimaryAction } = loadOrchestrator({
      HomeReadiness: readiness,
    });
    const result = HomePrimaryAction.resolveWinner();
    assert.equal(result.winner, 'none');
    assert.equal(result.reason, 'readiness');
  });
});

describe('I / S-10 + contracts: Trusted Device authz is not age-based', () => {
  it('trusted-device.js does not authorize via age or birthday', () => {
    const src = read('src/lib/trusted-device.js');
    assert.doesNotMatch(src, /\bbirthday\b/);
    assert.doesNotMatch(src, /\bage_band\b/);
    assert.doesNotMatch(src, /\bageYears\b/);
    assert.doesNotMatch(src, /\bdate_of_birth\b/);
    assert.match(src, /creatorHasChildAccess/);
    assert.doesNotMatch(src, /recordActivationMilestone/);
    assert.match(src, /child-access-completed/);
    assert.match(src, /ensureFirstStarStarterActivity/);
    assert.doesNotMatch(src, /ingestMilestoneAsync/);
    assert.doesNotMatch(src, /milestone:\s*'child_logged_in'/);
    const activationCalls = src.match(/recordTrustedChildSessionActivation\(/g) || [];
    assert.equal(activationCalls.length, 2);
  });

  it('child session activation runs only after issueChildSessionForDevice succeeds', () => {
    const src = read('src/lib/trusted-device.js');
    const issue = src.slice(src.indexOf('async function issueChildSessionForDevice'));
    const sessionIdx = issue.indexOf('trackSessionStarted');
    const activationIdx = issue.indexOf('recordTrustedChildSessionActivation');
    assert.ok(sessionIdx > 0 && activationIdx > sessionIdx);
    assert.match(issue, /CHILD_ACCESS_DENIED/);
    assert.match(issue, /ensureHandoffForChildSession/);
    assert.match(src, /'trusted_device_restore'/);
    assert.match(src, /'trusted_device_select_child'/);
  });

  it('parent show-child uses restore first and PIN as fallback', () => {
    const handoff = read('public/js/dashboard-child-handoff.js');
    assert.match(handoff, /tryOpenTrustedChildView/);
    assert.match(handoff, /probeTrustedChildPath/);
    assert.match(handoff, /device_mode === 'parent'/);
    assert.match(handoff, /SHARED_PICKER_REQUIRED/);
    assert.match(handoff, /Auth\.logout\(\{ childFlow: true \}\)/);
    assert.match(handoff, /home\.handoff\.trusted\./);
    assert.match(handoff, /home\.handoff\.pin\./);
    const login = read('public/js/child-login.js');
    assert.match(login, /user\.type === 'child'/);
    assert.match(login, /\/child\/today/);
  });

  it('i18n distinguishes open-child-view vs PIN login without internal terms', () => {
    const sv = JSON.parse(read('config/i18n/home-sv-SE.json'));
    const en = JSON.parse(read('config/i18n/home-en-GB.json'));
    assert.equal(sv.handoff.trusted.childLogin, 'Öppna barnets vy');
    assert.equal(sv.handoff.pin.childLogin, 'Logga in med barnets PIN');
    assert.equal(en.handoff.trusted.childLogin, 'Open child view');
    assert.match(en.handoff.pin.childLogin, /PIN/);
    const blob = JSON.stringify(sv) + JSON.stringify(en);
    assert.doesNotMatch(blob, /trusted_device|JWT|child_logged_in|child_access_completed/);
  });
});
