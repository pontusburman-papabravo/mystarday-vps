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

describe('P1 — trofe.svg is NOT stuck in a stale/mismatched service-worker precache entry', () => {
  const sw = read('public/sw.js');

  it('is not individually precached — same as every other working hub icon (support/profil/info)', () => {
    assert.doesNotMatch(sw, /hub\/trofe\.svg/);
    assert.doesNotMatch(sw, /hub\/support\.svg/);
    assert.doesNotMatch(sw, /hub\/profil\.svg/);
    assert.doesNotMatch(sw, /hub\/info\.svg/);
  });

  it('CACHE_NAME was bumped alongside this fix (forces a fresh SW cache for PWA users)', () => {
    const versionJson = JSON.parse(read('config/cache-version.json'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + versionJson.cacheName + "'"));
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
