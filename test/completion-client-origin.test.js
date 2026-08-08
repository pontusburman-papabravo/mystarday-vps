'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readCompletionClientOrigin } = require('../src/lib/completion-client-origin');

test('readCompletionClientOrigin accepts header id', () => {
  const id = 'abcd1234efgh5678';
  const req = { headers: { 'x-completion-client-id': id }, body: {} };
  assert.equal(readCompletionClientOrigin(req), id);
});

test('readCompletionClientOrigin accepts body client_completion_id', () => {
  const id = 'bodyOrigin12';
  const req = { headers: {}, body: { client_completion_id: id } };
  assert.equal(readCompletionClientOrigin(req), id);
});

test('readCompletionClientOrigin rejects invalid shapes', () => {
  assert.equal(readCompletionClientOrigin({ headers: { 'x-completion-client-id': 'short' }, body: {} }), null);
  assert.equal(readCompletionClientOrigin({ headers: { 'x-completion-client-id': '{}' }, body: {} }), null);
  assert.equal(readCompletionClientOrigin({ headers: {}, body: { client_completion_id: 123 } }), null);
});
