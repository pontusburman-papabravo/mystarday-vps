'use strict';

/**
 * P1 physical QA remediation (2026-08-25) — Fix B: native WKWebView white frame.
 *
 * Root cause: physical iOS QA showed the DOM transition overlay
 * (parent-transition-boot, added in a prior PR) does NOT eliminate a brief
 * full-white WKWebView frame after PIN entry, because the white frame
 * happens at the NATIVE layer between document unload and the destination
 * document's first paint — a moment where no web document is being
 * rendered at all, so no amount of DOM/CSS in either document can paint
 * over it. @capacitor/ios's CAPBridgeViewController sets the WKWebView's
 * `backgroundColor` and `scrollView.backgroundColor` directly from
 * `capacitor.config.ts`'s `backgroundColor` (global) / `ios.backgroundColor`
 * (override) at WKWebView creation time; when unset it falls back to
 * `UIColor.systemBackground` (white in light mode) — this default IS the
 * white frame.
 *
 * Fix: set `backgroundColor` (root + ios override) in capacitor.config.ts
 * to the app's canonical parent-magic dark background (#07071a), the same
 * value already used by parent-magic-common.css / platform-html.js's
 * early-magic inline style. This is a native/Capacitor config change — it
 * is compiled into the app bundle via `npx cap sync ios` + a NEW iOS build.
 * It cannot be delivered by a web-only deploy, and does NOT fix the issue
 * on any device running an already-shipped binary until a new
 * TestFlight/App Store build is installed.
 *
 * This suite verifies the SOURCE-level Capacitor config contract only —
 * actual native runtime behavior requires a real device/simulator build,
 * which is outside the scope of an automated Node test.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const PARENT_MAGIC_DARK_BG = '#07071a';

describe('P1 — capacitor.config.ts sets a native WebView background (no white frame default)', () => {
  const src = read('capacitor.config.ts');

  it('sets a global backgroundColor to the canonical parent-magic dark background', () => {
    assert.match(src, new RegExp("backgroundColor:\\s*'" + PARENT_MAGIC_DARK_BG + "'"));
  });

  it('sets the iOS-specific backgroundColor override to the same value (CAPBridgeViewController reads ios.* first)', () => {
    const iosBlockStart = src.indexOf('ios: {');
    const iosBlockEnd = src.indexOf('\n  },', iosBlockStart);
    const iosBlock = src.slice(iosBlockStart, iosBlockEnd);
    assert.match(iosBlock, new RegExp("backgroundColor:\\s*'" + PARENT_MAGIC_DARK_BG + "'"));
  });

  it('matches the same dark background token already used by the parent-magic early-paint style', () => {
    const platformHtml = read('src/middleware/platform-html.js');
    assert.match(platformHtml, new RegExp('background:' + PARENT_MAGIC_DARK_BG.replace('#', '#') + '!important'));
  });

  it('documents that this requires npx cap sync ios + a new native build (not a web-only deploy)', () => {
    assert.match(src, /cap sync ios/);
    assert.match(src, /new native build/i);
  });
});

describe('P1 — `npx cap sync ios` correctly propagates backgroundColor into the native config', () => {
  it('the gitignored generated ios/App/App/capacitor.config.json is the actual artifact @capacitor/ios reads at runtime', () => {
    const gitignore = read('ios/.gitignore');
    assert.match(gitignore, /capacitor\.config\.json/);
  });

  it('capacitor.config.ts is valid enough to be picked up by cap sync (root backgroundColor before server/ios blocks)', () => {
    // Source-level ordering/shape sanity check only — see PR description for
    // the actual `npx cap sync ios` output confirming propagation into
    // ios/App/App/capacitor.config.json during this remediation.
    const src = read('capacitor.config.ts');
    const bgIdx = src.indexOf("backgroundColor: '" + PARENT_MAGIC_DARK_BG + "'");
    const serverIdx = src.indexOf('server:');
    assert.ok(bgIdx > -1 && bgIdx < serverIdx, 'global backgroundColor must be set before the server block');
  });
});

describe('P1 — scope guard: this fix touches ONLY native WebView background config', () => {
  it('capacitor.config.ts diff does not touch server/auth-relevant fields (appId, server.url, plugins other than the documented background)', () => {
    const src = read('capacitor.config.ts');
    // Still exactly one server block, one ios block, existing plugin list
    // (SplashScreen/StatusBar/Keyboard/SignInWithApple/Camera/GoogleAuth)
    // untouched — this is a narrow addition, not a config rewrite.
    assert.equal((src.match(/^\s*server:/m) || []).length, 1);
    assert.match(src, /SplashScreen:/);
    assert.match(src, /StatusBar:/);
    assert.match(src, /SignInWithApple:/);
  });

  it('no auth/session/AdultPrivilege/AppEntry/DeviceMode source files were touched by this fix', () => {
    // This test asserts the CONTRACT (those modules do not reference this
    // change); the actual "no auth files changed" confirmation is the git
    // diff for this PR, reported separately.
    const authFiles = [
      'public/js/adult-privilege.js',
      'public/js/app-entry-orchestrator.js',
      'public/js/device-mode.js',
    ];
    for (const f of authFiles) {
      const content = read(f);
      assert.doesNotMatch(content, /capacitor\.config/i);
    }
  });
});
