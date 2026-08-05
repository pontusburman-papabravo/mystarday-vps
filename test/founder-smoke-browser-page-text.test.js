'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  readBodyInnerTextSync,
  isNavigationOrDetachedContextError,
} = require('../scripts/ops/founder-smoke-browser-page-text.cjs');

describe('founder smoke pageText helpers', () => {
  it('readBodyInnerTextSync returns empty string when body is null', () => {
    const prev = global.document;
    // eslint-disable-next-line no-global-assign
    global.document = { body: null };
    assert.equal(readBodyInnerTextSync(), '');
    global.document = prev;
  });

  it('readBodyInnerTextSync reads innerText when body exists', () => {
    const prev = global.document;
    global.document = { body: { innerText: 'Mission\nTreasure Chest' } };
    assert.equal(readBodyInnerTextSync(), 'Mission\nTreasure Chest');
    global.document = prev;
  });

  it('isNavigationOrDetachedContextError detects detached navigation errors', () => {
    assert.equal(
      isNavigationOrDetachedContextError(new Error('Execution context was destroyed')),
      true
    );
    assert.equal(isNavigationOrDetachedContextError(new Error('something else')), false);
  });
});
