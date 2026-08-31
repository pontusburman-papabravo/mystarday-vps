'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function memStorage() {
  const store = Object.create(null);
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
}

function loadLanguageChoice(opts) {
  opts = opts || {};
  const sessionStorage = opts.sessionStorage || memStorage();
  const errorEl = { textContent: '', hidden: true };
  const I18n = opts.I18n === undefined
    ? {
      STORAGE_KEY: 'sd_preferred_locale',
      locale: { language: { choice: { required: 'Choose a language to continue' } } },
      lang: opts.lang || 'en-GB',
      getCurrentLang() { return this.lang; },
      t(key) { return key === 'language.choice.required' ? 'Choose a language to continue' : key; },
      async init() {},
      async load() {},
      apply() {},
    }
    : opts.I18n;
  const document = {
    querySelector(sel) {
      if (sel === '[data-language-choice-error]') return errorEl;
      if (sel === '[data-language-choice-mount]') return { scrollIntoView() { document._scrolled = true; } };
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    getElementById() { return null; },
    head: { appendChild() {} },
    createElement() { return { textContent: '', id: '' }; },
    body: { dataset: {} },
    _scrolled: false,
  };
  const window = {
    sessionStorage,
    document,
    I18n,
    analytics: { track() {} },
  };
  const context = { window, document, sessionStorage, console };
  context.global = window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/language-choice.js'), 'utf8'), context);
  return {
    LanguageChoice: context.window.LanguageChoice,
    sessionStorage,
    errorEl,
  };
}

describe('LanguageChoice treats the displayed locale as selected', () => {
  it('requireSelection is true for on-screen English without a confirm tap', () => {
    const { LanguageChoice, sessionStorage, errorEl } = loadLanguageChoice({ lang: 'en-GB' });
    assert.equal(sessionStorage.getItem('sd_locale_confirmed'), null);
    assert.equal(LanguageChoice.isConfirmed(), true);
    assert.equal(LanguageChoice.requireSelection(), true);
    assert.equal(sessionStorage.getItem('sd_locale_confirmed'), '1');
    assert.equal(sessionStorage.getItem('sd_preferred_locale'), 'en-GB');
    assert.equal(errorEl.hidden, true);
  });

  it('requireSelection is true for on-screen Swedish without a confirm tap', () => {
    const { LanguageChoice } = loadLanguageChoice({ lang: 'sv-SE' });
    assert.equal(LanguageChoice.requireSelection(), true);
  });

  it('requireSelection is fail-closed when no locale bundle is loaded', () => {
    const { LanguageChoice, errorEl } = loadLanguageChoice({
      I18n: {
        STORAGE_KEY: 'sd_preferred_locale',
        locale: {},
        lang: 'sv-SE',
        getCurrentLang() { return this.lang; },
        t(key) { return key; },
      },
    });
    assert.equal(LanguageChoice.isConfirmed(), false);
    assert.equal(LanguageChoice.requireSelection(), false);
    assert.equal(errorEl.hidden, false);
  });

  it('does not paint a suggested gold border that can disagree with the page language', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/language-choice.js'), 'utf8');
    assert.match(src, /selection_source: 'displayed_locale'/);
    assert.match(src, /language-choice__btn--selected/);
    assert.doesNotMatch(src, /language-choice__btn--suggested/);
    assert.doesNotMatch(src, /language-choice__title-en/);
    assert.doesNotMatch(src, /user must actively confirm/);
  });

  it('register Apple/Google labels follow the page language', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    assert.match(html, /data-i18n="auth.register.continueWithApple"/);
    assert.match(html, /data-i18n="auth.register.continueWithGoogle"/);
    assert.match(html, /data-i18n="auth.register.orDivider"/);
  });

  it('locale copy is a switcher label, not a blocking choose-step', () => {
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en-GB.json'), 'utf8'));
    const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8'));
    assert.equal(en.language.choice.title, 'Language');
    assert.equal(sv.language.choice.title, 'Språk');
    assert.equal(en.auth.register.continueWithApple, 'Sign up with Apple');
    assert.equal(sv.auth.register.continueWithApple, 'Registrera med Apple');
  });
});
