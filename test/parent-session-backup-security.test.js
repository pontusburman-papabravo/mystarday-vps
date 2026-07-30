'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('stjarndag_parent_session stores base64 JSON with tokens (documented risk)', () => {
  const auth = fs.readFileSync(path.join(ROOT, 'src/middleware/auth.js'), 'utf8');
  assert.match(auth, /stjarndag_parent_session/);
  assert.match(auth, /Buffer\.from\(saved, 'base64'\)/);
  assert.match(auth, /access_token/);
  const childLogin = fs.readFileSync(path.join(ROOT, 'src/routes/auth/child-login.js'), 'utf8');
  assert.match(childLogin, /stjarndag_parent_session/);
});

test('logout clears stjarndag_parent_session cookie', () => {
  const login = fs.readFileSync(path.join(ROOT, 'src/routes/auth/login.js'), 'utf8');
  assert.match(login, /clearCookie\('stjarndag_parent_session'/);
});
