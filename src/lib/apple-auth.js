'use strict';

const crypto = require('crypto');

const APPLE_JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let _appleJwksCache = { keys: null, fetchedAt: 0 };

async function _fetchAppleJwks() {
  const now = Date.now();
  if (_appleJwksCache.keys && (now - _appleJwksCache.fetchedAt) < APPLE_JWKS_CACHE_TTL_MS) {
    return _appleJwksCache.keys;
  }
  try {
    const res = await fetch('https://appleid.apple.com/auth/keys');
    if (!res.ok) throw new Error(`Apple JWKS HTTP ${res.status}`);
    const data = await res.json();
    _appleJwksCache = { keys: data.keys || [], fetchedAt: now };
    return _appleJwksCache.keys;
  } catch (err) {
    console.error('[AUTH] Apple JWKS fetch failed, using cached keys:', err.message);
    return _appleJwksCache.keys || [];
  }
}

function _jwkToPem(jwk) {
  if (!jwk || jwk.kty !== 'RSA') return null;
  return crypto.createPublicKey({ key: jwk, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' });
}

async function verifyAppleIdToken(idToken) {
  const jwt = require('jsonwebtoken');
  const APPLE_ISSUER = 'https://appleid.apple.com';
  const audiences = [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_BUNDLE_ID || 'se.mystarday.app', // pragma: allowlist secret
  ].filter(Boolean);
  if (audiences.length === 0) {
    console.error('[APPLE] token verification: no APPLE_CLIENT_ID or APPLE_BUNDLE_ID configured');
    return null;
  }

  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded) {
      console.error('[APPLE] token decode failed');
      return null;
    }

    const { kid, alg } = decoded.header;
    if (!kid || alg !== 'RS256') {
      console.error('[APPLE] invalid token header', { kid: !!kid, alg });
      return null;
    }

    const keys = await _fetchAppleJwks();
    const jwk = keys.find((k) => k.kid === kid);
    if (!jwk) {
      console.error('[APPLE] JWK kid not found:', kid);
      return null;
    }

    const pem = _jwkToPem(jwk);
    if (!pem) return null;

    return jwt.verify(idToken, pem, {
      issuer: APPLE_ISSUER,
      audience: audiences.length === 1 ? audiences[0] : audiences,
      algorithms: ['RS256'],
    });
  } catch (err) {
    const decodedAud = (() => {
      try {
        const d = jwt.decode(idToken);
        return d && d.aud;
      } catch { return undefined; }
    })();
    if (err.name === 'JsonWebTokenError' && /audience/i.test(err.message)) {
      console.error('[APPLE] audience mismatch', {
        expected: audiences,
        got: decodedAud,
      });
    } else {
      console.error('[APPLE] token verification failed:', err.message);
    }
    return null;
  }
}

module.exports = { verifyAppleIdToken };
