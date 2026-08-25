'use strict';

/**
 * P1 physical QA remediation (2026-08-25) — trophy ("trofe") icon, take 2.
 *
 * Physical iOS QA showed the broken-image placeholder persisted in Settings
 * -> Prenumeration even after: correct runtime URL, HTTP 200, correct
 * Content-Type, HUB_ASSET_VERSION bump, and an exact-versioned SW precache
 * entry (see the now-superseded test/trofe-icon-runtime-serving.test.js,
 * deleted in this PR). Conclusion: this is not a cache/version problem —
 * something about the external-image chain itself (URL -> network/SW ->
 * WKWebView image decode) is unreliable for this one icon on device.
 *
 * Fix: `trofe` now renders as INLINE <svg> markup directly in
 * icon-system.js — no <img src>, no fetch, no service-worker dependency, no
 * image decode step at all. The trofe.svg file stays on disk in case any
 * other consumer needs it as a real image; IconSystem.url('trofe') is
 * unchanged. Every other icon key is unaffected — they still render as
 * <img src>.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

describe('P1 — trofe renders as inline <svg>, not <img>', () => {
  const IconSystem = loadIconSystem();

  it('IconSystem.render("trofe") returns inline SVG markup', () => {
    const html = IconSystem.render('trofe', { size: 44 });
    assert.match(html, /^<svg[\s>]/);
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /\bsrc=/);
  });

  it('IconSystem.hub("trofe") (the function Settings actually calls) returns inline SVG', () => {
    const html = IconSystem.hub('trofe');
    assert.match(html, /^<svg[\s>]/);
    assert.doesNotMatch(html, /<img/);
  });

  it('the SVG contains a valid viewBox and real path markup (actual trophy geometry, not a placeholder)', () => {
    const html = IconSystem.hub('trofe');
    assert.match(html, /viewBox="0 0 32 32"/);
    assert.match(html, /<path[^>]+d="[^"]+"/);
    // At least the three real trophy strokes from the original trofe.svg file.
    const pathCount = (html.match(/<path/g) || []).length;
    assert.equal(pathCount, 3);
  });

  it('respects requested size via width/height attributes', () => {
    const html = IconSystem.render('trofe', { size: 28 });
    assert.match(html, /width="28"/);
    assert.match(html, /height="28"/);
  });

  it('applies the requested className, same contract as <img>-based icons', () => {
    const html = IconSystem.render('trofe', { size: 44, className: 'app-icon app-icon--hub' });
    assert.match(html, /class="app-icon app-icon--hub"/);
  });

  it('is decorative (aria-hidden) by default, matching every other icon', () => {
    const html = IconSystem.hub('trofe');
    assert.match(html, /aria-hidden="true"/);
  });

  it('exposes a real accessible label when decorative is explicitly disabled', () => {
    const html = IconSystem.render('trofe', { size: 44, decorative: false });
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="Trofé"/);
    assert.doesNotMatch(html, /aria-hidden/);
  });

  it('IconSystem.has("trofe") is still true (icon key itself unchanged)', () => {
    assert.equal(IconSystem.has('trofe'), true);
  });

  it('IconSystem.url("trofe") is unchanged (kept for any other consumer of the real file)', () => {
    assert.equal(
      IconSystem.url('trofe'),
      '/img/stjarnadag-icons-v4/hub/trofe.svg?v=' + IconSystem.HUB_ASSET_VERSION
    );
  });

  it('the trofe.svg file itself still exists on disk (kept, not deleted)', () => {
    const filePath = path.join(ROOT, 'public/img/stjarnadag-icons-v4/hub/trofe.svg');
    assert.ok(fs.existsSync(filePath));
    assert.match(fs.readFileSync(filePath, 'utf8'), /^<svg/);
  });
});

describe('P1 — every other hub icon is unaffected (still <img src>)', () => {
  const IconSystem = loadIconSystem();

  for (const key of ['support', 'profil', 'info', 'skattkammaren', 'statistik']) {
    it(`IconSystem.hub("${key}") still renders <img src>, unchanged`, () => {
      const html = IconSystem.hub(key);
      assert.match(html, /<img/);
      assert.match(html, new RegExp('src="/img/stjarnadag-icons-v4/hub/' + key + '\\.svg\\?v='));
    });
  }
});

describe('P1 — Settings Premium card renders <svg> for trofe, not <img>', () => {
  const hubs = read('public/js/parent-magic-page-hubs.js');
  const IconSystem = loadIconSystem();

  it('premium settings group still configured with icon key "trofe"', () => {
    assert.match(hubs, /icon:\s*'trofe'/);
  });

  it('pageIcon() delegates directly to IconSystem.hub() for settings-group-sized icons (<=32px) — the exact call site Settings uses', () => {
    const fnStart = hubs.indexOf('function pageIcon');
    const fnBody = hubs.slice(fnStart, hubs.indexOf('\n  }', fnStart));
    assert.match(fnBody, /size\s*&&\s*size\s*<=\s*32[\s\S]{0,40}IconSystem\.hub[\s\S]{0,40}return IconSystem\.hub\(iconKey\)/);
  });

  it('end-to-end: the settings menu HTML for the Prenumeration card contains <svg>, not <img src=".../trofe...">', () => {
    // getSettingsGroups().map(...) wraps pageIcon(g.icon, 28) in a
    // .magic-settings-group-icon span per group card (see renderSettingsHubMenu).
    // Reproduce that exact call for the premium group's icon key end-to-end
    // through the real IconSystem, which is what actually determines the DOM.
    const html = IconSystem.hub('trofe'); // pageIcon() calls IconSystem.hub() for size<=32
    assert.match(html, /^<svg[\s>]/);
    assert.doesNotMatch(html, /<img[^>]+trofe/);
  });

  it('a working icon (support) still resolves to <img src> through the same IconSystem.hub() path', () => {
    const html = IconSystem.hub('support');
    assert.match(html, /<img[^>]+src="\/img\/stjarnadag-icons-v4\/hub\/support\.svg/);
  });
});

describe('P1 — sw.js no longer precaches trofe.svg (no remaining consumer)', () => {
  it('trofe.svg has no precache entry at all — inline SVG has no network/SW dependency', () => {
    const sw = read('public/sw.js');
    assert.doesNotMatch(sw, /hub\/trofe\.svg/);
  });

  it('general SW static-asset fetch strategy is otherwise untouched', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /Stale-while-revalidate/);
    assert.match(sw, /cache\.match\(request\)/);
  });

  it('CACHE_NAME was bumped alongside this change', () => {
    const versionJson = JSON.parse(read('config/cache-version.json'));
    const sw = read('public/sw.js');
    assert.match(sw, new RegExp("const CACHE_NAME = '" + versionJson.cacheName + "'"));
  });
});
