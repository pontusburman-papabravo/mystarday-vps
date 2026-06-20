'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const NAV_PATH = path.join(ROOT, 'public/admin/admin-nav.js');
const INDEX_PATH = path.join(ROOT, 'public/admin/index.html');
const CORE_PATH = path.join(ROOT, 'public/admin/admin-core.js');

function loadAdminNav() {
  const sandbox = {
    window: {},
    document: { getElementById: () => ({ innerHTML: '' }) },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(NAV_PATH, 'utf8'), sandbox);
  return {
    resolveRoute: sandbox.resolveRoute,
    renderAdminNav: sandbox.renderAdminNav,
    document: sandbox.document,
  };
}

function sectionIdsFromHtml() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const matches = [...html.matchAll(/id="([a-zA-Z0-9]+Section)"/g)];
  return new Set(matches.map((m) => m[1].replace(/Section$/, '')));
}

describe('Fas 1 — route registry', () => {
  const { resolveRoute } = loadAdminNav();

  const aliasCases = [
    ['overview', 'start', 'overview'],
    ['families', 'familjer', 'families'],
    ['messages', 'meddelanden', 'messages'],
    ['analytics', 'produktanalys', 'analytics'],
    ['intresseanmalningar', 'pedagogintresse', 'intresseanmalningar'],
    ['landning', 'landningssidor', 'landning'],
    ['emailmallar', 'epostmallar', 'emailmallar'],
    ['emaillog', 'epostlogg', 'emaillog'],
    ['dagensnyhet', 'dagens-nyhet', 'dagensnyhet'],
    ['defaults', 'bibliotek', 'defaults'],
    ['password', 'konto', 'password'],
    ['anvandarstatistik', 'anvandarinsikter', 'anvandarstatistik'],
  ];

  for (const [alias, canonical, section] of aliasCases) {
    test(`alias #${alias} → canonical #${canonical} → section ${section}`, () => {
      const r = resolveRoute('#' + alias);
      assert.equal(r.canonicalKey, canonical);
      assert.equal(r.targetSection, section);
    });
  }

  test('empty hash defaults to start', () => {
    const r = resolveRoute('');
    assert.equal(r.canonicalKey, 'start');
    assert.equal(r.targetSection, 'overview');
    assert.deepEqual([...r.breadcrumb], ['Hem', 'Start']);
  });

  test('unknown hash falls back to start', () => {
    const r = resolveRoute('#does-not-exist');
    assert.equal(r.canonicalKey, 'start');
  });

  test('#paketintresse → prenumeration + scroll anchor', () => {
    const r = resolveRoute('#paketintresse');
    assert.equal(r.targetSection, 'prenumeration');
    assert.equal(r.scrollTargetId, '#paketintresse-anchor');
    assert.equal(r.navId, 'paketintresse');
    assert.deepEqual([...r.breadcrumb], ['Tillväxt', 'Paketintresse']);
  });

  test('#valkomstmail → emailmallar + valkomstmail tab', () => {
    const r = resolveRoute('#valkomstmail');
    assert.equal(r.targetSection, 'emailmallar');
    assert.equal(r.emailTab, 'valkomstmail');
    assert.equal(r.navId, 'epostmallar');
    assert.deepEqual([...r.breadcrumb], ['Kommunikation', 'E-postmallar', 'Välkomstmail']);
  });

  test('#bildbank → bildbank with parent breadcrumb', () => {
    const r = resolveRoute('#bildbank');
    assert.equal(r.targetSection, 'bildbank');
    assert.equal(r.parentNavId, 'landningssidor');
    assert.deepEqual([...r.breadcrumb], ['Tillväxt', 'Landningssidor', 'Bildbank']);
  });

  test('every resolved route has capability', () => {
    const keys = [
      'start', 'familjer', 'paketintresse', 'produktanalys', 'valkomstmail', 'bildbank',
    ];
    for (const k of keys) {
      const r = resolveRoute('#' + k);
      assert.ok(r.capability, `missing capability for ${k}`);
    }
  });
});

describe('Fas 1 — DOM section targets exist in index.html', () => {
  const { resolveRoute } = loadAdminNav();
  const sections = sectionIdsFromHtml();

  const routes = [
    'start', 'familjer', 'meddelanden', 'paketintresse', 'pedagogintresse', 'waitlist',
    'landningssidor', 'bildbank', 'undersokningar', 'nyhetsbrev', 'epostmallar', 'valkomstmail',
    'epostlogg', 'dagens-nyhet', 'produktanalys', 'anvandning', 'anvandarinsikter',
    'retention', 'foraldaraktivering', 'fordig', 'bibliotek', 'prenumeration', 'konto',
  ];

  for (const key of routes) {
    test(`#${key} targetSection exists in HTML`, () => {
      const r = resolveRoute('#' + key);
      assert.ok(
        sections.has(r.targetSection),
        `#${key} → ${r.targetSection}Section missing in index.html`
      );
    });
  }

  test('paketintresse-anchor exists', () => {
    const html = fs.readFileSync(INDEX_PATH, 'utf8');
    assert.match(html, /id="paketintresse-anchor"/);
  });
});

describe('Fas 1 — sidebar render', () => {
  test('renderAdminNav produces 6 groups and no emojis in labels', () => {
    let html = '';
    const { renderAdminNav } = loadAdminNav();
    const doc = {
      getElementById(id) {
        if (id !== 'adminSidebarLinks') return null;
        return {
          set innerHTML(v) { html = v; },
          get innerHTML() { return html; },
        };
      },
    };
    const sandbox = { window: { document: doc }, document: doc };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(NAV_PATH, 'utf8'), sandbox);
    sandbox.renderAdminNav();

    assert.equal((html.match(/class="admin-nav-group"/g) || []).length, 6);
    assert.match(html, /Hem/);
    assert.match(html, /Tillväxt/);
    assert.match(html, /Paketintresse/);
    assert.match(html, /Pedagogintresse/);
    assert.match(html, /Landningssidor/);
    assert.match(html, /Bildbank/);
    assert.match(html, /Produktanalys/);
    assert.match(html, /Användning/);
    assert.match(html, /Experiment/);
    assert.match(html, /Funktioner/);
    assert.match(html, /\/admin\/development/);
    assert.doesNotMatch(html, /Översikt/);
    assert.doesNotMatch(html, /Intresseanmälningar/);
    // Common emoji ranges in nav output
    assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}]/u);
    assert.doesNotMatch(html, /📊|📧|🎓|💳|🌐|🖼️/);
    // Välkomstmail is alias-only in Fas 1, not a top-level nav item
    assert.doesNotMatch(html, />Välkomstmail</);
    assert.match(html, /id="messagesBadge"/);
  });
});

describe('Fas 1 — admin-core wiring', () => {
  test('index.html loads admin-nav before admin-core', () => {
    const html = fs.readFileSync(INDEX_PATH, 'utf8');
    const navIdx = html.indexOf('admin-nav.js');
    const coreIdx = html.indexOf('admin-core.js');
    assert.ok(navIdx > 0 && coreIdx > navIdx);
  });

  test('admin-core has hashchange and refresh handlers for fixed sections', () => {
    const core = fs.readFileSync(CORE_PATH, 'utf8');
    assert.match(core, /hashchange/);
    assert.match(core, /navigateToRoute/);
    for (const section of ['retention', 'dagensnyhet', 'landning', 'undersokningar', 'nyhetsbrev']) {
      assert.match(core, new RegExp(`name === '${section}'`));
    }
  });

  test('admin-library wraps showSection with route param', () => {
    const lib = fs.readFileSync(path.join(ROOT, 'public/admin/admin-library.js'), 'utf8');
    assert.match(lib, /showSection = function\(name, route\)/);
  });

  test('breadcrumb container in index.html', () => {
    const html = fs.readFileSync(INDEX_PATH, 'utf8');
    assert.match(html, /id="adminBreadcrumb"/);
    assert.match(html, /id="pageTitle"/);
  });
});
