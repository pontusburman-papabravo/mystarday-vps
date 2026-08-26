'use strict';

/**
 * Admin market-gates toggle UI — public/admin/admin-market-gates.js.
 *
 * Covers: correct country → gate key mapping, toggle ON/OFF via the existing
 * PUT /api/admin/feature-flags/:key endpoint, server-truth reload after both
 * success and failure (no optimistic/half-saved state), confirm-cancel is a
 * no-op, and static guards that market_eu_open / payment flags are never
 * touched by this file.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const GATES_JS_PATH = path.join(ROOT, 'public/admin/admin-market-gates.js');
const GATES_SOURCE = fs.readFileSync(GATES_JS_PATH, 'utf8');

const MARKETS_FIXTURE = [
  { code: 'SE', label: 'Sweden', gateKey: 'market_se_open', marketRegion: 'EU', open: true },
  { code: 'IE', label: 'Ireland', gateKey: 'market_ie_open', marketRegion: 'EU', open: false },
  { code: 'FI', label: 'Finland', gateKey: 'market_fi_open', marketRegion: 'EU', open: false },
  { code: 'NO', label: 'Norway', gateKey: 'market_no_open', marketRegion: 'EU', open: false },
  { code: 'DK', label: 'Denmark', gateKey: 'market_dk_open', marketRegion: 'EU', open: false },
  { code: 'GB', label: 'United Kingdom', gateKey: 'market_uk_open', marketRegion: 'UK', open: false },
  { code: 'US', label: 'United States', gateKey: 'market_us_open', marketRegion: 'US', open: false },
  { code: 'ZZ', label: 'Other', gateKey: 'market_other_open', marketRegion: 'OTHER', open: false },
];

function fakeElement() {
  return { innerHTML: '', textContent: '' };
}

/**
 * Loads admin-market-gates.js into a vm sandbox with a stubbed Auth/DOM.
 * @param {{ apiImpl?: Function, confirmImpl?: Function }} [opts]
 */
function loadModule(opts = {}) {
  const calls = { api: [], alerts: [], confirms: [] };
  const elements = {
    marketGatesTableBody: fakeElement(),
    marketGatesHint: fakeElement(),
    marketCountryStatsBody: fakeElement(),
  };

  const defaultApiImpl = async (url, options = {}) => {
    if (url === '/api/admin/market-registration-status') {
      return { markets: MARKETS_FIXTURE };
    }
    if (url === '/api/admin/locale-analytics') {
      return { families_by_country: [] };
    }
    if (url.startsWith('/api/admin/feature-flags/')) {
      return { key: url.split('/').pop(), enabled: JSON.parse(options.body).enabled };
    }
    throw new Error(`Unexpected URL in test: ${url}`);
  };
  const rawApiImpl = opts.apiImpl || defaultApiImpl;
  // Always record calls, even when the test supplies its own (e.g. failing) impl.
  const trackedApiImpl = async (url, options = {}) => {
    calls.api.push({ url, method: (options.method || 'GET').toUpperCase(), body: options.body });
    return rawApiImpl(url, options);
  };

  const sandbox = {
    console,
    document: {
      getElementById: (id) => elements[id] || null,
    },
    Auth: { api: trackedApiImpl },
    confirm: opts.confirmImpl || (() => true),
    alert: (msg) => calls.alerts.push(msg),
    encodeURIComponent,
    JSON,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(GATES_SOURCE, sandbox, { filename: 'admin-market-gates.js' });

  return {
    handleMarketGateToggle: sandbox.handleMarketGateToggle,
    loadMarketRegistrationStatus: sandbox.loadMarketRegistrationStatus,
    calls,
    elements,
  };
}

function fakeCheckbox({ gateKey, countryCode, countryLabel, currentEnabled, nextChecked }) {
  return {
    dataset: {
      gateKey,
      countryCode,
      countryLabel,
      currentEnabled: String(currentEnabled),
    },
    checked: nextChecked,
    disabled: false,
  };
}

describe('admin-market-gates.js — country → gate key mapping', () => {
  test('IE checkbox writes exactly market_ie_open, never market_eu_open', async () => {
    const mod = loadModule();
    const checkbox = fakeCheckbox({
      gateKey: 'market_ie_open',
      countryCode: 'IE',
      countryLabel: 'Irland',
      currentEnabled: false,
      nextChecked: true,
    });
    await mod.handleMarketGateToggle(checkbox);
    const putCall = mod.calls.api.find((c) => c.method === 'PUT');
    assert.ok(putCall, 'expected a PUT call');
    assert.equal(putCall.url, '/api/admin/feature-flags/market_ie_open');
    assert.notEqual(putCall.url, '/api/admin/feature-flags/market_eu_open');
  });

  test('FI checkbox writes exactly market_fi_open, never market_eu_open', async () => {
    const mod = loadModule();
    const checkbox = fakeCheckbox({
      gateKey: 'market_fi_open',
      countryCode: 'FI',
      countryLabel: 'Finland',
      currentEnabled: false,
      nextChecked: true,
    });
    await mod.handleMarketGateToggle(checkbox);
    const putCall = mod.calls.api.find((c) => c.method === 'PUT');
    assert.equal(putCall.url, '/api/admin/feature-flags/market_fi_open');
    assert.notEqual(putCall.url, '/api/admin/feature-flags/market_eu_open');
  });

  test('every rendered gate key is one of the eight per-country flags — market_eu_open never appears', () => {
    const mod = loadModule();
    let sink = '';
    mod.elements.marketGatesTableBody.innerHTML = '';
    Object.defineProperty(mod.elements.marketGatesTableBody, 'innerHTML', {
      set(v) { sink = v; },
      get() { return sink; },
    });
    return mod.loadMarketRegistrationStatus().then(() => {
      assert.doesNotMatch(sink, /market_eu_open/);
      for (const m of MARKETS_FIXTURE) {
        assert.match(sink, new RegExp(m.gateKey));
      }
    });
  });
});

describe('admin-market-gates.js — toggle ON / OFF via existing feature-flag endpoint', () => {
  test('toggle ON sends { enabled: true } and reloads server truth after success', async () => {
    const mod = loadModule();
    const checkbox = fakeCheckbox({
      gateKey: 'market_ie_open',
      countryCode: 'IE',
      countryLabel: 'Irland',
      currentEnabled: false,
      nextChecked: true,
    });
    await mod.handleMarketGateToggle(checkbox);

    const putCall = mod.calls.api.find((c) => c.method === 'PUT');
    assert.deepEqual(JSON.parse(putCall.body), { enabled: true });

    const reloadCall = mod.calls.api.find((c) => c.url === '/api/admin/market-registration-status');
    assert.ok(reloadCall, 'expected a GET reload of market-registration-status after successful PUT');
  });

  test('toggle OFF sends { enabled: false } and reloads server truth after success', async () => {
    const mod = loadModule();
    const checkbox = fakeCheckbox({
      gateKey: 'market_se_open',
      countryCode: 'SE',
      countryLabel: 'Sverige',
      currentEnabled: true,
      nextChecked: false,
    });
    await mod.handleMarketGateToggle(checkbox);

    const putCall = mod.calls.api.find((c) => c.method === 'PUT');
    assert.equal(putCall.url, '/api/admin/feature-flags/market_se_open');
    assert.deepEqual(JSON.parse(putCall.body), { enabled: false });
  });

  test('confirm dialog states exactly which country opens or closes', async () => {
    let confirmMessage = null;
    const mod = loadModule({
      confirmImpl: (msg) => { confirmMessage = msg; return true; },
    });
    const checkbox = fakeCheckbox({
      gateKey: 'market_fi_open',
      countryCode: 'FI',
      countryLabel: 'Finland',
      currentEnabled: false,
      nextChecked: true,
    });
    await mod.handleMarketGateToggle(checkbox);
    assert.match(confirmMessage, /ÖPPNA/);
    assert.match(confirmMessage, /Finland/);
    assert.match(confirmMessage, /market_fi_open/);
  });

  test('cancelling the confirm dialog reverts the checkbox locally and sends no request', async () => {
    const mod = loadModule({ confirmImpl: () => false });
    const checkbox = fakeCheckbox({
      gateKey: 'market_ie_open',
      countryCode: 'IE',
      countryLabel: 'Irland',
      currentEnabled: false,
      nextChecked: true,
    });
    await mod.handleMarketGateToggle(checkbox);
    assert.equal(checkbox.checked, false, 'checkbox should revert to the pre-click server state');
    assert.equal(mod.calls.api.length, 0, 'no API call should be made when the user cancels');
  });
});

describe('admin-market-gates.js — checkboxes stay usable after a toggle (regression)', () => {
  test('after a successful toggle + server reload, no checkbox is left disabled', async () => {
    const mod = loadModule();
    const checkbox = fakeCheckbox({
      gateKey: 'market_ie_open',
      countryCode: 'IE',
      countryLabel: 'Irland',
      currentEnabled: false,
      nextChecked: true,
    });

    await mod.handleMarketGateToggle(checkbox);

    const renderedHtml = mod.elements.marketGatesTableBody.innerHTML;
    assert.doesNotMatch(
      renderedHtml,
      /disabled/,
      'every toggle must be re-enabled once the post-save reload has rendered'
    );

    // And a second, unrelated toggle must actually be clickable — not silently ignored
    // by a guard that never got cleared.
    const secondCheckbox = fakeCheckbox({
      gateKey: 'market_fi_open',
      countryCode: 'FI',
      countryLabel: 'Finland',
      currentEnabled: false,
      nextChecked: true,
    });
    await mod.handleMarketGateToggle(secondCheckbox);
    const putCalls = mod.calls.api.filter((c) => c.method === 'PUT');
    assert.equal(putCalls.length, 2, 'the second, independent toggle must not be blocked by a stuck in-flight guard');
    assert.equal(putCalls[1].url, '/api/admin/feature-flags/market_fi_open');
  });

  test('after an API error + server reload, no checkbox is left disabled', async () => {
    const apiImpl = async (url, options = {}) => {
      if ((options.method || 'GET').toUpperCase() === 'PUT') {
        throw Object.assign(new Error('Kunde inte uppdatera funktionsflagga'), { status: 500 });
      }
      if (url === '/api/admin/market-registration-status') return { markets: MARKETS_FIXTURE };
      if (url === '/api/admin/locale-analytics') return { families_by_country: [] };
      throw new Error(`unexpected ${url}`);
    };
    const mod = loadModule({ apiImpl });
    const checkbox = fakeCheckbox({
      gateKey: 'market_ie_open',
      countryCode: 'IE',
      countryLabel: 'Irland',
      currentEnabled: false,
      nextChecked: true,
    });

    await mod.handleMarketGateToggle(checkbox);

    const renderedHtml = mod.elements.marketGatesTableBody.innerHTML;
    assert.doesNotMatch(
      renderedHtml,
      /disabled/,
      'every toggle must be re-enabled once the post-failure reload has rendered'
    );
  });
});

describe('admin-market-gates.js — API error handling (no half-saved state)', () => {
  test('PUT failure shows a clear error message and reloads actual server status instead of trusting the click', async () => {
    const apiImpl = async (url, options = {}) => {
      if ((options.method || 'GET').toUpperCase() === 'PUT') {
        throw Object.assign(new Error('Kunde inte uppdatera funktionsflagga'), { status: 500 });
      }
      if (url === '/api/admin/market-registration-status') return { markets: MARKETS_FIXTURE };
      if (url === '/api/admin/locale-analytics') return { families_by_country: [] };
      throw new Error(`unexpected ${url}`);
    };
    const mod = loadModule({ apiImpl });
    const checkbox = fakeCheckbox({
      gateKey: 'market_ie_open',
      countryCode: 'IE',
      countryLabel: 'Irland',
      currentEnabled: false,
      nextChecked: true,
    });

    await mod.handleMarketGateToggle(checkbox);

    assert.equal(mod.calls.alerts.length, 1, 'expected exactly one error alert');
    assert.match(mod.calls.alerts[0], /Irland/);
    assert.match(mod.calls.alerts[0], /market_ie_open/);

    const reloadCall = mod.calls.api.find(
      (c) => c.url === '/api/admin/market-registration-status'
    );
    assert.ok(reloadCall, 'expected a GET reload of actual server status after the PUT failed');
  });

  test('overlapping toggle while a save is in flight is rejected and reverted', async () => {
    let resolvePut;
    const apiImpl = async (url, options = {}) => {
      if ((options.method || 'GET').toUpperCase() === 'PUT') {
        return new Promise((resolve) => { resolvePut = () => resolve({ key: 'market_ie_open', enabled: true }); });
      }
      if (url === '/api/admin/market-registration-status') return { markets: MARKETS_FIXTURE };
      if (url === '/api/admin/locale-analytics') return { families_by_country: [] };
      throw new Error(`unexpected ${url}`);
    };
    const mod = loadModule({ apiImpl });
    const first = fakeCheckbox({
      gateKey: 'market_ie_open', countryCode: 'IE', countryLabel: 'Irland', currentEnabled: false, nextChecked: true,
    });
    const second = fakeCheckbox({
      gateKey: 'market_fi_open', countryCode: 'FI', countryLabel: 'Finland', currentEnabled: false, nextChecked: true,
    });

    const firstPromise = mod.handleMarketGateToggle(first);
    await mod.handleMarketGateToggle(second);
    assert.equal(second.checked, false, 'second toggle should be reverted while the first is in flight');

    resolvePut();
    await firstPromise;
  });
});

describe('admin-market-gates.js — scope guards (static)', () => {
  test('no code path can construct a feature-flags/market_eu_open write — only explanatory copy may mention it', () => {
    assert.doesNotMatch(GATES_SOURCE, /feature-flags\/[^\n'"`]*market_eu_open/);
    assert.doesNotMatch(GATES_SOURCE, /gateKey:\s*['"`]market_eu_open['"`]/);
  });

  test('file never references payment/IAP/RevenueCat/billing flags', () => {
    assert.doesNotMatch(GATES_SOURCE, /payment_start_at|payment_enabled|BILLING_UI|REVENUECAT|RevenueCat/i);
  });

  test('file writes only through the existing generic feature-flag endpoint, no parallel endpoint', () => {
    const putUrls = [...GATES_SOURCE.matchAll(/method:\s*'PUT'[\s\S]{0,200}/g)];
    assert.match(GATES_SOURCE, /\/api\/admin\/feature-flags\//);
    assert.ok(putUrls.length >= 0);
    assert.doesNotMatch(GATES_SOURCE, /\/api\/admin\/market-gates\//);
  });
});

describe('admin/system.js — feature-flag write endpoint stays behind requireAdmin', () => {
  test('PUT /feature-flags/:key is defined in admin/system.js and admin.js mounts requireAdmin before all sub-routers', () => {
    const systemSource = fs.readFileSync(path.join(ROOT, 'src/routes/admin/system.js'), 'utf8');
    assert.match(systemSource, /router\.put\('\/feature-flags\/:key'/);

    const adminSource = fs.readFileSync(path.join(ROOT, 'src/routes/admin.js'), 'utf8');
    const requireAdminIdx = adminSource.indexOf('router.use(requireAdmin)');
    const systemMountIdx = adminSource.indexOf("router.use(systemRouter)");
    assert.ok(requireAdminIdx >= 0, 'requireAdmin must be applied in admin.js');
    assert.ok(systemMountIdx >= 0, 'systemRouter must be mounted in admin.js');
    assert.ok(requireAdminIdx < systemMountIdx, 'requireAdmin must be applied before systemRouter (feature-flags) is mounted');
  });
});
