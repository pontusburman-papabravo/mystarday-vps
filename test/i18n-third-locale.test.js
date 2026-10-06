'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  SUPPORTED_LOCALES,
  normalizeLocale,
  experiencePackIdForLocale,
  usesCanonicalLibrary,
  shouldEnableEnglishAppOnRegister,
  withLocaleCatalog,
  childUiLocaleForFamily,
} = require('../src/lib/locale');
const { tWithBundles, assembleLocale } = require('../src/lib/i18n');
const { loadDefaultContent } = require('../src/lib/default-content');

const ROOT = path.join(__dirname, '..');
const shippedCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/locale-catalog.json'), 'utf8'));

const xxCatalog = {
  ...shippedCatalog,
  locales: [
    ...shippedCatalog.locales,
    {
      id: 'xx-XX',
      nativeName: 'Testish',
      base: 'xx',
      aliases: ['xx'],
      inputAliases: [],
      legacyJourneyTags: [],
      experiencePack: 'child_xx',
      availability: 'always',
      contentSource: 'locale-files',
    },
  ],
};

describe('third locale xx is data, not a code branch', () => {
  it('shipped catalog stays sv-SE and en-GB', () => {
    assert.deepEqual([...SUPPORTED_LOCALES], ['sv-SE', 'en-GB']);
    assert.equal(normalizeLocale('xx'), null);
    assert.equal(normalizeLocale('xx-XX'), null);
  });

  it('a test catalog resolves xx without treating it as Swedish', () => {
    withLocaleCatalog(xxCatalog, () => {
      assert.equal(normalizeLocale('xx'), 'xx-XX');
      assert.equal(normalizeLocale('xx-XX'), 'xx-XX');
      assert.equal(normalizeLocale('fr-FR'), null);
      assert.equal(experiencePackIdForLocale('xx-XX'), 'child_xx');
      assert.equal(experiencePackIdForLocale('sv-SE'), 'child_se');
      assert.equal(experiencePackIdForLocale('en-GB'), 'child_se');
      assert.equal(
        experiencePackIdForLocale('en-GB', { englishChildExperienceEnabled: true }),
        'child_en'
      );
      assert.equal(usesCanonicalLibrary('sv-SE'), true);
      assert.equal(usesCanonicalLibrary('xx-XX'), false);
      assert.equal(usesCanonicalLibrary('en-GB'), false);
      assert.equal(shouldEnableEnglishAppOnRegister('en-GB'), true);
      assert.equal(shouldEnableEnglishAppOnRegister('xx-XX'), false);
      assert.equal(childUiLocaleForFamily('xx-XX', false), 'xx-XX');
      assert.equal(childUiLocaleForFamily('en-GB', false), 'sv-SE');
      assert.equal(childUiLocaleForFamily('en-GB', true), 'en-GB');

      const bundles = {
        'sv-SE': { greet: 'Hej {{name}}', onlySv: 'bara svenska' },
        'en-GB': { greet: 'Hello {{name}}', extra: 'English extra' },
        'xx-XX': { greet: 'Xx {{name}}' },
      };
      assert.equal(tWithBundles('xx-XX', 'greet', { name: 'A' }, bundles), 'Xx A');
      assert.equal(tWithBundles('xx-XX', 'extra', {}, bundles), 'English extra');
      assert.equal(tWithBundles('xx-XX', 'onlySv', {}, bundles), 'onlySv');
      const assembled = assembleLocale('xx-XX', bundles);
      assert.equal(assembled.greet, 'Xx {{name}}');
      assert.equal(assembled.extra, 'English extra');
      assert.equal(assembled.onlySv, undefined);

      const content = loadDefaultContent('xx-XX');
      assert.equal(content.locale, 'en-GB');
    });
    assert.equal(normalizeLocale('xx'), null);
  });

  it('client catalog matches config/locale-catalog.json', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/i18n.js'), 'utf8');
    const sandbox = {
      window: {},
      document: {
        documentElement: { setAttribute() {}, removeAttribute() {} },
        addEventListener() {},
        body: { dataset: {} },
      },
      sessionStorage: { getItem() { return null; }, setItem() {} },
      localStorage: { getItem() { return null; }, setItem() {} },
      navigator: { languages: ['sv-SE'] },
      console,
    };
    sandbox.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'public/js/i18n.js' });
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.I18n.CATALOG)), shippedCatalog);
    assert.equal(sandbox.window.I18n._normalize('en-IE'), 'en-GB');
    assert.equal(sandbox.window.I18n._normalize('fi-FI'), null);
    sandbox.window.I18n.CATALOG = xxCatalog;
    assert.equal(sandbox.window.I18n._normalize('xx'), 'xx-XX');
    assert.equal(sandbox.window.I18n._normalize('fr'), null);
    const names = sandbox.window.I18n.selectorLocales().map((locale) => locale.nativeName);
    assert.deepEqual(names, ['Svenska', 'English', 'Testish']);
  });
});
