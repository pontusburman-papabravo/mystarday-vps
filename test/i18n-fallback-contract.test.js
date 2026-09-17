'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  DEFAULT_LOCALE,
  CANONICAL_FALLBACK_LOCALE,
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
    const src = read('public/js/i18n.js');
    const calls = [];
    const sandbox = {
      window: {},
      document: {
        documentElement: { lang: '' },
        querySelectorAll: () => [],
        addEventListener() {},
        body: { dataset: {} },
      },
      sessionStorage: { getItem() { return null; }, setItem() {} },
      localStorage: { getItem() { return null; }, setItem() {} },
      navigator: { languages: ['en-GB'] },
      console,
      fetch: async (url) => {
        calls.push(String(url));
        return { ok: false, json: async () => ({}) };
      },
    };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'public/js/i18n.js' });
    await sandbox.window.I18n.load('en-GB');
    assert.deepEqual(calls, ['/api/i18n/en-GB']);
    assert.equal(sandbox.window.I18n.lang, 'en-GB');
    assert.equal(Object.keys(sandbox.window.I18n.locale).length, 0);
  });

  it('client load(sv-SE) may fall back to en-GB, never a third language', async () => {
    const src = read('public/js/i18n.js');
    const calls = [];
    const sandbox = {
      window: {},
      document: {
        documentElement: { lang: '' },
        querySelectorAll: () => [],
        addEventListener() {},
        body: { dataset: {} },
      },
      sessionStorage: { getItem() { return null; }, setItem() {} },
      localStorage: { getItem() { return null; }, setItem() {} },
      navigator: { languages: ['sv-SE'] },
      console,
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).includes('en-GB')) {
          return { ok: true, json: async () => ({ app: { name: 'My Starday' } }) };
        }
        return { ok: false, json: async () => ({}) };
      },
    };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'public/js/i18n.js' });
    await sandbox.window.I18n.load('sv-SE');
    assert.deepEqual(calls, ['/api/i18n/sv-SE', '/api/i18n/en-GB']);
    assert.equal(sandbox.window.I18n.lang, 'en-GB');
    assert.equal(sandbox.window.I18n.locale.app.name, 'My Starday');
  });

  it('SW cache is bumped with the fallback-contract change', () => {
    assert.match(read('public/sw.js'), /stjarndag-v979/);
    const cache = JSON.parse(read('config/cache-version.json'));
    assert.equal(cache.cacheName, 'stjarndag-v979');
  });
});
