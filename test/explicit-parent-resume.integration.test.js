'use strict';

/**
 * Regression: explicit adult profile selection on shared devices must survive
 * picker → dashboard navigation without cold-start app-entry overwriting parent-home.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { loadOrchestratorSandbox } = require('./helpers/app-entry-orchestrator-harness.js');
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

function childHomeAppEntryBody() {
  return {
    orchestratorActive: true,
    dailyUxActive: true,
    allowedChildren: [{ id: CHILD_ID, name: 'Astrid' }, { id: 'child-2', name: 'Anna' }],
    allowedParents: [{ id: 'parent-1', name: 'Parent' }],
    pinRequiredForParents: true,
    decision: {
      destination: 'child-home',
      viewContext: 'child',
      credentialContext: 'child',
      deviceMode: 'shared',
      childId: CHILD_ID,
      reason: 'trusted_device_child_home',
      serverAction: 'restore-child',
      path: '/child/today',
    },
  };
}

describe('explicit parent resume — orchestrator VM sequence', () => {
  test('picker commit then dashboard bootstrap stays parent (no child redirect)', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      fetch(url) {
        return {
          ok: true,
          json: async () => childHomeAppEntryBody(),
        };
      },
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
    assert.equal(env.sandbox.DeviceMode.isChildMode(), true);

    orch.commitExplicitParentResume('/dashboard');
    assert.equal(orch.isExplicitParentResumeActive(), true);
    assert.equal(env.sandbox.DeviceMode.isChildMode(), false);

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(cold.ok, true);
    assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'parent-home');
    assert.equal(env.redirects.length, 0, 'must not redirect back to child after explicit adult pick');
    assert.equal(env.fetchCalls.length, 0, 'must not re-fetch app-entry when explicit parent resume is active');
  });

  test('fresh shared cold start without marker still resolves child-home from server', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      fetch(url) {
        return {
          ok: true,
          json: async () => childHomeAppEntryBody(),
        };
      },
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap', skipRedirect: true });
    assert.equal(cold.ok, true);
    assert.equal(cold.decision.destination, 'child-home');
    assert.ok(env.fetchCalls.length >= 1, 'cold start should fetch authoritative app-entry');
    assert.equal(env.fetchCalls[0].url, '/api/auth/app-entry');
    assert.equal(orch.isExplicitParentResumeActive(), false);
  });

  test('explicit return-to-child clears marker so dashboard cannot stay parent', async () => {
    const env = loadOrchestratorSandbox({ pathname: '/dashboard', deviceMode: 'parent' });
    const orch = env.sandbox.AppEntryOrchestrator;
    orch.commitExplicitParentResume('/dashboard');
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
  });

  test('marker without decision payload is reconstructed on dashboard bootstrap', async () => {
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      fetch(url) {
        return {
          ok: true,
          json: async () => childHomeAppEntryBody(),
        };
      },
    });
    const orch = env.sandbox.AppEntryOrchestrator;
    env.sandbox.sessionStorage.setItem('stjarndag_explicit_parent_resume_v1', '1');
    env.sandbox.sessionStorage.removeItem('stjarndag_entry_decision_v1');
    env.sandbox.sessionStorage.removeItem('stjarndag_entry_decision_applied');

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'parent-home');
    assert.equal(env.redirects.length, 0);
  });
});

describe('explicit parent resume — client wiring contracts', () => {
  test('picker uses commitExplicitParentResume', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(src, /commitExplicitParentResume/);
    assert.match(src, /explicitParentResume:\s*true/);
  });

  test('orchestrator exports explicit parent resume helpers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(src, /EXPLICIT_PARENT_RESUME_KEY/);
    assert.match(src, /commitExplicitParentResume/);
    assert.match(src, /EXPLICIT_PARENT_RESUME/);
  });

  test('session gate honors explicit parent resume before child redirect', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(src, /isExplicitParentResumeActive/);
  });
});

describe('explicit parent resume — HTTP + picker sequence', () => {
  test('shared child context → select-parent → explicit resume blocks cold-start child overwrite', async (t) => {
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

      const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader({ ...session.cookies, ...deviceCookies }),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ username: childUsername, pin: '2580' }),
      });
      assert.equal(childLoginRes.status, 200, await childLoginRes.text());
      let cookies = { ...session.cookies, ...deviceCookies };
      for (const header of getSetCookieHeaders(childLoginRes)) {
        cookies = mergeCookies(cookies, [header]);
      }

      const meChild = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal((await meChild.json()).type, 'child');

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

      const meParent = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal((await meParent.json()).type, 'parent');

      const entryRes = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      const entryBody = await entryRes.json();
      assert.equal(entryRes.status, 200);
      assert.notEqual(entryBody.decision.destination, 'parent-home',
        'cold-start app-entry must remain child-first on shared devices');

      const picker = await pickParent({ hasAppPin: true, parentId });
      assert.equal(picker.redirects[0], '/dashboard');
      assert.equal(picker.decision.explicitParentResume, true);
      assert.equal(picker.decision.reason, 'profile_picker_parent_resume');

      const env = loadOrchestratorSandbox({
        pathname: '/dashboard',
        deviceMode: 'parent',
        fetch() {
          return { ok: true, json: async () => entryBody };
        },
      });
      env.sandbox.sessionStorage._m = {
        ...picker.decision && {},
      };
      env.sandbox.AppEntryOrchestrator.commitExplicitParentResume('/dashboard');
      const cold = await env.sandbox.AppEntryOrchestrator.runColdStart({ source: 'parent_entry_bootstrap' });
      assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
      assert.equal(env.redirects.length, 0);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

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
