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
  const wfSrc = read('public/js/child-world-wayfinder.js');
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
  vm.runInNewContext(wfSrc, ctx);
  vm.runInNewContext(src, ctx);
  return ctx.window.ChildGarden;
}

function loadChildMorgonhus() {
  const wfSrc = read('public/js/child-world-wayfinder.js');
  const src = read('public/js/child-morgonhus.js');
  const dom = {
    readyState: 'complete',
    getElementById: () => null,
    body: { classList: { add: () => {}, remove: () => {} } },
  };
  const ctx = {
    document: dom,
    window: {
      matchMedia: () => ({ matches: false }),
      ChildMorgonhus: null,
      document: dom,
    },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(wfSrc, ctx);
  vm.runInNewContext(src, ctx);
  return ctx.window.ChildMorgonhus;
}

describe('child world accessibility — Min värld (BL-028)', () => {
  it('garden scene has accessible name and wayfinder actions', () => {
    const ChildGarden = loadChildGarden();
    const html = ChildGarden.renderScene({
      display_name: 'Trädgården',
      scenery: [
        { scenery_id: 'garden_path', label_sv: 'Stigen', leads_to_memory_hall: true },
        { scenery_id: 'garden_bed', label_sv: 'Blomsterbädden', hotspot_class: 'gd-hotspot--bed' },
      ],
    });
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="Trädgården"/);
    assert.match(html, /data-cww-action="bed"/);
    assert.match(html, /Blomsterbädd/);
    assert.doesNotMatch(html, /data-cww-action="memory"/);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
  });

  it('garden path to Minnesrummet uses labeled wayfinder button', () => {
    const ChildGarden = loadChildGarden();
    const html = ChildGarden.renderScene({
      scenery: [
        { scenery_id: 'garden_path', label_sv: 'Stigen', leads_to_memory_hall: true },
      ],
    });
    assert.match(html, /data-cww-action="memory"/);
    assert.match(html, /Minnen/);
    assert.doesNotMatch(html, /gd-hotspot--path/);
  });

  it('wayfinder back control meets 44px minimum touch target', () => {
    const css = read('public/css/child-world-wayfinder.css');
    assert.match(css, /cww-back[\s\S]*min-height:\s*44px/);
    assert.match(css, /cww-action[\s\S]*min-height:\s*52px/);
  });

  it('garden LOE uses illustrated plant sprites, not CSS conic placeholders', () => {
    const css = read('public/css/child-garden.css');
    assert.match(css, /gd-bed-plant/);
    assert.doesNotMatch(css, /repeating-conic-gradient/);
  });

  it('morgonhus hotspots meet minimum touch and reduced motion', () => {
    const css = read('public/css/child-morgonhus.css');
    assert.match(css, /mh-hotspot[\s\S]*min-height:\s*44px/);
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  });

  it('morgonhus scene has wayfinder actions and status region', () => {
    const ChildMorgonhus = loadChildMorgonhus();
    const html = ChildMorgonhus.renderScene({
      display_name: 'Morgonhuset',
      gate_to_garden: true,
      props: [],
    });
    assert.match(html, /cww-place-text/);
    assert.match(html, /Morgonhuset/);
    assert.match(html, /data-cww-action="garden"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /role="status"/);
  });

  it('morgonhus wayfinder actions meet 44px minimum touch target', () => {
    const css = read('public/css/child-world-wayfinder.css');
    assert.match(css, /cww-action[\s\S]*min-height:\s*52px/);
  });

  it('morgonhus scene uses aria-live polite for feedback', () => {
    const src = read('public/js/child-morgonhus.js');
    assert.match(src, /aria-live="polite"/);
    assert.match(src, /role="status"/);
  });

  it('garden timer refresh announces living slot state transitions', () => {
    const src = read('public/js/child-garden.js');
    assert.match(src, /livingSlotTransitionMessage/);
    assert.match(src, /label_state_sv/);
    assert.match(src, /scheduleTimerRefresh[\s\S]*showLoeFeedback/);
  });

  it('memory hall exhibit slots meet 44px touch minimum', () => {
    const css = read('public/css/child-memory-hall.css');
    assert.match(css, /mu-exhibit[\s\S]*min-width:\s*44px/);
    assert.match(css, /mu-exhibit[\s\S]*min-height:\s*44px/);
  });

  it('memory hall back control meets 44px minimum touch target', () => {
    const css = read('public/css/child-memory-hall.css');
    assert.match(css, /mu-back-fab[\s\S]*min-width:\s*44px/);
    assert.match(css, /mu-back-fab[\s\S]*min-height:\s*44px/);
  });

  it('memory hall hotspots are invisible in illustrated mode (no debug borders)', () => {
    const css = read('public/css/child-memory-hall.css');
    assert.match(css, /\.mu-hotspot[\s\S]*border:\s*none/);
    assert.match(css, /\.mu-hotspot[\s\S]*background:\s*transparent/);
  });

  it('memory hall scaffold uses wood frames with 44px touch minimum', () => {
    const css = read('public/css/child-memory-hall.css');
    assert.match(css, /mu-frame[\s\S]*min-height:\s*88px/);
    assert.match(css, /mu-back-fab[\s\S]*min-width:\s*44px/);
  });

  it('garden LOE feedback uses polite status region not blocking modal', () => {
    const src = read('public/js/child-garden.js');
    assert.match(src, /gdSceneStatus/);
    assert.match(src, /child_message_sv/);
    assert.doesNotMatch(src, /showToast/);
    assert.doesNotMatch(src, /alert\(/);
  });
});
