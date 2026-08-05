'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('child today i18n bootstrap', () => {
  it('exposes ready dataset helpers', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/child-today-i18n-bootstrap.js'),
      'utf8'
    );
    assert.match(src, /childTodayI18nReady/);
    assert.match(src, /markChildTodayI18nReady/);
    assert.match(src, /renderBottomNav/);
  });

  it('child dashboard init marks ready after loadDay path', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /ChildTodayI18n\.clearReady/);
    assert.match(src, /ChildTodayI18n\.markReady/);
    assert.match(src, /nnlCpt\('today\.zoneNow'\)/);
    assert.doesNotMatch(src, /zoneNowLabel[\s\S]{0,80}'NU'/);
  });
});
