'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadGoogleAuth(isNewAccount) {
  const completed = [];
  const marketing = [];
  const redirects = [];
  const sandbox = {
    console,
    Auth: {
      setAuth() {},
      redirectToDashboard() { redirects.push('dashboard'); },
      completeParentAuthRedirect() { return false; },
    },
    Platform: {
      googleSignIn: {
        signIn: async () => ({ idToken: 'google-id-token' }),
      },
    },
    MarketingEvents: {
      trackSignup(method) { marketing.push(method); },
    },
    EntryAnalytics: {
      trackSignupCompleted(method) { completed.push(method); },
    },
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'parent-1', type: 'parent', onboarding_completed: true },
        isNewAccount,
        csrfToken: 'csrf',
        expiresAt: 1,
      }),
    }),
    document: {
      readyState: 'complete',
      addEventListener() {},
      getElementById() { return null; },
    },
    location: {
      replace(url) { redirects.push(String(url)); },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'public/js/google-auth-ui.js'), 'utf8'),
    sandbox,
    { filename: 'google-auth-ui.js' }
  );
  return { sandbox, completed, marketing, redirects };
}

describe('Google signup_completed analytics', () => {
  it('sends signup_completed only when Google creates a new account', async () => {
    const created = loadGoogleAuth(true);
    await created.sandbox.handleGoogleLogin();
    assert.deepEqual(created.completed, ['google']);
    assert.deepEqual(created.marketing, ['google']);
    assert.deepEqual(created.redirects, ['dashboard']);

    const returning = loadGoogleAuth(false);
    await returning.sandbox.handleGoogleLogin();
    assert.deepEqual(returning.completed, []);
    assert.deepEqual(returning.marketing, []);
    assert.deepEqual(returning.redirects, ['dashboard']);
  });
});
