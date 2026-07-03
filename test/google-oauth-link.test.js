'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const parentDbPath = path.join(__dirname, '../db/parent.js');
const googleAuthPath = path.join(__dirname, '../src/lib/google-auth.js');
const createOAuthPath = path.join(__dirname, '../src/lib/create-oauth-parent.js');
const oauthGooglePath = path.join(__dirname, '../src/routes/auth/oauth-google.js');

let mockLinkArgs = null;

beforeEach(() => {
  mockLinkArgs = null;

  require.cache[parentDbPath] = {
    id: parentDbPath,
    filename: parentDbPath,
    loaded: true,
    exports: {
      getParentByGoogleUserId: async () => null,
      linkGoogleUserId: async (parentId, googleUserId) => {
        mockLinkArgs = { parentId, googleUserId };
      },
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[googleAuthPath] = {
    id: googleAuthPath,
    filename: googleAuthPath,
    loaded: true,
    exports: {
      verifyGoogleIdToken: async () => ({
        email: 'linked@example.com',
        email_verified: true,
        sub: 'google-sub-link',
      }),
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[createOAuthPath] = {
    id: createOAuthPath,
    filename: createOAuthPath,
    loaded: true,
    exports: { createParentFromOAuth: async () => ({}) },
    children: [],
    parent: null,
    paths: [],
  };

  const sessionPath = require.resolve('../src/routes/auth/session');
  require.cache[sessionPath] = {
    id: sessionPath,
    filename: sessionPath,
    loaded: true,
    exports: { completeLogin: () => {} },
    children: [],
    parent: null,
    paths: [],
  };

  const rateLimiterPath = require.resolve('../src/middleware/rateLimiter');
  require.cache[rateLimiterPath] = {
    id: rateLimiterPath,
    filename: rateLimiterPath,
    loaded: true,
    exports: {
      appleLoginLimiter: (_req, _res, next) => next(),
    },
    children: [],
    parent: null,
    paths: [],
  };

  delete require.cache[oauthGooglePath];
});

afterEach(() => {
  delete require.cache[oauthGooglePath];
  delete require.cache[parentDbPath];
  delete require.cache[googleAuthPath];
  delete require.cache[createOAuthPath];
  delete require.cache[require.resolve('../src/routes/auth/session')];
  delete require.cache[require.resolve('../src/middleware/rateLimiter')];
});

function getGoogleLinkHandler() {
  const router = require(oauthGooglePath);
  const layer = router.stack.find((l) => l.route && l.route.path === '/google/link');
  assert.ok(layer, 'google/link route missing');
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
}

test('POST /google/link links Google ID to logged-in parent', async () => {
  const handler = getGoogleLinkHandler();
  const req = {
    body: { idToken: 'valid-token' },
    user: { id: 'parent-1', type: 'parent' },
    ip: '127.0.0.1',
  };
  let body = null;
  const res = {
    status() { return this; },
    json(payload) { body = payload; },
  };

  await handler(req, res);
  assert.deepEqual(mockLinkArgs, { parentId: 'parent-1', googleUserId: 'google-sub-link' });
  assert.equal(body.message, 'Google-konto länkat!');
});

test('POST /google/link requires parent session', async () => {
  const handler = getGoogleLinkHandler();
  const req = { body: { idToken: 'valid-token' }, ip: '127.0.0.1' };
  let statusCode = 200;
  const res = {
    status(code) { statusCode = code; return this; },
    json() {},
  };

  await handler(req, res);
  assert.equal(statusCode, 401);
});
