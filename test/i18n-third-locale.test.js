'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  SUPPORTED_LOCALES,
  normalizeLocale,
  resolveAccountLocale,
  experiencePackIdForLocale,
  usesCanonicalLibrary,
  shouldEnableEnglishAppOnRegister,
  withLocaleCatalog,
  childUiLocaleForFamily,
} = require('../src/lib/locale');
const { tWithBundles, assembleLocale } = require('../src/lib/i18n');
const { loadDefaultContent } = require('../src/lib/default-content');
const { formatDayMonthLong } = require('../src/lib/locale-format');
const { pluralCategory } = require('../src/lib/i18n');
const { pickLocaleString } = require('../src/lib/canonical-library-copy');

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
      availability: 'registered',
      showOnFirstRun: false,
      contentSource: 'locale-files',
    },
  ],
};

describe('third locale xx is data, not a code branch', () => {
  it('matches a regional tag to the one registered bundle for that language', () => {
    const catalog = {
      ...shippedCatalog,
      locales: [
        ...shippedCatalog.locales,
        {
          id: 'fr-FR',
          nativeName: 'Français',
          base: 'fr',
          aliases: ['fr'],
          availability: 'public',
          showOnFirstRun: true,
          contentSource: 'locale-files',
        },
        {
          id: 'de-DE',
          nativeName: 'Deutsch',
          base: 'de',
          aliases: ['de'],
          availability: 'public',
          showOnFirstRun: true,
          contentSource: 'locale-files',
        },
      ],
    };
    withLocaleCatalog(catalog, () => {
      assert.equal(normalizeLocale('fr-BE'), 'fr-FR');
      assert.equal(normalizeLocale('de-AT'), 'de-DE');
      assert.equal(normalizeLocale('fr'), 'fr-FR');
      const frenchBrowser = resolveAccountLocale({
        acceptLanguage: 'fr-BE,en;q=0.8',
        marketDefaultLocale: 'sv-SE',
      });
      assert.equal(frenchBrowser.locale, 'fr-FR');
      assert.equal(frenchBrowser.source, 'accept_language');
      assert.equal(resolveAccountLocale({ marketDefaultLocale: 'de-DE' }).locale, 'de-DE');
    });
    assert.equal(normalizeLocale('fr-BE'), null);
  });

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
    assert.deepEqual(names, ['Svenska', 'English']);
    assert.equal(sandbox.window.I18n.firstRunLocales().some((locale) => locale.id === 'xx-XX'), false);

    sandbox.window.I18n.CATALOG = {
      defaultLocale: 'sv-SE',
      fallbackLocale: 'en-GB',
      locales: [
        { id: 'fr-FR', nativeName: 'Français', base: 'fr', aliases: ['fr'], availability: 'public', showOnFirstRun: true },
        { id: 'de-DE', nativeName: 'Deutsch', base: 'de', aliases: ['de'], availability: 'public', showOnFirstRun: true },
        { id: 'nl-NL', nativeName: 'Nederlands', base: 'nl', aliases: ['nl'], availability: 'registered', showOnFirstRun: false },
      ],
    };
    assert.equal(sandbox.window.I18n._normalize('fr-BE'), 'fr-FR');
    assert.equal(sandbox.window.I18n._normalize('de-AT'), 'de-DE');
    assert.equal(sandbox.window.I18n._normalize('nl-BE'), 'nl-NL');
    const shown = sandbox.window.I18n.firstRunLocales().map((locale) => locale.nativeName);
    assert.deepEqual(shown, ['Français', 'Deutsch']);
  });

  it('formats a valid BCP 47 tag that is not in the shipped catalog', () => {
    const day = new Date('2026-10-06T12:00:00Z');
    assert.match(formatDayMonthLong(day, 'sv-SE'), /oktober 2026/);
    assert.match(formatDayMonthLong(day, 'en-GB'), /October 2026/);
    assert.match(formatDayMonthLong(day, 'fr-FR'), /octobre 2026/);
    assert.match(formatDayMonthLong(day, 'de-DE'), /Oktober 2026/);
    assert.match(formatDayMonthLong(day, 'pl-PL'), /października 2026/);
    assert.equal(
      formatDayMonthLong(day, 'nl-NL'),
      new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(day),
    );
    assert.match(formatDayMonthLong(day, 'not a locale'), /oktober 2026/);
    assert.equal(formatDayMonthLong('nope', 'fr-FR'), '');
    assert.equal(pluralCategory('pl-PL', 5), 'many');
    assert.equal(pluralCategory('sv-SE', 5), 'other');
  });

  it('picks a locale string from data, then English, for a non-canonical language', () => {
    const names = { sv: 'Fritids', 'en-GB': 'After-school club', 'fr-FR': 'Garderie' };
    const catalog = {
      ...shippedCatalog,
      locales: [
        ...shippedCatalog.locales,
        {
          id: 'fr-FR',
          nativeName: 'Français',
          base: 'fr',
          aliases: ['fr'],
          availability: 'public',
          showOnFirstRun: true,
          contentSource: 'locale-files',
        },
      ],
    };
    withLocaleCatalog(catalog, () => {
      assert.equal(pickLocaleString(names, 'fr-FR'), 'Garderie');
      assert.equal(pickLocaleString({ sv: 'Fritids', 'en-GB': 'After-school club' }, 'fr-FR'), 'After-school club');
      assert.equal(pickLocaleString(names, 'sv-SE'), 'Fritids');
      assert.equal(pickLocaleString(names, 'en-GB'), 'After-school club');
    });
  });
});
