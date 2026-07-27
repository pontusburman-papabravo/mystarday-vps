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
    ['messages', 'arenden', 'arenden'],
    ['meddelanden', 'arenden', 'arenden'],
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

  test('#paketintresse → extra-stod paket workspace + interest panel', () => {
    const r = resolveRoute('#paketintresse');
    assert.equal(r.canonicalKey, 'extra-stod');
    assert.equal(r.targetSection, 'paket');
    assert.equal(r.subview, 'teacch');
    assert.equal(r.workspacePanel, 'interest');
    assert.equal(r.navId, 'extra-stod');
    assert.deepEqual([...r.breadcrumb], ['Paket', 'Extra stöd']);
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
    'start', 'familjer', 'arenden', 'pedagogintresse', 'waitlist',
    'landningssidor', 'bildbank', 'undersokningar', 'nyhetsbrev', 'epostmallar', 'valkomstmail',
    'epostlogg', 'dagens-nyhet', 'produktanalys', 'anvandning', 'anvandarinsikter',
    'retention', 'foraldaraktivering', 'fordig', 'bibliotek',
    'paket', 'extra-stod', 'paket-rapportering', 'paket-pedagog',
    'prenumeration', 'konto',
    'tillvaxt-pipeline',
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

/** Render sidebar HTML in a minimal VM sandbox (same pattern as route tests). */
function renderNavHtml() {
  let html = '';
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
  return html;
}

/** Canonical routes from A-admin-nav-spec.md §4 (hash router). */
const SPEC_CANONICAL_ROUTES = [
  'start', 'familjer', 'arenden', 'pedagogintresse', 'waitlist',
  'landningssidor', 'bildbank', 'undersokningar', 'nyhetsbrev', 'epostmallar', 'valkomstmail',
  'epostlogg', 'dagens-nyhet', 'produktanalys', 'anvandning', 'anvandarinsikter',
  'retention', 'foraldaraktivering', 'fordig', 'bibliotek',
  'paket', 'extra-stod', 'paket-rapportering', 'paket-pedagog',
  'prenumeration', 'konto',
];

describe('Fas 1 — spec route table completeness', () => {
  const { resolveRoute } = loadAdminNav();
  const sections = sectionIdsFromHtml();

  for (const key of SPEC_CANONICAL_ROUTES) {
    test(`spec route #${key} resolves with breadcrumb + DOM target`, () => {
      const r = resolveRoute('#' + key);
      assert.equal(r.canonicalKey, key, `expected canonical ${key}, got ${r.canonicalKey}`);
      assert.ok(r.breadcrumb && r.breadcrumb.length >= 1, 'breadcrumb too short');
      assert.equal(r.breadcrumb[r.breadcrumb.length - 1], r.label, 'last breadcrumb !== label');
      assert.ok(sections.has(r.targetSection), `missing ${r.targetSection}Section`);
      assert.ok(['stable', 'ui-only', 'proxy-data'].includes(r.capability), `bad capability: ${r.capability}`);
    });
  }
});

describe('Fas 1 — sidebar render', () => {
  test('renderAdminNav produces 7 groups and no emojis in labels', () => {
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

    assert.equal((html.match(/class="admin-nav-group"/g) || []).length, 7);
    assert.match(html, /Hem/);
    assert.match(html, /Tillväxt/);
    assert.match(html, /Paket/);
    assert.match(html, /Extra stöd/);
    assert.match(html, /Rapportering/);
    assert.doesNotMatch(html, />Paketintresse</);
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

  test('every sidebar href is canonical (no legacy aliases in menu)', () => {
    const html = renderNavHtml();
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    const { resolveRoute } = loadAdminNav();
    assert.equal(hrefs.length, 27, 'expected 27 hash nav links (+ 1 external Funktioner)');
    const dup = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    assert.deepEqual(dup, [], 'duplicate nav hrefs: ' + dup.join(', '));
    for (const h of hrefs) {
      const r = resolveRoute('#' + h);
      assert.equal(r.canonicalKey, h, `#${h} is not canonical (→ #${r.canonicalKey})`);
    }
  });

  test('child routes have parentNavId for parent highlight', () => {
    const { resolveRoute } = loadAdminNav();
    const childCases = [
      ['bildbank', 'landningssidor'],
      ['anvandning', 'produktanalys'],
      ['anvandarinsikter', 'produktanalys'],
      ['foraldaraktivering', 'experiment'],
      ['fordig', 'experiment'],
      ['dagens-nyhet', 'kampanjer'],
      ['extra-stod', 'paket'],
      ['paket-rapportering', 'paket'],
      ['paket-pedagog', 'paket'],
    ];
    for (const [key, parent] of childCases) {
      assert.equal(resolveRoute('#' + key).parentNavId, parent, `#${key} parent`);
    }
  });

  test('Kampanjer/Experiment are label-only parents (no data-nav-id on group header)', () => {
    const html = renderNavHtml();
    assert.match(html, />Kampanjer</);
    assert.match(html, />Experiment</);
    assert.doesNotMatch(html, /data-nav-id="kampanjer"/);
    assert.doesNotMatch(html, /data-nav-id="experiment"/);
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

  test('navigateToRoute writes canonical hash then applies on hashchange', () => {
    const core = fs.readFileSync(CORE_PATH, 'utf8');
    assert.match(core, /if \(!opts\.skipHashWrite && current !== canonical\)/);
    assert.match(core, /window\.location\.hash = canonical\.slice\(1\)/);
    assert.match(core, /skipHashWrite: true/);
    assert.match(core, /followup=1/);
  });

  test('refreshSectionData covers all stable section loaders from spec', () => {
    const core = fs.readFileSync(CORE_PATH, 'utf8');
    const handlers = [
      'loadFamilies', 'loadMessages', 'loadInterests', 'loadWaitlist', 'loadLandingNews',
      'loadAdminImages', 'loadSurveys', 'loadNewsletterSubscribers', 'loadEmailTemplates',
      'loadEmailLog', 'loadAnalytics', 'loadUserStats', 'loadRetentionData',
      'loadActivationProgramAdmin', 'loadForDigAdmin', 'loadNyheter', 'loadSubscriptionSettings',
      'syncPaketWorkspace',
    ];
    for (const fn of handlers) {
      assert.match(core, new RegExp(fn), `missing refresh handler ${fn}`);
    }
  });

  test('overviewSection visible by default (Start fallback if hash write defers apply)', () => {
    const html = fs.readFileSync(INDEX_PATH, 'utf8');
    const m = html.match(/id="overviewSection"[^>]*>/);
    assert.ok(m, 'overviewSection missing');
    assert.doesNotMatch(m[0], /hidden/, 'overviewSection should not have hidden class');
  });
});
