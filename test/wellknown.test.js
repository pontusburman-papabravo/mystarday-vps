'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildAssetLinks, buildAppleAppSiteAssociation } = require('../src/lib/well-known');

test('buildAssetLinks default web fallback', () => {
  const saved = process.env.ANDROID_SHA256_CERT_FINGERPRINT;
  delete process.env.ANDROID_SHA256_CERT_FINGERPRINT;
  const links = buildAssetLinks();
  assert.equal(links[0].target.namespace, 'web');
  if (saved) process.env.ANDROID_SHA256_CERT_FINGERPRINT = saved;
});

test('buildAssetLinks android_app when fingerprint set', () => {
  process.env.ANDROID_SHA256_CERT_FINGERPRINT = 'AA:BB:CC';
  const links = buildAssetLinks();
  assert.equal(links[0].target.namespace, 'android_app');
  assert.equal(links[0].target.package_name, 'se.mystarday.app');
});

test('buildAppleAppSiteAssociation has applinks', () => {
  const aasa = buildAppleAppSiteAssociation();
  assert.ok(aasa.applinks.details[0].paths.length > 0);
});
