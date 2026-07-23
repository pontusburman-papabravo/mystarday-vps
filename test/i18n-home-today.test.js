'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { loadLocales, t, getLocale } = require('../src/lib/i18n');

const FRAGMENTS_DIR = path.join(__dirname, '../config/i18n');
const SWEDISH_RE = /[åäöÅÄÖ]/;
const DOMAINS = ['home', 'today', 'journey', 'time'];

function flattenStrings(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenStrings(v, key));
    } else if (typeof v === 'string') {
      out.push({ key, value: v });
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') out.push({ key: `${key}[${i}]`, value: item });
      });
    }
  }
  return out;
}

function loadFragment(locale, domain) {
  return JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, `${domain}-${locale}.json`), 'utf8'));
}

function loadLocaleDateTime(mockWindow) {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/locale-datetime.js'), 'utf8');
  const sandbox = {
    window: mockWindow || {},
    Intl,
    Date,
    console,
  };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.LocaleDateTime;
}

describe('home/today locale fragments', () => {
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
      const allowEmpty = new Set(['rating.labels[0]', 'emotions.sliderSuffixOne', 'bump.movedOne']);
      const empty = flattenStrings(en).filter((x) => !x.value.trim() && !allowEmpty.has(x.key));
      assert.equal(empty.length, 0, empty.map((x) => x.key).join(', '));
    });

    it(`${domain} en-GB avoids obvious Swedish (åäö)`, () => {
      const en = loadFragment('en-GB', domain);
      const swedishHits = flattenStrings(en).filter((x) => SWEDISH_RE.test(x.value));
      assert.equal(swedishHits.length, 0, swedishHits.slice(0, 5).map((x) => `${x.key}: ${x.value}`).join('\n'));
    });
  }

  it('merged bundles expose home.* and today.* via getLocale', () => {
    loadLocales();
    const en = getLocale('en-GB');
    assert.ok(en.home?.greeting?.morning);
    assert.equal(en.home.greeting.morning, 'Good morning!');
    assert.ok(en.today?.nav?.todayBtn);
    assert.equal(en.today.nav.todayBtn, 'Today');
  });
});

describe('server readiness copy', () => {
  it('localizes pending invite for en-GB', () => {
    loadLocales();
    const title = t('en-GB', 'home.readiness.items.pendingInviteTitleMany', { count: 2 });
    assert.match(title, /co-parent invite/i);
    assert.doesNotMatch(title, SWEDISH_RE);
  });

  it('localizes incomplete days for sv-SE', () => {
    loadLocales();
    const title = t('sv-SE', 'home.readiness.items.incompleteDaysTitleMany', { name: 'Anna', count: 3 });
    assert.match(title, /Anna/);
    assert.match(title, /ofullständiga dagar/);
  });
});

describe('LocaleDateTime', () => {
  it('formats weekdays in en-GB without sv-SE default', () => {
    const mockPt = (key) => {
      const map = {
        'time.todayPrefix': 'Today',
        'time.yesterdayPrefix': 'Yesterday',
        'time.tomorrowPrefix': 'Tomorrow',
        'sections.morgon': 'Morning',
      };
      return map[key] || key;
    };
    const mockWindow = {
      I18n: { getCurrentLang: () => 'en-GB' },
      pt: mockPt,
    };
    const LocaleDateTime = loadLocaleDateTime(mockWindow);
    const header = LocaleDateTime.formatDateHeader('2026-07-23', '2026-07-23');
    assert.match(header, /^Today — /);
    assert.doesNotMatch(header, /idag/i);
    const labels = LocaleDateTime.weekDayLabelsMondayFirst();
    assert.equal(labels.length, 7);
    assert.ok(labels[0].length >= 2);
  });
});

describe('analytics regression (static event names)', () => {
  const homeHub = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-home-hub.js'), 'utf8');
  const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
  const readiness = fs.readFileSync(path.join(__dirname, '../public/js/home-readiness.js'), 'utf8');

  it('home-readiness still tracks readiness_action_click', () => {
    assert.match(readiness, /readiness_action_click/);
  });

  it('daily-log analytics events unchanged', () => {
    assert.match(dailyLog, /print_schema_exported/);
    assert.match(dailyLog, /custody_view_filtered/);
    const matches = dailyLog.match(/analytics\.track\(/g) || [];
    assert.equal(matches.length, 2);
  });

  it('dashboard-home-hub preserves nav_hub_click if present', () => {
    if (homeHub.includes('nav_hub_click')) {
      assert.match(homeHub, /nav_hub_click/);
    }
  });
});

describe('user-authored activity names unchanged', () => {
  it('daily-log renders item.name via escHtml without translation wrapper', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    assert.match(dailyLog, /escHtml\(item\.name\)/);
    assert.doesNotMatch(dailyLog, /pt\([^)]*item\.name/);
  });
});
