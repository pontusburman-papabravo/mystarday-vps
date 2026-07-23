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

  it('platform-html injects early native redirect before paint', () => {
    const html = read('src/middleware/platform-html.js');
    assert.match(html, /stjarndag_user/);
    assert.match(html, /location\.replace\(li\?"\/dashboard":"\/login"\)/);
  });

  it('family init shows cached data immediately', () => {
    const family = read('public/js/family.js');
    assert.match(family, /applyWarmFamilyData/);
    assert.match(family, /__familyWarmData/);
    assert.match(family, /setFamilyLoading\(false\)/);
    assert.match(family, /function renderAll\(data\) \{[\s\S]*familyData = data;/);
    const rolesIdx = family.indexOf('const ROLES = [');
    const initCallIdx = family.indexOf('familyI18nBoot');
    assert.ok(rolesIdx >= 0 && initCallIdx > rolesIdx, 'ROLES must be defined before familyI18nBoot runs');
  });

  it('dashboard warms family API after auth', () => {
    const dash = read('public/js/dashboard.js');
    assert.match(dash, /ParentMagicRouter\.warmFamilyFetch/);
  });

  it('parent-magic-router exports warmFamilyFetch', () => {
    const router = read('public/js/parent-magic-router.js');
    assert.match(router, /warmFamilyFetch: warmFamilyFetch/);
    assert.match(router, /__familyWarmData/);
  });
});
