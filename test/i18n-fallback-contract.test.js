'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  DEFAULT_LOCALE,
  CANONICAL_FALLBACK_LOCALE,
  ALIASES,
  normalizeLocale,
  parseAcceptLanguage,
  resolvePreAuthLocale,
} = require('../src/lib/locale');
const {
  loadLocales,
  t,
  tWithBundles,
  assembleLocale,
  getLocale,
} = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const FIXTURES = {
  'sv-SE': {
    app: { name: 'Svenskt testnamn' },
    onlySwedish: 'Hemlig svensk nyckel',
    nested: { shared: 'Svenska' },
  },
  'en-GB': {
    app: { name: 'My Starday' },
    onlyEnglish: 'English-only key',
    nested: { shared: 'English' },
  },
};

function htmlElement() {
  const attrs = {};
  return {
    lang: '',
    attrs,
    setAttribute(name, val) { attrs[name] = String(val); },
    removeAttribute(name) { delete attrs[name]; },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
  };
}

function makeEl(attrName, key, initial) {
  const attrs = { [attrName]: key };
  return {
    attrs,
    textContent: initial,
    placeholder: initial,
    title: initial,
    innerHTML: initial,
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
    setAttribute(name, val) { attrs[name] = String(val); },
  };
}

function loadClientI18n(opts = {}) {
  const src = read('public/js/i18n.js');
  const nodes = opts.nodes || [];
  const stored = opts.stored || {};
  const html = htmlElement();
  const calls = [];
  const sandbox = {
    window: {},
    document: {
      documentElement: html,
      querySelectorAll(sel) {
        const attr = {
          '[data-i18n]': 'data-i18n',
          '[data-i18n-placeholder]': 'data-i18n-placeholder',
          '[data-i18n-title]': 'data-i18n-title',
          '[data-i18n-aria-label]': 'data-i18n-aria-label',
          '[data-i18n-html]': 'data-i18n-html',
        }[sel];
        if (!attr) return [];
        return nodes.filter((n) => n.getAttribute(attr) != null);
      },
      addEventListener() {},
      body: { dataset: {} },
    },
    sessionStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(stored, k) ? stored[k] : null; },
      setItem(k, v) { stored[k] = String(v); },
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(stored, k) ? stored[k] : null; },
      setItem(k, v) { stored[k] = String(v); },
    },
    navigator: { languages: opts.languages || ['sv-SE'] },
    console,
    fetch: opts.fetch || (async (url) => {
      calls.push(String(url));
      return { ok: false, json: async () => ({}) };
    }),
  };
  sandbox.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'public/js/i18n.js' });
  return { sandbox, calls, html, nodes, stored };
}

describe('i18n fallback contract', () => {
  before(() => {
    loadLocales();
  });

  it('canonical message fallback is en-GB, not sv-SE', () => {
    assert.equal(DEFAULT_LOCALE, 'sv-SE');
    assert.equal(CANONICAL_FALLBACK_LOCALE, 'en-GB');
  });

  it('en-GB missing keys do not silently take Swedish', () => {
    const value = tWithBundles('en-GB', 'onlySwedish', {}, FIXTURES);
    assert.equal(value, 'onlySwedish');
    assert.notEqual(value, FIXTURES['sv-SE'].onlySwedish);
  });

  it('en-GB with no English bundle still does not use Swedish', () => {
    const svOnly = { 'sv-SE': FIXTURES['sv-SE'] };
    assert.equal(tWithBundles('en-GB', 'app.name', {}, svOnly), 'app.name');
    const assembled = assembleLocale('en-GB', svOnly);
    assert.equal(assembled.app, undefined);
  });

  it('sv-SE missing keys use en-GB then the key', () => {
    assert.equal(tWithBundles('sv-SE', 'onlyEnglish', {}, FIXTURES), 'English-only key');
    assert.equal(tWithBundles('sv-SE', 'totally.missing', {}, FIXTURES), 'totally.missing');
  });

  it('assembleLocale(en-GB) does not merge Swedish-only leaves', () => {
    const en = assembleLocale('en-GB', FIXTURES);
    assert.equal(en.app.name, 'My Starday');
    assert.equal(en.onlySwedish, undefined);
    assert.equal(en.onlyEnglish, 'English-only key');
    assert.equal(en.nested.shared, 'English');
  });

  it('assembleLocale(sv-SE) stays Swedish-only', () => {
    const sv = assembleLocale('sv-SE', FIXTURES);
    assert.equal(sv.app.name, 'Svenskt testnamn');
    assert.equal(sv.onlyEnglish, undefined);
    assert.equal(sv.onlySwedish, 'Hemlig svensk nyckel');
  });

  it('getLocale(en-GB) payload has English app name without Swedish merge', () => {
    const en = getLocale('en-GB');
    assert.equal(en.app.name, 'My Starday');
    const dumped = JSON.stringify(en);
    assert.equal(dumped.includes('onlySwedish'), false);
    assert.match(en.app.name, /Starday/);
  });

  it('t(en-GB) unknown key returns the key, not Swedish copy', () => {
    const missing = 'fallback.contract.missing.key.zz';
    assert.equal(t('en-GB', missing), missing);
  });

  it('client loader never fetches sv-SE as fallback for a failed en-GB load', () => {
    const src = read('public/js/i18n.js');
    assert.match(src, /CANONICAL_FALLBACK_LOCALE:\s*'en-GB'/);
    assert.doesNotMatch(src, /fetch\('\/api\/i18n\/sv-SE'\)/);
    assert.match(src, /this\.CANONICAL_FALLBACK_LOCALE/);
  });

  it('client load(en-GB) uses en-GB then empty bundle, never sv-SE', async () => {
    const { sandbox, calls } = loadClientI18n({ languages: ['en-GB'] });
    await sandbox.window.I18n.load('en-GB');
    assert.deepEqual(calls, ['/api/i18n/en-GB']);
    assert.equal(sandbox.window.I18n.lang, 'en-GB');
    assert.equal(Object.keys(sandbox.window.I18n.locale).length, 0);
  });

  it('client load(sv-SE) may fall back to en-GB, never a third language', async () => {
    const fetchCalls = [];
    const { sandbox } = loadClientI18n({
      languages: ['sv-SE'],
      fetch: async (url) => {
        fetchCalls.push(String(url));
        if (String(url).includes('en-GB')) {
          return { ok: true, json: async () => ({ app: { name: 'My Starday' } }) };
        }
        return { ok: false, json: async () => ({}) };
      },
    });
    await sandbox.window.I18n.load('sv-SE');
    assert.deepEqual(fetchCalls, ['/api/i18n/sv-SE', '/api/i18n/en-GB']);
    assert.equal(sandbox.window.I18n.lang, 'en-GB');
    assert.equal(sandbox.window.I18n.locale.app.name, 'My Starday');
  });

  it('SW cache is bumped with the fallback-contract change', () => {
    const cache = JSON.parse(read('config/cache-version.json'));
    assert.match(read('public/sw.js'), new RegExp("const CACHE_NAME = '" + cache.cacheName + "'"));
    const n = Number(String(cache.cacheName).replace(/^stjarndag-v/, ''));
    assert.ok(n >= 980, 'fallback-contract shipped at v980; later i18n PRs may bump further');
  });
});

describe('i18n fallback invariant: fi is not Swedish', () => {
  it('normalizeLocale never maps fi / fi-FI to sv-SE', () => {
    for (const raw of ['fi', 'fi-FI', 'fi-fi', 'fi_FI', 'fi_fi', 'FI']) {
      assert.equal(normalizeLocale(raw), null, raw);
    }
    assert.equal(ALIASES.fi, undefined);
    assert.equal(ALIASES['fi-fi'], undefined);
  });

  it('Accept-Language fi then en-GB resolves to English, not Swedish', () => {
    assert.equal(parseAcceptLanguage('fi-FI,en-GB;q=0.8'), 'en-GB');
    assert.equal(parseAcceptLanguage('fi,en;q=0.5'), 'en-GB');
    assert.equal(resolvePreAuthLocale({ acceptLanguage: 'fi-FI,en-GB;q=0.8' }), 'en-GB');
  });

  it('fi-only header is unknown (product default), not an alias', () => {
    assert.equal(parseAcceptLanguage('fi-FI'), null);
    assert.equal(parseAcceptLanguage('fi'), null);
    assert.equal(resolvePreAuthLocale({ acceptLanguage: 'fi-FI' }), DEFAULT_LOCALE);
    assert.equal(resolvePreAuthLocale({ acceptLanguage: 'fr-FR' }), DEFAULT_LOCALE);
  });

  it('client _normalize does not alias fi to sv-SE', () => {
    const { sandbox } = loadClientI18n({ languages: ['sv-SE'] });
    const I18n = sandbox.window.I18n;
    assert.equal(I18n._normalize('fi'), null);
    assert.equal(I18n._normalize('fi-FI'), null);
    assert.equal(I18n._normalize('fi_FI'), null);
    assert.equal(I18n._fromNavigator(), 'sv-SE');
  });

  it('client navigator fi-FI,en-GB picks English', () => {
    const { sandbox } = loadClientI18n({ languages: ['fi-FI', 'en-GB'] });
    assert.equal(sandbox.window.I18n._fromNavigator(), 'en-GB');
    assert.equal(sandbox.window.I18n.lang, 'en-GB');
  });
});

describe('i18n fallback invariant: data-i18n does not keep Swedish for non-Swedish', () => {
  it('en-GB apply overwrites Swedish DOM text even when the key is missing', () => {
    const el = makeEl('data-i18n', 'common.cancel', 'Avbryt');
    const { sandbox, html } = loadClientI18n({
      languages: ['en-GB'],
      stored: { sd_preferred_locale: 'en-GB' },
      nodes: [el],
    });
    const I18n = sandbox.window.I18n;
    assert.equal(html.getAttribute('data-i18n-pending'), '1');
    I18n.lang = 'en-GB';
    I18n.locale = {};
    I18n.apply();
    assert.equal(el.textContent, 'common.cancel');
    assert.notEqual(el.textContent, 'Avbryt');
    assert.equal(html.getAttribute('data-i18n-pending'), null);
  });

  it('sv-SE apply keeps Swedish DOM text when the key is missing', () => {
    const el = makeEl('data-i18n', 'common.cancel', 'Avbryt');
    const { sandbox } = loadClientI18n({
      languages: ['sv-SE'],
      nodes: [el],
    });
    const I18n = sandbox.window.I18n;
    I18n.lang = 'sv-SE';
    I18n.locale = {};
    I18n.apply();
    assert.equal(el.textContent, 'Avbryt');
  });

  it('en-GB apply writes placeholder/title/aria/html when keys are missing', () => {
    const text = makeEl('data-i18n', 'common.save', 'Spara');
    const ph = makeEl('data-i18n-placeholder', 'common.search', 'Sök');
    const title = makeEl('data-i18n-title', 'common.close', 'Stäng');
    const aria = makeEl('data-i18n-aria-label', 'common.menu', 'Meny');
    const htmlEl = makeEl('data-i18n-html', 'common.lead', '<b>Svenska</b>');
    const { sandbox } = loadClientI18n({
      languages: ['en-GB'],
      nodes: [text, ph, title, aria, htmlEl],
    });
    const I18n = sandbox.window.I18n;
    I18n.lang = 'en-GB';
    I18n.locale = {};
    I18n.apply();
    assert.equal(text.textContent, 'common.save');
    assert.equal(ph.placeholder, 'common.search');
    assert.equal(title.title, 'common.close');
    assert.equal(aria.getAttribute('aria-label'), 'common.menu');
    assert.equal(htmlEl.innerHTML, 'common.lead');
  });

  it('failed en-GB load still apply() so Swedish placeholders are replaced', async () => {
    const el = makeEl('data-i18n', 'common.cancel', 'Avbryt');
    const { sandbox } = loadClientI18n({
      languages: ['en-GB'],
      nodes: [el],
      fetch: async () => { throw new Error('network down'); },
    });
    await sandbox.window.I18n.load('en-GB');
    assert.equal(sandbox.window.I18n.lang, 'en-GB');
    assert.equal(el.textContent, 'common.cancel');
  });

  it('pending CSS hides data-i18n nodes until apply', () => {
    const css = read('public/css/platform-native.css');
    assert.match(css, /html\[data-i18n-pending\] \[data-i18n\]/);
    assert.match(css, /visibility:\s*hidden/);
  });
});

describe('i18n fallback invariant: helpers do not use Swedish literals off Swedish', () => {
  it('I18n.literalFallback uses Swedish only for sv-SE', () => {
    const { sandbox } = loadClientI18n({ languages: ['sv-SE'] });
    const I18n = sandbox.window.I18n;
    I18n.lang = 'sv-SE';
    assert.equal(I18n.literalFallback('common.cancel', 'Avbryt'), 'Avbryt');
    I18n.lang = 'en-GB';
    assert.equal(I18n.literalFallback('common.cancel', 'Avbryt'), 'common.cancel');
    assert.equal(I18n.tOrLiteral('common.cancel', 'Avbryt'), 'common.cancel');
  });

  it('ScheduleCore.dayName does not return Swedish for en-GB missing keys', () => {
    const { sandbox } = loadClientI18n({ languages: ['en-GB'] });
    sandbox.window.I18n.lang = 'en-GB';
    sandbox.window.I18n.locale = {};
    vm.runInContext(read('public/js/schedule-core.js'), sandbox, { filename: 'public/js/schedule-core.js' });
    const name = sandbox.window.ScheduleCore.dayName(1);
    assert.equal(name, 'schedule.days.1');
    assert.notEqual(name, 'Måndag');
  });

  it('ScheduleCore.dayName still uses Swedish literals for sv-SE missing keys', () => {
    const { sandbox } = loadClientI18n({ languages: ['sv-SE'] });
    sandbox.window.I18n.lang = 'sv-SE';
    sandbox.window.I18n.locale = {};
    vm.runInContext(read('public/js/schedule-core.js'), sandbox, { filename: 'public/js/schedule-core.js' });
    assert.equal(sandbox.window.ScheduleCore.dayName(1), 'Måndag');
  });

  it('AppleAuthSession cancelledMessage does not use Avbröts for en-GB', () => {
    const { sandbox } = loadClientI18n({ languages: ['en-GB'] });
    sandbox.window.I18n.lang = 'en-GB';
    sandbox.window.I18n.locale = {};
    vm.runInContext(read('public/js/apple-auth-session.js'), sandbox, { filename: 'public/js/apple-auth-session.js' });
    const msg = sandbox.window.AppleAuthSession.cancelledMessage();
    assert.equal(msg, 'auth.login.apple.cancelled');
    assert.notEqual(msg, 'Avbröts');
  });

  it('library timer helper does not use Barnet for en-GB missing keys', () => {
    const src = read('public/js/library-activity-timer-bridge.js');
    assert.match(src, /I18n\.tOrLiteral|I18n\.literalFallback/);
    assert.doesNotMatch(src, /if \(!raw \|\| raw === key\) raw = fallback;/);
    const { sandbox } = loadClientI18n({ languages: ['en-GB'] });
    sandbox.window.I18n.lang = 'en-GB';
    sandbox.window.I18n.locale = {};
    assert.equal(
      sandbox.window.I18n.tOrLiteral('library.timer.childFallback', 'Barnet'),
      'library.timer.childFallback'
    );
  });
});
