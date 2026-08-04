'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('child-login PIN digits use white keys with readable saturated colors', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-login-magic.css'),
    'utf8'
  );
  assert.match(css, /\.cl-key\.digit\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)/i);
  assert.match(css, /\.cl-key\.digit\s*\{[^}]*font-weight:\s*800/i);
  assert.match(css, /\.cl-key\.digit\.col-purple\s*\{\s*color:\s*#5B21B6/i);
  assert.match(css, /\.cl-key\.digit\.col-teal\s*\{\s*color:\s*#0F766E/i);
  assert.match(css, /\.cl-key\.digit\.col-pink\s*\{\s*color:\s*#BE185D/i);
  assert.match(css, /\.cl-key\.digit\.col-gold\s*\{\s*color:\s*#B45309/i);
});

test('child-login PIN digit keys do not use low-contrast tinted-only keys', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-login-magic.css'),
    'utf8'
  );
  assert.doesNotMatch(css, /\.cl-key\.digit\.col-purple\s*\{[^}]*background:\s*rgba\(123,\s*97,\s*255,\s*0\.14\)[^}]*color:\s*#1B2340/);
});

test('child-login keypad keys have focus-visible outline', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-login-magic.css'),
    'utf8'
  );
  assert.match(css, /\.cl-key:focus-visible/);
});
