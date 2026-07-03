'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getAuthMethodsForPlatform } = require('../config/auth-login-methods');

test('getAuthMethodsForPlatform: web/PWA', () => {
  assert.deepEqual(getAuthMethodsForPlatform('web'), {
    apple: true,
    google: true,
    email: true,
    childLink: true,
  });
});

test('getAuthMethodsForPlatform: ios-native', () => {
  assert.deepEqual(getAuthMethodsForPlatform('ios-native'), {
    apple: true,
    google: false,
    email: true,
    childLink: true,
  });
});

test('getAuthMethodsForPlatform: android', () => {
  assert.deepEqual(getAuthMethodsForPlatform('android'), {
    apple: false,
    google: true,
    email: true,
    childLink: true,
  });
});
