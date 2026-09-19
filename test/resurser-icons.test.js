'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { MORNING_KEYS } = require('../config/resurser-r1');
const { EMOTION_KEYS } = require('../config/emotion-keys');
const { allPictogramKeys } = require('../config/resurser-catalog');
const {
  iconSourceForKey,
  publicIconPathForKey,
  preloadResurserIcons,
  getIconPng,
} = require('../src/lib/resurser-icons');

const ROOT = path.join(__dirname, '..');

describe('resurser PDF icons follow the child app pack', () => {
  it('morning keys resolve to the simple app pictogram, not design-kit line icons', () => {
    for (const key of MORNING_KEYS) {
      const source = iconSourceForKey(key);
      assert.ok(source, 'missing icon for ' + key);
      assert.equal(source.kind, 'app', key + ' should use the app pictogram');
      assert.match(source.url, /\/images\/child\/pictograms\/simple\/.+\.webp$/);
      assert.ok(fs.existsSync(path.join(ROOT, 'public', source.url.slice(1))), source.url);
    }
    const wake = publicIconPathForKey('wake_up');
    assert.equal(wake, '/images/child/pictograms/simple/wake-up@2x.webp');
    assert.doesNotMatch(wake, /min-stjarndag-design-kit/);
  });

  it('emotion keys keep design-kit until an app pictogram exists', () => {
    for (const key of EMOTION_KEYS) {
      const source = iconSourceForKey(key);
      assert.ok(source, 'missing emotion icon for ' + key);
      assert.equal(source.kind, 'kit', key);
      assert.match(source.url, /\/assets\/min-stjarndag-design-kit\/icons\/svg\/light\/.+\.svg$/);
    }
  });

  it('pause uses the app break pictogram via existing alias', () => {
    const source = iconSourceForKey('pause');
    assert.equal(source.kind, 'app');
    assert.equal(source.url, '/images/child/pictograms/simple/break@2x.webp');
  });

  it('bathroom uses the app toilet pictogram', () => {
    const source = iconSourceForKey('bathroom');
    assert.equal(source.kind, 'app');
    assert.equal(source.url, '/images/child/pictograms/simple/toilet@2x.webp');
  });

  it('preloads PNG buffers for every catalog pictogram key', async () => {
    const keys = allPictogramKeys();
    await preloadResurserIcons(keys);
    for (const key of keys) {
      const png = getIconPng(key);
      assert.ok(png && png.length > 100, 'no PNG for ' + key);
      assert.equal(png[0], 0x89);
      assert.equal(png[1], 0x50);
    }
  });
});
