'use strict';

/**
 * P1 UI polish (2026-08-25) — Test A: profile-switch transition/loading state.
 *
 * Root cause: after a server-verified child->adult profile-switch commit,
 * there was no visible "in progress" state between the picker's
 * window.location.replace() and the destination page's first real render —
 * WKWebView showed a brief white flash, then a near-empty dark shell, then
 * finally the dashboard. Auth/session/commit logic was never the problem
 * (confirmed by telemetry) — this is a pure loading-state gap.
 *
 * Fix: platform-html.js injects a tiny, synchronous, read-only script into
 * every parent-magic page that checks the SAME sessionStorage marker
 * app-entry-orchestrator.js already writes (stjarndag_explicit_parent_resume_v1).
 * When verified + not expired + not already shown for this exact commit, it
 * adds html.parent-transition-boot, which paints a full-screen dark overlay
 * (spinner + "Öppnar föräldraläge…") via CSS ::before/::after — never a
 * setTimeout, never a new navigation, never touching auth/session state.
 * The overlay is cleared by dashboard-home-hub.js render() (precise) or the
 * browser's native `load` event (generic fallback) — never a fake delay.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  buildTransitionBootCss,
  buildTransitionBootScript,
  buildEarlyMagicScriptTag,
} = require('../src/middleware/platform-html');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function makeSessionStorage(initial) {
  const store = Object.assign({}, initial);
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _dump: () => store,
  };
}

function runBootScript({ sessionStorage, loaded } = {}) {
  const classes = new Set();
  const listeners = {};
  const sandbox = {
    console,
    Date,
    JSON,
    String,
    sessionStorage: sessionStorage || makeSessionStorage(),
    document: {
      documentElement: {
        classList: {
          add: (c) => classes.add(c),
          remove: (c) => classes.delete(c),
          contains: (c) => classes.has(c),
        },
      },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  sandbox.window.addEventListener = (evt, fn) => {
    listeners[evt] = listeners[evt] || [];
    listeners[evt].push(fn);
  };
  vm.runInContext(buildTransitionBootScript(), sandbox, { filename: 'transition-boot.js' });
  if (loaded) {
    (listeners.load || []).forEach((fn) => fn());
  }
  return {
    classes,
    listeners,
    clear: sandbox.window.__stjarndagClearParentTransitionBoot,
  };
}

describe('P1 — transition-boot script (read-only marker check)', () => {
  it('shows the overlay for a fresh verified, unexpired, unconsumed marker', () => {
    const marker = { status: 'verified', at: 1000, expiresAt: Date.now() + 60000, path: '/dashboard' };
    const ss = makeSessionStorage({ stjarndag_explicit_parent_resume_v1: JSON.stringify(marker) });
    const { classes } = runBootScript({ sessionStorage: ss });
    assert.equal(classes.has('parent-transition-boot'), true);
    assert.equal(ss.getItem('stjarndag_parent_transition_boot_shown_v1'), '1000');
  });

  it('does NOT show again on a later page load for the same commit (already shown)', () => {
    const marker = { status: 'verified', at: 1000, expiresAt: Date.now() + 60000, path: '/dashboard' };
    const ss = makeSessionStorage({
      stjarndag_explicit_parent_resume_v1: JSON.stringify(marker),
      stjarndag_parent_transition_boot_shown_v1: '1000',
    });
    const { classes } = runBootScript({ sessionStorage: ss });
    assert.equal(classes.has('parent-transition-boot'), false);
  });

  it('shows again for a NEW commit even if a previous one was already shown', () => {
    const marker = { status: 'verified', at: 2000, expiresAt: Date.now() + 60000, path: '/dashboard' };
    const ss = makeSessionStorage({
      stjarndag_explicit_parent_resume_v1: JSON.stringify(marker),
      stjarndag_parent_transition_boot_shown_v1: '1000',
    });
    const { classes } = runBootScript({ sessionStorage: ss });
    assert.equal(classes.has('parent-transition-boot'), true);
  });

  it('does not show when marker status is "pending" (not yet verified)', () => {
    const marker = { status: 'pending', at: 1000, expiresAt: Date.now() + 60000, path: '/dashboard' };
    const ss = makeSessionStorage({ stjarndag_explicit_parent_resume_v1: JSON.stringify(marker) });
    const { classes } = runBootScript({ sessionStorage: ss });
    assert.equal(classes.has('parent-transition-boot'), false);
  });

  it('does not show when the marker has expired (fail-closed, unchanged)', () => {
    const marker = { status: 'verified', at: 1000, expiresAt: Date.now() - 1000, path: '/dashboard' };
    const ss = makeSessionStorage({ stjarndag_explicit_parent_resume_v1: JSON.stringify(marker) });
    const { classes } = runBootScript({ sessionStorage: ss });
    assert.equal(classes.has('parent-transition-boot'), false);
  });

  it('does nothing when there is no marker at all (ordinary page load)', () => {
    const { classes } = runBootScript({ sessionStorage: makeSessionStorage() });
    assert.equal(classes.has('parent-transition-boot'), false);
  });

  it('does nothing when the marker JSON is malformed (never throws)', () => {
    const ss = makeSessionStorage({ stjarndag_explicit_parent_resume_v1: '{not json' });
    assert.doesNotThrow(() => runBootScript({ sessionStorage: ss }));
  });

  it('clears the class exactly once via the exposed clear function', () => {
    const marker = { status: 'verified', at: 1000, expiresAt: Date.now() + 60000, path: '/dashboard' };
    const ss = makeSessionStorage({ stjarndag_explicit_parent_resume_v1: JSON.stringify(marker) });
    const { classes, clear } = runBootScript({ sessionStorage: ss });
    assert.equal(classes.has('parent-transition-boot'), true);
    clear();
    assert.equal(classes.has('parent-transition-boot'), false);
    clear(); // idempotent, no throw
    assert.equal(classes.has('parent-transition-boot'), false);
  });

  it('registers a native window "load" fallback (no setTimeout/fake delay) that clears the overlay', () => {
    const marker = { status: 'verified', at: 1000, expiresAt: Date.now() + 60000, path: '/dashboard' };
    const ss = makeSessionStorage({ stjarndag_explicit_parent_resume_v1: JSON.stringify(marker) });
    const { classes } = runBootScript({ sessionStorage: ss, loaded: true });
    assert.equal(classes.has('parent-transition-boot'), false, 'load event fallback must clear the overlay');
  });

  it('the injected script itself contains no setTimeout/setInterval (no fake delay)', () => {
    const script = buildTransitionBootScript();
    assert.doesNotMatch(script, /setTimeout|setInterval/);
  });
});

describe('P1 — transition-boot CSS never exposes native white background', () => {
  const css = buildTransitionBootCss();

  it('paints a full-screen, high z-index, brand-dark background', () => {
    assert.match(css, /html\.parent-transition-boot::before\{[^}]*position:fixed;inset:0/);
    assert.match(css, /html\.parent-transition-boot::before\{[^}]*background:#07071a/);
    assert.match(css, /z-index:999999/);
  });

  it('shows Swedish loading copy without needing a JS DOM write (works before <body>)', () => {
    assert.match(css, /content:"Öppnar föräldraläge…"/);
  });

  it('uses a CSS animation, not a timer, for the spinner', () => {
    assert.match(css, /@keyframes parentTransitionBootSpin/);
    assert.match(css, /animation:parentTransitionBootSpin/);
  });
});

describe('P1 — early magic script wiring includes the transition-boot pieces', () => {
  it('buildEarlyMagicScriptTag embeds both the CSS and the marker-check script', () => {
    const tag = buildEarlyMagicScriptTag();
    assert.match(tag, /parent-transition-boot::before/);
    assert.match(tag, /stjarndag_explicit_parent_resume_v1/);
    assert.match(tag, /__stjarndagClearParentTransitionBoot/);
  });

  it('is present on the served /dashboard HTML (parent-magic path)', () => {
    const { injectPlatformHtml } = require('../src/middleware/platform-html');
    const html = read('public/dashboard.html');
    const served = injectPlatformHtml(html, '/dashboard', {});
    assert.match(served, /parent-transition-boot/);
    assert.match(served, /stjarndag_explicit_parent_resume_v1/);
  });
});

describe('P1 — dashboard-home-hub.js clears the overlay on real render', () => {
  const src = read('public/js/dashboard-home-hub.js');

  it('render() calls the clear hook before/while showing real content', () => {
    const fnStart = src.indexOf('function render(stats');
    const fnBody = src.slice(fnStart, fnStart + 800);
    assert.match(fnBody, /__stjarndagClearParentTransitionBoot/);
  });

  it('the clear call happens unconditionally (both magic and legacy render branches)', () => {
    const fnStart = src.indexOf('function render(stats');
    const shouldUseIdx = src.indexOf('shouldUse()', fnStart);
    const clearIdx = src.indexOf('__stjarndagClearParentTransitionBoot', fnStart);
    assert.ok(clearIdx > -1 && clearIdx < shouldUseIdx, 'clear call must run before the shouldUse() branch split');
  });
});

describe('P1 — picker shows a branded overlay before navigating away (no extra navigation)', () => {
  const src = read('public/js/child-profile-picker.js');

  it('defines a self-contained, best-effort overlay helper', () => {
    assert.match(src, /function showParentTransitionBootOverlay/);
    assert.match(src, /Öppnar föräldraläge…/);
    assert.match(src, /background:#07071a/);
  });

  it('is called only AFTER commit succeeds, right before navigation — never on a rejected/discarded commit', () => {
    const fnStart = src.indexOf('function commitParentViewFromPicker');
    const fnEnd = src.indexOf('\n  }', src.indexOf('return true;', fnStart));
    const fnBody = src.slice(fnStart, fnEnd);

    const commitAppliedIdx = fnBody.indexOf("diag('commit:applied'");
    const overlayIdx = fnBody.indexOf('showParentTransitionBootOverlay()');
    const navigateIdx = fnBody.indexOf('window.location.replace(target)');
    const discardedIdxes = [...fnBody.matchAll(/discardPending\(/g)].map((m) => m.index);

    assert.ok(overlayIdx > -1, 'overlay must be invoked in commitParentViewFromPicker');
    assert.ok(overlayIdx > commitAppliedIdx, 'overlay must be shown only after commit:applied');
    assert.ok(overlayIdx < navigateIdx, 'overlay must be shown before navigating away');
    for (const idx of discardedIdxes) {
      assert.ok(idx < overlayIdx, 'every discardPending() early-return must happen before the overlay is ever shown');
    }
  });

  it('does not introduce any new navigation call', () => {
    const fnStart = src.indexOf('function commitParentViewFromPicker');
    const fnEnd = src.indexOf('\n  }', src.indexOf('return true;', fnStart));
    const fnBody = src.slice(fnStart, fnEnd);
    const navCalls = fnBody.match(/window\.location\.(replace|assign|href\s*=)/g) || [];
    assert.equal(navCalls.length, 1, 'exactly one navigation call, unchanged from before this fix');
  });

  it('never touches commitVerifiedParentResume, AdultPrivilege, cookies, or DeviceMode', () => {
    const overlayFnStart = src.indexOf('function showParentTransitionBootOverlay');
    const overlayFnEnd = src.indexOf('\n  }', overlayFnStart);
    const overlayFnBody = src.slice(overlayFnStart, overlayFnEnd);
    assert.doesNotMatch(overlayFnBody, /commitVerifiedParentResume|AdultPrivilege|DeviceMode|cookie/i);
  });
});
