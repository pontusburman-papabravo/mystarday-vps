'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('R4.3 contracts', () => {
  it('child-login does not merge stale known_children when picker has session', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
    const block = src.slice(src.indexOf('if (parentChildren && parentChildren.length > 0)'), src.indexOf('lastMergedChildren = merged'));
    assert.match(block, /if \(!hasSession\)/);
    assert.match(block, /never add stale local-only profiles/);
  });

  it('child-dashboard load-day discards stale responses', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-load-day.js'), 'utf8');
    assert.match(src, /ChildSessionContext/);
    assert.match(src, /discardIfStale/);
  });

  it('auth switchChild invalidates child session context', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    const fn = src.slice(src.indexOf('async switchChildMember'), src.indexOf('_redirectAfterLogoutClear'));
    assert.match(fn, /ChildSessionContext\.invalidate/);
  });
});
