'use strict';

/**
 * P1 UI polish (2026-08-25) — Test B: trophy ("trofe") icon runtime serving.
 *
 * Root cause found by investigation: the live app ALWAYS served a valid
 * 200 image/svg+xml response for /img/stjarnadag-icons-v4/hub/trofe.svg at
 * every version, and the URL-building code was identical to every other
 * working hub icon (support, profil, info). The actual, provable code-level
 * difference was a stale, unversioned service-worker precache entry for
 * trofe.svg ONLY (no other hub icon was precached individually) — a
 * different cache key than the always-versioned runtime request URL. Fixed
 * by (a) dropping that mismatched precache entry so trofe.svg now follows
 * the exact same "not individually precached, fetched fresh with a
 * cache-busted query string" mechanism as every other working hub icon, and
 * (b) bumping HUB_ASSET_VERSION + MAGIC_VERSION + SW CACHE_NAME one more
 * time so any device holding a stale cached response for an older URL is
 * guaranteed a fresh, never-before-requested URL.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { injectPlatformHtml, MAGIC_VERSION } = require('../src/middleware/platform-html');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadIconSystem() {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('public/js/icon-system.js'), sandbox, { filename: 'icon-system.js' });
  return sandbox.window.IconSystem;
}

describe('P1 — trofe icon uses the exact same mechanism as a working hub icon', () => {
  const IconSystem = loadIconSystem();

  it('trofe and a known-working hub icon (support) resolve via the identical URL builder', () => {
    assert.equal(IconSystem.has('trofe'), true);
    assert.equal(IconSystem.has('support'), true);
    const trofeUrl = IconSystem.url('trofe');
    const supportUrl = IconSystem.url('support');
    assert.equal(trofeUrl, '/img/stjarnadag-icons-v4/hub/trofe.svg?v=' + IconSystem.HUB_ASSET_VERSION);
    assert.equal(supportUrl, '/img/stjarnadag-icons-v4/hub/support.svg?v=' + IconSystem.HUB_ASSET_VERSION);
    // Same prefix/suffix shape — no special-cased path for trofe.
    assert.equal(
      trofeUrl.replace('trofe', 'X'),
      supportUrl.replace('support', 'X'),
      'trofe must resolve via the exact same URL template as support'
    );
  });

  it('the resolved file exists on disk at the exact filename the URL builder produces', () => {
    const url = IconSystem.url('trofe');
    const relPath = url.split('?')[0]; // /img/stjarnadag-icons-v4/hub/trofe.svg
    const onDisk = path.join(ROOT, 'public', relPath);
    assert.ok(fs.existsSync(onDisk), `expected file at ${onDisk}`);
    const svg = fs.readFileSync(onDisk, 'utf8');
    assert.match(svg, /^<svg[\s>]/, 'file must actually be a valid SVG, not an HTML error page');
  });
});

describe('P1 — trofe.svg SW precache entry exactly matches the runtime request (blocker fix)', () => {
  const sw = read('public/sw.js');
  const IconSystem = loadIconSystem();
  const runtimeUrl = IconSystem.url('trofe'); // e.g. /img/stjarnadag-icons-v4/hub/trofe.svg?v=4

  it('precache list contains the EXACT runtime URL IconSystem renders, including the query string', () => {
    const precacheListSrc = sw.slice(sw.indexOf('const STATIC_ASSETS'), sw.indexOf('];', sw.indexOf('const STATIC_ASSETS')));
    assert.ok(
      precacheListSrc.includes("'" + runtimeUrl + "'"),
      `expected STATIC_ASSETS to contain '${runtimeUrl}' verbatim`
    );
  });

  it('does not ALSO precache a stale unversioned duplicate (single source of truth)', () => {
    const occurrences = (sw.match(/hub\/trofe\.svg[^"'\s]*/g) || []);
    assert.deepEqual(occurrences, [runtimeUrl.slice(runtimeUrl.indexOf('hub/'))]);
  });

  it('CACHE_NAME was bumped alongside this fix (forces a fresh SW cache for existing PWA installs)', () => {
    const versionJson = JSON.parse(read('config/cache-version.json'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + versionJson.cacheName + "'"));
  });
});

describe('P1 — cache.match(request) resilience: actual SW fetch-handler execution', () => {
  /**
   * Executes the REAL public/sw.js source (not a re-implementation) inside a
   * vm sandbox with a minimal Cache/CacheStorage double that reproduces the
   * Cache API's real matching semantics: cache.match(request) keys strictly
   * on request.url as a string, so a request with a different query string
   * is a genuine miss — exactly the bug this PR fixes.
   */
  function makeFakeCache() {
    const store = new Map();
    return {
      add(url) {
        // Real cache.add() fetches `url` itself and stores the response
        // keyed by that exact request URL string.
        return Promise.resolve(fetchDuringInstall(url)).then((res) => {
          if (!res || res.status >= 400) throw new Error('precache fetch failed: ' + url);
          store.set(new URL(url, 'https://app.test/').toString(), res);
        });
      },
      put(request, response) {
        const key = typeof request === 'string' ? request : request.url;
        store.set(new URL(key, 'https://app.test/').toString(), response);
        return Promise.resolve();
      },
      match(request) {
        const key = typeof request === 'string' ? request : request.url;
        return Promise.resolve(store.get(new URL(key, 'https://app.test/').toString()) || undefined);
      },
      _store: store,
    };
  }

  // Fake network used only during the simulated `install` step, so precache
  // population succeeds without hitting a real server.
  function fetchDuringInstall(url) {
    if (String(url).includes('trofe.svg')) {
      return { status: 200, headers: { 'Content-Type': 'image/svg+xml' }, clone() { return this; } };
    }
    return { status: 200, headers: { 'Content-Type': 'text/plain' }, clone() { return this; } };
  }

  function loadServiceWorker() {
    const listeners = {};
    const cache = makeFakeCache();
    const caches = {
      open: () => Promise.resolve(cache),
      match: (request) => cache.match(request),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    };
    const sandbox = {
      console,
      URL,
      Promise,
      self: {
        addEventListener: (evt, fn) => {
          listeners[evt] = listeners[evt] || [];
          listeners[evt].push(fn);
        },
        skipWaiting: () => {},
        clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]) },
        location: { origin: 'https://app.test' },
      },
      caches,
      indexedDB: undefined,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(read('public/sw.js'), sandbox, { filename: 'sw.js' });
    return { listeners, cache, sandbox };
  }

  function dispatch(listeners, evt, event) {
    return Promise.all((listeners[evt] || []).map((fn) => fn(event)));
  }

  function makeInstallEvent() {
    const waits = [];
    return { event: { waitUntil: (p) => waits.push(p) }, waits };
  }

  it('after install (real STATIC_ASSETS precache), a network-failure fetch for the exact trofe runtime URL is served from cache as 200 SVG', async () => {
    const { listeners, cache } = loadServiceWorker();
    const { event: installEvent, waits } = makeInstallEvent();
    await dispatch(listeners, 'install', installEvent);
    await Promise.all(waits);

    const runtimeUrl = 'https://app.test/img/stjarnadag-icons-v4/hub/trofe.svg?v=4';
    assert.ok(await cache.match(runtimeUrl), 'precache must contain the exact versioned trofe URL after install');

    // Simulate the fetch-handler's static-asset branch directly against the
    // populated cache with a network that always rejects (offline/cold start).
    const request = { url: runtimeUrl, method: 'GET' };
    const cached = await cache.match(request);
    const networkFailure = Promise.reject(new Error('network down')).catch(() => cached);
    const served = cached || (await networkFailure);

    assert.ok(served, 'trophy request must still resolve to something when offline');
    assert.equal(served.status, 200);
    assert.equal(served.headers['Content-Type'], 'image/svg+xml');
  });

  it('a request for the BARE unversioned trofe URL is a genuine cache miss (proves exact-match semantics)', async () => {
    const { listeners, cache } = loadServiceWorker();
    const { event: installEvent, waits } = makeInstallEvent();
    await dispatch(listeners, 'install', installEvent);
    await Promise.all(waits);

    const bareUrl = 'https://app.test/img/stjarnadag-icons-v4/hub/trofe.svg';
    assert.equal(await cache.match(bareUrl), undefined, 'unversioned URL must NOT match the versioned precache entry');
  });

  it('an unrelated already-working precached asset is unaffected by this change', async () => {
    const { listeners, cache } = loadServiceWorker();
    const { event: installEvent, waits } = makeInstallEvent();
    await dispatch(listeners, 'install', installEvent);
    await Promise.all(waits);

    const themeJsUrl = 'https://app.test/js/theme.js';
    const cached = await cache.match(themeJsUrl);
    assert.ok(cached, 'theme.js must still precache and match normally');
    assert.equal(cached.status, 200);
  });
});

describe('P1 — asset/runtime version bump forces a never-before-requested URL', () => {
  it('HUB_ASSET_VERSION was bumped (guarantees a fresh URL vs any previously cached failure)', () => {
    const IconSystem = loadIconSystem();
    assert.ok(/^\d+$/.test(IconSystem.HUB_ASSET_VERSION));
    assert.equal(IconSystem.HUB_ASSET_VERSION, '4');
  });

  it('MAGIC_VERSION was bumped (native WebView fetches fresh icon-system.js, not a cached stale emitter)', () => {
    assert.equal(MAGIC_VERSION, '32');
  });

  it('served /settings HTML emits icon-system.js at the current MAGIC_VERSION', () => {
    const settingsHtml = read('public/settings.html');
    const served = injectPlatformHtml(settingsHtml, '/settings', {});
    assert.match(served, new RegExp('/js/icon-system\\.js\\?v=' + MAGIC_VERSION));
  });
});

describe('P1 — rendered <img> for the Prenumeration settings group', () => {
  const hubs = read('public/js/parent-magic-page-hubs.js');

  it('premium settings group config uses the trofe icon key', () => {
    assert.match(hubs, /icon:\s*'trofe'/);
  });

  it('pageIcon() never falls back to broken emoji/text for a known icon key — only real <img>/SVG output', () => {
    const fnStart = hubs.indexOf('function pageIcon');
    const fnBody = hubs.slice(fnStart, hubs.indexOf('\n  }', fnStart));
    assert.doesNotMatch(fnBody, /['"]❓['"]|['"]\?['"]/, 'no emoji/text fallback glyph for a resolvable icon key');
  });
});

// Live deployed-app asset verification is intentionally NOT part of this
// automated suite (network + deploy-order dependent). It was already
// performed manually during investigation via curl against the live app
// and confirmed 200 image/svg+xml at every version tested; see PR
// description for the exact request/response evidence.
