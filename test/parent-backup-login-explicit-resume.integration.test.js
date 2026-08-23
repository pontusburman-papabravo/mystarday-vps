'use strict';

/**
 * Backup parent login must preserve explicit adult selection via one-shot intent
 * + existing #1059 server-verified explicit-parent-resume contract.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const {
  loadOrchestratorSandbox,
  childHomeAppEntryBody,
  createMemoryStorage,
} = require('./helpers/app-entry-orchestrator-harness.js');

const BACKUP_KEY = 'stjarndag_parent_backup_login_intent_v1';
const MARKER_KEY = 'stjarndag_explicit_parent_resume_v1';
const DECISION_KEY = 'stjarndag_entry_decision_v1';
const APPLIED_KEY = 'stjarndag_entry_decision_applied';
const ACTIVE_KEY = 'stjarndag_family_device_entry_v1';

function loadIntentSandbox() {
  const sessionStorage = createMemoryStorage();
  const sandbox = {
    console,
    sessionStorage,
    AppEntryOrchestrator: {
      clearOrchestratorSessionState() {
        sessionStorage.removeItem(DECISION_KEY);
        sessionStorage.removeItem(APPLIED_KEY);
        sessionStorage.removeItem(MARKER_KEY);
        sessionStorage.setItem(ACTIVE_KEY, '0');
      },
      beginExplicitParentResume(path) {
        const now = Date.now();
        sessionStorage.setItem(MARKER_KEY, JSON.stringify({
          status: 'pending',
          at: now,
          expiresAt: now + 60000,
          path: path || '/dashboard',
        }));
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(ROOT, 'public/js/parent-backup-login-intent.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'parent-backup-login-intent.js' });
  return sandbox;
}

function readBackupIntent(env) {
  const raw = env.sessionStorage.getItem(BACKUP_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('parent backup login intent — storage contract', () => {
  test('A: storeIntent clears stale child orchestrator decision and keeps backup intent', () => {
    const env = loadIntentSandbox();
    env.sessionStorage.setItem(ACTIVE_KEY, '1');
    env.sessionStorage.setItem(APPLIED_KEY, '1');
    env.sessionStorage.setItem(DECISION_KEY, JSON.stringify({
      destination: 'child-home',
      viewContext: 'child',
      credentialContext: 'child',
      childId: 'child-1',
      path: '/child/today',
    }));

    env.ParentBackupLoginIntent.storeIntent('/home');

    assert.equal(env.sessionStorage.getItem(APPLIED_KEY), null);
    assert.equal(env.sessionStorage.getItem(DECISION_KEY), null);
    const intent = readBackupIntent(env);
    assert.equal(intent.origin, 'shared_profile_picker');
    assert.equal(intent.requestedPath, '/dashboard');
    assert.ok(intent.expiresAt > Date.now());
  });

  test('F: expired backup intent is cleared on read', () => {
    const env = loadIntentSandbox();
    env.sessionStorage.setItem(BACKUP_KEY, JSON.stringify({
      origin: 'shared_profile_picker',
      requestedPath: '/dashboard',
      createdAt: Date.now() - 100000,
      expiresAt: Date.now() - 1000,
    }));
    assert.equal(env.ParentBackupLoginIntent.readIntent(), null);
    assert.equal(env.sessionStorage.getItem(BACKUP_KEY), null);
  });

  test('G: failed password attempt does not consume intent', () => {
    const env = loadIntentSandbox();
    env.ParentBackupLoginIntent.storeIntent('/dashboard');
    assert.ok(env.ParentBackupLoginIntent.readIntent());
    assert.ok(env.ParentBackupLoginIntent.readIntent());
    assert.equal(env.sessionStorage.getItem(BACKUP_KEY) != null, true);
  });

  test('E: forged backup intent with wrong origin is cleared', () => {
    const env = loadIntentSandbox();
    env.sessionStorage.setItem(BACKUP_KEY, JSON.stringify({
      origin: 'forged',
      requestedPath: '/dashboard',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    }));
    assert.equal(env.ParentBackupLoginIntent.consumeIntent(), null);
    assert.equal(env.sessionStorage.getItem(BACKUP_KEY), null);
  });
});

describe('parent backup login — Auth.completeParentAuthRedirect contract', () => {
  test('B/K/L: parent auth consumes intent and begins explicit resume before navigation', () => {
    const auth = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    assert.match(auth, /completeParentAuthRedirect/);
    assert.match(auth, /beginExplicitParentResume/);
    assert.match(auth, /location\.replace\(path\)/);
    assert.match(auth, /consumeIntent/);
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    assert.match(login, /Auth\.completeParentAuthRedirect/);
    const google = fs.readFileSync(path.join(ROOT, 'public/js/google-auth-ui.js'), 'utf8');
    assert.match(google, /Auth\.completeParentAuthRedirect/);
    assert.doesNotMatch(google, /afterAuthSuccess[\s\S]*location\.href = '\/onboarding'/);
  });

  test('J: normal parent login without backup intent uses next/default only', () => {
    const auth = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    const block = auth.slice(auth.indexOf('completeParentAuthRedirect'), auth.indexOf('redirectToDashboard()'));
    assert.match(block, /consumeIntent/);
    assert.match(block, /_getLoginNextUrlFromLocation/);
    assert.match(block, /redirectToDashboard\(\)/);
    assert.match(block, /if \(intent\) \{/);
  });
});

describe('parent backup login — orchestrator bootstrap after auth', () => {
  test('B+C: backup flow verifies parent authority and does not restore-child', async () => {
    const leaseUntil = Date.now() + 15 * 60 * 1000;
    const childId = '00000000-0000-4000-8000-0000000000c1';
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'parent',
      appEntryBody: childHomeAppEntryBody(childId),
      privilegeActive: true,
      leaseUntil,
    });
    const orch = env.sandbox.AppEntryOrchestrator;

    orch.beginExplicitParentResume('/dashboard');
    assert.equal(orch.isExplicitParentResumePending(), true);

    const cold = await orch.runColdStart({ source: 'parent_entry_bootstrap' });
    assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(cold.decision.destination, 'parent-home');
    assert.equal(env.redirects.length, 0);
    assert.equal(
      env.fetchCalls.filter((c) => c.url.indexOf('/api/auth/trusted-device/restore') !== -1).length,
      0
    );
  });

  test('D: normal shared cold start without backup marker still child-first', async () => {
    const childId = '00000000-0000-4000-8000-0000000000c1';
    const env = loadOrchestratorSandbox({
      pathname: '/dashboard',
      appEntryBody: childHomeAppEntryBody(childId),
    });
    const cold = await env.sandbox.AppEntryOrchestrator.runColdStart({
      source: 'parent_entry_bootstrap',
      skipRedirect: true,
    });
    assert.equal(cold.decision.destination, 'child-home');
    assert.ok(env.fetchCalls.some((c) => c.url.indexOf('/api/auth/app-entry') !== -1));
  });
});

describe('parent backup login — picker + wiring', () => {
  test('H: child pick clears backup intent', () => {
    const picker = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(picker, /onPickChild[\s\S]*ParentBackupLoginIntent\.clearIntent/);
  });

  test('redirectToParentBackupLogin stores intent via ParentBackupLoginIntent', () => {
    const auth = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    assert.match(auth, /redirectToParentBackupLogin[\s\S]*storeIntent/);
    assert.match(auth, /clearOrchestratorSessionState/);
  });

  test('I: PIN route still uses beginExplicitParentResume', () => {
    const picker = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(picker, /beginExplicitParentResume/);
    assert.doesNotMatch(picker, /hasAppPin[\s\S]{0,200}beginExplicitParentResume/);
  });
});
