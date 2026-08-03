'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { typesForQueue, isValidQueue } = require('../config/support-queues');

describe('support-queues', () => {
  test('meddelanden queue excludes bugs', () => {
    const types = typesForQueue('meddelanden');
    assert.ok(types.includes('contact'));
    assert.ok(!types.includes('bug'));
  });

  test('incidenter queue is bugs only', () => {
    assert.deepEqual(typesForQueue('incidenter'), ['bug']);
  });

  test('invalid queue rejected', () => {
    assert.equal(isValidQueue('foo'), false);
    assert.equal(typesForQueue('foo'), null);
  });
});
