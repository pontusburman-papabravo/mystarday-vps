'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIG = path.join(ROOT, 'migrations/1809610000000_barnets_samling_feature.js');

describe('barnets_samling feature rollout', () => {
  it('migration registers dev feature and allowlists test + Pontus', () => {
    const src = fs.readFileSync(MIG, 'utf8');
    assert.match(src, /barnets_samling/);
    assert.match(src, /status = 'dev'/);
    assert.match(src, /pontus@burman\.cc/i);
    assert.match(src, /test.*my.*star.*day\.se/);
    assert.match(src, /family_features/);
  });

  it('barnets-samling-vision documents rollout allowlist', () => {
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs/barnets-samling-vision.md'),
      'utf8'
    );
    assert.match(doc, /barnets_samling/);
    assert.match(doc, /pontus@burman\.cc/i);
    assert.match(doc, /testanvändaren/i);
    assert.doesNotMatch(doc, /review@/i);
  });
});
