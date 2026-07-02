'use strict';

/**
 * N5/L7/M9 — all five legacy call sites must verify JWTs through the shared
 * dual-secret `verifyToken` (auth.js) instead of a direct `jwt.verify(token,
 * config.jwt.secret)`, so a JWT_SECRET rotation doesn't log everyone out of
 * report links / PIN restore / SSE / impersonation-block / maintenance-bypass.
 * events.js's `?token=` query-param fallback (a log-leak risk) is removed.
 */

process.env.JWT_SECRET = 'test-secret-current-at-least-32-chars-xx';
process.env.JWT_SECRET_PREVIOUS = 'test-secret-previous-at-least-32-chars-xx';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Matches a direct verify call against the raw current secret, bypassing
// verifyToken's JWT_SECRET_PREVIOUS fallback.
const RAW_VERIFY_PATTERN = /jwt\.verify\([^)]*config\.jwt\.secret\)/;

const CALL_SITES = [
  { file: 'src/routes/public.js', importPattern: /require\(['"]\.\.\/middleware\/auth['"]\)/ },
  { file: 'src/routes/family/pin.js', importPattern: /require\(['"]\.\.\/\.\.\/middleware\/auth['"]\)/ },
  { file: 'src/routes/events.js', importPattern: /require\(['"]\.\.\/middleware\/auth['"]\)/ },
  { file: 'src/middleware/impersonation.js', importPattern: /require\(['"]\.\/auth['"]\)/ },
  { file: 'src/middleware/maintenance.js', importPattern: /require\(['"]\.\/auth['"]\)/ },
];

describe('JWT rotation contract (N5/L7/M9)', () => {
  for (const { file, importPattern } of CALL_SITES) {
    it(`${file} verifies tokens via the shared verifyToken (dual-secret) helper`, () => {
      const src = read(file);
      assert.match(src, /verifyToken/, `${file} should reference verifyToken`);
      assert.match(src, importPattern, `${file} should import verifyToken from auth.js`);
      assert.doesNotMatch(
        src,
        RAW_VERIFY_PATTERN,
        `${file} should not call jwt.verify(token, config.jwt.secret) directly — use verifyToken()`
      );
    });
  }

  it('events.js no longer accepts a ?token= query-param fallback', () => {
    const src = read('src/routes/events.js');
    assert.doesNotMatch(src, /req\.query\.token/, 'query-param JWT fallback must be removed (log-leak risk)');
  });

  it('shared verifyToken() accepts a token signed with JWT_SECRET_PREVIOUS', () => {
    // This is the mechanism all five call sites now delegate to — proves a
    // token signed before a key rotation is still accepted after JWT_SECRET
    // is rotated and the old value moves to JWT_SECRET_PREVIOUS.
    delete require.cache[require.resolve('../src/lib/config')];
    delete require.cache[require.resolve('../src/middleware/auth')];
    const { verifyToken } = require('../src/middleware/auth');

    const oldToken = jwt.sign({ type: 'parent', id: 'x' }, process.env.JWT_SECRET_PREVIOUS, {
      expiresIn: '15m',
    });
    const decoded = verifyToken(oldToken);
    assert.equal(decoded.type, 'parent');

    const garbageToken = jwt.sign({ type: 'parent', id: 'x' }, 'not-a-configured-secret-at-all', {
      expiresIn: '15m',
    });
    assert.throws(() => verifyToken(garbageToken));
  });
});
