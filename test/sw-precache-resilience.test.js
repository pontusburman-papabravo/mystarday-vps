'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('service worker precaches assets individually with per-URL catch', () => {
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
  assert.doesNotMatch(sw, /cache\.addAll\(STATIC_ASSETS\)/);
  assert.match(sw, /STATIC_ASSETS\.map/);
  assert.match(sw, /cache\.add\(url\)\.catch/);
  assert.match(sw, /skipWaiting\(\)/);
});

test('cache-version.json matches SW CACHE_NAME', () => {
  const { cacheName } = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/cache-version.json'), 'utf8')
  );
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
  assert.equal(cacheName, 'stjarndag-v763');
  assert.match(sw, new RegExp(`const CACHE_NAME = '${cacheName}'`));
});
