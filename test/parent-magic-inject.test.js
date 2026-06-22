'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { injectPlatformHtml, injectParentMagicHtml } = require('../src/middleware/platform-html');

describe('parent magic platform inject', () => {
  const minimalHtml = '<!DOCTYPE html><html><head><title>T</title></head><body><main>x</main></body></html>';

  it('injects magic assets on calendar path', () => {
    const out = injectParentMagicHtml(minimalHtml, '/calendar');
    assert.match(out, /parent-magic-common\.css/);
    assert.match(out, /parent-magic-bootstrap\.js/);
    assert.match(out, /parent-magic-auto\.js/);
  });

  it('skips pages outside parent magic whitelist', () => {
    const out = injectParentMagicHtml(minimalHtml, '/login');
    assert.equal(out, minimalHtml);
  });

  it('skips script inject when parent-magic-shell already present but still adds CSS', () => {
    const wired = minimalHtml.replace('</body>', '<script src="/js/parent-magic-shell.js"><\/script></body>');
    const out = injectParentMagicHtml(wired, '/calendar');
    assert.match(out, /parent-magic-common\.css/);
    assert.doesNotMatch(out, /parent-magic-bootstrap\.js/);
    assert.match(out, /parent-magic-shell\.js/);
  });

  it('injectPlatformHtml still adds platform scripts', () => {
    const out = injectPlatformHtml(minimalHtml, '/calendar');
    assert.match(out, /platform\.js/);
    assert.match(out, /parent-magic-shell\.js/);
  });
});
