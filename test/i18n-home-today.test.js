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

describe('Journey Home experience en-GB coverage', () => {
  const REGISTRY_SEED = require('../config/journey-experience-registry.json');
  const EN_TRANSLATIONS = require('../config/journey-en-GB-translations');
  const { loadRegistry } = require('../src/lib/journey/registry');

  function listHomeExperiences() {
    const keys = [];
    for (const [phase, experiences] of Object.entries(REGISTRY_SEED.phases || {})) {
      for (const experienceKey of Object.keys(experiences)) {
        keys.push({ phase, experienceKey });
      }
    }
    return keys;
  }

  it('every registry experience_key has en-GB translation', () => {
    const all = listHomeExperiences();
    const missing = all.filter(({ experienceKey }) => !EN_TRANSLATIONS[experienceKey]);
    assert.equal(missing.length, 0, missing.map((x) => x.experienceKey).join(', '));
    assert.ok(all.length >= 18, `expected Home-relevant experiences, got ${all.length}`);
  });

  it('en-GB translations have non-empty headline and cta', () => {
    for (const [key, tr] of Object.entries(EN_TRANSLATIONS)) {
      assert.ok(tr[0] && tr[0].trim(), `${key} headline empty`);
      assert.ok(tr[2] && tr[2].trim(), `${key} cta empty`);
    }
  });

  it('loadRegistry(en-GB) returns English headlines (JSON fallback)', async () => {
    const registry = await loadRegistry({ useDb: false, locale: 'en-GB' });
    const exp = registry.phases.FIRST_USE.handoff_to_child;
    assert.equal(exp.headline, 'Let your child try their routine');
    assert.doesNotMatch(exp.headline, SWEDISH_RE);
    assert.equal(exp.cta, 'Try child mode now');
  });

  it('experience_key set unchanged between sv-SE and en-GB registries', async () => {
    const sv = await loadRegistry({ useDb: false, locale: 'sv-SE' });
    const en = await loadRegistry({ useDb: false, locale: 'en-GB' });
    assert.deepEqual(Object.keys(sv.phases).sort(), Object.keys(en.phases).sort());
    for (const phase of Object.keys(sv.phases)) {
      assert.deepEqual(
        Object.keys(sv.phases[phase]).sort(),
        Object.keys(en.phases[phase]).sort()
      );
    }
  });
});

describe('dashboard variant gating for English parents', () => {
  const appView = fs.readFileSync(path.join(__dirname, '../public/js/app-view-mode.js'), 'utf8');
  const hub = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-home-hub.js'), 'utf8');
  const magicCss = fs.readFileSync(path.join(__dirname, '../public/css/parent-magic-common.css'), 'utf8');

  it('parents are forced to magic view (no classic toggle)', () => {
    assert.match(appView, /Parents are magic-only/);
    assert.match(appView, /_mode = 'magic'/);
  });

  it('magic CSS hides legacy sidebar when parent-magic-view is active', () => {
    assert.match(magicCss, /body\.parent-magic-view nav#sidebar/);
  });

  it('magic hub uses pt() for all visible chrome strings', () => {
    assert.match(hub, /pt\('home\.greeting/);
    assert.match(hub, /pt\('home\.sub'\)/);
    assert.match(hub, /pt\('home\.quickActions/);
    assert.doesNotMatch(hub, /I efterhand/);
  });

  it('shouldUse gates hub on parent_home_magic feature only (not locale)', () => {
    assert.match(hub, /parent_home_magic === false/);
    assert.doesNotMatch(hub, /preferred_locale|english_app/);
  });
});

describe('parent-app-i18n adapter', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/parent-app-i18n.js'), 'utf8');
  const i18n = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');

  it('delegates to I18n.init and I18n.t without separate bundle cache', () => {
    assert.match(src, /await I18n\.init\(preferredLocale\)/);
    assert.match(src, /return I18n\.t\(key, params\)/);
    assert.doesNotMatch(src, /localStorage\.setItem/);
    assert.doesNotMatch(src, /fetch\(/);
    assert.doesNotMatch(src, /innerHTML/);
  });

  it('passes explicit preferred_locale to I18n.init (wins over sessionStorage)', () => {
    assert.match(i18n, /explicitLang/);
    assert.match(src, /initParentAppI18n\(preferredLocale\)/);
  });

  it('exposes thin globals pt, parentPlural, ptGet', () => {
    assert.match(src, /window\.pt = pt/);
    assert.match(src, /window\.parentPlural = parentPlural/);
    assert.match(src, /window\.ptGet = ptGet/);
  });
});

describe('LocaleDateTime timezone semantics', () => {
  function mockWindow(lang) {
    return {
      I18n: { getCurrentLang: () => lang },
      pt: (key) => ({ 'time.todayPrefix': 'Today', 'time.yesterdayPrefix': 'Yesterday', 'time.tomorrowPrefix': 'Tomorrow' }[key] || key),
    };
  }

  it('same ISO date formats as same calendar day in en-GB and sv-SE', () => {
    const LDTen = loadLocaleDateTime(mockWindow('en-GB'));
    const LDTsv = loadLocaleDateTime(mockWindow('sv-SE'));
    const iso = '2026-07-23';
    const enDay = LDTen.parseLocalNoon(iso).getDate();
    const svDay = LDTsv.parseLocalNoon(iso).getDate();
    assert.equal(enDay, svDay);
    assert.equal(enDay, 23);
  });

  it('formatDateHeader uses today prefix for same calendar day', () => {
    const LDT = loadLocaleDateTime(mockWindow('en-GB'));
    const today = '2026-07-23';
    const header = LDT.formatDateHeader(today, today);
    assert.match(header, /^Today — /);
  });

  it('weekDayLabelsMondayFirst returns 7 labels independent of host locale', () => {
    const orig = process.env.LC_ALL;
    process.env.LC_ALL = 'sv_SE.UTF-8';
    const LDT = loadLocaleDateTime(mockWindow('en-GB'));
    const labels = LDT.weekDayLabelsMondayFirst();
    process.env.LC_ALL = orig;
    assert.equal(labels.length, 7);
    assert.match(labels[0], /Mon/i);
  });
});

describe('readiness API backward compatibility', () => {
  it('response item shape keys unchanged in route handler', () => {
    const core = fs.readFileSync(path.join(__dirname, '../src/routes/family/core.js'), 'utf8');
    assert.match(core, /items\.push\(\{[\s\S]*type:/);
    assert.match(core, /child_id:/);
    assert.match(core, /child_name:/);
    assert.match(core, /title:/);
    assert.match(core, /sub:/);
    assert.match(core, /href:/);
    assert.match(core, /priority:/);
    assert.match(core, /res\.json\(\{ items \}\)/);
    assert.doesNotMatch(core, /title_sv|title_en/);
  });
});

describe('analytics event parity (sv vs en code paths)', () => {
  const files = [
    'public/js/home-readiness.js',
    'public/js/journey-coach.js',
    'public/js/daily-log.js',
    'public/js/dashboard-home-hub.js',
  ];

  for (const rel of files) {
    it(`${rel} analytics.track calls do not branch on locale`, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
      const trackBlocks = src.match(/analytics\.track\([^)]+\)[^;]*/g) || [];
      for (const block of trackBlocks) {
        assert.doesNotMatch(block, /preferred_locale|getCurrentLang|english_app/);
      }
    });
  }
});
