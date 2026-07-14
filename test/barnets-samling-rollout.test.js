'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIG_DEV = path.join(ROOT, 'migrations/1809610000000_barnets_samling_feature.js');
const MIG_LIVE = path.join(ROOT, 'migrations/1809620000000_barnets_samling_live.js');

describe('barnets_samling feature rollout', () => {
  it('dev migration registers feature and allowlists test + Pontus', () => {
    const src = fs.readFileSync(MIG_DEV, 'utf8');
    assert.match(src, /barnets_samling/);
    assert.match(src, /status = 'dev'/);
    assert.match(src, /pontus@burman\.cc/i);
    assert.match(src, /test.*my.*star.*day\.se/);
    assert.match(src, /family_features/);
  });

  it('live migration sets barnets_samling status live for all families', () => {
    const src = fs.readFileSync(MIG_LIVE, 'utf8');
    assert.match(src, /barnets_samling/);
    assert.match(src, /status = 'live'/);
  });

  it('seed-features defaults barnets_samling to live', () => {
    const seed = fs.readFileSync(path.join(ROOT, 'scripts/seed-features.js'), 'utf8');
    assert.match(seed, /slug: 'barnets_samling'/);
    assert.match(seed, /status: 'live'/);
  });

  it('barnets-samling-vision documents live rollout', () => {
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs/barnets-samling-vision.md'),
      'utf8'
    );
    assert.match(doc, /barnets_samling/);
    assert.match(doc, /status.*live/i);
  });
});
