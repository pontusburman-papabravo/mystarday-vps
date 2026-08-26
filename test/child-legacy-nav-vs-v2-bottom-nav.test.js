'use strict';

/**
 * Regression test: the "classic view: show legacy tabs" !important rule in
 * child-bottom-nav.css force-showed #childLayerNav (legacy top tabs)
 * whenever body did not have .child-magic-view — with no exception for
 * .child-worlds-v2 / .child-has-bottom-nav. Since barnmeny v2's
 * #childBottomNav is shown via those same body classes (and V2_ENABLED is
 * always true today), any non-magic ("classic") child saw BOTH the legacy
 * top nav and the v2 bottom nav at once: the CSS !important rule beat
 * applyChildViewChrome()'s JS .hidden + aria-hidden="true" on #childLayerNav.
 *
 * See public/css/child-bottom-nav.css, public/js/child-dashboard.js
 * (applyChildViewChrome), public/js/child-worlds-nav.js (applyV2Chrome).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('child-bottom-nav.css — legacy top nav must not fight the v2 bottom nav', () => {
  const css = read('public/css/child-bottom-nav.css');

  it('legacy force-show rule excludes child-worlds-v2 and child-has-bottom-nav', () => {
    assert.match(
      css,
      /body:not\(\.child-magic-view\):not\(\.child-worlds-v2\):not\(\.child-has-bottom-nav\) #childLayerNav\s*\{/
    );
    assert.match(
      css,
      /body:not\(\.child-magic-view\):not\(\.child-worlds-v2\):not\(\.child-has-bottom-nav\) #childLayerNav\[aria-hidden="true"\]\s*\{/
    );
  });

  it('does not regress to the unscoped legacy force-show rule (would double-show nav under v2)', () => {
    assert.doesNotMatch(css, /body:not\(\.child-magic-view\) #childLayerNav\s*\{/);
    assert.doesNotMatch(css, /body:not\(\.child-magic-view\) #childLayerNav\[aria-hidden="true"\]\s*\{/);
  });

  it('v2 bottom nav is shown via the same child-worlds-v2 / child-has-bottom-nav classes the legacy rule now excludes', () => {
    assert.match(css, /body\.child-worlds-v2 \.child-bottom-nav,\s*\n\s*body\.child-has-bottom-nav \.child-bottom-nav\s*\{\s*\n\s*display:\s*flex;/);
  });
});
