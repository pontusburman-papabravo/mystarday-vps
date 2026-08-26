'use strict';

/**
 * Regression test: the ChildTodayFocus ALL_DONE celebration overlay
 * (.ctf-celebration-overlay, child-today-focus.js showCelebrationOverlay)
 * used a translucent backdrop (rgba(27,35,64,0.45)) that let the
 * always-on Idag focus bar behind it — which already renders its own
 * "all done" copy (day narrative, star progress trail, "Bra jobbat!"
 * headline, "Alla klara idag!" next-step label) — stay fully legible
 * while the one-time celebration frame played on top. Visually this
 * looked like two celebrations firing for the same completion event.
 *
 * The backdrop must be near-opaque (matching the adult-pin-gate-ui.js
 * overlay precedent) so the celebration owns the screen for its short,
 * skippable duration before revealing the calm status underneath.
 *
 * See public/css/child-today-focus.css, public/js/child-today-focus.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('child-today-focus.css — ALL_DONE celebration overlay backdrop must obscure the status bar behind it', () => {
  const css = read('public/css/child-today-focus.css');
  const blockMatch = /\.ctf-celebration-overlay\s*\{([^}]*)\}/.exec(css);

  it('celebration overlay rule exists', () => {
    assert.ok(blockMatch, '.ctf-celebration-overlay rule not found');
  });

  it('backdrop alpha is near-opaque (>= 0.85), not translucent', () => {
    const block = blockMatch[1];
    const bgMatch = /background:\s*rgba\(\s*27,\s*35,\s*64,\s*([0-9.]+)\s*\)/.exec(block);
    assert.ok(bgMatch, 'expected an rgba(27,35,64,<alpha>) background declaration');
    const alpha = parseFloat(bgMatch[1]);
    assert.ok(
      alpha >= 0.85,
      `celebration overlay backdrop alpha ${alpha} is too translucent — status bar behind it stays legible, producing a double-celebration look`
    );
  });

  it('backdrop-filter blur is applied for extra separation from the content behind it', () => {
    const block = blockMatch[1];
    assert.match(block, /backdrop-filter:\s*blur\(/);
    assert.match(block, /-webkit-backdrop-filter:\s*blur\(/);
  });
});
