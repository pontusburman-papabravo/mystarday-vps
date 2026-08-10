'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('AUTO_LOCK_MATRIX: client policy mirrors server durations', () => {
  const server = fs.readFileSync(path.join(ROOT, 'src/lib/adult-privilege-lease-policy.js'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege-lease-policy.js'), 'utf8');
  assert.match(server, /shared: 15 \* 60 \* 1000/);
  assert.match(client, /shared: 15 \* 60 \* 1000/);
  assert.match(client, /shouldAutoExpireOnBackground/);
});

test('lifecycle owns single expiry timer', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege-lifecycle.js'), 'utf8');
  assert.match(src, /let expiryTimer = null/);
  assert.match(src, /clearTimer/);
  assert.doesNotMatch(src, /setInterval/);
});

test('parent device background does not auto-expire via policy helper', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege-lease-policy.js'), 'utf8');
  assert.match(src, /deviceMode === 'parent'/);
});

test('adult pin UI meets touch and a11y minimums', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-pin-gate-ui.js'), 'utf8');
  assert.match(src, /min-height:52px/);
  assert.match(src, /min-height:44px/);
  assert.match(src, /aria-live/);
  assert.match(src, /aria-label/);
  assert.doesNotMatch(src, /localStorage.*pin/i);
});

test('expire route restores child session path', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/adult-privilege.js'), 'utf8');
  assert.match(src, /adult-privilege\/expire/);
  assert.match(src, /restoreChildSessionFromDevice/);
});

test('requireParent blocks expired escalated lease', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/middleware/auth.js'), 'utf8');
  assert.match(src, /ADULT_PRIVILEGE_EXPIRED/);
  assert.match(src, /isEscalatedParentExpired/);
});
