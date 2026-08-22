'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const parentDbPath = path.join(__dirname, '../db/parent.js');
const googleAuthPath = path.join(__dirname, '../src/lib/google-auth.js');
const createOAuthPath = path.join(__dirname, '../src/lib/create-oauth-parent.js');
const oauthGooglePath = path.join(__dirname, '../src/routes/auth/oauth-google.js');

let mockParentByEmail = null;
let mockCreateParent = null;
let mockCompleteLoginArgs = null;

beforeEach(() => {
  mockParentByEmail = null;
  mockCreateParent = null;
  mockCompleteLoginArgs = null;

  require.cache[parentDbPath] = {
    id: parentDbPath,
    filename: parentDbPath,
    loaded: true,
    exports: {
      getParentByEmail: async () => mockParentByEmail,
      getParentByGoogleUserId: async () => null,
      linkGoogleUserId: async () => ({}),
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
        email: 'new-google@example.com',
        email_verified: true,
        name: 'Google Ny',
        sub: 'google-sub-1',
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
    exports: {
      createParentFromOAuth: async (opts) => {
        mockCreateParent = opts;
        return {
          id: 'parent-new',
          family_id: 'family-new',
          email: opts.email,
          name: opts.displayName,
          onboarding_completed: false,
        };
      },
    },
    children: [],
    parent: null,
    paths: [],
  };

  const sessionPath = require.resolve('../src/routes/auth/session');
  require.cache[sessionPath] = {
    id: sessionPath,
    filename: sessionPath,
    loaded: true,
    exports: {
      completeLogin: (req, res, parent, userType, meta) => {
        mockCompleteLoginArgs = { parent, userType, meta };
        res.json({ user: { id: parent.id }, isNewAccount: !!(meta && meta.isNewAccount) });
      },
    },
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

function getGoogleHandler() {
  const router = require(oauthGooglePath);
  const layer = router.stack.find((l) => l.route && l.route.path === '/google');
  assert.ok(layer, 'google route missing');
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
}

test('POST /google rejects new signup without country_code', async () => {
  const handler = getGoogleHandler();
  const req = { body: { idToken: 'valid-token' }, ip: '127.0.0.1', headers: {} };
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; },
  };

  await handler(req, res);

  assert.equal(statusCode, 400);
  assert.equal(body.code, 'COUNTRY_REQUIRED');
  assert.equal(mockCreateParent, null);
});

test('POST /google creates parent when email is new with country_code', async () => {
  const handler = getGoogleHandler();
  const req = {
    body: { idToken: 'valid-token', country_code: 'SE', preferred_locale: 'sv-SE' },
    ip: '127.0.0.1',
    headers: {},
  };
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
    },
  };

  await handler(req, res);

  assert.equal(statusCode, 200);
  assert.ok(mockCreateParent);
  assert.equal(mockCreateParent.email, 'new-google@example.com');
  assert.equal(mockCreateParent.displayName, 'Google Ny');
  assert.equal(mockCompleteLoginArgs.meta.isNewAccount, true);
  assert.equal(body.isNewAccount, true);
});

test('POST /google logs in existing oauth-only parent', async () => {
  mockParentByEmail = {
    id: 'existing',
    family_id: 'fam-1',
    email: 'new-google@example.com',
    has_password: false,
    onboarding_completed: true,
  };

  const handler = getGoogleHandler();
  const req = { body: { idToken: 'valid-token' }, ip: '127.0.0.1' };
  const res = {
    status() { return this; },
    json(payload) {
      assert.equal(payload.user.id, 'existing');
    },
  };

  await handler(req, res);
  assert.equal(mockCreateParent, null);
  assert.equal(mockCompleteLoginArgs.parent.id, 'existing');
  assert.ok(!mockCompleteLoginArgs.meta || !mockCompleteLoginArgs.meta.isNewAccount);
});

test('POST /google returns 409 when email has password account', async () => {
  mockParentByEmail = {
    id: 'pw-user',
    email: 'new-google@example.com',
    has_password: true,
  };

  const handler = getGoogleHandler();
  const req = { body: { idToken: 'valid-token' }, ip: '127.0.0.1' };
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
    },
  };

  await handler(req, res);
  assert.equal(statusCode, 409);
  assert.equal(body.error, 'email_conflict');
});
