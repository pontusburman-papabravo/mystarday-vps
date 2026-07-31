'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function buildChildLoginErrorMapper(locale) {
  const childI18nSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-app-i18n.js'), 'utf8');
  const lang = locale;
  const sandbox = {
    window: {},
    document: { addEventListener: () => {} },
    CustomEvent: function CustomEvent() {},
    navigator: { onLine: true },
  };
  sandbox.window.I18n = {
    STORAGE_KEY: 'sd_preferred_locale',
    init: async () => lang,
    getCurrentLang: () => lang,
    t: (key, params) => {
      const fullKey = String(key).startsWith('child.') ? String(key) : `child.${key}`;
      return t(lang, fullKey, params);
    },
    plural: (key, count, params) => {
      const fullKey = String(key).startsWith('child.') ? String(key) : `child.${key}`;
      return t(lang, fullKey, params);
    },
    apply: () => {},
  };
  sandbox.I18n = sandbox.window.I18n;
  vm.runInNewContext(childI18nSrc, sandbox, { filename: 'child-app-i18n.js' });
  return sandbox.window.childLoginErrorFromResponse;
}

describe('childLoginErrorFromResponse', () => {
  before(() => {
    loadLocales();
  });

  it('en-GB never shows Swedish validation or raw server error', () => {
    const map = buildChildLoginErrorMapper('en-GB');
    const samples = [
      { error: 'Ogiltiga värden', details: ['username: Required'] },
      { error: 'Namn krävs' },
      { code: 'CHILD_NAME_REQUIRED' },
      { code: 'CHILD_PIN_INVALID_FORMAT' },
      { code: 'CHILD_PIN_INVALID', attempts_remaining: 2 },
      { code: 'CHILD_PIN_LOCKED', lockout_minutes: 2 },
      { code: 'CHILD_SERVER_ERROR', error: 'Något gick fel' },
      {},
    ];
    for (const data of samples) {
      const msg = map(data);
      assert.doesNotMatch(msg, /Ogiltiga värden|Namn krävs|PIN-koden måste|Användarnamn/i, JSON.stringify(data));
      if (data.code === 'CHILD_NAME_REQUIRED') {
        assert.match(msg, /Name is required/i);
      }
      if (data.code === 'CHILD_PIN_INVALID_FORMAT') {
        assert.match(msg, /4 digits/i);
      }
      if (!data.code && data.error) {
        assert.match(msg, /Something went wrong/i);
      }
    }
  });

  it('sv-SE shows localized Swedish for known codes', () => {
    const map = buildChildLoginErrorMapper('sv-SE');
    assert.match(map({ code: 'CHILD_NAME_REQUIRED' }), /Namn krävs/);
    assert.match(map({ code: 'CHILD_PIN_INVALID_FORMAT' }), /4 siffror/i);
    assert.match(map({ code: 'CHILD_PIN_INVALID', attempts_remaining: 1 }), /1 försök/i);
  });

  it('ignores raw data.error when code is absent', () => {
    const map = buildChildLoginErrorMapper('en-GB');
    const msg = map({ error: 'Felaktigt namn eller PIN-kod' });
    assert.doesNotMatch(msg, /Felaktigt/);
    assert.match(msg, /Something went wrong/i);
  });
});
