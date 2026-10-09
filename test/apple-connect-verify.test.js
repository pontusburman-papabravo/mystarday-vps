'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { IOS_BUNDLE_ID } = require('../config/iap-product-contract');
const {
  APPS_URL,
  AUDIENCE,
  TOKEN_TTL_SEC,
  assertReadOnlyRequest,
  createAppStoreConnectToken,
  verifyAppStoreConnectAccess,
} = require('../src/lib/app-store-connect-read');
const { main } = require('../scripts/apple-connect-verify');

const ISSUER_ID = '57246542-96fe-1a63-e053-0824d011072a';
const SWEDISH_APP_NAME = ['Min', 'Stjärndag'].join(' ');
const ENGLISH_APP_NAME = ['My', 'Starday'].join(' ');
const KEY_ID = 'AB12CD34EF';

function generatePem() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
  };
}

function jsonResponse(status, body, extra) {
  return {
    status,
    ...extra,
    async text() {
      return body == null ? '' : JSON.stringify(body);
    },
  };
}

function appRow(name, bundleId, id) {
  return { type: 'apps', id, attributes: { name, bundleId } };
}

function credentials(pem, overrides = {}) {
  return {
    APP_STORE_CONNECT_API_PRIVATE_KEY: pem,
    APP_STORE_CONNECT_KEY_ID: KEY_ID,
    APP_STORE_CONNECT_ISSUER_ID: ISSUER_ID,
    APPLE_SIGN_IN_PRIVATE_KEY: 'sign-in-with-apple-key-must-not-be-used',
    APPLE_KEY_ID: 'SIGNINKEY1',
    APPLE_TEAM_ID: 'TEAMID1234',
    ...overrides,
  };
}

describe('App Store Connect JWT', () => {
  it('signs an ES256 token with key id, issuer id, and aud=appstoreconnect-v1', () => {
    const { privateKey, publicKey } = generatePem();
    const nowSec = 1_700_000_000;
    const token = createAppStoreConnectToken({
      privateKey,
      keyId: KEY_ID,
      issuerId: ISSUER_ID,
      nowSec,
    });
    const decoded = jwt.decode(token, { complete: true });
    assert.equal(decoded.header.alg, 'ES256');
    assert.equal(decoded.header.kid, KEY_ID);
    assert.equal(decoded.header.typ, 'JWT');
    assert.equal(decoded.payload.iss, ISSUER_ID);
    assert.equal(decoded.payload.aud, AUDIENCE);
    assert.equal(decoded.payload.iat, nowSec);
    assert.equal(decoded.payload.exp, nowSec + TOKEN_TTL_SEC);
    assert.ok(decoded.payload.exp - decoded.payload.iat <= 20 * 60);
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['ES256'],
      audience: AUDIENCE,
      issuer: ISSUER_ID,
      clockTimestamp: nowSec,
    });
    assert.equal(verified.aud, 'appstoreconnect-v1');
    assert.equal(JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).alg, 'ES256');
  });

  it('accepts a private key stored with escaped newlines', () => {
    const { privateKey, publicKey } = generatePem();
    const token = createAppStoreConnectToken({
      privateKey: privateKey.replace(/\n/g, '\\n'),
      keyId: KEY_ID,
      issuerId: ISSUER_ID,
      nowSec: 1_700_000_000,
    });
    assert.equal(jwt.verify(token, publicKey, {
      algorithms: ['ES256'],
      clockTimestamp: 1_700_000_000,
    }).aud, AUDIENCE);
    assert.equal(jwt.decode(token, { complete: true }).header.kid, KEY_ID);
  });
});

describe('App Store Connect read guard', () => {
  it('allows only GET https://api.appstoreconnect.apple.com/v1/apps', () => {
    assert.equal(assertReadOnlyRequest('GET', APPS_URL).pathname, '/v1/apps');
    assert.equal(assertReadOnlyRequest('get', `${APPS_URL}?cursor=abc`).pathname, '/v1/apps');
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      assert.throws(
        () => assertReadOnlyRequest(method, APPS_URL),
        (error) => error.code === 'APPLE_CONNECT_METHOD_BLOCKED',
      );
    }
    for (const url of [
      'https://api.appstoreconnect.apple.com/v1/apps/123',
      'https://api.appstoreconnect.apple.com/v1/users',
      'https://example.com/v1/apps',
      'http://api.appstoreconnect.apple.com/v1/apps',
    ]) {
      assert.throws(
        () => assertReadOnlyRequest('GET', url),
        (error) => error.code === 'APPLE_CONNECT_URL_BLOCKED',
      );
    }
  });
});

describe('App Store Connect verification report', () => {
  it('reports a missing issuer id and does not call Apple', async () => {
    const { privateKey } = generatePem();
    let called = 0;
    const report = await verifyAppStoreConnectAccess({
      env: credentials(privateKey, { APP_STORE_CONNECT_ISSUER_ID: '' }),
      fetchImpl: async () => {
        called += 1;
        return jsonResponse(200, { data: [] });
      },
    });
    assert.equal(called, 0);
    assert.equal(report.classification, 'config_missing');
    assert.equal(report.authResult, 'not_attempted');
    assert.equal(report.httpStatus, null);
    assert.deepEqual(report.missingConfig, ['APP_STORE_CONNECT_ISSUER_ID']);
    assert.equal(report.configured.APP_STORE_CONNECT_ISSUER_ID, false);
  });

  it('does not use Sign in with Apple settings when the Team API key is absent', async () => {
    const report = await verifyAppStoreConnectAccess({
      env: {
        APPLE_SIGN_IN_PRIVATE_KEY: generatePem().privateKey,
        APPLE_KEY_ID: 'SIGNINKEY1',
        APPLE_TEAM_ID: 'TEAMID1234',
      },
      fetchImpl: async () => {
        throw new Error('network must not be called');
      },
    });
    assert.deepEqual(report.missingConfig, [
      'APP_STORE_CONNECT_API_PRIVATE_KEY',
      'APP_STORE_CONNECT_KEY_ID',
      'APP_STORE_CONNECT_ISSUER_ID',
    ]);
  });

  it('rejects a swapped private key in the key id field before signing', async () => {
    const { privateKey } = generatePem();
    let called = 0;
    const report = await verifyAppStoreConnectAccess({
      env: credentials(privateKey, { APP_STORE_CONNECT_KEY_ID: privateKey }),
      fetchImpl: async () => {
        called += 1;
        return jsonResponse(200, { data: [] });
      },
    });
    assert.equal(called, 0);
    assert.equal(report.classification, 'config_invalid');
    assert.equal(report.invalidConfig[0].name, 'APP_STORE_CONNECT_KEY_ID');
    assert.equal(JSON.stringify(report).includes(privateKey), false);
    assert.equal(JSON.stringify(report).includes('BEGIN PRIVATE KEY'), false);
  });

  it('classifies 401 as authentication failure and 403 as permission failure', async () => {
    const { privateKey } = generatePem();
    const unauthorized = await verifyAppStoreConnectAccess({
      env: credentials(privateKey),
      fetchImpl: async () => jsonResponse(401, {
        errors: [{ code: 'NOT_AUTHORIZED', title: 'Authentication credentials are missing or invalid.', detail: 'bad token' }],
      }),
    });
    assert.equal(unauthorized.httpStatus, 401);
    assert.equal(unauthorized.classification, 'auth_error');
    assert.equal(unauthorized.authResult, 'unauthenticated');
    assert.equal(unauthorized.appAccess.found, false);
    assert.equal(unauthorized.appleError.code, 'NOT_AUTHORIZED');

    const forbidden = await verifyAppStoreConnectAccess({
      env: credentials(privateKey),
      fetchImpl: async () => jsonResponse(403, {
        errors: [{ code: 'FORBIDDEN_ERROR', title: 'This request is forbidden for security reasons', detail: 'role' }],
      }),
    });
    assert.equal(forbidden.httpStatus, 403);
    assert.equal(forbidden.classification, 'permission_error');
    assert.equal(forbidden.authResult, 'forbidden');

    const other = await verifyAppStoreConnectAccess({
      env: credentials(privateKey),
      fetchImpl: async () => jsonResponse(500, {
        errors: [{ code: 'UNEXPECTED_ERROR', title: 'An unexpected error occurred.', detail: '' }],
      }),
    });
    assert.equal(other.httpStatus, 500);
    assert.equal(other.classification, 'api_error');
    assert.equal(other.authResult, 'request_failed');
  });

  it('finds the canonical app by bundle id and keeps the call on GET /v1/apps', async () => {
    const { privateKey } = generatePem();
    const calls = [];
    const report = await verifyAppStoreConnectAccess({
      env: credentials(privateKey.replace(/\n/g, '\\n')),
      nowSec: 1_700_000_000,
      fetchImpl: async (url, init) => {
        calls.push({ url, method: init.method, authorization: init.headers.Authorization });
        assert.equal(init.redirect, 'manual');
        const decoded = jwt.decode(init.headers.Authorization.replace(/^Bearer /, ''), { complete: true });
        assert.equal(decoded.header.alg, 'ES256');
        assert.equal(decoded.header.kid, KEY_ID);
        assert.equal(decoded.payload.iss, ISSUER_ID);
        assert.equal(decoded.payload.aud, AUDIENCE);
        if (calls.length === 1) {
          return jsonResponse(200, {
            data: [appRow('Other', 'se.example.other', '1')],
            links: { next: `${APPS_URL}?cursor=next-page` },
          });
        }
        return jsonResponse(200, {
          data: [appRow(SWEDISH_APP_NAME, IOS_BUNDLE_ID, '99')],
        });
      },
    });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET']);
    assert.equal(calls[0].url, APPS_URL);
    assert.equal(report.classification, 'ok');
    assert.equal(report.authResult, 'authenticated');
    assert.equal(report.httpStatus, 200);
    assert.equal(report.appAccess.found, true);
    assert.equal(report.appAccess.matched[0].name, SWEDISH_APP_NAME);
    assert.equal(report.appAccess.matched[0].bundleMatch, true);
    assert.equal(report.appAccess.matched[0].nameMatch, true);
    assert.equal(report.appAccess.listComplete, true);
    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes(privateKey), false);
    assert.equal(serialized.includes(KEY_ID), false);
    assert.equal(serialized.includes(ISSUER_ID), false);
    assert.equal(serialized.includes(calls[0].authorization), false);
  });

  it('does not follow a next link outside GET /v1/apps', async () => {
    const { privateKey } = generatePem();
    const calls = [];
    const report = await verifyAppStoreConnectAccess({
      env: credentials(privateKey),
      fetchImpl: async (url) => {
        calls.push(url);
        return jsonResponse(200, {
          data: [appRow(SWEDISH_APP_NAME, IOS_BUNDLE_ID, '5')],
          links: { next: 'https://api.appstoreconnect.apple.com/v1/users' },
        });
      },
    });
    assert.deepEqual(calls, [APPS_URL]);
    assert.equal(report.classification, 'ok');
    assert.equal(report.appAccess.found, true);
    assert.equal(report.appAccess.listComplete, false);
    assert.equal(report.appleError, null);
  });

  it('treats an authenticated list without the app as inaccessible', async () => {
    const { privateKey } = generatePem();
    const report = await verifyAppStoreConnectAccess({
      env: credentials(privateKey),
      fetchImpl: async () => jsonResponse(200, {
        data: [appRow(ENGLISH_APP_NAME, 'se.example.other', '7')],
      }),
    });
    assert.equal(report.httpStatus, 200);
    assert.equal(report.authResult, 'authenticated');
    assert.equal(report.classification, 'app_not_accessible');
    assert.equal(report.appAccess.found, false);
    assert.equal(report.appAccess.listedAppCount, 1);
  });

  it('strips secrets echoed in an Apple error body', async () => {
    const { privateKey } = generatePem();
    const env = credentials(privateKey);
    let token = '';
    const report = await verifyAppStoreConnectAccess({
      env,
      fetchImpl: async (_url, init) => {
        token = init.headers.Authorization.replace(/^Bearer /, '');
        return jsonResponse(401, {
          errors: [{
            code: 'NOT_AUTHORIZED',
            title: 'Authentication credentials are missing or invalid.',
            detail: `leaked ${token} ${privateKey} ${KEY_ID} ${ISSUER_ID}`,
          }],
        });
      },
    });
    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes(token), false);
    assert.equal(serialized.includes('BEGIN PRIVATE KEY'), false);
    assert.equal(serialized.includes(KEY_ID), false);
    assert.equal(serialized.includes(ISSUER_ID), false);
    assert.match(serialized, /\[REDACTED\]/);
  });
});

describe('apple-connect-verify workflow', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/apple-connect-verify.yml'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'scripts/apple-connect-verify.js'), 'utf8');
  const library = fs.readFileSync(path.join(__dirname, '..', 'src/lib/app-store-connect-read.js'), 'utf8');

  it('is manual, uses store-publishing, and reads only the three Team API secrets', () => {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /\n\s*push:/);
    assert.doesNotMatch(workflow, /pull_request/);
    assert.doesNotMatch(workflow, /schedule:/);
    assert.match(workflow, /environment: store-publishing/);
    assert.match(workflow, /secrets\.APP_STORE_CONNECT_API_PRIVATE_KEY/);
    assert.match(workflow, /secrets\.APP_STORE_CONNECT_KEY_ID/);
    assert.match(workflow, /secrets\.APP_STORE_CONNECT_ISSUER_ID/);
    assert.match(workflow, /refs\/heads\/main/);
    assert.match(workflow, /contents: read/);
    assert.match(workflow, /if: always\(\)/);
    assert.doesNotMatch(workflow, /contents: write|actions: write|id-token: write|pull-requests: write/);
    assert.doesNotMatch(workflow, /echo \$\{?\{?\s*secrets|printenv|set -x/);
    assert.doesNotMatch(workflow, /play-store-publish|play-publisher|GOOGLE_PLAY/);
    assert.doesNotMatch(workflow, /APPLE_SIGN_IN|APPLE_PRIVATE_KEY|APPLE_KEY_ID|APPLE_TEAM_ID/);
    assert.match(script, /verifyAppStoreConnectAccess/);
    assert.doesNotMatch(script, /play-publisher|play-store-publish|apple-token|apple-auth/);
    assert.doesNotMatch(library, /play-publisher|play-store-publish|apple-token|apple-auth/);
    assert.doesNotMatch(library, /method:\s*'POST'|method:\s*'PUT'|method:\s*'PATCH'|method:\s*'DELETE'/);
  });

  it('writes a report that does not contain the signing secrets', async () => {
    const { privateKey } = generatePem();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apple-connect-verify-'));
    const outPath = path.join(dir, 'apple-connect-verify.json');
    const logs = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk, ...rest) => {
      logs.push(String(chunk));
      return originalWrite.call(process.stdout, chunk, ...rest);
    };
    try {
      const code = await main(['node', 'scripts/apple-connect-verify.js', '--out', outPath], credentials(privateKey), async () => jsonResponse(200, {
        data: [appRow(ENGLISH_APP_NAME, IOS_BUNDLE_ID, '42')],
      }));
      assert.equal(code, 0);
    } finally {
      process.stdout.write = originalWrite;
    }
    const written = fs.readFileSync(outPath, 'utf8') + fs.readFileSync(outPath.replace(/\.json$/, '.md'), 'utf8') + logs.join('');
    assert.equal(written.includes(privateKey), false);
    assert.equal(written.includes(KEY_ID), false);
    assert.equal(written.includes(ISSUER_ID), false);
    assert.match(written, /HTTP status: 200/);
    assert.match(written, /Authentication: authenticated/);
  });
});
