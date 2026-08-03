'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('child-login PIN digits use high-contrast navy on white keys', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-login-magic.css'),
    'utf8'
  );
  assert.match(css, /\.cl-key\.digit\s*\{[^}]*color:\s*#1B2340/i);
  assert.match(css, /\.cl-key\.digit\.col-purple\s*\{[^}]*color:\s*#1B2340/i);
  assert.match(css, /\.cl-key\.digit\.col-teal\s*\{[^}]*color:\s*#1B2340/i);
  assert.match(css, /\.cl-key\.digit\.col-pink\s*\{[^}]*color:\s*#1B2340/i);
  assert.match(css, /\.cl-key\.digit\.col-gold\s*\{[^}]*color:\s*#1B2340/i);
});

test('child-login PIN digit keys do not use pastel text-only colors', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-login-magic.css'),
    'utf8'
  );
  assert.doesNotMatch(css, /\.cl-key\.digit\.col-purple\s*\{\s*color:\s*#7B61FF/);
  assert.doesNotMatch(css, /\.cl-key\.digit\.col-teal\s*\{\s*color:\s*#14B8A6/);
  assert.doesNotMatch(css, /\.cl-key\.digit\.col-pink\s*\{\s*color:\s*#EC4899/);
  assert.doesNotMatch(css, /\.cl-key\.digit\.col-gold\s*\{\s*color:\s*#F5A623/);
});

test('child-login keypad keys have focus-visible outline', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-login-magic.css'),
    'utf8'
  );
  assert.match(css, /\.cl-key:focus-visible/);
});
