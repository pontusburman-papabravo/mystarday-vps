'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { selectableLocaleOptions } = require('../src/lib/locale');

const CATALOG_PATH = path.join(__dirname, '../config/locale-catalog.json');
const ROUTE_PATH = path.join(__dirname, '../src/routes/family/core.js');

function catalogSelectable() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  return catalog.locales.filter((locale) => {
    const availability = locale.availability;
    return availability === 'public' || availability === 'always' || availability === 'english_app' || availability === 'enabled';
  });
}

describe('GET /api/family/locale-options follows the locale catalog', () => {
  it('returns every public locale with code and nativeName from the catalog', () => {
    const expected = catalogSelectable();
    const actual = selectableLocaleOptions();
    assert.deepEqual(actual.map((locale) => locale.id), expected.map((locale) => locale.id));
    assert.deepEqual(actual.map((locale) => locale.code), expected.map((locale) => locale.id));
    assert.deepEqual(actual.map((locale) => locale.nativeName), expected.map((locale) => locale.nativeName));
    for (const locale of actual) {
      assert.equal(locale.code, locale.id);
      assert.equal(typeof locale.nativeName, 'string');
      assert.ok(locale.nativeName.length > 0);
    }
    const hidden = ['is-IS', 'ga-IE', 'mt-MT'];
    assert.deepEqual(actual.map((locale) => locale.id).filter((id) => hidden.includes(id)), []);
  });

  it('the family route does not keep a handwritten locale list', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf8');
    assert.match(src, /selectableLocaleOptions\(/);
    assert.doesNotMatch(src, /supported_locales:\s*\[\s*['"]sv-SE['"]/);
    assert.doesNotMatch(src, /\[['"]sv-SE['"],\s*['"]en-GB['"]\]/);
  });
});
