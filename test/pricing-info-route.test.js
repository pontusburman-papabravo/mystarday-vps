'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('public route serves /pricing-info', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../src/routes/public-pages.js'),
    'utf8'
  );
  assert.match(src, /router\.get\('\/pricing-info'/);
  assert.match(src, /pricing-info\.html/);
});

test('upgrade page links to /pricing-info', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '../public/upgrade.html'),
    'utf8'
  );
  assert.match(html, /href="\/pricing-info"/);
  assert.match(html, /grundarprogrammet/i);
});
