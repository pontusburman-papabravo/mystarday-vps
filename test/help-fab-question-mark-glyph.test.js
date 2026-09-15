'use strict';

/**
 * P1 UI polish (2026-08-25) — Test C: red "?" above the orange feedback FAB.
 *
 * Root cause found by investigation: NOT a broken image, NOT the trofe/
 * premium icon, NOT a broken support/feedback widget, and NOT an asset-load
 * failure. It is the intentional contextual help button (dashboard.html
 * #helpBtn, help-bubble.js #hbBtn), which rendered the literal ❓ (U+2753)
 * emoji. iOS/WKWebView renders that codepoint in its own colorful (red)
 * emoji presentation regardless of any CSS `color` set on the button, so it
 * reads as a separate broken/red badge stacked above the orange feedback
 * FAB (feedback.js #globalFeedbackBtn, unrelated and unchanged).
 *
 * Fix: replace the ❓ emoji with a plain "?" text glyph (bold, sized) in
 * both places so the browser renders it with the button's actual `color`
 * (white on the navy circle) instead of the OS emoji palette. The help
 * button's function (opening the help panel) is unchanged.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P1 — dashboard #helpBtn no longer uses the ❓ emoji', () => {
  const html = read('public/dashboard.html');

  const btnStart = html.indexOf('<button id="helpBtn"');
  const closeIdx = html.indexOf('</button>', btnStart) + '</button>'.length;
  const btnBlock = html.slice(btnStart, closeIdx);
  const btnBlockNoComments = btnBlock.replace(/<!--[\s\S]*?-->/g, '');

  it('renders a plain "?" text glyph instead of the ❓ emoji (outside code comments)', () => {
    assert.doesNotMatch(btnBlockNoComments, /❓/);
    assert.match(btnBlock, />\s*\?\s*<\/button>/);
  });

  it('keeps the exact same click handler (function unchanged)', () => {
    assert.match(btnBlock, /onclick="toggleHelpPanel\(\)"/);
  });

  it('is styled bold so the plain "?" reads clearly on the navy circle', () => {
    assert.match(btnBlock, /font-bold/);
    assert.match(btnBlock, /text-white/);
  });
});

describe('P1 — settings help-bubble #hbBtn no longer uses the ❓ emoji', () => {
  const src = read('public/js/help-bubble.js');

  it('renders a plain "?" text glyph instead of the ❓ emoji', () => {
    const shellStart = src.indexOf('function buildShellHtml()');
    const shellBlock = src.slice(shellStart, shellStart + 600);
    assert.doesNotMatch(shellBlock, /❓/);
    assert.match(shellBlock, /'\?'/);
    assert.match(shellBlock, /id="hbBtn"/);
  });

  it('keeps the exact same click handler and localized accessibility labels', () => {
    const shellStart = src.indexOf('function buildShellHtml()');
    const shellBlock = src.slice(shellStart, shellStart + 600);
    assert.match(shellBlock, /onclick="window\.__hbToggle\(\)"/);
    assert.match(src, /ht\('chrome\.openAria'\)/);
    assert.match(src, /ht\('chrome\.closeAria'\)/);
  });

  it('sets font-weight so the plain "?" reads clearly against color:white', () => {
    const cssStart = src.indexOf('#hbBtn {');
    const cssBlock = src.slice(cssStart, src.indexOf('}', cssStart));
    assert.match(cssBlock, /color:\s*white/);
    assert.match(cssBlock, /font-weight:\s*700/);
  });
});

describe('P1 — orange feedback FAB is untouched (scope: visual glyph fix only)', () => {
  it('feedback.js still uses its own 💬 emoji and #F5A623 background, unchanged', () => {
    const src = read('public/js/feedback.js');
    assert.match(src, /innerHTML = '💬'/);
    assert.match(src, /#F5A623/);
  });
});
