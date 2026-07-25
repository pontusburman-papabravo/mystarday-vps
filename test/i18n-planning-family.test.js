'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadLocales, t, getLocale } = require('../src/lib/i18n');

const FRAGMENTS_DIR = path.join(__dirname, '../config/i18n');
const SWEDISH_RE = /[åäöÅÄÖ]/;
const DOMAINS = ['planning', 'library', 'family', 'schedule', 'settings'];

function flattenStrings(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenStrings(v, key));
    } else if (typeof v === 'string') {
      out.push({ key, value: v });
    }
  }
  return out;
}

function loadFragment(locale, domain) {
  return JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, `${domain}-${locale}.json`), 'utf8'));
}

describe('planning/family locale fragments', () => {
  for (const domain of DOMAINS) {
    it(`${domain} sv-SE and en-GB have identical key structure`, () => {
      const sv = loadFragment('sv-SE', domain);
      const en = loadFragment('en-GB', domain);
      const svKeys = flattenStrings(sv).map((x) => x.key).sort();
      const enKeys = flattenStrings(en).map((x) => x.key).sort();
      assert.deepEqual(enKeys, svKeys);
    });

    it(`${domain} en-GB has no empty values`, () => {
      const en = loadFragment('en-GB', domain);
      const empty = flattenStrings(en).filter((x) => !x.value.trim());
      assert.equal(empty.length, 0, empty.map((x) => x.key).join(', '));
    });

    it(`${domain} en-GB avoids obvious Swedish (åäö)`, () => {
      const en = loadFragment('en-GB', domain);
      const swedishHits = flattenStrings(en).filter((x) => SWEDISH_RE.test(x.value));
      assert.equal(swedishHits.length, 0, swedishHits.slice(0, 5).map((x) => `${x.key}: ${x.value}`).join('\n'));
    });
  }

  it('merged bundles expose planning.* and family.* via getLocale', () => {
    loadLocales();
    const en = getLocale('en-GB');
    assert.equal(en.planning.shell.title, 'Planning');
    assert.equal(en.library.hub.title, 'Library');
    assert.equal(en.family.shell.title, 'Family');
    assert.equal(en.schedule.actions.add, 'Add');
    assert.equal(en.settings.title, 'Settings');
  });
});

describe('navigation locale keys', () => {
  it('nav en-GB exposes capability and header labels', () => {
    loadLocales();
    assert.equal(t('en-GB', 'nav.capability.reports'), 'Reports');
    assert.equal(t('en-GB', 'nav.header.shareTitle'), 'Tell a family about the app!');
    assert.equal(t('en-GB', 'nav.mobile.openMenu'), 'Open menu');
    assert.doesNotMatch(t('en-GB', 'nav.primary.planning'), SWEDISH_RE);
  });

  it('nav-config resolves labelKey when pt is available', () => {
    const navConfig = fs.readFileSync(path.join(__dirname, '../public/js/nav-config.js'), 'utf8');
    assert.match(navConfig, /labelKey:\s*'nav\.primary\.planning'/);
    assert.match(navConfig, /function resolveLabel/);
    assert.match(navConfig, /HEADER_ACTIONS/);
  });
});

describe('static shells', () => {
  it('planning.html has data-i18n shell and manual init', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/planning.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n="planning\.shell\.title"/);
    assert.match(html, /parent-magic-i18n\.js/);
  });

  it('family.html has data-i18n shell and i18n bootstrap', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/family.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n="family\.shell\.title"/);
    assert.match(html, /parent-app-i18n\.js/);
    assert.match(html, /parent-magic-i18n\.js/);
  });

  it('library.html has manual init and page title key', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/library.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n-title="library\.pageTitle"/);
  });

  it('rewards.html has i18n bootstrap and shell keys', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/rewards.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n="library\.rewardsPage\.shell\.title"/);
    assert.match(html, /parent-app-i18n\.js/);
    assert.match(html, /parent-magic-i18n\.js/);
  });

  it('for-dig.html has i18n bootstrap and shell keys', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/for-dig.html'), 'utf8');
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n="forDig\.focus"/);
    assert.match(html, /parent-app-i18n\.js/);
    assert.match(html, /parent-magic-i18n\.js/);
  });

  it('for-dig fragment merges under forDig namespace (not for-dig)', () => {
    loadLocales();
    assert.equal(t('en-GB', 'forDig.sections.recommendTitle', { name: 'Anna' }), 'Good next steps for Anna');
    assert.equal(t('en-GB', 'forDig.cta.addRewards'), 'Add rewards');
    assert.equal(t('en-GB', 'forDig.badges.activated'), 'Activated ✓');
    assert.equal(t('en-GB', 'for-dig.sections.recommendTitle', { name: 'Anna' }), 'for-dig.sections.recommendTitle');
  });
});

describe('runtime localization hooks', () => {
  it('rewards-hub defers initial render when manual i18n init is set', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/rewards-hub.js'), 'utf8');
    assert.match(js, /shouldDeferInitialRender/);
    assert.match(js, /i18nManualInit/);
  });

  it('for-dig.js initializes parent i18n before loading goals', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/for-dig.js'), 'utf8');
    assert.match(js, /initParentAppI18n\(user\.preferred_locale\)/);
    assert.match(js, /await loadGoals\(\)/);
  });

  it('for-dig goals route reads family preferred_locale from database', () => {
    const route = fs.readFileSync(path.join(__dirname, '../src/routes/for-dig.js'), 'utf8');
    assert.match(route, /preferred_locale FROM family/);
    assert.doesNotMatch(route, /req\.user\.preferred_locale/);
  });

  it('planning-hub uses pt() for section labels', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/planning-hub.js'), 'utf8');
    assert.match(js, /function pt\(/);
    assert.match(js, /titleKey/);
    assert.doesNotMatch(js, /label:\s*'Bibliotek'/);
  });

  it('library-magic-hub uses pt() for hub chrome', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/library-magic-hub.js'), 'utf8');
    assert.match(js, /library\.hub\.title/);
    assert.match(js, /subtitleKey/);
  });

  it('family.js uses fpt() and does not translate child names', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/family.js'), 'utf8');
    assert.match(js, /function fpt\(/);
    assert.match(js, /escHtml\(child\.name\)/);
    assert.doesNotMatch(js, /fpt\([^)]*child\.name/);
  });

  it('schedule.js uses spt() helper', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/schedule.js'), 'utf8');
    assert.match(js, /function spt\(/);
    assert.match(js, /initParentAppI18n/);
  });

  it('parent-nav-header uses resolveLabel for actions', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/parent-nav-header.js'), 'utf8');
    assert.match(js, /resolveLabel\(action\)/);
  });
});

describe('user-authored data unchanged', () => {
  it('library.js does not wrap activity.name in pt for display', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/library.js'), 'utf8');
    assert.doesNotMatch(js, /lpt\([^)]*item\.name/);
    assert.doesNotMatch(js, /pt\([^)]*item\.name/);
    assert.match(js, /escHtml\([^)]*\.name\)/);
  });

  it('family schedule apply keeps schedule name in toast params', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/family.js'), 'utf8');
    assert.match(js, /scheduleApplied.*name: scheduleName/);
  });
});

describe('i18n merge domains', () => {
  it('src/lib/i18n.js merges planning/family/schedule domains', () => {
    const i18n = fs.readFileSync(path.join(__dirname, '../src/lib/i18n.js'), 'utf8');
    for (const domain of ['planning', 'library', 'family', 'schedule', 'settings']) {
      assert.match(i18n, new RegExp(`'${domain}'`));
    }
  });
});
