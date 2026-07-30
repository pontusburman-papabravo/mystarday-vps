'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isPrivateOrBlockedIp,
  detectImageMime,
  resolveHostAllowed,
} = require('../src/lib/safe-url-fetch');

describe('safe-url-fetch', () => {
  test('blocks RFC1918 and loopback IPv4', () => {
    assert.equal(isPrivateOrBlockedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('10.0.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('192.168.1.1'), true);
    assert.equal(isPrivateOrBlockedIp('169.254.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('8.8.8.8'), false);
  });

  test('blocks loopback IPv6', () => {
    assert.equal(isPrivateOrBlockedIp('::1'), true);
    assert.equal(isPrivateOrBlockedIp('fe80::1'), true);
  });

  test('detectImageMime accepts jpeg/png', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    assert.equal(detectImageMime(jpeg), 'image/jpeg');
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    assert.equal(detectImageMime(png), 'image/png');
    assert.equal(detectImageMime(Buffer.from([0, 0, 0])), null);
  });

  test('resolveHostAllowed rejects localhost hostname', async () => {
    const ok = await resolveHostAllowed('localhost');
    assert.equal(ok, false);
  });
});
