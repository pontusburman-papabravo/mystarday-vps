'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('skattkammaren route redirects logged-in parent to rewards', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.match(src, /forceDemo = req\.query\.demo === '1'/);
  assert.match(src, /redirect\(302, '\/rewards'\)/);
  assert.match(src, /skattkammaren\.html/);
});

test('landing page links to skattkammaren demo', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /href="\/skattkammaren\?demo=1"/);
  assert.doesNotMatch(html, /href="\/skattkammaren"/);
});
