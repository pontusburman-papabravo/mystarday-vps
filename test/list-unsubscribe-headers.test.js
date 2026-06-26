'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildListUnsubscribeHeaders } = require('../src/lib/list-unsubscribe-headers');

test('buildListUnsubscribeHeaders returns RFC 8058 headers for https URL', () => {
  const headers = buildListUnsubscribeHeaders('https://example.test/api/newsletter/unsubscribe?token=abc');
  assert.deepEqual(headers, {
    'List-Unsubscribe': '<https://example.test/api/newsletter/unsubscribe?token=abc>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  });
});

test('buildListUnsubscribeHeaders returns null for missing or invalid URL', () => {
  assert.equal(buildListUnsubscribeHeaders(''), null);
  assert.equal(buildListUnsubscribeHeaders('/relative'), null);
});
