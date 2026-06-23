'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const WEB_CLIENT = 'web-client-id.apps.googleusercontent.com';
const ANDROID_CLIENT = 'android-client-id.apps.googleusercontent.com';

let verifyIdTokenImpl = async () => ({
  getPayload: () => ({
    email: 'google-user@example.com',
    email_verified: true,
    aud: WEB_CLIENT,
  }),
});

const googleAuthLibPath = require.resolve('google-auth-library');
require.cache[googleAuthLibPath] = {
  id: googleAuthLibPath,
  filename: googleAuthLibPath,
  loaded: true,
  exports: {
    OAuth2Client: class OAuth2Client {
      verifyIdToken(opts) {
        return verifyIdTokenImpl(opts);
      }
    },
  },
  children: [],
  parent: null,
  paths: [],
};

const verifyPath = require.resolve(path.join(__dirname, '../src/lib/google-auth'));
delete require.cache[verifyPath];

function loadVerifier() {
  delete require.cache[verifyPath];
  return require(verifyPath);
}

beforeEach(() => {
  process.env.GOOGLE_WEB_CLIENT_ID = WEB_CLIENT;
  process.env.GOOGLE_ANDROID_CLIENT_ID = ANDROID_CLIENT;
  delete process.env.GOOGLE_IOS_CLIENT_ID;
  verifyIdTokenImpl = async (opts) => {
    const aud = opts.audience;
    assert.ok(Array.isArray(aud));
    assert.ok(aud.includes(WEB_CLIENT));
    assert.ok(aud.includes(ANDROID_CLIENT));
    return {
      getPayload: () => ({
        email: 'google-user@example.com',
        email_verified: true,
        aud: opts.idToken === 'android-token' ? ANDROID_CLIENT : WEB_CLIENT,
      }),
    };
  };
});

afterEach(() => {
  delete process.env.GOOGLE_WEB_CLIENT_ID;
  delete process.env.GOOGLE_ANDROID_CLIENT_ID;
});

test('verifyGoogleIdToken rejects wrong audience', async () => {
  verifyIdTokenImpl = async () => {
    const err = new Error('Wrong audience');
    err.name = 'Error';
    throw err;
  };
  const { verifyGoogleIdToken } = loadVerifier();
  await assert.rejects(
    () => verifyGoogleIdToken('bad-token'),
    /Wrong audience/
  );
});

test('verifyGoogleIdToken accepts web client audience', async () => {
  const { verifyGoogleIdToken } = loadVerifier();
  const payload = await verifyGoogleIdToken('web-token');
  assert.equal(payload.email, 'google-user@example.com');
  assert.equal(payload.aud, WEB_CLIENT);
});

test('verifyGoogleIdToken accepts native/android client audience', async () => {
  const { verifyGoogleIdToken } = loadVerifier();
  const payload = await verifyGoogleIdToken('android-token');
  assert.equal(payload.aud, ANDROID_CLIENT);
});

test('verifyGoogleIdToken fails when no client IDs configured', async () => {
  delete process.env.GOOGLE_WEB_CLIENT_ID;
  delete process.env.GOOGLE_ANDROID_CLIENT_ID;
  const { verifyGoogleIdToken } = loadVerifier();
  await assert.rejects(
    () => verifyGoogleIdToken('any-token'),
    /No Google client IDs configured/
  );
});
