'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadWayfinder() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/child-world-wayfinder.js'), 'utf8');
  const ctx = { window: {}, document: { body: { classList: { add: () => {}, remove: () => {} } } } };
  vm.runInNewContext(src, ctx);
  return ctx.window.ChildWorldWayfinder;
}

describe('child-world-wayfinder', () => {
  it('renders place title and labeled action buttons', () => {
    const wf = loadWayfinder();
    const html = wf.render({
      placeId: 'garden',
      placeLabel: 'Trädgården',
      placeIcon: '🌻',
      back: { label: 'Tillbaka', short: 'Tillbaka' },
      actions: [
        { id: 'bed', label: 'Plantera', short: 'Blomsterbädd', icon: '🌻', primary: true },
      ],
    });
    assert.match(html, /cww-place-text/);
    assert.match(html, /Trädgården/);
    assert.match(html, /data-cww-action="bed"/);
    assert.match(html, /Blomsterbädd/);
  });

  it('immersive mode floats chrome over scene', () => {
    const wf = loadWayfinder();
    const html = wf.render({
      placeId: 'morgonhus',
      placeLabel: 'Morgonhuset',
      placeIcon: '🏠',
      immersive: true,
    });
    assert.match(html, /cww-chrome--immersive/);
    assert.match(html, /cww-place-pill/);
    assert.doesNotMatch(html, /data-cww-action="back"/);
  });

  it('CSS enforces 44pt action targets', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-world-wayfinder.css'), 'utf8');
    assert.match(css, /cww-action[\s\S]*min-height:\s*52px/);
    assert.match(css, /cww-back[\s\S]*min-height:\s*44px/);
  });

  it('CSS allows primary scene tap zones inside shell', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-world-wayfinder.css'), 'utf8');
    assert.match(css, /gd-hotspot--bed/);
    assert.match(css, /mh-hotspot--door/);
    assert.match(css, /pointer-events:\s*auto/);
  });
});
