'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('skattkammaren route serves parent treasury for logged-in parent', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.match(src, /forceDemo = req\.query\.demo === '1'/);
  assert.match(src, /skattkammaren-parent\.html/);
  assert.match(src, /skattkammaren\.html/);
  assert.doesNotMatch(src, /redirect\(302, '\/rewards'\)/);
});

test('landing page links to skattkammaren demo', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /href="\/skattkammaren\?demo=1"/);
  assert.doesNotMatch(html, /href="\/skattkammaren"/);
});
