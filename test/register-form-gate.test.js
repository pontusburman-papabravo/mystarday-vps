'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('register form gate hides fields until language and country are confirmed', () => {
  const countryChoice = fs.readFileSync(path.join(ROOT, 'public/js/country-choice.js'), 'utf8');
  const registerHtml = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');

  assert.match(countryChoice, /register-form-ready/);
  assert.match(countryChoice, /registerGateHint/);
  assert.match(countryChoice, /REGISTER_GATED_IDS/);
  assert.doesNotMatch(countryChoice, /formCard\.style\.pointerEvents\s*=\s*'none'/);
  assert.doesNotMatch(countryChoice, /suggest === 'SE' \? ' selected'/);
  assert.match(registerHtml, /register-form-ready/);
  assert.doesNotMatch(registerHtml, /registerForm'\)\.classList\.remove\('hidden'\)/);
});

test('register gate hints exist in locale bundles', () => {
  const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en-GB.json'), 'utf8'));

  assert.ok(sv.auth.register.gateHintLanguage);
  assert.ok(sv.auth.register.gateHintCountry);
  assert.ok(en.auth.register.gateHintLanguage);
  assert.ok(en.auth.register.gateHintCountry);
});
