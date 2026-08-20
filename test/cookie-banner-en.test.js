'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('cookie-banner English copy', () => {
  it('serves English consent strings on /en public paths', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/cookie-banner.js'), 'utf8');
    assert.match(src, /function isEnglishPublicPath\(\)/);
    assert.match(src, /Reject all/);
    assert.match(src, /Accept all/);
    assert.match(src, /Cookie settings/);
    assert.match(src, /analytics_storage.*denied/s);
  });
});
