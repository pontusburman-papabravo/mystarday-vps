'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('founder-banner.js desktop layout', () => {
  it('inserts banner inside main, not as sibling before main', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/founder-banner.js'), 'utf8');
    assert.match(src, /main\.insertBefore\(banner/);
    assert.doesNotMatch(src, /anchor\.parentNode\.insertBefore\(banner,\s*anchor\)/);
    assert.match(src, /Must stay inside <main>/);
  });
});
