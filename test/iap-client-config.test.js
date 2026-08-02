'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isSecretSdkKey,
  getLegacyPublicApiKey,
  getPublicSdkKeyForPlatform,
} = require('../src/lib/iap-client-config');

describe('iap client config', () => {
  test('isSecretSdkKey detects sk_ and rcsk_ prefixes', () => {
    assert.equal(isSecretSdkKey('sk_live_abc'), true);
    assert.equal(isSecretSdkKey('rcsk_abc'), true);
    assert.equal(isSecretSdkKey('appl_abc'), false);
  });

  test('getLegacyPublicApiKey never returns secret REVENUECAT_API_KEY', () => {
    const prev = process.env.REVENUECAT_API_KEY;
    process.env.REVENUECAT_API_KEY = 'sk_secret_must_not_leak';
    assert.equal(getLegacyPublicApiKey(), null);
    process.env.REVENUECAT_API_KEY = 'appl_public_sdk_key';
    assert.equal(getLegacyPublicApiKey(), 'appl_public_sdk_key');
    process.env.REVENUECAT_API_KEY = prev;
  });

  test('getPublicSdkKeyForPlatform reads platform env vars', () => {
    const prevIos = process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY;
    const prevAndroid = process.env.REVENUECAT_ANDROID_PUBLIC_SDK_KEY;
    process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY = 'appl_ios';
    process.env.REVENUECAT_ANDROID_PUBLIC_SDK_KEY = 'goog_android';
    assert.equal(getPublicSdkKeyForPlatform('ios'), 'appl_ios');
    assert.equal(getPublicSdkKeyForPlatform('android'), 'goog_android');
    process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY = prevIos;
    process.env.REVENUECAT_ANDROID_PUBLIC_SDK_KEY = prevAndroid;
  });
});
