'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  injectBrandPlaceholders,
  injectSiteUrl,
} = require('../src/lib/public-html-placeholders');

test('public HTML placeholders replace brand and site URL', () => {
  const prevName = process.env.EMAIL_FROM_NAME;
  const prevSite = process.env.PUBLIC_SITE_URL;
  process.env.EMAIL_FROM_NAME = 'Test Brand';
  process.env.PUBLIC_SITE_URL = 'https://example.test';
  try {
    assert.equal(
      injectBrandPlaceholders('<p>[REDACTED]</p>'),
      '<p>Test Brand</p>'
    );
    assert.equal(
      injectSiteUrl('<link href="__SITE_URL__/viktig-information">'),
      '<link href="https://example.test/viktig-information">'
    );
  } finally {
    if (prevName === undefined) delete process.env.EMAIL_FROM_NAME;
    else process.env.EMAIL_FROM_NAME = prevName;
    if (prevSite === undefined) delete process.env.PUBLIC_SITE_URL;
    else process.env.PUBLIC_SITE_URL = prevSite;
  }
});
