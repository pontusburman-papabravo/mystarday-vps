'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { injectParentMagicHtml } = require('../src/middleware/platform-html');

describe('family-week redirect', () => {
  const html = '<!DOCTYPE html><html><head></head><body></body></html>';

  it('does not inject magic on /family-week (301 redirect route)', () => {
    const out = injectParentMagicHtml(html, '/family-week');
    assert.equal(out, html);
  });

  it('still injects magic on /schedule', () => {
    const out = injectParentMagicHtml(html, '/schedule');
    assert.match(out, /parent-magic-shell\.js/);
  });
});
