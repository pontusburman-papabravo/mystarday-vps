/**
 * client-log.test.js — Apple Sign In client diagnostics endpoint.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

test('CSRF exempt includes /client-log', () => {
  const csrf = require('../src/middleware/csrf');
  const src = require('fs').readFileSync(
    path.join(__dirname, '../src/middleware/csrf.js'),
    'utf8'
  );
  assert.ok(src.includes("'/client-log'"), 'client-log should be CSRF exempt');
  assert.ok(csrf.csrfProtect, 'csrfProtect exported');
});

test('public router exposes POST /client-log', () => {
  const fs = require('fs');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/public.js'), 'utf8');
  assert.ok(src.includes("router.post('/client-log'"), 'POST /client-log route missing');
  assert.ok(src.includes("'apple_sign_in'"), 'apple_sign_in channel expected');
  assert.ok(src.includes("'native_debug'"), 'native_debug channel expected');
  assert.ok(src.includes("'android_stability'"), 'android_stability channel expected');
  assert.ok(src.includes("'trusted_profile_unlock'"), 'trusted_profile_unlock channel expected');
  assert.ok(src.includes('native_debug_overlay'), 'native_debug_overlay app-config flag expected');
});

test('login.html exposes Apple Sign In diagnostics on parent login', () => {
  const fs = require('fs');
  const html = fs.readFileSync(path.join(__dirname, '../public/login.html'), 'utf8');
  assert.ok(html.includes('id="appleLoginError"'), 'appleLoginError missing');
  assert.ok(html.includes('id="appleLinkingPrompt"'), 'appleLinkingPrompt missing');
  assert.ok(html.includes('apple-sign-in-diagnostics.js'), 'diagnostics script missing');
  assert.ok(!html.includes('if (!result || !result.idToken) return'), 'silent idToken return should be removed');
  assert.ok(html.includes('onboarding_completed'), 'should log onboarding_completed explicitly');
});
