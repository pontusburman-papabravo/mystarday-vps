'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('register page never blocks form with pointer-events gate', () => {
  const countryChoice = fs.readFileSync(path.join(ROOT, 'public/js/country-choice.js'), 'utf8');
  const registerHtml = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  assert.doesNotMatch(countryChoice, /gateRegisterForm/);
  assert.doesNotMatch(countryChoice, /formCard\.style\.pointerEvents/);
  assert.doesNotMatch(countryChoice, /suggest === 'SE' \? ' selected'/);
  assert.doesNotMatch(countryChoice, /acceptDisplayedCountry/);
  assert.doesNotMatch(countryChoice, /displayed_country/);
  assert.match(countryChoice, /data-suggested-country/);
  assert.match(registerHtml, /authEntryInlineUnlock/);
  assert.match(registerHtml, /#auth-entry-fallback \{ display: none !important/);
  assert.match(registerHtml, /fetchWithTimeout/);
  assert.match(registerHtml, /registerForm'\)\.classList\.remove\('hidden'\)/);
  assert.match(appJs, /req\.path === '\/register'/);
});
