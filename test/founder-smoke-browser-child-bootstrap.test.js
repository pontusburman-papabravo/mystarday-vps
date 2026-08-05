'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isChildLoginBootstrapReady,
  waitForChildLoginBootstrap,
  buildChildLoginBootstrapError,
  handoffFromSettingsSwitchUser,
  createChildLoginApiCollector,
} = require('../scripts/ops/founder-smoke-browser-child-bootstrap.cjs');

describe('founder smoke browser child bootstrap', () => {
  it('isChildLoginBootstrapReady when loading gone and cards present', () => {
    assert.equal(
      isChildLoginBootstrapReady({
        loading_overlay_visible: false,
        child_card_count: 2,
      }),
      true
    );
    assert.equal(
      isChildLoginBootstrapReady({
        loading_overlay_visible: true,
        child_card_count: 2,
      }),
      false
    );
  });

  it('waitForChildLoginBootstrap succeeds when overlay clears', async () => {
    const states = [
      { loading_overlay_visible: true, child_card_count: 0 },
      { loading_overlay_visible: false, child_card_count: 1, keypad_button_count: 0 },
    ];
    const page = { url: () => 'https://example.test/child-login' };
    const result = await waitForChildLoginBootstrap(page, {
      timeoutMs: 500,
      pollMs: 10,
      readDom: async () => states.shift() || states[states.length - 1],
    });
    assert.equal(result.ok, true);
    assert.equal(result.dom.child_card_count, 1);
  });

  it('waitForChildLoginBootstrap surfaces API 401/500 in diagnostics', async () => {
    const collector = createChildLoginApiCollector();
    const responseHandlers = [];
    const fakePage = {
      url: () => 'https://example.test/child-login',
      on(ev, fn) {
        if (ev === 'response') responseHandlers.push(fn);
      },
      off() {},
    };
    collector.attach(fakePage);
    for (const fn of responseHandlers) {
      fn({
        url: () => 'https://example.test/api/auth/login-picker-children',
        status: () => 401,
        request: () => ({ method: () => 'GET' }),
      });
      fn({
        url: () => 'https://example.test/api/auth/me',
        status: () => 500,
        request: () => ({ method: () => 'GET' }),
      });
    }

    await assert.rejects(
      () =>
        waitForChildLoginBootstrap(fakePage, {
          timeoutMs: 80,
          pollMs: 20,
          collector,
          readDom: async () => ({
            loading_overlay_visible: true,
            child_card_count: 0,
            pathname: '/child-login',
          }),
        }),
      (err) => {
        assert.equal(err.code, 'FOUNDER_SMOKE_CHILD_LOGIN_BOOTSTRAP_FAILED');
        const blob = JSON.stringify(err.diagnostics);
        assert.ok(blob.includes('401') || blob.includes('login-picker-children'));
        assert.ok(blob.includes('500') || blob.includes('/api/auth/me'));
        assert.ok(!blob.includes('super-secret-pin'));
        return true;
      }
    );
  });

  it('persistent loading overlay yields sanitized bootstrap error', async () => {
    const err = buildChildLoginBootstrapError({
      phase: 'wait_bootstrap',
      dom: {
        pathname: '/child-login',
        loading_overlay_visible: true,
        child_card_count: 0,
        body_text_snippet: 'Still loading child profiles',
      },
      network: { api_status_by_path: { '/api/auth/me': 401 } },
    });
    const blob = JSON.stringify(err.diagnostics);
    assert.ok(blob.includes('loading_overlay_visible'));
    assert.ok(!blob.includes('leak'));
  });

  it('handoffFromSettingsSwitchUser does not call page.goto', async () => {
    let gotoCalled = false;
    let evalCount = 0;
    const page = {
      url: () => 'https://example.test/child-login?picker=1',
      goto: async () => {
        gotoCalled = true;
      },
      evaluate: async () => {
        evalCount += 1;
        if (evalCount === 1) return '/settings';
        if (evalCount === 2) return undefined;
        return '/child-login';
      },
      waitForNavigation: async () => {},
      on() {},
      off() {},
    };

    await handoffFromSettingsSwitchUser(page, {
      fetchMe: async () => ({ type: 'parent', email: 'founder@example.com', family_id: 'fam-1' }),
      expectedParentEmail: 'founder@example.com',
      deps: {
        waitForChildLoginBootstrap: async () => ({
          ok: true,
          dom: { child_card_count: 1, loading_overlay_visible: false },
        }),
      },
    });

    assert.equal(gotoCalled, false);
  });
});
