'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('child-tab-profiler — measure-only instrumentation', () => {
  it('exists and is gated by localStorage', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-tab-profiler.js'), 'utf8');
    assert.match(src, /child_tab_profile/);
    assert.match(src, /wrapAuthApi/);
    assert.match(src, /full_page_navigation/);
    assert.match(src, /FULL PAGE RELOAD/);
  });

  it('is loaded from child-dashboard.html after auth', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    const authIdx = html.indexOf('auth.js');
    const profIdx = html.indexOf('child-tab-profiler.js');
    assert.ok(authIdx > 0);
    assert.ok(profIdx > authIdx);
  });
});
