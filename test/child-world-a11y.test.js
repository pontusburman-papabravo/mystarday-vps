'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadChildGarden() {
  const src = read('public/js/child-garden.js');
  const dom = {
    readyState: 'complete',
    getElementById: () => null,
    body: { classList: { add: () => {}, remove: () => {} } },
  };
  const ctx = {
    document: dom,
    window: {
      matchMedia: () => ({ matches: false }),
      GardenAssetPipeline: {
        scenePictureHtml: () => '<picture></picture>',
      },
      ChildGarden: null,
      document: dom,
    },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(src, ctx);
  return ctx.window.ChildGarden;
}

describe('child world accessibility — Min värld (BL-028)', () => {
  it('garden scene has accessible name and labelled hotspots', () => {
    const ChildGarden = loadChildGarden();
    const html = ChildGarden.renderScene({
      display_name: 'Trädgården',
      scenery: [
        { scenery_id: 'garden_path', label_sv: 'Stigen', hotspot_class: 'gd-hotspot--path' },
        { scenery_id: 'garden_bed', label_sv: 'Blomsterbädden', hotspot_class: 'gd-hotspot--bed' },
      ],
    });
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="Trädgården"/);
    assert.match(html, /aria-label="Stigen"/);
    assert.match(html, /aria-label="Blomsterbädden"/);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
  });

  it('garden back control meets 44px minimum touch target', () => {
    const css = read('public/css/child-garden.css');
    assert.match(css, /gd-back-fab[\s\S]*min-width:\s*44px/);
    assert.match(css, /gd-back-fab[\s\S]*min-height:\s*44px/);
  });

  it('garden respects prefers-reduced-motion', () => {
    const css = read('public/css/child-garden.css');
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css, /gd-loe--sunflower_bloom/);
  });

  it('morgonhus props meet minimum touch and reduced motion', () => {
    const css = read('public/css/child-morgonhus.css');
    assert.match(css, /mh-prop[\s\S]*min-height:\s*44px/);
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  });

  it('morgonhus scene uses aria-live polite for feedback', () => {
    const src = read('public/js/child-morgonhus.js');
    assert.match(src, /aria-live="polite"/);
    assert.match(src, /role="status"/);
  });

  it('garden LOE feedback uses polite status region not blocking modal', () => {
    const src = read('public/js/child-garden.js');
    assert.match(src, /gdSceneStatus/);
    assert.match(src, /child_message_sv/);
    assert.doesNotMatch(src, /showToast/);
    assert.doesNotMatch(src, /alert\(/);
  });
});
