'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');

const parentDbPath = path.join(__dirname, '../db/parent.js');
const googleAuthPath = path.join(__dirname, '../src/lib/google-auth.js');
const createOAuthPath = path.join(__dirname, '../src/lib/create-oauth-parent.js');
const oauthGooglePath = path.join(__dirname, '../src/routes/auth/oauth-google.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

let mockParentByEmail = null;
let mockParentByGoogle = null;
let mockCreateParent = null;
let mockCompleteLoginArgs = null;

async function setMarketFlag(db, key, enabled) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'oauth-registration-market test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

beforeEach(() => {
  mockParentByEmail = null;
  mockParentByGoogle = null;
  mockCreateParent = null;
  mockCompleteLoginArgs = null;

  require.cache[parentDbPath] = {
    id: parentDbPath,
    filename: parentDbPath,
    loaded: true,
    exports: {
      getParentByEmail: async () => mockParentByEmail,
      getParentByGoogleUserId: async () => mockParentByGoogle,
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

test('New Google OAuth without country_code rejected (fail closed)', async () => {
  const handler = getGoogleHandler();
  const req = {
    body: { idToken: 'valid-token' },
    ip: '127.0.0.1',
    headers: {},
  };
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

test('IE Google new signup blocked while market_ie_open=false', async () => {
  const db = await setupTestDb();
  if (db.skip) return;
  await setMarketFlag(db, 'market_ie_open', false);

  const handler = getGoogleHandler();
  const req = {
    body: {
      idToken: 'valid-token',
      country_code: 'IE',
      preferred_locale: 'en-GB',
    },
    ip: '127.0.0.1',
    headers: {},
  };
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; },
  };

  await handler(req, res);
  assert.equal(statusCode, 403);
  assert.equal(body.code, 'MARKET_IE_CLOSED');
  assert.equal(mockCreateParent, null);
  await db.cleanup();
});

test('IE Google new signup passes market context when gate enabled in test', async () => {
  const db = await setupTestDb();
  if (db.skip) return;
  await setMarketFlag(db, 'market_ie_open', true);

  const handler = getGoogleHandler();
  const req = {
    body: {
      idToken: 'valid-token',
      country_code: 'IE',
      preferred_locale: 'en-GB',
    },
    ip: '127.0.0.1',
    headers: {},
  };
  let statusCode = 200;
  const res = {
    status(code) { statusCode = code; return this; },
    json() {},
  };

  await handler(req, res);
  assert.equal(statusCode, 200);
  assert.ok(mockCreateParent);
  assert.equal(mockCreateParent.countryCode, 'IE');
  assert.equal(mockCreateParent.familyLocale, 'en-GB');
  assert.equal(mockCreateParent.timezone, 'Europe/Dublin');
  await setMarketFlag(db, 'market_ie_open', false);
  await db.cleanup();
});

test('existing Google parent login unaffected by IE gate', async () => {
  mockParentByGoogle = {
    id: 'existing-google',
    family_id: 'fam-1',
    email: 'existing@example.com',
    onboarding_completed: true,
  };

  const handler = getGoogleHandler();
  const req = {
    body: { idToken: 'valid-token', country_code: 'IE' },
    ip: '127.0.0.1',
    headers: {},
  };
  const res = {
    status() { return this; },
    json(payload) {
      assert.equal(payload.user.id, 'existing-google');
    },
  };

  await handler(req, res);
  assert.equal(mockCreateParent, null);
  assert.equal(mockCompleteLoginArgs.parent.id, 'existing-google');
});

const appleAuthPath = path.join(__dirname, '../src/lib/apple-auth.js');
const oauthApplePath = path.join(__dirname, '../src/routes/auth/oauth-apple.js');

let mockParentByApple = null;

function setupAppleMocks() {
  require.cache[appleAuthPath] = {
    id: appleAuthPath,
    filename: appleAuthPath,
    loaded: true,
    exports: {
      verifyAppleIdToken: async () => ({
        sub: 'apple-sub-ie-1',
        email: 'new-apple@example.com',
      }),
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[parentDbPath].exports.getParentByAppleUserId = async () => mockParentByApple;
  delete require.cache[oauthApplePath];
}

function getAppleHandler() {
  const router = require(oauthApplePath);
  const layer = router.stack.find((l) => l.route && l.route.path === '/apple');
  assert.ok(layer, 'apple route missing');
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
}

test('New Apple OAuth without country_code rejected (fail closed)', async () => {
  setupAppleMocks();
  mockParentByApple = null;

  const handler = getAppleHandler();
  const req = {
    body: { idToken: 'valid-token' },
    ip: '127.0.0.1',
    headers: {},
  };
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

test('IE Apple new signup blocked while market_ie_open=false', async () => {
  setupAppleMocks();
  mockParentByApple = null;

  const db = await setupTestDb();
  if (db.skip) return;
  await setMarketFlag(db, 'market_ie_open', false);

  const handler = getAppleHandler();
  const req = {
    body: {
      idToken: 'valid-token',
      country_code: 'IE',
      preferred_locale: 'en-GB',
    },
    ip: '127.0.0.1',
    headers: {},
  };
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; },
  };

  await handler(req, res);
  assert.equal(statusCode, 403);
  assert.equal(body.code, 'MARKET_IE_CLOSED');
  assert.equal(mockCreateParent, null);
  await db.cleanup();
});

test('IE Apple new signup passes market context when gate enabled in test', async () => {
  setupAppleMocks();
  mockParentByApple = null;

  const db = await setupTestDb();
  if (db.skip) return;
  await setMarketFlag(db, 'market_ie_open', true);

  const handler = getAppleHandler();
  const req = {
    body: {
      idToken: 'valid-token',
      country_code: 'IE',
      preferred_locale: 'en-GB',
      firstName: 'Aoife',
      lastName: 'Murphy',
    },
    ip: '127.0.0.1',
    headers: {},
  };
  let statusCode = 200;
  const res = {
    status(code) { statusCode = code; return this; },
    json() {},
  };

  await handler(req, res);
  assert.equal(statusCode, 200);
  assert.ok(mockCreateParent);
  assert.equal(mockCreateParent.countryCode, 'IE');
  assert.equal(mockCreateParent.familyLocale, 'en-GB');
  assert.equal(mockCreateParent.timezone, 'Europe/Dublin');
  await setMarketFlag(db, 'market_ie_open', false);
  await db.cleanup();
});

test('existing Apple parent login unaffected by IE gate', async () => {
  setupAppleMocks();
  mockParentByApple = {
    id: 'existing-apple',
    family_id: 'fam-apple',
    email: 'existing-apple@example.com',
    onboarding_completed: true,
  };

  const handler = getAppleHandler();
  const req = {
    body: { idToken: 'valid-token', country_code: 'IE' },
    ip: '127.0.0.1',
    headers: {},
  };
  const res = {
    status() { return this; },
    json(payload) {
      assert.equal(payload.user.id, 'existing-apple');
    },
  };

  await handler(req, res);
  assert.equal(mockCreateParent, null);
  assert.equal(mockCompleteLoginArgs.parent.id, 'existing-apple');
});

test('IE OAuth family is not Swedish-grandfathered before payment_start_at', async () => {
  const db = await setupTestDb();
  if (db.skip) return;

  await setMarketFlag(db, 'market_ie_open', true);
  const appSettings = require('../db/app-settings');
  await appSettings.upsertSetting('payment_start_at', '2026-10-01T00:00:00+02:00');

  for (const mod of [
    '../src/lib/db',
    '../db/app-settings',
    '../src/lib/payment-settings',
    '../src/lib/family-entitlements',
    '../src/lib/create-oauth-parent',
  ]) {
    delete require.cache[require.resolve(mod)];
  }

  const { createParentFromOAuth } = require('../src/lib/create-oauth-parent');
  const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');

  const email = `ie-oauth-${Date.now()}@example.com`;
  const parent = await createParentFromOAuth({
    displayName: 'IE OAuth Parent',
    email,
    googleUserId: `google-ie-${Date.now()}`,
    familyLocale: 'en-GB',
    countryCode: 'IE',
    marketRegion: 'EU',
    timezone: 'Europe/Dublin',
    localeSelectionSource: 'registration',
    englishBetaOfferState: 'registration_decided',
    countrySelectionSource: 'registration',
  });

  const { premium, requires_paywall } = await resolveFamilyEntitlements(parent.family_id);
  assert.equal(premium.active, false);
  assert.equal(premium.is_grandfathered, false);
  assert.equal(requires_paywall, true);

  const fam = await db.query(
    'SELECT country_code, preferred_locale, timezone FROM family WHERE id = $1',
    [parent.family_id]
  );
  assert.equal(fam.rows[0].country_code, 'IE');
  assert.equal(fam.rows[0].preferred_locale, 'en-GB');
  assert.equal(fam.rows[0].timezone, 'Europe/Dublin');

  await setMarketFlag(db, 'market_ie_open', false);
  await db.cleanup();
});
