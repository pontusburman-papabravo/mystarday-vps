'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Native startup + family fast path', () => {
  it('platform-theme redirects native marketing paths to login or dashboard', () => {
    const theme = read('public/js/platform-theme.js');
    assert.doesNotMatch(theme, /native_landing_redirected/);
    assert.match(theme, /stjarndag_user/);
    assert.match(theme, /location\.replace\(loggedIn \? '\/dashboard' : '\/login'\)/);
  });

  it('platform-html injects early native redirect to authoritative entry surface', () => {
    const html = read('src/middleware/platform-html.js');
    assert.doesNotMatch(html, /stjarndag_user/);
    assert.match(html, /location\.replace\("\/home"\)/);
  });

  it('family init shows cached data immediately after successful fetch', () => {
    const family = read('public/js/family.js');
    assert.match(family, /familyCache = data/);
    assert.match(family, /setFamilyLoading\(false\)/);
    assert.doesNotMatch(family, /__familyWarmData/);
    assert.doesNotMatch(family, /prefetchFamily/);
  });

  it('parent-magic-router does not warm-prefetch family on navigate', () => {
    const router = read('public/js/parent-magic-router.js');
    assert.doesNotMatch(router, /warmFamilyFetch/);
  });
});
