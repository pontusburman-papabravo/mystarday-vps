'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { loadLocales, compareLocaleStructures, t, plural, getLocale } = require('../src/lib/i18n');

const FRAGMENTS_DIR = path.join(__dirname, '../config/i18n');
const SWEDISH_RE = /[åäöÅÄÖ]/;

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

function countLeafKeys(obj) {
  let count = 0;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      count += countLeafKeys(v);
    } else {
      count += 1;
    }
  }
  return count;
}

describe('onboarding locale fragments', () => {
  it('sv-SE and en-GB have identical key structure', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    const svKeys = flattenStrings(sv).map((x) => x.key).sort();
    const enKeys = flattenStrings(en).map((x) => x.key).sort();
    assert.deepEqual(enKeys, svKeys);
  });

  it('each locale fragment has 408 leaf keys', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    assert.equal(countLeafKeys(sv), 408);
    assert.equal(countLeafKeys(en), 408);
  });

  it('no empty English onboarding values', () => {
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    const empty = flattenStrings(en).filter((x) => !x.value.trim());
    assert.equal(empty.length, 0, `Empty keys: ${empty.map((x) => x.key).join(', ')}`);
  });

  it('English onboarding strings avoid obvious Swedish (åäö)', () => {
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    const swedishHits = flattenStrings(en).filter((x) => SWEDISH_RE.test(x.value));
    assert.equal(swedishHits.length, 0, swedishHits.slice(0, 5).map((x) => `${x.key}: ${x.value}`).join('\n'));
  });

  it('merged bundles expose onboarding.* via getLocale', () => {
    loadLocales();
    const en = getLocale('en-GB');
    assert.ok(en.onboarding?.common?.brand);
    assert.equal(en.onboarding.common.brand, 'My Starday');
    const sv = getLocale('sv-SE');
    assert.ok(sv.onboarding?.common?.brand);
  });

  it('API alias locales return merged onboarding bundle', () => {
    loadLocales();
    for (const lang of ['sv', 'sv-SE', 'en', 'en-GB']) {
      const bundle = getLocale(lang);
      assert.ok(bundle.onboarding?.handoffFilm?.ctaTryNow, `missing onboarding keys for ${lang}`);
    }
    assert.match(t('sv', 'onboarding.handoffFilm.ctaTryNow'), /barnläget/i);
    assert.match(t('en', 'onboarding.handoffFilm.ctaTryNow'), /child mode/i);
  });
});

describe('onboarding server messages', () => {
  loadLocales();

  it('returns English error for en-GB family', () => {
    const msg = t('en-GB', 'onboarding.errors.childNameRequired');
    assert.match(msg, /name/i);
    assert.doesNotMatch(msg, SWEDISH_RE);
  });

  it('returns Swedish error for sv-SE', () => {
    const msg = t('sv-SE', 'onboarding.errors.childNameRequired');
    assert.match(msg, /namn/i);
  });

  it('plural helper works for reward count', () => {
    const one = plural('en-GB', 'onboarding.rewards.selectCount', 1, { count: 1 });
    const many = plural('en-GB', 'onboarding.rewards.selectCount', 3, { count: 3 });
    assert.notEqual(one, many);
    assert.match(one, /1/);
    assert.match(many, /3/);
  });
});

describe('onboarding HTML i18n wiring', () => {
  it('loads i18n scripts and manual init flag', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/onboarding.html'), 'utf8');
    assert.match(html, /onboarding-i18n\.js/);
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n-title="onboarding\.pageTitle\.welcome"/);
  });

  it('onboarding.js initializes i18n after auth', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    assert.match(js, /initOnboardingI18n/);
    assert.match(js, /onboarding-i18n-ready/);
    assert.match(js, /initOnboardingI18n\(me\?\.preferred_locale\)/);
  });

  it('does not expose otp global (one-time password naming conflict)', () => {
    const adapter = fs.readFileSync(path.join(__dirname, '../public/js/onboarding-i18n.js'), 'utf8');
    const onboarding = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    assert.match(adapter, /window\.onboardingPlural/);
    assert.doesNotMatch(adapter, /window\.otp/);
    assert.match(onboarding, /onboardingPlural\(/);
    assert.doesNotMatch(onboarding, /\botp\(/);
  });
});

describe('onboarding canonical locale resolution', () => {
  it('I18n.init prefers explicit family locale over sessionStorage', async () => {
    const storage = { sd_preferred_locale: 'sv-SE' };
    const sessionStorage = {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
    };
    const fetchCalls = [];
    const mockBundles = {
      'sv-SE': { onboarding: { common: { brand: 'Stjärndag' } } },
      'en-GB': { onboarding: { common: { brand: 'My Starday' } } },
    };

    const sandbox = {
      window: {},
      document: {
        documentElement: { lang: '' },
        body: { dataset: {} },
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {},
      },
      sessionStorage,
      navigator: { languages: ['sv-SE'] },
      fetch: async (url) => {
        fetchCalls.push(url);
        const lang = url.split('/').pop();
        return {
          ok: true,
          json: async () => mockBundles[lang] || mockBundles['sv-SE'],
        };
      },
      console: { warn: () => {} },
    };
    sandbox.window = sandbox;

    const i18nSrc = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
    vm.runInNewContext(i18nSrc, sandbox, { filename: 'i18n.js' });

    await sandbox.I18n.init('en-GB');
    assert.equal(sandbox.I18n.getCurrentLang(), 'en-GB');
    assert.equal(sandbox.I18n.t('onboarding.common.brand'), 'My Starday');
    assert.ok(fetchCalls.some((u) => u.endsWith('/en-GB')), 'should load en-GB bundle');
    assert.equal(sessionStorage.getItem('sd_preferred_locale'), 'en-GB');
  });

  it('I18n.init reloads when explicit en-GB follows early sv-SE init', async () => {
    const storage = { sd_preferred_locale: 'sv-SE' };
    const sessionStorage = {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
    };
    const mockBundles = {
      'sv-SE': { home: { sub: 'Så här ser dagen ut.' } },
      'en-GB': { home: { sub: 'Here is how the day looks.' } },
    };
    const sandbox = {
      window: {},
      document: {
        documentElement: { lang: '' },
        body: { dataset: {} },
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {},
      },
      sessionStorage,
      navigator: { languages: ['sv-SE'] },
      fetch: async (url) => ({
        ok: true,
        json: async () => mockBundles[url.split('/').pop()] || mockBundles['sv-SE'],
      }),
      console: { warn: () => {} },
    };
    sandbox.window = sandbox;
    const i18nSrc = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
    vm.runInNewContext(i18nSrc, sandbox, { filename: 'i18n.js' });

    await sandbox.I18n.init();
    assert.equal(sandbox.I18n.getCurrentLang(), 'sv-SE');
    await sandbox.I18n.init('en-GB');
    assert.equal(sandbox.I18n.getCurrentLang(), 'en-GB');
    assert.equal(sandbox.I18n.t('home.sub'), 'Here is how the day looks.');
  });

  it('initOnboardingI18n passes family preferred_locale to I18n.init', () => {
    const adapter = fs.readFileSync(path.join(__dirname, '../public/js/onboarding-i18n.js'), 'utf8');
    assert.match(adapter, /await I18n\.init\(preferredLocale\)/);
    assert.match(adapter, /family\.preferred_locale wins/i);
  });
});

describe('onboarding analytics regression (static contracts)', () => {
  it('funnel_onboarding_started is guarded against duplicate sends', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    assert.match(src, /_funnelOnboardingStartedSent/);
    assert.match(src, /if \(_funnelOnboardingStartedSent\) return/);
  });

  it('handoff resume skips starter init and uses reminder_landed not handoff_started', () => {
    const onboarding = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    const resume = fs.readFileSync(path.join(__dirname, '../public/js/onboarding-handoff-resume.js'), 'utf8');
    assert.match(onboarding, /handoffResumeHandled/);
    assert.match(onboarding, /!handoffResumeHandled && window\.OnboardingStarterPlan/);
    assert.match(resume, /child_handoff_reminder_landed/);
    assert.doesNotMatch(resume, /child_handoff_started/);
  });
});

describe('locale structure parity (full bundles)', () => {
  it('main sv-SE / en-GB bundles remain aligned', () => {
    loadLocales();
    const { missingInEn, missingInSv } = compareLocaleStructures();
    assert.deepEqual(missingInEn, []);
    assert.deepEqual(missingInSv, []);
  });
});
