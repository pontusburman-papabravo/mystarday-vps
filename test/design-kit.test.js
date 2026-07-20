'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KIT = path.join(ROOT, 'public/assets/min-stjarndag-design-kit');

const {
  PICTOGRAMS,
  DESIGN_KIT_BY_KEY,
  designKitIconPath,
  pictogramImagePath,
} = require('../config/pictogram-library');

describe('min-stjarndag-design-kit v1', () => {
  it('ships SVG icons, illustrations, tokens and manifest', () => {
    assert.ok(fs.existsSync(path.join(KIT, 'README.md')));
    assert.ok(fs.existsSync(path.join(KIT, 'icons/manifest.json')));
    assert.ok(fs.existsSync(path.join(KIT, 'tokens/colors.json')));
    assert.ok(fs.existsSync(path.join(KIT, 'icons/svg/light/borsta-tanderna.svg')));
    assert.ok(fs.existsSync(path.join(KIT, 'icons/svg/dark/borsta-tanderna.svg')));
    assert.ok(fs.existsSync(path.join(KIT, 'illustrations/svg/light/tandborstning.svg')));
    assert.equal(fs.existsSync(path.join(KIT, 'icons/png')), false, 'PNG exports stay out of git');
  });

  it('manifest lists 400 unique icon names with light+dark paths', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(KIT, 'icons/manifest.json'), 'utf8'));
    assert.equal(manifest.length, 400);
    const names = new Set(manifest.map((e) => e.name));
    assert.equal(names.size, 400);
    for (const entry of manifest) {
      assert.ok(fs.existsSync(path.join(KIT, entry.light)), 'missing ' + entry.light);
      assert.ok(fs.existsSync(path.join(KIT, entry.dark)), 'missing ' + entry.dark);
    }
  });

  it('maps every pictogram icon_key to an existing kit SVG', () => {
    assert.equal(Object.keys(DESIGN_KIT_BY_KEY).length, PICTOGRAMS.length);
    for (const pic of PICTOGRAMS) {
      const url = designKitIconPath(pic.key);
      assert.ok(url, 'missing design-kit map for ' + pic.key);
      assert.equal(pictogramImagePath(pic.key), url);
      const disk = path.join(ROOT, 'public', url.slice(1));
      assert.ok(fs.existsSync(disk), 'missing asset ' + disk);
    }
  });
});
