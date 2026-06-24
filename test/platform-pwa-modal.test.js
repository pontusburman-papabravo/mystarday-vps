'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('PWA mobile shell', () => {
  const themeSrc = fs.readFileSync(
    path.join(__dirname, '../public/js/platform-theme.js'),
    'utf8'
  );
  const shellCss = fs.readFileSync(
    path.join(__dirname, '../public/css/platform-shell.css'),
    'utf8'
  );
  const injectSrc = fs.readFileSync(
    path.join(__dirname, '../src/middleware/platform-html.js'),
    'utf8'
  );

  it('platform-theme detects PWA and applies mobile-shell class', () => {
    assert.match(themeSrc, /function detectPWA\(/);
    assert.match(themeSrc, /platform-pwa/);
    assert.match(themeSrc, /platform-mobile-shell/);
    assert.match(themeSrc, /isPWA = !isNative && detectPWA\(\)/);
  });

  it('viewport zoom lock applies to PWA and native', () => {
    assert.match(themeSrc, /if \(isMobileShell\) \{\s*patchViewportNoZoom\(\)/);
  });

  it('platform-shell.css constrains modals on mobile', () => {
    assert.match(shellCss, /max-height: min\(/);
    assert.match(shellCss, /platform-mobile-shell/);
    assert.match(shellCss, /touch-action: manipulation/);
  });

  it('platform-html injects platform-shell.css', () => {
    assert.match(injectSrc, /platform-shell\.css/);
  });
});
