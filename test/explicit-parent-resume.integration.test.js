'use strict';

/**
 * Regression: explicit adult profile selection on shared devices must survive
 * picker → dashboard navigation without cold-start app-entry overwriting parent-home,
 * while stale markers must never outlive server authority.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const {
  loadOrchestratorSandbox,
  childHomeAppEntryBody,
} = require('./helpers/app-entry-orchestrator-harness.js');
const { pickParent } = require('./helpers/child-profile-picker-harness.js');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ROOT = path.join(__dirname, '..');
const ADULT_FLAG = 'adult_privilege_v1';
const CHILD_ID = '00000000-0000-4000-8000-0000000000c1';
const MARKER_KEY = 'stjarndag_explicit_parent_resume_v1';

function readMarker(env) {
  const raw = env.sandbox.sessionStorage.getItem(MARKER_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('explicit parent resume — orchestrator VM sequence', () => {
  test('A: pending marker + verified authority -> dashboard stays parent', async () => {
    const entryBody = childHomeAppEntryBody(CHILD_ID);
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      appEntryBody: entryBody,
      privilegeActive: true,
    });
    const orch = env.sandbox.AppEntryOrchestrator;

    orch.markDecisionApplied({
      destination: 'child-home',
      viewContext: 'child',
      credentialContext: 'child',
      childId: CHILD_ID,
      deviceMode: 'shared',
      reason: 'trusted_device_child_home',
      path: '/child/today',
    });

    orch.beginExplicitParentResume('/dashboard');
    assert.equal(orch.isExplicitParentResumePending(), true);
    assert.equal(orch.isExplicitParentResumeActive(), false, 'pending alone is not active');

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(cold.ok, true);
    assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'parent-home');
    assert.equal(env.redirects.length, 0);
    assert.equal(orch.isExplicitParentResumeActive(), true);
    assert.equal(readMarker(env).status, 'verified');
    const appEntryCalls = env.fetchCalls.filter((c) => c.url.indexOf('/api/auth/app-entry') !== -1);
    assert.equal(appEntryCalls.length, 0, 'verified explicit resume must not re-fetch app-entry');
  });

  test('B: fresh shared cold start without marker still resolves child-home', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      appEntryBody: childHomeAppEntryBody(CHILD_ID),
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap', skipRedirect: true });
    assert.equal(cold.ok, true);
    assert.equal(cold.decision.destination, 'child-home');
    assert.ok(env.fetchCalls.some((c) => c.url.indexOf('/api/auth/app-entry') !== -1));
    assert.equal(orch.isExplicitParentResumeActive(), false);
  });

  test('C: explicit return-to-child clears marker and parent decision', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      privilegeActive: true,
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    orch.beginExplicitParentResume('/dashboard');
    await orch.resolveExplicitParentResumeIfNeeded();
    assert.equal(orch.isExplicitParentResumeActive(), true);

    orch.markDecisionApplied({
      destination: 'child-home',
      viewContext: 'child',
      credentialContext: 'child',
      childId: CHILD_ID,
      deviceMode: 'shared',
      reason: 'explicit_return_to_child',
      path: '/child/today',
    });
    assert.equal(orch.isExplicitParentResumeActive(), false);
    assert.equal(env.sandbox.sessionStorage.getItem(MARKER_KEY), null);
  });

  test('D: numeric lease expiry clears marker and resumes child-first routing', async () => {
    const leaseUntil = Date.now() + 15 * 60 * 1000;
    const entryBody = childHomeAppEntryBody(CHILD_ID);
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      appEntryBody: entryBody,
      privilegeActive: true,
      leaseUntil,
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    orch.beginExplicitParentResume('/dashboard');
    const resolved = await orch.resolveExplicitParentResumeIfNeeded();
    assert.equal(resolved.ok, true);
    assert.equal(orch.isExplicitParentResumeActive(), true);

    const marker = readMarker(env);
    assert.equal(marker.status, 'verified');
    assert.equal(marker.expiresAt, leaseUntil);
    assert.notEqual(marker.expiresAt, Date.now() + 30 * 60 * 1000);

    env.advanceTime(16 * 60 * 1000);
    assert.equal(orch.isExplicitParentResumeActive(), false);
    assert.equal(env.sandbox.sessionStorage.getItem(MARKER_KEY), null);
    assert.equal(orch.getAppliedDecision(), null);

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap', skipRedirect: true });
    assert.notEqual(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'child-home');
  });

  test('D2: numeric-string epoch lease is honored', async () => {
    const leaseUntil = Date.now() + 15 * 60 * 1000;
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      privilegeActive: true,
      leaseUntil: String(leaseUntil),
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    orch.beginExplicitParentResume('/dashboard');
    await orch.resolveExplicitParentResumeIfNeeded();
    assert.equal(readMarker(env).expiresAt, leaseUntil);
  });

  test('D3: invalid or missing lease fails closed at verification', async () => {
    const entryBody = childHomeAppEntryBody(CHILD_ID);
    for (const leaseUntil of [null, undefined, '', 'not-a-date', Date.now() - 1000]) {
      const env = loadOrchestratorSandbox({
        pathname: '/dashboard',
        appEntryBody: entryBody,
        privilegeActive: true,
        leaseUntil,
      });
      const orch = env.sandbox.AppEntryOrchestrator;
      orch.beginExplicitParentResume('/dashboard');
      const resolved = await orch.resolveExplicitParentResumeIfNeeded();
      assert.equal(resolved.rejected, true, `leaseUntil=${String(leaseUntil)}`);
      assert.equal(env.sandbox.sessionStorage.getItem(MARKER_KEY), null);
      assert.equal(orch.isExplicitParentResumeActive(), false);
    }
  });

  test('D4: ISO lease string remains supported', async () => {
    const leaseUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const expectedMs = Date.parse(leaseUntil);
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      privilegeActive: true,
      leaseUntil,
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    orch.beginExplicitParentResume('/dashboard');
    await orch.resolveExplicitParentResumeIfNeeded();
    assert.equal(readMarker(env).expiresAt, expectedMs);
  });

  test('E: revoked/locked authority rejects pending marker', async () => {
    const entryBody = childHomeAppEntryBody(CHILD_ID);
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      appEntryBody: entryBody,
      privilegeActive: false,
      privilegeState: 'revoked',
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    orch.beginExplicitParentResume('/dashboard');

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap', skipRedirect: true });
    assert.notEqual(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'child-home');
    assert.equal(env.sandbox.sessionStorage.getItem(MARKER_KEY), null);
  });

  test('F: forged stale marker with child /api/auth/me is rejected', async () => {
    const entryBody = childHomeAppEntryBody(CHILD_ID);
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      appEntryBody: entryBody,
      meType: 'child',
      privilegeActive: false,
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    env.sandbox.sessionStorage.setItem(MARKER_KEY, JSON.stringify({
      status: 'pending',
      at: Date.now(),
      expiresAt: Date.now() + 60000,
      path: '/dashboard',
    }));

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap', skipRedirect: true });
    assert.notEqual(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'child-home');
    assert.equal(env.sandbox.sessionStorage.getItem(MARKER_KEY), null);
  });

  test('G: marker without decision payload requires verification, not blind reconstruct', async () => {
    const entryBody = childHomeAppEntryBody(CHILD_ID);
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      appEntryBody: entryBody,
      privilegeActive: true,
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    env.sandbox.sessionStorage.setItem(MARKER_KEY, JSON.stringify({
      status: 'pending',
      at: Date.now(),
      expiresAt: Date.now() + 60000,
      path: '/dashboard',
    }));

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'parent-home');
    assert.ok(env.fetchCalls.some((c) => c.url.indexOf('/api/auth/me') !== -1));
    assert.ok(env.fetchCalls.some((c) => c.url.indexOf('/api/family/adult-privilege/status') !== -1));
  });
});

describe('explicit parent resume — client wiring contracts', () => {
  test('picker uses beginExplicitParentResume (pending transition only)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(src, /beginExplicitParentResume/);
    assert.doesNotMatch(src, /markDecisionApplied\(\{[\s\S]*profile_picker_parent_resume/);
  });

  test('orchestrator verifies authority before honoring explicit resume', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(src, /verifyExplicitParentResumeAuthority/);
    assert.match(src, /resolveExplicitParentResumeIfNeeded/);
    assert.match(src, /rejectExplicitParentResume/);
    assert.match(src, /normalizeTimestampMs/);
    assert.match(src, /status:\s*'pending'/);
    assert.match(src, /status:\s*'verified'/);
    assert.doesNotMatch(src, /EXPLICIT_PARENT_VERIFIED_FALLBACK/);
    assert.doesNotMatch(src, /30 \* 60 \* 1000/);
  });

  test('session gate defers while pending and honors verified resume', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(src, /isExplicitParentResumePending/);
    assert.match(src, /isExplicitParentResumeActive/);
  });

  test('adult privilege expiry clears explicit parent resume marker', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
    assert.match(src, /rejectExplicitParentResume/);
  });
});

describe('explicit parent resume — HTTP + picker sequence', () => {
  test('A HTTP: child -> select-parent -> me parent -> dashboard stays parent', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      await enableFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, {
        name: 'Astrid',
        emoji: '⭐',
        username: `kid-${Date.now()}`,
      });
      const deviceCookies = await enrollShared(http, session);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      const parentId = parentRow.rows[0].id;
      await db.query('UPDATE parent SET parent_pin_hash = $1 WHERE id = $2', [
        await hashPassword('4321'),
        parentId,
      ]);

      const childRow = await db.query(
        'SELECT c.id, c.username FROM child c JOIN parent p ON p.family_id = c.family_id WHERE LOWER(p.email) = $1 ORDER BY c.name LIMIT 1',
        [session.email.toLowerCase()]
      );
      const childUsername = childRow.rows[0].username;
      const childPinHash = await hashPassword('2580');
      await db.query('UPDATE child SET pin = $1 WHERE id = $2', [childPinHash, childRow.rows[0].id]);

      let cookies = { ...session.cookies, ...deviceCookies };
      const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ username: childUsername, pin: '2580' }),
      });
      assert.equal(childLoginRes.status, 200, await childLoginRes.text());
      for (const header of getSetCookieHeaders(childLoginRes)) {
        cookies = mergeCookies(cookies, [header]);
      }
      assert.equal((await (await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      })).json()).type, 'child');

      const selectParent = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(cookies),
        },
        body: JSON.stringify({ parent_id: parentId, unlock_method: 'pin', pin: '4321' }),
      });
      const selectBody = await selectParent.json();
      assert.equal(selectParent.status, 200, JSON.stringify(selectBody));
      assert.equal(selectBody.ok, true);
      for (const header of getSetCookieHeaders(selectParent)) {
        cookies = mergeCookies(cookies, [header]);
      }
      assert.equal((await (await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      })).json()).type, 'parent');

      const statusRes = await fetch(`${http.baseUrl}/api/family/adult-privilege/status`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      const statusBody = await statusRes.json();
      assert.equal(statusRes.status, 200);
      assert.equal(statusBody.privilegeActive, true);

      const entryBody = await (await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(cookies) },
      })).json();
      assert.notEqual(entryBody.decision.destination, 'parent-home');

      const picker = await pickParent({ hasAppPin: true, parentId });
      assert.equal(picker.redirects[0], '/dashboard');
      assert.equal(picker.pendingResume, true);

      const env = loadOrchestratorSandbox({
        pathname: '/dashboard',
        deviceMode: 'parent',
        privilegeActive: true,
        appEntryBody: entryBody,
      });
      env.sandbox.sessionStorage.setItem(MARKER_KEY, JSON.stringify({
        status: 'pending',
        at: Date.now(),
        expiresAt: Date.now() + 60000,
        path: '/dashboard',
      }));

      const cold = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
      assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
      assert.equal(env.redirects.length, 0);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

async function enableFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG, ADULT_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'explicit-parent-resume' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}
