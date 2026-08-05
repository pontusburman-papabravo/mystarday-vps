'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadChildLocale(locale) {
  const file = path.join(ROOT, 'config', 'i18n', `child-${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('auth parent handoff i18n keys', () => {
  for (const locale of ['sv-SE', 'en-GB']) {
    it(`${locale} has parentGate.restoringParentMode copy`, () => {
      const bundle = loadChildLocale(locale);
      const text = bundle.parentGate && bundle.parentGate.restoringParentMode;
      assert.equal(typeof text, 'string');
      assert.ok(text.length > 4);
      assert.doesNotMatch(text, /parentGate\.restoringParentMode/);
      if (locale === 'en-GB') {
        assert.doesNotMatch(text, /Öppnar föräldraläge/);
        assert.match(text, /parent mode/i);
      } else {
        assert.match(text, /föräldraläge/i);
      }
    });

    it(`${locale} has errors.handoffRestoreFailed copy`, () => {
      const bundle = loadChildLocale(locale);
      const text = bundle.errors && bundle.errors.handoffRestoreFailed;
      assert.equal(typeof text, 'string');
      assert.ok(text.length > 8);
      assert.doesNotMatch(text, /handoffRestoreFailed/);
      if (locale === 'en-GB') {
        assert.doesNotMatch(text, /Kunde inte öppna/);
        assert.match(text, /parent mode/i);
      } else {
        assert.match(text, /föräldraläge/i);
      }
    });
  }
});
