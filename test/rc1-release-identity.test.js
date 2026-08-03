'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertExactHealthSha,
  assertExactCacheName,
  assertAuthMeFamilyId,
  assertFixtureChildUsername,
  parseActiveCacheName,
} = require('../scripts/lib/rc1-release-identity');

describe('rc1-release-identity', () => {
  it('assertExactHealthSha rejects wrong sha', () => {
    assert.throws(
      () => assertExactHealthSha({ status: 'healthy', git_sha: 'aaa' }, 'bbb'),
      /git_sha mismatch/
    );
  });

  it('assertExactHealthSha accepts match', () => {
    assert.doesNotThrow(() => assertExactHealthSha(
      { status: 'healthy', git_sha: 'deadbeef' },
      'deadbeef'
    ));
  });

  it('parseActiveCacheName reads const CACHE_NAME', () => {
    const sw = "const CACHE_NAME = 'stjarndag-v999';\nconst x = 1;";
    assert.equal(parseActiveCacheName(sw), 'stjarndag-v999');
  });

  it('assertExactHealthSha rejects missing expected sha', () => {
    assert.throws(
      () => assertExactHealthSha({ status: 'healthy', git_sha: 'aaa' }, ''),
      /RC1_EXPECTED_SHA required/
    );
  });

  it('assertExactCacheName rejects missing cache', () => {
    const sw = "const CACHE_NAME = 'stjarndag-v1';";
    assert.throws(() => assertExactCacheName(sw, ''), /RC1_EXPECTED_CACHE required/);
  });

  it('assertExactCacheName accepts match', () => {
    const sw = "const CACHE_NAME = 'stjarndag-v1';";
    assert.doesNotThrow(() => assertExactCacheName(sw, 'stjarndag-v1'));
  });

  it('assertExactCacheName rejects mismatch', () => {
    const sw = "const CACHE_NAME = 'stjarndag-v1';";
    assert.throws(() => assertExactCacheName(sw, 'stjarndag-v2'), /CACHE_NAME mismatch/);
  });

  it('assertAuthMeFamilyId rejects wrong family', () => {
    assert.throws(
      () => assertAuthMeFamilyId({ familyId: 'a' }, 'b'),
      /family_id mismatch/
    );
  });

  it('assertFixtureChildUsername requires exact child', () => {
    const children = [{ username: 'rc1qachild', name: 'RC1 Child' }];
    assert.doesNotThrow(() => assertFixtureChildUsername(children, 'rc1qachild'));
    assert.throws(
      () => assertFixtureChildUsername(children, 'other'),
      /not found/
    );
  });
});
