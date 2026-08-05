'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  robustParentLogin,
  sanitizeDiagnostics,
  buildLoginFailureError,
  MAX_LOGIN_ATTEMPTS,
} = require('../scripts/ops/founder-smoke-browser-login.cjs');

function mockPage() {
  const handlers = { console: [], requestfailed: [], response: [] };
  return {
    handlers,
    url: () => 'https://example.test/login',
    on(event, fn) {
      handlers[event]?.push(fn);
    },
    off(event, fn) {
      const list = handlers[event];
      if (!list) return;
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    evaluate: async () => ({}),
    waitForSelector: async () => {},
    waitForFunction: async () => {},
    goto: async () => ({ status: () => 200 }),
    createCDPSession: async () => ({
      send: async () => {},
      detach: async () => {},
    }),
    cookies: async () => [],
    deleteCookie: async () => {},
  };
}

const browser = {};

describe('founder smoke browser login', () => {
  it('succeeds on second attempt after first navigation fails', async () => {
    const page = mockPage();
    let navCalls = 0;
    const deps = {
      clearBrowserSession: async () => {},
      ensureAnonymousForLogin: async () => ({ cleared: false }),
      navigateToVisibleLoginForm: async () => {
        navCalls += 1;
        if (navCalls === 1) {
          throw new Error('Waiting for selector `#email` failed');
        }
        return {
          ok: true,
          http_status: 200,
          final_url: 'https://example.test/login',
          page: { has_email: true, pathname: '/login' },
        };
      },
      submitParentCredentials: async () => {},
      waitForParentDashboard: async () => {},
    };

    const result = await robustParentLogin(page, browser, {
      base: 'https://example.test',
      email: 'founder@example.com',
      password: 'secret-password-value',
      fetchMe: async () => null,
      deps,
    });

    assert.equal(navCalls, 2);
    assert.equal(result.attempts, 2);
  });

  it('fails with sanitized diagnostics when login form never appears', async () => {
    const page = mockPage();
    const deps = {
      clearBrowserSession: async () => {},
      ensureAnonymousForLogin: async () => ({ cleared: false }),
      navigateToVisibleLoginForm: async () => {
        throw new Error('Waiting for selector `#email` failed');
      },
      submitParentCredentials: async () => {},
      waitForParentDashboard: async () => {},
    };

    await assert.rejects(
      () =>
        robustParentLogin(page, browser, {
          base: 'https://example.test',
          email: 'founder@example.com',
          password: 'super-pin-1234',
          fetchMe: async () => null,
          deps,
        }),
      (err) => {
        assert.equal(err.code, 'FOUNDER_SMOKE_LOGIN_FORM_FAILED');
        assert.ok(Array.isArray(err.attempts));
        assert.equal(err.attempts.length, MAX_LOGIN_ATTEMPTS);
        const blob = JSON.stringify(err.attempts);
        assert.ok(!blob.includes('super-pin-1234'));
        assert.ok(!blob.includes('secret-password'));
        assert.ok(err.attempts[0].page !== undefined || err.attempts[0].error);
        return true;
      }
    );
  });

  it('clears existing session before opening login form', async () => {
    const page = mockPage();
    let ensureCalls = 0;
    const deps = {
      clearBrowserSession: async () => {},
      ensureAnonymousForLogin: async () => {
        ensureCalls += 1;
        if (ensureCalls === 1) {
          return { cleared: true, had_session_type: 'parent' };
        }
        return { cleared: false };
      },
      navigateToVisibleLoginForm: async () => ({
        ok: true,
        http_status: 200,
        final_url: 'https://example.test/login',
        page: { has_email: true, pathname: '/login' },
      }),
      submitParentCredentials: async () => {},
      waitForParentDashboard: async () => {},
    };

    await robustParentLogin(page, browser, {
      base: 'https://example.test',
      email: 'founder@example.com',
      password: 'pw',
      fetchMe: async () => ({ type: 'parent' }),
      deps,
    });

    assert.equal(ensureCalls, 1);
  });

  it('sanitizeDiagnostics redacts secret-like keys and emails', () => {
    const out = sanitizeDiagnostics({
      password: 'hunter2',
      parent_pin: '1234',
      body_text_snippet: 'Contact founder@secret.test for help',
      http_status: 200,
      cookie: 'session=abc',
      nested: { authorization: 'Bearer xyz', ok: true },
    });
    assert.equal(out.password, '[redacted]');
    assert.equal(out.parent_pin, '[redacted]');
    assert.equal(out.cookie, '[redacted]');
    assert.equal(out.nested.authorization, '[redacted]');
    assert.ok(!String(out.body_text_snippet).includes('founder@secret.test'));
    assert.equal(out.http_status, '200');
    assert.equal(out.nested.ok, 'true');
  });

  it('buildLoginFailureError never embeds raw credentials in message', () => {
    const err = buildLoginFailureError([
      {
        attempt: 1,
        password: 'leak',
        page: { body_text_snippet: 'pin 9999' },
      },
    ]);
    const serialized = JSON.stringify(err);
    assert.ok(!serialized.includes('leak'));
    assert.ok(err.attempts[0].password === '[redacted]' || !serialized.includes('"leak"'));
  });
});
