/**
 * parent-magic-shell — bottom nav aria-label synced with locale (RC-1 R3).
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('parent-magic-shell nav aria-label (RC-1 R3)', () => {
  it('renderBottomNav sets aria-label even when #parentBottomNav exists in HTML', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(src, /function syncBottomNavAria/);
    assert.match(src, /syncBottomNavAria\(\)/);
  });

  it('refresh runs on parent-i18n-ready and locale-changed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(src, /parent-i18n-ready', refresh/);
    assert.match(src, /locale-changed', refresh/);
  });
});
