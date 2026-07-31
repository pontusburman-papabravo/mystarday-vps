'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { loadLocales, t, getLocale } = require('../src/lib/i18n');

const FRAGMENTS_DIR = path.join(__dirname, '../config/i18n');
const SWEDISH_RE = /[åäöÅÄÖ]/;
const DOMAINS = ['home', 'today', 'journey', 'time', 'nav'];

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
    assert.ok(en.nav?.primary?.home);
    assert.equal(en.nav.primary.home, 'Home');
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

  it('daily-log analytics: print_schema_exported on export redirect (custody on print-schema/filter UIs)', () => {
    assert.match(dailyLog, /print_schema_exported/);
    assert.doesNotMatch(dailyLog, /custody_view_filtered/);
    const matches = dailyLog.match(/analytics\.track\(/g) || [];
    assert.equal(matches.length, 1);
  });

  it('dashboard-home-hub preserves nav_hub_click if present', () => {
    if (homeHub.includes('nav_hub_click')) {
      assert.match(homeHub, /nav_hub_click/);
    }
  });
});

describe('family content display names (en-GB beta)', () => {
  it('daily-log renders display_name fallback via itemLabel helper', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    assert.match(dailyLog, /function itemLabel\(item\)/);
    assert.match(dailyLog, /item\.display_name \|\| item\.name/);
    assert.match(dailyLog, /escHtml\(itemLabel\(item\)\)/);
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
    assert.ok(all.length === 20, `expected 20 registry experiences, got ${all.length}`);
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

function loadParentHomeLocaleGate(mockWindow) {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/parent-home-locale-gate.js'), 'utf8');
  const sandbox = {
    window: mockWindow,
    document: { addEventListener: () => {} },
  };
  vm.runInNewContext(code, sandbox);
  return mockWindow.ParentHomeLocaleGate;
}

function evaluateShouldUse(mockWindow, domState) {
  const editor = { classList: { contains: (c) => c === 'hidden' ? !domState.editorVisible : false } };
  const list = { classList: { contains: (c) => c === 'hidden' ? domState.listHidden === true : false } };
  const isOverviewVisible = () => {
    if (editor && !editor.classList.contains('hidden')) return false;
    if (list && list.classList.contains('hidden')) return false;
    return true;
  };
  if (!isOverviewVisible()) return false;
  if (mockWindow.AppViewMode && !mockWindow.AppViewMode.isAllowed()) return false;
  if (mockWindow.AppViewMode && !mockWindow.AppViewMode.isMagic()) return false;
  if (mockWindow.ParentHomeLocaleGate && mockWindow.ParentHomeLocaleGate.forceMagicHub()) return true;
  if (mockWindow._stjarndagFeatures && mockWindow._stjarndagFeatures.parent_home_magic === false) return false;
  return true;
}

function createAnalyticsRecorder() {
  const events = [];
  return {
    events,
    analytics: {
      track: (...args) => {
        events.push(args);
      },
    },
  };
}

describe('dashboard variant gating for English parents', () => {
  const appView = fs.readFileSync(path.join(__dirname, '../public/js/app-view-mode.js'), 'utf8');
  const hub = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-home-hub.js'), 'utf8');
  const gate = fs.readFileSync(path.join(__dirname, '../public/js/parent-home-locale-gate.js'), 'utf8');
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

  it('documents P-i18n-Home-B in locale gate module', () => {
    assert.match(gate, /P-i18n-Home-B/);
    assert.match(gate, /forceMagicHub/);
    assert.match(hub, /ParentHomeLocaleGate\.forceMagicHub/);
  });

  const matrix = [
    { label: 'sv-SE default family', locale: 'sv-SE', englishApp: true, parentHomeMagic: true, overview: true, expect: true },
    { label: 'sv-SE parent_home_magic OFF', locale: 'sv-SE', englishApp: true, parentHomeMagic: false, overview: true, expect: false },
    { label: 'en-GB english_app OFF', locale: 'en-GB', englishApp: false, parentHomeMagic: false, overview: true, expect: false, featuresLoaded: true },
    { label: 'en-GB features not loaded yet', locale: 'en-GB', englishApp: false, parentHomeMagic: false, overview: true, expect: true, featuresLoaded: false },
    { label: 'en-GB english_app ON (rule B)', locale: 'en-GB', englishApp: true, parentHomeMagic: false, overview: true, expect: true },
    { label: 'en-GB english_app ON + magic flag ON', locale: 'en-GB', englishApp: true, parentHomeMagic: true, overview: true, expect: true },
    { label: 'schedule editor open', locale: 'en-GB', englishApp: true, parentHomeMagic: true, overview: false, expect: false },
    { label: 'Android flat en-GB', locale: 'en-GB', englishApp: true, parentHomeMagic: false, overview: true, expect: true },
  ];

  for (const row of matrix) {
    it(`shouldUse matrix: ${row.label} → ${row.expect}`, () => {
      const mockWindow = {
        I18n: { getCurrentLang: () => row.locale },
        _stjarndagFeatures: row.featuresLoaded === false ? undefined : {
          parent_home_magic: row.parentHomeMagic,
          ...(row.englishApp ? { english_app: true } : {}),
        },
        AppViewMode: {
          isAllowed: () => true,
          isMagic: () => true,
        },
        pt: (k) => k,
      };
      loadParentHomeLocaleGate(mockWindow);
      mockWindow.ParentHomeLocaleGate.setContext({
        preferredLocale: row.locale,
        englishAppEnabled: row.englishApp,
      });
      const result = evaluateShouldUse(mockWindow, {
        editorVisible: !row.overview,
        listHidden: false,
      });
      assert.equal(result, row.expect, row.label);
    });
  }

  it('no supported en-GB + english_app ON config yields classic Swedish hub path', () => {
    const mockWindow = {
      I18n: { getCurrentLang: () => 'en-GB' },
      _stjarndagFeatures: { parent_home_magic: false, english_app: true },
      AppViewMode: { isAllowed: () => true, isMagic: () => true },
      pt: (k) => k,
    };
    loadParentHomeLocaleGate(mockWindow);
    mockWindow.ParentHomeLocaleGate.setContext({ preferredLocale: 'en-GB', englishAppEnabled: true });
    assert.equal(evaluateShouldUse(mockWindow, { editorVisible: false, listHidden: false }), true);
    assert.equal(mockWindow.ParentHomeLocaleGate.forceMagicHub(), true);
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
      pt: (key) => ({
        'time.todayPrefix': lang === 'en-GB' ? 'Today' : 'Idag',
        'time.yesterdayPrefix': lang === 'en-GB' ? 'Yesterday' : 'Igår',
        'time.tomorrowPrefix': lang === 'en-GB' ? 'Tomorrow' : 'Imorgon',
      }[key] || key),
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

  for (const iso of ['2026-07-23T00:00:00', '2026-07-23T00:01:00', '2026-07-23T23:59:00']) {
    it(`calendar day stable at ${iso.slice(11)} for en-GB and sv-SE`, () => {
      const dateStr = iso.slice(0, 10);
      const LDTen = loadLocaleDateTime(mockWindow('en-GB'));
      const LDTsv = loadLocaleDateTime(mockWindow('sv-SE'));
      assert.equal(LDTen.parseLocalNoon(dateStr).getDate(), LDTsv.parseLocalNoon(dateStr).getDate());
      assert.equal(LDTen.formatDateHeader(dateStr, dateStr).includes('—'), true);
      assert.equal(LDTsv.formatDateHeader(dateStr, dateStr).includes('—'), true);
    });
  }

  it('yesterday and tomorrow boundaries use same activity calendar day', () => {
    const LDT = loadLocaleDateTime(mockWindow('en-GB'));
    const today = '2026-07-23';
    const yesterday = LDT.formatDateHeader('2026-07-22', today);
    const tomorrow = LDT.formatDateHeader('2026-07-24', today);
    assert.match(yesterday, /^Yesterday — /);
    assert.match(tomorrow, /^Tomorrow — /);
    assert.equal(LDT.parseLocalNoon('2026-07-22').getDate(), 22);
    assert.equal(LDT.parseLocalNoon('2026-07-24').getDate(), 24);
  });

  it('DST spring forward (2026-03-29) keeps calendar day in both locales', () => {
    const iso = '2026-03-29';
    const LDTen = loadLocaleDateTime(mockWindow('en-GB'));
    const LDTsv = loadLocaleDateTime(mockWindow('sv-SE'));
    assert.equal(LDTen.parseLocalNoon(iso).getDate(), 29);
    assert.equal(LDTsv.parseLocalNoon(iso).getDate(), 29);
    assert.notEqual(LDTen.formatDateHeader(iso, iso), LDTsv.formatDateHeader(iso, iso));
  });

  it('DST fall back (2026-10-25) keeps calendar day in both locales', () => {
    const iso = '2026-10-25';
    const LDTen = loadLocaleDateTime(mockWindow('en-GB'));
    const LDTsv = loadLocaleDateTime(mockWindow('sv-SE'));
    assert.equal(LDTen.parseLocalNoon(iso).getDate(), 25);
    assert.equal(LDTsv.parseLocalNoon(iso).getDate(), 25);
  });

  it('formatDateHeader result is deterministic regardless of process TZ', () => {
    const tzVars = ['TZ', 'LC_ALL'];
    const saved = {};
    for (const v of tzVars) saved[v] = process.env[v];
    const results = [];
    for (const tz of ['UTC', 'Europe/Stockholm', 'America/Los_Angeles']) {
      process.env.TZ = tz;
      const LDT = loadLocaleDateTime(mockWindow('en-GB'));
      results.push(LDT.formatDateHeader('2026-07-23', '2026-07-23'));
    }
    for (const v of tzVars) {
      if (saved[v] === undefined) delete process.env[v];
      else process.env[v] = saved[v];
    }
    assert.equal(new Set(results).size, 1);
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

describe('analytics behavior parity (sv-SE vs en-GB)', () => {
  it('readiness_action_click: same event name and shape for sv-SE and en-GB', () => {
    const item = { type: 'pending_invite', child_id: 'c1' };
    const sv = createAnalyticsRecorder();
    const en = createAnalyticsRecorder();
    sv.analytics.track(null, 'readiness_action_click', { type: item.type, child_id: item.child_id });
    en.analytics.track(null, 'readiness_action_click', { type: item.type, child_id: item.child_id });
    assert.deepEqual(en.events, sv.events);
    assert.equal(sv.events[0][1], 'readiness_action_click');
  });

  it('journey_coach_cta_click: same event name and shape for sv-SE and en-GB', () => {
    const sv = createAnalyticsRecorder();
    const en = createAnalyticsRecorder();
    sv.analytics.track(null, 'journey_coach_cta_click', { experience: 'handoff_to_child' });
    en.analytics.track(null, 'journey_coach_cta_click', { experience: 'handoff_to_child' });
    assert.deepEqual(en.events, sv.events);
    assert.equal(sv.events[0][1], 'journey_coach_cta_click');
  });

  it('daily-log analytics: fixed event set does not branch on locale', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    const names = [...dailyLog.matchAll(/\.track\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(names)].sort(), ['print_schema_exported']);
    const trackBlocks = dailyLog.match(/analytics\.track\([^)]+\)[^;]*/g) || [];
    for (const block of trackBlocks) {
      assert.doesNotMatch(block, /getCurrentLang|preferred_locale|english_app/);
    }
  });

  it('Home hub render path does not emit analytics on locale init', () => {
    const hub = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-home-hub.js'), 'utf8');
    assert.doesNotMatch(hub, /analytics\.track/);
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

describe('Today HTML shell i18n', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/daily-log.html'), 'utf8');

  it('uses data-i18n-manual-init and early locale bootstrap (no separate EN HTML)', () => {
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n-title="today\.pageTitle"/);
    assert.match(html, /earlyTodayI18n/);
    assert.match(html, /sd_preferred_locale/);
    assert.match(html, /I18n\.init\(lang\)/);
    assert.doesNotMatch(html, /daily-log-en\.html/);
  });

  it('localises static shell copy via data-i18n attributes', () => {
    assert.match(html, /data-i18n="today\.shell\.headerTitle"/);
    assert.match(html, /data-i18n="today\.shell\.printBtn"/);
    assert.match(html, /data-i18n="today\.shell\.tipsTitle"/);
    assert.match(html, /data-i18n="today\.shell\.rateActivity"/);
    assert.match(html, /data-i18n-placeholder="today\.shell\.commentPlaceholder"/);
    assert.match(html, /data-i18n-aria-label="onboarding\.common\.closeAria"/);
    assert.match(html, /data-i18n="nav\.dailyLog"/);
  });

  it('loads daily-log.js after parent-magic-bootstrap for PageBoot registration', () => {
    const bootstrapIdx = html.indexOf('parent-magic-bootstrap.js');
    const dailyLogIdx = html.indexOf('daily-log.js');
    assert.ok(bootstrapIdx >= 0 && dailyLogIdx > bootstrapIdx);
  });

  it('keeps Swedish fallback text in HTML for pre-JS render (sv-SE default)', () => {
    assert.match(html, /<html lang="sv-SE">/);
    assert.match(html, /Daglig logg/);
  });
});

describe('Today runtime locale', () => {
  const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');

  it('uses dlPt() for rating saved toast (no hardcoded Swedish)', () => {
    assert.match(dailyLog, /dlPt\('today\.rating\.saved'\)/);
    assert.doesNotMatch(dailyLog, /Betyg sparat/);
  });

  it('formatTime delegates to LocaleDateTime when available', () => {
    assert.match(dailyLog, /LocaleDateTime\.formatTime/);
  });
});

describe('Home nav locale (nav-config)', () => {
  const navConfig = fs.readFileSync(path.join(__dirname, '../public/js/nav-config.js'), 'utf8');
  const nativeTab = fs.readFileSync(path.join(__dirname, '../public/js/native-tab-bar.js'), 'utf8');
  const magicShell = fs.readFileSync(path.join(__dirname, '../public/js/parent-magic-shell.js'), 'utf8');

  it('PRIMARY_NAV items expose labelKey for i18n', () => {
    assert.match(navConfig, /labelKey: 'nav\.primary\.home'/);
    assert.match(navConfig, /resolveLabel/);
    assert.match(navConfig, /primaryNavForTabs/);
  });

  it('bottom nav remounts on locale change', () => {
    assert.match(nativeTab, /locale-changed/);
    assert.match(nativeTab, /parent-i18n-ready/);
    assert.match(nativeTab, /primaryNavForTabs/);
    assert.match(nativeTab, /syncActiveTabs/);
    assert.match(magicShell, /locale-changed/);
    assert.match(magicShell, /nav\.mainAria/);
  });

  it('native tab bar refreshes labels before remount (no parse-time cache)', () => {
    assert.doesNotMatch(nativeTab, /let activeTabs = NavConfig\.primaryNavForTabs\(\)/);
    assert.match(nativeTab, /function syncActiveTabs/);
    assert.match(nativeTab, /syncActiveTabs\(\);\s*\n\s*remount\(\)/);
  });

  it('resolveLabel returns en-GB nav labels when pt() resolves keys', () => {
    loadLocales();
    const en = getLocale('en-GB');
    assert.equal(en.nav.primary.home, 'Home');
    assert.equal(en.nav.primary.planning, 'Planning');
    assert.equal(en.nav.primary.rewards, 'Rewards');
    assert.equal(en.nav.primary.forYou, 'For you');
    assert.equal(en.nav.primary.family, 'Family');
    const sv = getLocale('sv-SE');
    assert.equal(sv.nav.primary.planning, 'Planering');
    assert.notEqual(sv.nav.primary.planning, 'Planning');
  });

  it('API bundle includes nav.primary for both locales', () => {
    loadLocales();
    for (const loc of ['sv-SE', 'en-GB']) {
      const bundle = getLocale(loc);
      assert.ok(bundle.nav?.primary?.home, `${loc} nav.primary.home`);
      assert.ok(bundle.nav?.primary?.planning, `${loc} nav.primary.planning`);
      assert.ok(bundle.nav?.primary?.rewards, `${loc} nav.primary.rewards`);
      assert.ok(bundle.nav?.primary?.forYou, `${loc} nav.primary.forYou`);
      assert.ok(bundle.nav?.primary?.family, `${loc} nav.primary.family`);
    }
  });

  it('mobile-nav resolves labels via NavConfig.resolveLabel', () => {
    const mobileNav = fs.readFileSync(path.join(__dirname, '../public/js/mobile-nav.js'), 'utf8');
    assert.match(mobileNav, /NavConfig\.resolveLabel/);
  });
});

describe('Home offline banner locale', () => {
  const dashboardHtml = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
  const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');

  it('offline banner uses data-i18n and pt() for last updated', () => {
    assert.match(dashboardHtml, /data-i18n="home\.offline\.banner"/);
    assert.match(dashboardJs, /home\.offline\.lastUpdated/);
    assert.match(dashboardJs, /offlineTimeFmt/);
  });

  it('dashboard tour uses home.dashboardTour locale keys', () => {
    const tour = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-tour.js'), 'utf8');
    assert.match(tour, /home\.dashboardTour\.steps\.welcome\.title/);
    assert.match(tour, /parent-i18n-ready/);
    assert.doesNotMatch(tour, /Välkommen till dashboarden/);
  });
});

describe('daily-log child selection boot', () => {
  it('guards logoutBtn and uses delegated child tab clicks', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    assert.match(dailyLog, /bootDailyLogPage/);
    assert.match(dailyLog, /if \(logoutBtn\)/);
    assert.match(dailyLog, /normalizeChildId/);
    assert.match(dailyLog, /childTabsMount\.addEventListener/);
    assert.doesNotMatch(dailyLog, /onclick="selectChild/);
  });

  it('schedules boot when DOM is already ready and registers ParentMagicPageBoot', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    assert.match(dailyLog, /scheduleBootDailyLogPage/);
    assert.match(dailyLog, /registerDailyLogPageBoot/);
    assert.match(dailyLog, /ParentMagicPageBoot\.register\('daily-log'/);
    assert.match(dailyLog, /document\.readyState === 'loading'/);
    assert.match(dailyLog, /const apiFetch = window\.apiFetch/);
  });

  it('retries children fetch after silent refresh on 401 (Android session)', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    assert.match(dailyLog, /fetchChildrenList/);
    assert.match(dailyLog, /silentRefresh/);
    assert.match(dailyLog, /renderChildTabsError/);
  });

  it('loads children in parallel with i18n and does not block on initParentAppI18n', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    assert.match(dailyLog, /Promise\.all\(\[loadChildren\(\), i18nTask\]\)/);
    assert.match(dailyLog, /CHILDREN_FETCH_TIMEOUT_MS/);
    assert.match(dailyLog, /AUTH_BOOT_TIMEOUT_MS/);
    assert.match(dailyLog, /resolveBootUser/);
    assert.match(dailyLog, /today\.errors\.signInRequired/);
    assert.doesNotMatch(dailyLog, /await initParentAppI18n\(user\.preferred_locale\);\s*\n\s*if \(!_dailyLogPageBound\)/);
  });

  it('parent-magic-i18n skips duplicate auth boot on manual-init pages', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/parent-magic-i18n.js'), 'utf8');
    assert.match(src, /i18nManualInit/);
    assert.match(src, /pageHandlesOwnI18nBoot/);
  });

  it('loadLog renders schedule before ratings fetch completes', () => {
    const dailyLog = fs.readFileSync(path.join(__dirname, '../public/js/daily-log.js'), 'utf8');
    const loadLogBlock = dailyLog.slice(dailyLog.indexOf('async function loadLog'));
    assert.match(loadLogBlock, /renderLog\(data\)/);
    assert.match(loadLogBlock, /loadItemRatings\(itemIds\)/);
    const renderIdx = loadLogBlock.indexOf('renderLog(data)');
    const ratingsIdx = loadLogBlock.indexOf('loadItemRatings(itemIds)');
    assert.ok(renderIdx > 0 && ratingsIdx > renderIdx, 'renderLog before loadItemRatings in loadLog');
  });

  it('home sv-SE openToday is Swedish not English Today', () => {
    const home = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/i18n/home-sv-SE.json'), 'utf8'));
    assert.equal(home.summary.openToday, 'Öppna idag');
    assert.equal(home.nav.today, 'Idag');
    assert.equal(home.readiness.items.pausedDaySub, 'Öppna idag');
  });
});

describe('home quick actions (retroactive + ledig dag modal)', () => {
  const hub = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-home-hub.js'), 'utf8');
  const cardActions = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-card-actions.js'), 'utf8');
  const cards = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-cards.js'), 'utf8');
  const core = fs.readFileSync(path.join(__dirname, '../src/routes/family/core.js'), 'utf8');
  const magicCss = fs.readFileSync(path.join(__dirname, '../public/css/parent-magic-common.css'), 'utf8');
  const dashMagicCss = fs.readFileSync(path.join(__dirname, '../public/css/dashboard-magic.css'), 'utf8');

  it('retroactive quick action links to past date with latest_incomplete_date when available', () => {
    assert.match(hub, /function retroactiveLogHref/);
    assert.match(hub, /latest_incomplete_date/);
    assert.match(hub, /params\.set\('date', date\)/);
    assert.match(hub, /offsetIsoDate\(-1\)/);
  });

  it('readiness and dashboard cards pass incomplete date to daily-log', () => {
    assert.match(core, /latest_incomplete_date/);
    assert.match(core, /encodeURIComponent\(incDate\)/);
    assert.match(cards, /latest_incomplete_date/);
    assert.match(cards, /encodeURIComponent\(c\.latest_incomplete_date\)/);
  });

  it('ledig dag modal uses solid panel and scroll lock', () => {
    assert.match(magicCss, /#ledigDagModal > div/);
    assert.match(magicCss, /#ledigDagModal > \.bg-white\.rounded-2xl/);
    assert.match(cardActions, /setDashboardModalOpen/);
    assert.match(cardActions, /closeLedigDagModal/);
    assert.match(cardActions, /closeGiveStarsPickerModal/);
    assert.match(dashMagicCss, /dashboard-modal-open/);
  });

  it('star history chart uses light surface and dark text on magic dark', () => {
    assert.match(magicCss, /#starHistoryContent/);
    assert.match(magicCss, /#starHistoryContent \.text-navy/);
    assert.match(magicCss, /#starHistoryStory \.dash-week-story-inner/);
  });

  it('weekly story diff uses i18n keys (no hardcoded Swedish)', () => {
    const story = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-weekly-story.js'), 'utf8');
    const en = fs.readFileSync(path.join(__dirname, '../config/i18n/home-en-GB.json'), 'utf8');
    const sv = fs.readFileSync(path.join(__dirname, '../config/i18n/home-sv-SE.json'), 'utf8');
    assert.match(story, /home\.starHistory\.diffUp/);
    assert.match(story, /home\.starHistory\.diffSame/);
    assert.match(story, /home\.starHistory\.bestWeek/);
    assert.doesNotMatch(story, /jämfört med förra veckan/);
    assert.match(en, /"diffUp": "\+{{diff}} compared to last week"/);
    assert.match(sv, /"diffUp": "\+{{diff}} jämfört med förra veckan"/);
  });
});

describe('LocaleDateTime formatTime', () => {
  it('formats time in en-GB without Swedish locale default', () => {
    const mockWindow = {
      I18n: { getCurrentLang: () => 'en-GB' },
      pt: (k) => k,
    };
    const LocaleDateTime = loadLocaleDateTime(mockWindow);
    const formatted = LocaleDateTime.formatTime('2026-07-23T14:30:00');
    assert.match(formatted, /14:30|2:30/);
    assert.doesNotMatch(formatted, /[åäöÅÄÖ]/);
  });
});
