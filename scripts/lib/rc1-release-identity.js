'use strict';

/**
 * RC-1 release + fixture identity checks (smoke / mobile-browser).
 * No secrets — env-driven expected values only.
 */

const CACHE_NAME_RE = /const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/;

function assertExactHealthSha(healthJson, expectedSha) {
  const sha = (expectedSha || '').trim();
  if (!sha) {
    const err = new Error('RC1_EXPECTED_SHA required for release identity check');
    err.code = 'RC1_IDENTITY_MISSING_SHA';
    throw err;
  }
  if (healthJson?.status !== 'healthy') {
    const err = new Error(`RC1 release identity: /health status=${healthJson?.status || 'missing'}`);
    err.code = 'RC1_IDENTITY_HEALTH';
    throw err;
  }
  if (healthJson.git_sha !== sha) {
    const err = new Error(
      `RC1 release identity: git_sha mismatch (expected ${sha}, got ${healthJson.git_sha || 'missing'})`
    );
    err.code = 'RC1_IDENTITY_SHA_MISMATCH';
    throw err;
  }
}

function parseActiveCacheName(swText) {
  const m = String(swText || '').match(CACHE_NAME_RE);
  return m ? m[1] : null;
}

function assertExactCacheName(swText, expectedCache) {
  const cache = (expectedCache || '').trim();
  if (!cache) {
    const err = new Error('RC1_EXPECTED_CACHE required for release identity check');
    err.code = 'RC1_IDENTITY_MISSING_CACHE';
    throw err;
  }
  const active = parseActiveCacheName(swText);
  if (!active) {
    const err = new Error('RC1 release identity: could not parse CACHE_NAME from sw.js');
    err.code = 'RC1_IDENTITY_CACHE_PARSE';
    throw err;
  }
  if (active !== cache) {
    const err = new Error(
      `RC1 release identity: CACHE_NAME mismatch (expected ${cache}, got ${active})`
    );
    err.code = 'RC1_IDENTITY_CACHE_MISMATCH';
    throw err;
  }
}

function assertAuthMeFamilyId(meJson, expectedFamilyId) {
  const familyId = (expectedFamilyId || '').trim();
  if (!familyId) {
    const err = new Error('RC1_QA_FAMILY_ID required for fixture identity check');
    err.code = 'RC1_IDENTITY_MISSING_FAMILY';
    throw err;
  }
  const actual = meJson?.familyId || meJson?.family_id;
  if (actual !== familyId) {
    const err = new Error(
      `RC1 fixture identity: family_id mismatch (expected ${familyId}, got ${actual || 'missing'})`
    );
    err.code = 'RC1_IDENTITY_FAMILY_MISMATCH';
    throw err;
  }
}

function findFixtureChild(childrenList, childUsername) {
  const username = (childUsername || '').trim().toLowerCase();
  if (!username) {
    const err = new Error('RC1_CHILD_USERNAME required for fixture child check');
    err.code = 'RC1_IDENTITY_MISSING_CHILD_USERNAME';
    throw err;
  }
  const list = Array.isArray(childrenList)
    ? childrenList
    : (childrenList?.children || []);
  const match = list.find(
    (c) => String(c.username || '').toLowerCase() === username
  );
  if (!match) {
    const err = new Error(`RC1 fixture identity: child username ${username} not found`);
    err.code = 'RC1_IDENTITY_CHILD_NOT_FOUND';
    throw err;
  }
  return match;
}

function assertFixtureChildUsername(childrenList, childUsername) {
  const match = findFixtureChild(childrenList, childUsername);
  if (String(match.username).toLowerCase() !== String(childUsername).trim().toLowerCase()) {
    const err = new Error('RC1 fixture identity: child username mismatch');
    err.code = 'RC1_IDENTITY_CHILD_USERNAME_MISMATCH';
    throw err;
  }
}

function releaseIdentityEnforced(env = process.env) {
  return env.RC1_ENFORCE_RELEASE_IDENTITY === '1'
    || env.RC1_MOBILE_BROWSER_QA_MODE === 'full';
}

module.exports = {
  CACHE_NAME_RE,
  parseActiveCacheName,
  assertExactHealthSha,
  assertExactCacheName,
  assertAuthMeFamilyId,
  assertFixtureChildUsername,
  findFixtureChild,
  releaseIdentityEnforced,
};
