'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  CANONICAL_VISUAL_THEME_IDS,
  DEFAULT_VISUAL_THEME,
  isCanonicalVisualTheme,
  normalizeCanonicalVisualTheme,
} = require('../src/lib/child-visual-theme');

describe('child-visual-theme — server canonical validation', () => {
  it('defines ten canonical theme ids', () => {
    assert.equal(CANONICAL_VISUAL_THEME_IDS.length, 10);
    assert.equal(DEFAULT_VISUAL_THEME, 'adventure');
  });

  it('accepts canonical ids only', () => {
    assert.equal(isCanonicalVisualTheme('space'), true);
    assert.equal(isCanonicalVisualTheme('adventure'), true);
    assert.equal(isCanonicalVisualTheme('cars'), false);
    assert.equal(isCanonicalVisualTheme('fantasy'), false);
    assert.equal(isCanonicalVisualTheme(''), false);
  });

  it('normalizes canonical ids to lowercase', () => {
    assert.equal(normalizeCanonicalVisualTheme('SPACE'), 'space');
    assert.equal(normalizeCanonicalVisualTheme('invalid'), null);
  });
});
