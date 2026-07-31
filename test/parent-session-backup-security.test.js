'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('parent handoff uses opaque cookie storage (not base64 JWT backup)', () => {
  const handoff = fs.readFileSync(path.join(ROOT, 'src/lib/parent-session-handoff.js'), 'utf8');
  assert.match(handoff, /randomBytes/);
  assert.match(handoff, /parent_session_handoff/);
  assert.doesNotMatch(handoff, /Buffer\.from\(.*base64.*access_token/);

  const childLogin = fs.readFileSync(path.join(ROOT, 'src/routes/auth/child-login.js'), 'utf8');
  assert.match(childLogin, /createHandoffFromParentCookies/);

  const cookies = fs.readFileSync(path.join(ROOT, 'src/lib/parent-session-cookies.js'), 'utf8');
  assert.match(cookies, /consumeHandoffAndActivateSession/);
});

test('logout clears parent handoff cookie', () => {
  const login = fs.readFileSync(path.join(ROOT, 'src/routes/auth/login.js'), 'utf8');
  assert.match(login, /clearHandoffCookie/);
});
