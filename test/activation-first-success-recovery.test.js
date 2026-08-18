'use strict';

/**
 * Activation first-success client recovery (#1023 final PR).
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HUB_PATH = path.join(ROOT, 'public/js/activation-first-success-hub.js');
const MOUNT_ID = 'activationFirstSuccessCoachMount';

function mockJsonResponse(status, body) {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    clone: function () { return this; },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(text),
  };
}

function makeMount() {
  return {
    id: MOUNT_ID,
    className: '',
    classList: {
      _c: new Set(),
      add(c) { this._c.add(c); },
      remove(c) { this._c.delete(c); },
      contains(c) { return this._c.has(c); },
    },
    innerHTML: '',
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    removeAttribute(k) { delete this.attributes[k]; },
    querySelector(sel) {
      if (sel === '.activation-fs-coach' && this.innerHTML.indexOf('activation-fs-coach') !== -1) {
        return { addEventListener: () => {} };
      }
      if (sel === '.activation-fs-retry') {
        return {
          disabled: false,
          addEventListener: (ev, fn) => { this._retryFn = fn; },
          focus: () => {},
        };
      }
      if (sel === '.activation-fs-continue') {
        return { addEventListener: (ev, fn) => { this._continueFn = fn; } };
      }
      if (sel === '.activation-fs-defer') {
        return {
          disabled: false,
          textContent: '',
          addEventListener: (ev, fn) => { this._deferFn = fn; },
        };
      }
      if (sel === '.activation-fs-defer-error') {
        return { classList: { add: () => {}, remove: () => {} }, textContent: '', className: 'hidden' };
      }
      if (sel === '.activation-fs-cta') {
        return { addEventListener: () => {} };
      }
      return null;
    },
    _retryFn: null,
    _continueFn: null,
    _deferFn: null,
  };
}

function createSandbox(overrides) {
  const mount = makeMount();
  const tracked = [];
  const apiCalls = [];
  let nextActionCalls = 0;
  let deferCalls = 0;

  const win = {
      analytics: {
        track: (_user, event, meta) => {
          tracked.push({ event, meta: meta || {} });
        },
      },
      Auth: {
        silentRefresh: async () => true,
        logout: () => {},
      },
      pt: (key) => key,
      escHtml: (s) => String(s || ''),
      apiFetch: async (url, opts) => {
        apiCalls.push({ url, opts });
        if (String(url).includes('/next-action')) {
          nextActionCalls += 1;
          if (overrides && overrides.nextAction) {
            return overrides.nextAction(url, opts, nextActionCalls);
          }
          return mockJsonResponse(200, overrides && overrides.payload ? overrides.payload : {
            enabled: true,
            show_primary_coach: true,
            next_action: 'create_child',
            can_defer: true,
            headline: 'H',
            body: 'B',
            cta_label: 'C',
          });
        }
        if (String(url).includes('/activation/defer')) {
          deferCalls += 1;
          if (overrides && overrides.defer) {
            return overrides.defer(url, opts, deferCalls);
          }
          return mockJsonResponse(200, { ok: true, deferred_until: new Date().toISOString() });
        }
        return mockJsonResponse(404, {});
      },
      EngineCoach: { load: async () => {} },
      JourneyCoach: { pollCoach: async () => {} },
      document: {
        getElementById: (id) => (id === MOUNT_ID ? mount : null),
        contains: () => true,
      },
      sessionStorage: {
        _m: {},
        getItem(k) { return this._m[k] || null; },
        setItem(k, v) { this._m[k] = v; },
        removeItem(k) { delete this._m[k]; },
      },
      location: { href: '' },
    };

  if (overrides && overrides.sessionStorage) {
    Object.assign(win.sessionStorage._m, overrides.sessionStorage);
  }
  if (overrides && overrides.silentRefresh) {
    win.Auth.silentRefresh = overrides.silentRefresh;
  }

  const sandbox = {
    window: win,
    document: win.document,
    sessionStorage: win.sessionStorage,
    setTimeout,
    clearTimeout,
    AbortController,
  };
  sandbox.analytics = win.analytics;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(HUB_PATH, 'utf8'), sandbox);

  return {
    Hub: win.ActivationFirstSuccessHub,
    mount,
    tracked,
    apiCalls,
    get nextActionCalls() { return nextActionCalls; },
    get deferCalls() { return deferCalls; },
  };
}

describe('activation first-success recovery client (#1023)', () => {
  it('1: next-action 500 → blocked card', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, { error: 'fail' }),
    });
    const result = await ctx.Hub.load();
    assert.equal(result.reason, 'blocked');
    assert.match(ctx.mount.innerHTML, /fetchErrorHeadline/);
    assert.ok(ctx.Hub.isBlocked());
    assert.ok(ctx.Hub.shouldSuppressLegacyCoaches());
  });

  it('2: network error → blocked card', async () => {
    const ctx = createSandbox({
      nextAction: () => Promise.reject(Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' })),
    });
    const result = await ctx.Hub.load();
    assert.equal(result.reason, 'blocked');
    assert.match(ctx.mount.innerHTML, /fetchErrorHeadline/);
  });

  it('3: timeout → blocked card', async () => {
    const ctx = createSandbox({
      nextAction: () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    });
    const result = await ctx.Hub.load();
    assert.equal(result.reason, 'blocked');
    assert.equal(result.blocked.errorClass, 'timeout');
  });

  it('4: 429 → blocked card', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(429, { error: 'rate' }),
    });
    const result = await ctx.Hub.load();
    assert.equal(result.reason, 'blocked');
    assert.equal(result.blocked.errorClass, 'rate_limited');
  });

  it('5: retry → successful coach', async () => {
    let calls = 0;
    const ctx = createSandbox({
      nextAction: () => {
        calls += 1;
        if (calls === 1) return mockJsonResponse(500, {});
        return mockJsonResponse(200, {
          enabled: true,
          show_primary_coach: true,
          next_action: 'create_child',
          can_defer: true,
          headline: 'H',
          body: 'B',
          cta_label: 'C',
        });
      },
    });
    await ctx.Hub.load();
    ctx.mount._retryFn();
    await new Promise((r) => setTimeout(r, 20));
    assert.match(ctx.mount.innerHTML, /activation-fs-coach/);
    assert.ok(!ctx.Hub.isBlocked());
  });

  it('6: retry bypasses cache', async () => {
    let calls = 0;
    const payload = {
      enabled: true,
      show_primary_coach: true,
      next_action: 'create_child',
      can_defer: true,
    };
    const ctx = createSandbox({
      nextAction: () => {
        calls += 1;
        if (calls === 1) return mockJsonResponse(500, {});
        return mockJsonResponse(200, payload);
      },
    });
    await ctx.Hub.load();
    await ctx.Hub.load();
    assert.equal(calls, 1);
    ctx.mount._retryFn();
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(calls >= 2);
  });

  it('7: blocked failure not cached as success', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    assert.equal(ctx.Hub.getCachedPayload(), null);
  });

  it('8: 401 → one silent refresh → refetch', async () => {
    let refreshCalls = 0;
    let actionCalls = 0;
    const ctx = createSandbox({
      silentRefresh: async () => { refreshCalls += 1; return true; },
      nextAction: () => {
        actionCalls += 1;
        if (actionCalls === 1) return mockJsonResponse(401, {});
        return mockJsonResponse(200, {
          enabled: true,
          show_primary_coach: true,
          next_action: 'save_schedule',
          can_defer: true,
        });
      },
    });
    const result = await ctx.Hub.load();
    assert.equal(refreshCalls, 1);
    assert.equal(actionCalls, 2);
    assert.equal(result.ok, true);
  });

  it('9: failed auth refresh → no blocked card', async () => {
    const ctx = createSandbox({
      silentRefresh: async () => false,
      nextAction: () => mockJsonResponse(401, {}),
    });
    const result = await ctx.Hub.load();
    assert.equal(result.reason, 'auth');
    assert.ok(!ctx.Hub.isBlocked());
    assert.equal(ctx.mount.innerHTML, '');
  });

  it('10: 403 PEDAGOG_ONLY does NOT show blocked or auth failure card', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(403, { error: 'PEDAGOG_ONLY' }),
    });
    const result = await ctx.Hub.load();
    assert.equal(result.reason, 'pedagog_only');
    assert.ok(!ctx.Hub.isBlocked());
  });

  it('11: continue without guide → session suppress', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    ctx.mount._continueFn();
    assert.ok(ctx.Hub.isSessionSuppressed());
  });

  it('12: continue without guide → NO defer POST', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    ctx.mount._continueFn();
    assert.equal(ctx.deferCalls, 0);
  });

  it('13: continue without guide → legacy suppressed', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    ctx.mount._continueFn();
    assert.ok(ctx.Hub.shouldSuppressLegacyCoaches());
  });

  it('14: deferred:true payload → coach hidden + legacy suppressed', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: false,
        deferred: true,
        next_action: 'save_schedule',
      },
    });
    const result = await ctx.Hub.load();
    assert.equal(result.deferred, true);
    assert.equal(ctx.mount.innerHTML, '');
    assert.ok(ctx.Hub.shouldSuppressLegacyCoaches());
  });

  it('15: can_defer true → defer button', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'save_schedule',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
    });
    await ctx.Hub.load();
    assert.match(ctx.mount.innerHTML, /activation-fs-defer/);
    assert.match(ctx.mount.innerHTML, /recovery\.defer/);
  });

  it('16: journey_retention → no Activation defer button', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        authority: 'journey_retention',
        show_primary_coach: true,
        next_action: 'child_access',
        can_defer: false,
        dismiss_action: 'DISMISS',
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
    });
    await ctx.Hub.load();
    assert.doesNotMatch(ctx.mount.innerHTML, /class="activation-fs-defer /);
  });

  it('17: successful defer', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'save_schedule',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
    });
    await ctx.Hub.load();
    await ctx.mount._deferFn();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(ctx.deferCalls, 1);
    assert.equal(ctx.mount.innerHTML, '');
    const deferredEvent = ctx.tracked.find((e) => e.event === 'activation_first_success_deferred');
    assert.ok(deferredEvent);
    assert.equal(deferredEvent.meta.defer_duration_hours, 12);
  });

  it('18: double defer protected', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'save_schedule',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
      defer: async () => {
        await new Promise((r) => setTimeout(r, 30));
        return mockJsonResponse(200, { ok: true, deferred_until: new Date().toISOString() });
      },
    });
    await ctx.Hub.load();
    const p1 = ctx.mount._deferFn();
    const p2 = ctx.mount._deferFn();
    await Promise.all([p1, p2]);
    assert.equal(ctx.deferCalls, 1);
  });

  it('19: 409 STEP_CHANGED self-heals', async () => {
    let actionCalls = 0;
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'save_schedule',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
      defer: () => mockJsonResponse(409, { code: 'ACTIVATION_STEP_CHANGED', current_next_action: 'child_access' }),
      nextAction: (url, opts, n) => {
        actionCalls += 1;
        if (actionCalls <= 1) {
          return mockJsonResponse(200, {
            enabled: true,
            show_primary_coach: true,
            next_action: 'save_schedule',
            can_defer: true,
            headline: 'H',
            body: 'B',
            cta_label: 'C',
          });
        }
        return mockJsonResponse(200, {
          enabled: true,
          show_primary_coach: true,
          next_action: 'child_access',
          can_defer: true,
          headline: 'H2',
          body: 'B2',
          cta_label: 'C2',
        });
      },
    });
    await ctx.Hub.load();
    await ctx.mount._deferFn();
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(actionCalls >= 2);
  });

  it('20: 409 NO_STEP self-heals', async () => {
    let actionCalls = 0;
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'save_schedule',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
      defer: () => mockJsonResponse(409, { code: 'ACTIVATION_NO_STEP' }),
      nextAction: () => {
        actionCalls += 1;
        if (actionCalls === 1) {
          return mockJsonResponse(200, {
            enabled: true,
            show_primary_coach: true,
            next_action: 'save_schedule',
            can_defer: true,
            headline: 'H',
            body: 'B',
            cta_label: 'C',
          });
        }
        return mockJsonResponse(200, {
          enabled: true,
          show_primary_coach: false,
          next_action: 'none',
          reason: ['already_first_success'],
        });
      },
    });
    await ctx.Hub.load();
    await ctx.mount._deferFn();
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(actionCalls >= 2);
    assert.ok(!ctx.Hub.isBlocked());
  });

  it('21: defer 500 leaves coach visible', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'save_schedule',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
      defer: () => mockJsonResponse(500, { error: 'fail' }),
    });
    await ctx.Hub.load();
    await ctx.mount._deferFn();
    await new Promise((r) => setTimeout(r, 20));
    assert.match(ctx.mount.innerHTML, /activation-fs-coach/);
    const deferredEvent = ctx.tracked.filter((e) => e.event === 'activation_first_success_deferred');
    assert.equal(deferredEvent.length, 0);
  });

  it('22: analytics exactly once for blocked shown', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    await ctx.Hub.load();
    const blocked = ctx.tracked.filter((e) => e.event === 'activation_first_success_blocked_shown');
    assert.equal(blocked.length, 1);
  });

  it('23: analytics no PII/high-cardinality values', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    for (const { event, meta } of ctx.tracked) {
      const serialized = JSON.stringify(meta);
      assert.doesNotMatch(serialized, /family_id|child_id|parent_id|@/i);
      assert.doesNotMatch(serialized, /stack|trace/i);
      if (event === 'activation_first_success_blocked_shown') {
        assert.ok(['server', 'network', 'timeout', 'rate_limited'].includes(meta.error_class));
      }
    }
  });

  it('24: accessibility contract', async () => {
    const ctx = createSandbox({
      nextAction: () => mockJsonResponse(500, {}),
    });
    await ctx.Hub.load();
    assert.match(ctx.mount.innerHTML, /aria-live="polite"/);
    assert.match(ctx.mount.innerHTML, /min-h-\[44px\]/);
    assert.match(ctx.mount.innerHTML, /activation-fs-retry/);
  });

  it('25: successful happy path unchanged', async () => {
    const ctx = createSandbox({
      payload: {
        enabled: true,
        show_primary_coach: true,
        next_action: 'create_child',
        can_defer: true,
        headline: 'H',
        body: 'B',
        cta_label: 'C',
      },
    });
    const result = await ctx.Hub.load();
    assert.equal(result.ok, true);
    assert.match(ctx.mount.innerHTML, /activation-fs-coach/);
    assert.match(ctx.mount.innerHTML, /activation-fs-cta/);
    const shown = ctx.tracked.filter((e) => e.event === 'activation_first_success_next_action_shown');
    assert.equal(shown.length, 1);
  });
});

describe('AC5 idempotency evidence (#1023)', () => {
  it('26: concurrent onboarding test exists for child dedupe', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'test/golden-path-fas6-concurrent-onboarding.integration.test.js'),
      'utf8'
    );
    assert.match(src, /at most one child/);
    assert.match(src, /findResumableChildWithoutSchema|concurrent/);
  });

  it('27: schedule overwrite idempotency in onboarding route', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/onboarding.js'), 'utf8');
    assert.match(src, /overwrite:\s*true/);
    assert.match(src, /findResumableChildWithoutSchema/);
  });

  it('28: golden-path concurrent schedule test exists', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'test/golden-path-fas6-concurrent-onboarding.integration.test.js'),
      'utf8'
    );
    assert.match(src, /parallel schedule|overwrite/i);
  });
});

describe('analytics allowlist', () => {
  it('recovery events whitelisted', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    const events = [
      'activation_first_success_blocked_shown',
      'activation_first_success_retry_clicked',
      'activation_first_success_recovered',
      'activation_first_success_deferred',
      'activation_first_success_blocked_continue_clicked',
    ];
    for (const ev of events) {
      assert.match(src, new RegExp(`'${ev}'`));
    }
  });
});

describe('hub source contracts', () => {
  it('shouldSuppressLegacyCoaches covers blocked/deferred/session', () => {
    const src = fs.readFileSync(HUB_PATH, 'utf8');
    assert.match(src, /isSessionSuppressed/);
    assert.match(src, /blockedState/);
    assert.match(src, /cache\.data\.deferred/);
  });

  it('no hard-coded Swedish recovery strings in hub', () => {
    const src = fs.readFileSync(HUB_PATH, 'utf8');
    assert.doesNotMatch(src, /Vi kunde inte hämta/);
    assert.doesNotMatch(src, /Försök igen/);
    assert.doesNotMatch(src, /Gör det senare/);
  });
});
